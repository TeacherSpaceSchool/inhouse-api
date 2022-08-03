const Order = require('../models/order');
const WayItem = require('../models/wayItem');
const ItemOrder = require('../models/itemOrder');
const History = require('../models/history');
const BalanceClient = require('../models/balanceClient');
const {checkFloat} = require('../module/const');

const type = `
  type Order {
    _id: ID
    createdAt: Date
    paymentConfirmation: Boolean
    number: String
    manager: User
    client: Client
    itemsOrder: [ItemFromList]
    store: Store
    amount: Float
    paid: Float
    typePayment: String
    comment: String
    currency: String
    status: String
    sale: Sale
}
`;

const query = `
    prepareAcceptOrder(_id: ID!): [ID]
    orders(skip: Int, items: Boolean, limit: Int, manager: ID, client: ID, store: ID, date: Date, status: String): [Order]
    ordersCount(manager: ID, client: ID, store: ID, date: Date, status: String): Int
    order(_id: ID!): Order
`;

const mutation = `
    addOrder(client: ID!, itemsOrder: [ItemFromListInput]!, amount: Float!, paid: Float!, typePayment: String!, comment: String!, currency: String): String
    setOrder(_id: ID!, itemsOrder: [ItemFromListInput], amount: Float, paid: Float, comment: String, status: String): String
`;

const resolvers = {
    orders: async(parent, {skip, items, manager, client, store, limit, date, status}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)) {
            if(user.store) store = user.store
            if(user.role==='менеджер') manager = user._id
            let dateStart, dateEnd
            if (date) {
                dateStart = new Date(date)
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            let res = await Order.find({
                ...manager?{manager}:{},
                ...client?{client}:{},
                ...date?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{},
                ...store?{store}:{},
                ...status?{status}:{},
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? limit ? limit : 30 : 10000000000)
                .sort('-createdAt')
                .populate({
                    path: 'manager',
                    select: '_id name'
                })
                .populate({
                    path: 'client',
                    select: '_id name'
                })
                .populate({
                    path: 'store',
                    select: '_id name'
                })
                .populate({
                    path: 'sale',
                    select: '_id number'
                })
                .lean()
            if(items) {
                for (let i = 0; i < res.length; i++) {
                    res[i].itemsOrder = await ItemOrder.find({_id: {$in: res[i].itemsOrder}}).lean()
                }
            }
            return res
        }
    },
    ordersCount: async(parent, {client, store, manager, date, status}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)) {
            if(user.store) store = user.store
            if(user.role==='менеджер') manager = user._id
            let dateStart, dateEnd
            if (date) {
                dateStart = new Date(date)
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            return await Order.countDocuments({
                ...manager?{manager}:{},
                ...client?{client}:{},
                ...date?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{},
                ...store?{store}:{},
                ...status?{status}:{},
            })
                .lean()
        }
    },
    order: async(parent, {_id}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)) {
            let res = await Order.findOne({
                _id,
                ...user.role==='менеджер'?{manager: user._id}:{}
            })
                .populate({
                    path: 'manager',
                    select: '_id name'
                })
                .populate({
                    path: 'client',
                    select: '_id name'
                })
                .populate({
                    path: 'store',
                    select: '_id name'
                })
                .populate({
                    path: 'sale',
                    select: '_id number'
                })
                .populate('itemsOrder')
                .lean()
            return res
        }
    },
    prepareAcceptOrder: async(parent, {_id}, {user}) => {
        if(['admin', 'завсклад'].includes(user.role)) {
            let res = []
            let order = await Order.findOne({
                _id
            })
                .populate('itemsOrder')
                .lean()
            let wayItems, usedAmount
            for(let i=0; i<order.itemsOrder.length; i++) {
                res[i] = null
                wayItems = await WayItem.find({item: order.itemsOrder[i].item, status: 'в пути'}).lean()
                for(let i1=0; i1<wayItems.length; i1++) {
                    usedAmount = 0
                    for(let i2=0; i2<wayItems[i1].bookings.length; i2++) {
                        usedAmount += wayItems[i1].bookings[i2].amount
                    }
                    if((wayItems[i1].amount-usedAmount)>=order.itemsOrder[i].count) {
                        res[i] = wayItems[i1]._id
                        break
                    }
                }
            }
            return res
        }
    },
};

