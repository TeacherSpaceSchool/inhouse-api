const Order = require('../models/order');
const WayItem = require('../models/wayItem');
const ItemOrder = require('../models/itemOrder');
const History = require('../models/history');
const BalanceClient = require('../models/balanceClient');
const {checkFloat, urlMain, pdDDMMYYHHMM, checkDate } = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const randomstring = require('randomstring');

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
    unloadOrders(search: String, manager: ID, client: ID, store: ID, date: Date, status: String, _id: ID): String
    prepareAcceptOrder(_id: ID!): [ID]
    orders(search: String, skip: Int, items: Boolean, limit: Int, manager: ID, client: ID, store: ID, date: Date, status: String): [Order]
    ordersCount(search: String, manager: ID, client: ID, store: ID, date: Date, status: String): Int
    order(_id: ID!): Order
`;

const mutation = `
    addOrder(client: ID!, itemsOrder: [ItemFromListInput]!, amount: Float!, paid: Float!, typePayment: String!, comment: String!, currency: String): String
    setOrder(_id: ID!, itemsOrder: [ItemFromListInput], amount: Float, paid: Float, comment: String, status: String): String
`;

const resolvers = {
    unloadOrders: async(parent, {search, client, store, manager, date, status, _id}, {user}) => {
        if(['admin', 'управляющий',  'кассир', 'менеджер', 'менеджер/завсклад', 'завсклад'].includes(user.role)) {
            if(user.store) store = user.store
            if(['менеджер', 'менеджер/завсклад'].includes(user.role)) manager = user._id
            let dateStart, dateEnd
            if (date&&date.toString()!=='Invalid Date') {
                dateStart = new Date(date)
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            let res = await Order.find(
                _id?
                    {
                        _id
                    }
                    :
                    {
                        ...search?{number: search}:{},
                        ...user.role==='менеджер'?{manager: user._id}:manager?{manager}:{},
                        ...client?{client}:{},
                        ...date?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{},
                        ...store?{store}:{},
                        ...status?status==='оплата'?{status: {$ne: 'отмена'}}:{status}:{},
                    }
            )
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
                .populate('itemsOrder')
                .lean()
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Выгрузка');
            worksheet.getColumn(1).width = 20
            let row = 1
            for(let i = 0; i < res.length; i++) {
                worksheet.getRow(row).getCell(1).font = {bold: true};
                worksheet.getRow(row).getCell(1).value = 'На заказ №'
                worksheet.getRow(row).getCell(2).value = res[i].number
                row +=1
                worksheet.getRow(row).getCell(1).font = {bold: true};
                worksheet.getRow(row).getCell(1).value = 'Статус'
                worksheet.getRow(row).getCell(2).value = `${res[i].status} ${res[i].paymentConfirmation?'оплачен':''}`
                row +=1
                worksheet.getRow(row).getCell(1).font = {bold: true};
                worksheet.getRow(row).getCell(1).value = 'Создан'
                worksheet.getRow(row).getCell(2).value = pdDDMMYYHHMM(res[i].createdAt)
                row +=1
                worksheet.getRow(row).getCell(1).font = {bold: true};
                worksheet.getRow(row).getCell(1).value = 'Магазин'
                worksheet.getRow(row).getCell(2).value = res[i].store.name
                row +=1
                worksheet.getRow(row).getCell(1).font = {bold: true};
                worksheet.getRow(row).getCell(1).value = 'Менеджер'
                worksheet.getRow(row).getCell(2).value = res[i].manager.name
                row +=1
                worksheet.getRow(row).getCell(1).font = {bold: true};
                worksheet.getRow(row).getCell(1).value = 'Клиент'
                worksheet.getRow(row).getCell(2).value = res[i].client.name
                row +=1
                worksheet.getRow(row).getCell(1).font = {bold: true};
                worksheet.getRow(row).getCell(1).value = 'Тип платежа'
                worksheet.getRow(row).getCell(2).value = res[i].typePayment
                row +=1
                worksheet.getRow(row).getCell(1).font = {bold: true};
                worksheet.getRow(row).getCell(1).value = 'Итого'
                worksheet.getRow(row).getCell(2).value = `${res[i].amount} сом`
                row +=1
                worksheet.getRow(row).getCell(1).font = {bold: true};
                worksheet.getRow(row).getCell(1).value = 'Оплачено'
                worksheet.getRow(row).getCell(2).value = `${res[i].paid} ${res[i].currency}`
                row +=1
                if(res[i].comment) {
                    worksheet.getRow(row).getCell(1).font = {bold: true};
                    worksheet.getRow(row).getCell(1).value = 'Комментарий'
                    worksheet.getRow(row).getCell(2).value = res[i].comment
                    row +=1
                }
                worksheet.getRow(row).getCell(1).font = {bold: true};
                worksheet.getRow(row).getCell(1).value = 'Позиции'
                worksheet.getRow(row).getCell(2).value = res[i].itemsOrder.length
                row +=1
                for(let i1=0; i1<res[i].itemsOrder.length; i1++) {
                    worksheet.getRow(row).getCell(1).font = {bold: true};
                    worksheet.getRow(row).getCell(1).alignment = {wrapText: true}
                    worksheet.getRow(row).getCell(1).value = res[i].itemsOrder[i1].name
                    worksheet.getRow(row).getCell(2).value = `${res[i].itemsOrder[i1].price} сом * ${res[i].itemsOrder[i1].count} ${res[i].itemsOrder[i1].unit} = ${res[i].itemsOrder[i1].amount} сом`
                    if(res[i].itemsOrder[i1].characteristics.length) {
                        let characteristics = ''
                        for(let i2=0; i2<res[i].itemsOrder[i1].characteristics.length; i2++) {
                            characteristics = `${characteristics?`${characteristics}`:''}${res[i].itemsOrder[i1].characteristics[i2][0]}: ${res[i].itemsOrder[i1].characteristics[i2][1]}`
                        }
                        worksheet.getRow(row).getCell(3).value = characteristics
                    }
                    row +=1
                }
                row +=1
            }
            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
    orders: async(parent, {search, skip, items, manager, client, store, limit, date, status}, {user}) => {
        if(['admin', 'управляющий',  'кассир', 'менеджер', 'менеджер/завсклад', 'завсклад'].includes(user.role)) {
            if(user.store) store = user.store
            if(['менеджер', 'менеджер/завсклад'].includes(user.role)) manager = user._id
            let dateStart, dateEnd
            if (date&&date.toString()!=='Invalid Date') {
                dateStart = new Date(date)
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            let res = await Order.find({
                ...search?{number: search}:{},
                ...user.role==='менеджер'?{manager: user._id}:manager?{manager}:{},
                ...client?{client}:{},
                ...date?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{},
                ...store?{store}:{},
                ...status?status==='оплата'?{status: {$ne: 'отмена'}}:{status}:{},
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
    ordersCount: async(parent, {search, client, store, manager, date, status}, {user}) => {
        if(['admin', 'управляющий',  'кассир', 'менеджер', 'менеджер/завсклад', 'завсклад'].includes(user.role)) {
            if(user.store) store = user.store
            if(['менеджер', 'менеджер/завсклад'].includes(user.role)) manager = user._id
            let dateStart = checkDate(date)
            dateStart.setHours(0, 0, 0, 0)
            let dateEnd = new Date(dateStart)
            dateEnd.setDate(dateEnd.getDate() + 1)
            return await Order.countDocuments({
                ...search?{number: search}:{},
                ...user.role==='менеджер'?{manager: user._id}:manager?{manager}:{},
                ...client?{client}:{},
                ...dateStart?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{},
                ...store?{store}:{},
                ...status?status==='оплата'?{status: {$ne: 'отмена'}}:{status}:{},
            })
                .lean()
        }
    },
    order: async(parent, {_id}, {user}) => {
        if(['admin', 'управляющий',  'кассир', 'менеджер', 'менеджер/завсклад', 'завсклад'].includes(user.role)) {
            let res = await Order.findOne({
                _id,
                ...['менеджер', 'менеджер/завсклад'].includes(user.role)?{manager: user._id}:{}
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
        if(['admin', 'завсклад', 'менеджер/завсклад'].includes(user.role)) {
            let res = []
            let order = await Order.findOne({
                _id
            })
                .populate('itemsOrder')
                .lean()
            let wayItems, usedAmount
            for(let i=0; i<order.itemsOrder.length; i++) {
                res[i] = null
                wayItems = await WayItem.find({item: order.itemsOrder[i].item, status: 'в пути', store: order.store}).lean()
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
        if(['менеджер', 'менеджер/завсклад'].includes(user.role)) {
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
                let balanceClient = await BalanceClient.findOne({client})
                balanceClient.balance = checkFloat(balanceClient.balance - paid)
                await balanceClient.save()
            }
            return object._id
        }
        return 'ERROR'
    },
    setOrder: async(parent, {_id, itemsOrder, amount, paid, comment, status}, {user}) => {
        if(['admin', 'менеджер', 'менеджер/завсклад', 'завсклад'].includes(user.role)) {
            let object = await Order.findOne({
                _id,
                ...['менеджер', 'менеджер/завсклад'].includes(user.role)?{manager: user._id}:{}
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

                    let balanceClient = await BalanceClient.findOne({client: object.client})
                    balanceClient.balance = checkFloat(balanceClient.balance + object.paid - paid)
                    await balanceClient.save()

                    object.paid = paid
                }
                if (comment) {
                    history.what = `${history.what}Комментарий:${object.comment}→${comment};\n`
                    object.comment = comment
                }
                if (status) {
                    history.what = `${history.what}Статус:${object.status}→${status};`
                    object.status = status
                    await ItemOrder.updateMany({_id: {$in: object.itemsOrder}}, {status})
                    if(status==='отмена'&&object.paid) {
                        let balanceClient = await BalanceClient.findOne({client: object.client})
                        balanceClient.balance = checkFloat(balanceClient.balance + object.paid)
                        await balanceClient.save()
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