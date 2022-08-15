const Reservation = require('../models/reservation');
const ItemReservation = require('../models/itemReservation');
const StoreBalanceItem = require('../models/storeBalanceItem');
const History = require('../models/history');
const BalanceClient = require('../models/balanceClient');
const {checkFloat, pdDDMMYYYY} = require('../module/const');

const type = `
  type Reservation {
    _id: ID
    createdAt: Date
    number: String
    manager: User
    paymentConfirmation: Boolean
    client: Client
    itemsReservation: [ItemFromList]
    store: Store
    amount: Float
    term: Date
    paid: Float
    typePayment: String
    comment: String
    currency: String
    status: String
    sale: Sale
  }
`;

const query = `
    reservations(search: String, skip: Int, items: Boolean, limit: Int, manager: ID, soon: Boolean, client: ID, store: ID, date: Date, status: String, late: Boolean, today: Boolean): [Reservation]
    reservationsCount(search: String, manager: ID, client: ID, store: ID, soon: Boolean, date: Date, status: String, late: Boolean, today: Boolean): Int
    reservation(_id: ID!): Reservation
`;

const mutation = `
    addReservation(client: ID!, itemsReservation: [ItemFromListInput]!, term: Date!, amount: Float!, paid: Float!, typePayment: String!, comment: String!, currency: String): String
    setReservation(_id: ID!, itemsReservation: [ItemFromListInput], amount: Float, term: Date, paid: Float, comment: String, status: String): String
`;