const resolversMutation = {
    addOrder: async(parent, {client, itemsOrder, amount, paid, typePayment, comment, currency}, {user}) => {
        if('менеджер'===user.role) {
            for(let i=0; i<itemsOrder.length; i++) {
                itemsOrder[i] = new ItemOrder(itemsOrder[i]);
                itemsOrder[i] = (await ItemOrder.create(itemsOrder[i]))._id
            }
            let object = new Order({
                number: (await Order.countDocuments({}).lean())+1,
                manager: user._id,
                client,
                itemsOrder,
                store: user.store,
                comment,
                status: 'обработка',
                amount,
                paid,
                typePayment,
                currency
            });
            object = await Order.create(object)
            let history = new History({
                who: user._id,
                where: object._id,
                what: 'Создание'
            });
            await History.create(history)

            if(paid) {
                let balanceClient = await BalanceClient.findOne({client}).lean(), index
                for(let i=0; i<balanceClient.balance.length; i++) {
                    if (balanceClient.balance[i].currency === currency) {
                        index = i
                        break
                    }
                }
                if(index===undefined)
                    balanceClient.balance = [
                        {
                            currency,
                            amount: -paid
                        },
                        ...balanceClient.balance
                    ]
                else
                    balanceClient.balance[index].amount = checkFloat(balanceClient.balance[index].amount - paid)
                await BalanceClient.updateOne({_id: balanceClient._id}, {balance: balanceClient.balance})
            }
            return object._id
        }
        return 'ERROR'
    },
    setOrder: async(parent, {_id, itemsOrder, amount, paid, comment, status}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)) {
            let object = await Order.findOne({
                _id,
                ...user.role==='менеджер'?{manager: user._id}:{}
            })
            if(object&&object.status==='обработка') {
                let history = new History({
                    who: user._id,
                    where: object._id,
                    what: ''
                });
                if (itemsOrder) {
                    history.what = 'Позиции;\n'
                    let newItemOrder, newIdsItemOrder = [], newItemsOrder = []
                    //новые IDs
                    for(let i=0; i<itemsOrder.length; i++) {
                        if(itemsOrder[i]._id)
                            newIdsItemOrder.push(itemsOrder[i]._id)
                    }
                    //перебор старых
                    for(let i=0; i<object.itemsOrder.length; i++) {
                        if(!newIdsItemOrder.includes(object.itemsOrder[i].toString()))
                            await ItemOrder.deleteOne({_id: object.itemsOrder[i]})
                        else
                            newItemsOrder.push(object.itemsOrder[i])
                    }
                    //перебор новых
                    for(let i=0; i<itemsOrder.length; i++) {
                        if(itemsOrder[i]._id)
                            await ItemOrder.updateOne({_id: itemsOrder[i]._id}, itemsOrder[i])
                        else {
                            newItemOrder = new ItemOrder(itemsOrder[i]);
                            newItemsOrder.push((await ItemOrder.create(newItemOrder))._id)
                        }
                    }
                    await Order.updateOne({_id}, {itemsOrder: newItemsOrder})
                }
                if (amount!=undefined) {
                    history.what = `${history.what}Итого:${object.amount}→${amount};\n`
                    object.amount = amount
                }
                if (paid!=undefined) {
                    history.what = `${history.what}Оплачено:${object.paid}→${paid};\n`

                    let balanceClient = await BalanceClient.findOne({client: object.client}).lean(), index
                    for(let i=0; i<balanceClient.balance.length; i++) {
                        if (balanceClient.balance[i].currency === object.currency) {
                            index = i
                            break
                        }
                    }
                    balanceClient.balance[index].amount = checkFloat(balanceClient.balance[index].amount + object.paid - paid)
                    await BalanceClient.updateOne({_id: balanceClient._id}, {balance: balanceClient.balance})

                    object.paid = paid
                }
                if (comment) {
                    history.what = `${history.what}Информация:${object.comment}→${comment};\n`
                    object.comment = comment
                }
                if (status) {
                    history.what = `${history.what}Статус:${object.status}→${status};`
                    object.status = status
                    await ItemOrder.updateMany({_id: {$in: object.itemsOrder}}, {status})
                    if(status==='отмена') {
                        let balanceClient = await BalanceClient.findOne({client: object.client}).lean(), index
                        for(let i=0; i<balanceClient.balance.length; i++) {
                            if (balanceClient.balance[i].currency === object.currency) {
                                index = i
                                break
                            }
                        }
                        balanceClient.balance[index].amount = checkFloat(balanceClient.balance[index].amount + object.paid)
                        await BalanceClient.updateOne({_id: balanceClient._id}, {balance: balanceClient.balance})
                    }
                }
                await object.save();
                await History.create(history)
                return 'OK'
            }
        }
        return 'ERROR'
    }
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;