const resolvers = {
    reservations: async(parent, {search, skip, manager, items, client, store, soon, limit, date, status, late, today}, {user}) => {
        if(['admin', 'управляющий',  'кассир', 'менеджер', 'менеджер/завсклад'].includes(user.role)) {
            if(user.store) store = user.store
            let dateStart, dateEnd
            if(late||today) {
                date = new Date()
                date.setHours(0, 0, 0, 0)
            }
            else if (soon) {
                dateStart = new Date()
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 3)
            }
            else if (date) {
                dateStart = new Date(date)
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            let res = await Reservation.find({
                ...search?{number: search}:{},
                ...manager?{manager}:{},
                ...client?{client}:{},
                ...store?{store}:{},
                ...late?
                    {term: {$lt: date}, status: 'обработка'}
                    :
                    today?
                        {term: date, status: 'обработка'}
                        :
                        soon?
                            {$and: [{term: {$gte: dateStart}}, {term: {$lt: dateEnd}}], status: 'обработка'}
                            :
                            {
                                ...status?status==='оплата'?{status: {$ne: 'отмена'}}:{status}:{},
                                ...dateStart?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{}
                            }

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
                    res[i].itemsReservation = await ItemReservation.find({_id: {$in: res[i].itemsReservation}}).lean()
                }
            }
            return res
        }
    },
    reservationsCount: async(parent, {search, client, store, manager, date, soon, status, late, today}, {user}) => {
        if(['admin', 'управляющий',  'кассир', 'менеджер', 'менеджер/завсклад'].includes(user.role)) {
            if(user.store) store = user.store
            let dateStart, dateEnd
            if(late||today) {
                date = new Date()
                date.setHours(0, 0, 0, 0)
            }
            else if (soon) {
                dateStart = new Date()
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 3)
            }
            else if (date) {
                dateStart = new Date(date)
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            return await Reservation.countDocuments({
                ...search?{number: search}:{},
                ...manager?{manager}:{},
                ...client?{client}:{},
                ...store?{store}:{},
                ...late?
                    {term: {$lt: date}, status: 'обработка'}
                    :
                    today?
                        {term: date, status: 'обработка'}
                        :
                        soon?
                            {$and: [{term: {$gte: dateStart}}, {term: {$lt: dateEnd}}], status: 'обработка'}
                            :
                            {
                                ...status?status==='оплата'?{status: {$ne: 'отмена'}}:{status}:{},
                                ...dateStart?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{}
                            }
            })
                .lean()
        }
    },
    reservation: async(parent, {_id}, {user}) => {
        if(['admin', 'управляющий',  'кассир', 'менеджер', 'менеджер/завсклад'].includes(user.role)) {
            let res = await Reservation.findOne({
                _id,
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
                .populate('itemsReservation')
                .lean()
            return res
        }
    },
};

const resolversMutation = {
    addReservation: async(parent, {client, itemsReservation, term, paid, typePayment, amount, comment, currency}, {user}) => {
        if(['менеджер', 'менеджер/завсклад'].includes(user.role)) {
            for(let i=0; i<itemsReservation.length; i++) {
                itemsReservation[i] = new ItemReservation(itemsReservation[i]);
                let storeBalanceItem = await StoreBalanceItem.findOne({store: user.store, item: itemsReservation[i].item})
                storeBalanceItem.reservation = checkFloat(storeBalanceItem.reservation + itemsReservation[i].count)
                storeBalanceItem.free = checkFloat(storeBalanceItem.free - itemsReservation[i].count)
                await storeBalanceItem.save()
                itemsReservation[i] = (await ItemReservation.create(itemsReservation[i]))._id
            }
            term = new Date(term)
            term.setHours(0, 0, 0, 0)
            let object = new Reservation({
                number: (await Reservation.countDocuments({}).lean())+1,
                manager: user._id,
                client,
                itemsReservation,
                store: user.store,
                term,
                paid,
                amount,
                typePayment,
                comment,
                currency,
                status: 'обработка'
            });
            object = await Reservation.create(object)
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
    setReservation: async(parent, {_id, itemsReservation, amount, term, paid, comment, status}, {user}) => {
        if(['admin', 'менеджер', 'менеджер/завсклад'].includes(user.role)) {
            let object = await Reservation.findOne({
                _id,
                ...['менеджер', 'менеджер/завсклад'].includes(user.role)?{manager: user._id}:{}
            })
            if(object&&object.status==='обработка') {
                let history = new History({
                    who: user._id,
                    where: object._id,
                    what: ''
                });
                if (itemsReservation) {
                    history.what = 'Позиции;\n'
                    let storeBalanceItem, oldItemReservation, newItemReservation, newIdsItemReservation = [], newItemsReservation = []
                    for(let i=0; i<itemsReservation.length; i++) {
                        if(itemsReservation[i]._id)
                            newIdsItemReservation.push(itemsReservation[i]._id)
                    }
                    for(let i=0; i<object.itemsReservation.length; i++) {
                        oldItemReservation = await ItemReservation.findOne({_id: object.itemsReservation[i]}).lean()
                        storeBalanceItem = await StoreBalanceItem.findOne({store: object.store, item: oldItemReservation.item})
                        storeBalanceItem.reservation = checkFloat(storeBalanceItem.reservation - oldItemReservation.count)
                        storeBalanceItem.free = checkFloat(storeBalanceItem.free + oldItemReservation.count)
                        await storeBalanceItem.save()
                        if(!newIdsItemReservation.includes(object.itemsReservation[i].toString()))
                            await ItemReservation.deleteOne({_id: object.itemsReservation[i]})
                        else
                            newItemsReservation.push(object.itemsReservation[i])
                    }
                    for(let i=0; i<itemsReservation.length; i++) {
                        if(itemsReservation[i]._id) {
                            await ItemReservation.updateOne({_id: itemsReservation[i]._id}, itemsReservation[i])
                        }
                        else {
                            newItemReservation = new ItemReservation(itemsReservation[i]);
                            newItemsReservation.push((await ItemReservation.create(newItemReservation))._id)
                        }
                        storeBalanceItem = await StoreBalanceItem.findOne({store: object.store, item: itemsReservation[i].item})
                        storeBalanceItem.reservation = checkFloat(storeBalanceItem.reservation + itemsReservation[i].count)
                        storeBalanceItem.free = checkFloat(storeBalanceItem.free - itemsReservation[i].count)
                        await storeBalanceItem.save()
                    }
                    await Reservation.updateOne({_id}, {itemsReservation: newItemsReservation})
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
                if (amount!=undefined) {
                    history.what = `${history.what}Итого:${object.amount}→${amount};\n`
                    object.amount = amount
                }
                if (term) {
                    term = new Date(term)
                    term.setHours(0, 0, 0, 0)
                    history.what = `${history.what}Срок:${pdDDMMYYYY(object.term)}→${pdDDMMYYYY(term)};\n`
                    object.term = term
                }
                if (comment) {
                    history.what = `${history.what}Комментарий:${object.comment}→${comment};\n`
                    object.comment = comment
                }
                if (status) {
                    history.what = `${history.what}Статус:${object.status}→${status};`
                    object.status = status
                    await ItemReservation.updateMany({_id: {$in: object.itemsReservation}}, {status})
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

                        itemsReservation = await ItemReservation.find({_id: {$in: object.itemsReservation}}).lean()
                        for(let i=0; i<itemsReservation.length; i++) {
                            let storeBalanceItem = await StoreBalanceItem.findOne({store: object.store, item: itemsReservation[i].item})
                            storeBalanceItem.reservation = checkFloat(storeBalanceItem.reservation - itemsReservation[i].count)
                            storeBalanceItem.free = checkFloat(storeBalanceItem.free + itemsReservation[i].count)
                            await storeBalanceItem.save()
                        }
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