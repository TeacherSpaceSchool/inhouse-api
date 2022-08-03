const MoneyFlow = require('../models/moneyFlow');
const BalanceClient = require('../models/balanceClient');
const Cashbox = require('../models/cashbox');
const History = require('../models/history');
const Doc = require('../models/doc');
const Order = require('../models/order');
const Sale = require('../models/sale');
const Reservation = require('../models/reservation');
const Refund = require('../models/refund');
const {urlMain, checkFloat} = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const numberToWord = require('../module/numberToWord');

const type = `
  type MoneyFlow {
    _id: ID
    createdAt: Date
    client: Client
    cashbox: Cashbox
    cashboxRecipient: Cashbox
    employment: User
    moneyRecipient: MoneyRecipient
    moneyArticle: MoneyArticle
    operation: String
    info: String
    amount: Float
    currency: String
    number: String
    date: Date
    order: Order
    sale: Sale
    installment: Installment
    reservation: Reservation
    refund: Refund
  }
`;

const query = `
    getRKO(_id: ID!): String
    getPKO(_id: ID!): String
    moneyFlows(store: ID, skip: Int, order: ID, sale: ID, reservation: ID, refund: ID, cashbox: ID, client: ID, employment: ID, moneyRecipient: ID, moneyArticle: ID, operation: String, currency: String, date: Date): [MoneyFlow]
    moneyFlowsCount(store: ID, client: ID, order: ID, sale: ID, reservation: ID, refund: ID, cashbox: ID, employment: ID, moneyRecipient: ID, moneyArticle: ID, operation: String, currency: String, date: Date): Int
`;

const mutation = `
    addMoneyFlow(installment: ID, client: ID, employment: ID, order: ID, sale: ID, reservation: ID, refund: ID, cashboxRecipient: ID, cashbox: ID!, moneyRecipient: ID, moneyArticle: ID!, operation: String!, info: String!, amount: Float!, currency: String!, date: Date!): MoneyFlow
    setMoneyFlow(_id: ID!, info: String, amount: Float): String
    deleteMoneyFlow(_id: ID!): String
`;

const resolvers = {
    getRKO: async(parent, {_id}, {user}) => {
        if(['admin'].includes(user.role)) {
            let moneyFlow = await MoneyFlow.findById(_id)
                .populate({
                    path: 'client',
                    select: '_id name'
                })
                .populate({
                    path: 'cashbox',
                    select: '_id name'
                })
                .populate({
                    path: 'employment',
                    select: '_id name'
                })
                .populate({
                    path: 'moneyRecipient',
                    select: '_id name'
                })
                .populate({
                    path: 'moneyArticle',
                    select: '_id name'
                })
                .populate({
                    path: 'cashboxRecipient',
                    select: '_id name'
                })
                .populate({
                    path: 'order',
                    select: '_id number'
                })
                .populate({
                    path: 'sale',
                    select: '_id number'
                })
                .populate({
                    path: 'reservation',
                    select: '_id number'
                })
                .populate({
                    path: 'refund',
                    select: '_id number'
                })
                .populate({
                    path: 'installment',
                    select: '_id number'
                })
                .lean()
            let PKOfile = path.join(app.dirname, 'docs', 'RKO.xlsx');
            let workbook = new ExcelJS.Workbook();
            workbook = await workbook.xlsx.readFile(PKOfile);
            let worksheet = workbook.getWorksheet('РКО');
            let doc = await Doc.findOne({}).select('name').lean()
            worksheet.getRow(9).getCell(2).value = doc?doc.name:'InHouse'
            let date = new Date(moneyFlow.createdAt)
            worksheet.getRow(14).getCell(11).value = moneyFlow.number
            worksheet.getRow(14).getCell(12).value = `${date.getDate()<10?'0':''}${date.getDate()}.${date.getMonth()<9?'0':''}${date.getMonth()+1}.${date.getFullYear()}`
            worksheet.getRow(20).getCell(8).value = moneyFlow.amount;
            worksheet.getRow(22).getCell(3).value = moneyFlow.client?moneyFlow.client.name:
                moneyFlow.moneyRecipient?moneyFlow.moneyRecipient.name:
                    moneyFlow.employment?moneyFlow.employment.name:
                        moneyFlow.cashboxRecipient?moneyFlow.cashboxRecipient.name:'не указан'
            worksheet.getRow(24).getCell(3).value = moneyFlow.moneyArticle.name
            worksheet.getRow(26).getCell(4).value = moneyFlow.sale?`Продажа №${moneyFlow.sale.number}`:
                moneyFlow.refund?`Возврат №${moneyFlow.refund.number}`:
                    moneyFlow.reservation?`Бронь №${moneyFlow.reservation.number}`:
                        moneyFlow.order?`На заказ №${moneyFlow.order.number}`:
                            moneyFlow.installment?`Рассрочка №${moneyFlow.installment.number}`:''
            worksheet.getRow(29).getCell(3).value = await numberToWord(moneyFlow.amount, 'all')
            date = new Date()
            worksheet.getRow(35).getCell(3).value = `${date.getDate()<10?'0':''}${date.getDate()}.${date.getMonth()<9?'0':''}${date.getMonth()+1}.${date.getFullYear()}`
            let xlsxname = `РКО-${moneyFlow.number}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname

        }
    },
    getPKO: async(parent, {_id}, {user}) => {
        if(['admin'].includes(user.role)) {
            let moneyFlow = await MoneyFlow.findById(_id)
                .populate({
                    path: 'client',
                    select: '_id name'
                })
                .populate({
                    path: 'cashbox',
                    select: '_id name'
                })
                .populate({
                    path: 'employment',
                    select: '_id name'
                })
                .populate({
                    path: 'moneyRecipient',
                    select: '_id name'
                })
                .populate({
                    path: 'moneyArticle',
                    select: '_id name'
                })
                .populate({
                    path: 'cashboxRecipient',
                    select: '_id name'
                })
                .populate({
                    path: 'order',
                    select: '_id number'
                })
                .populate({
                    path: 'sale',
                    select: '_id number'
                })
                .populate({
                    path: 'reservation',
                    select: '_id number'
                })
                .populate({
                    path: 'refund',
                    select: '_id number'
                })
                .populate({
                    path: 'installment',
                    select: '_id number'
                })
                .lean()
            let PKOfile = path.join(app.dirname, 'docs', 'PKO.xlsx');
            let workbook = new ExcelJS.Workbook();
            workbook = await workbook.xlsx.readFile(PKOfile);
            let worksheet = workbook.getWorksheet('ПКО');
            let doc = await Doc.findOne({}).select('name').lean()
            worksheet.getRow(7).getCell(1).value = doc?doc.name:'InHouse'
            worksheet.getRow(3).getCell(75).value = doc?doc.name:'InHouse'
            let date = new Date(moneyFlow.createdAt)
            let float = (moneyFlow.amount.toString().split('.'))[1]
            worksheet.getRow(13).getCell(43).value = moneyFlow.number
            worksheet.getRow(13).getCell(55).value = `${date.getDate()<10?'0':''}${date.getDate()}.${date.getMonth()<9?'0':''}${date.getMonth()+1}.${date.getFullYear()}`
            worksheet.getRow(19).getCell(41).value = moneyFlow.amount;
            worksheet.getRow(21).getCell(11).value = moneyFlow.client?moneyFlow.client.name:
                moneyFlow.moneyRecipient?moneyFlow.moneyRecipient.name:
                    moneyFlow.employment?moneyFlow.employment.name:
                        moneyFlow.cashboxRecipient?moneyFlow.cashboxRecipient.name:'не указан'
            worksheet.getRow(23).getCell(11).value = moneyFlow.moneyArticle.name
            worksheet.getRow(25).getCell(8).value = await numberToWord(moneyFlow.amount)
            worksheet.getRow(30).getCell(12).value = moneyFlow.sale?`Продажа №${moneyFlow.sale.number}`:
                moneyFlow.refund?`Возврат №${moneyFlow.refund.number}`:
                    moneyFlow.reservation?`Бронь №${moneyFlow.reservation.number}`:
                        moneyFlow.order?`На заказ №${moneyFlow.order.number}`:
                            moneyFlow.installment?`Рассрочка №${moneyFlow.installment.number}`:''
            worksheet.getRow(10).getCell(79).value = `${date.getDate()<10?'0':''}${date.getDate()}`
            worksheet.getRow(10).getCell(85).value = `${date.getMonth()<9?'0':''}${date.getMonth()+1}`
            worksheet.getRow(10).getCell(101).value = date.getFullYear()
            worksheet.getRow(12).getCell(84).value = moneyFlow.client?moneyFlow.client.name:
                moneyFlow.moneyRecipient?moneyFlow.moneyRecipient.name:
                    moneyFlow.employment?moneyFlow.employment.name:
                        moneyFlow.cashboxRecipient?moneyFlow.cashboxRecipient.name:'не указан'
            worksheet.getRow(15).getCell(75).value = moneyFlow.moneyArticle.name
            worksheet.getRow(19).getCell(81).value = moneyFlow.amount;
            worksheet.getRow(21).getCell(75).value = await numberToWord(moneyFlow.amount)
            worksheet.getRow(27).getCell(55).value = float?float:'0'
            worksheet.getRow(19).getCell(103).value = float?float:'0'
            worksheet.getRow(24).getCell(103).value = float?float:'0'
            worksheet.getRow(9).getCell(102).value = moneyFlow.number
            let xlsxname = `ПКО-${moneyFlow.number}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname

        }
    },
    moneyFlows: async(parent, {store, order, sale, reservation, refund, skip, cashbox, client, employment, moneyRecipient, moneyArticle, operation, currency, date}, {user}) => {
        if(['admin'].includes(user.role)) {
            if(user.store) store = user.store
            let dateStart, dateEnd
            if (date) {
                dateStart = new Date(date)
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            return await MoneyFlow.find({
                ...store?{store}:{},
                ...order?{order}:{},
                ...sale?{sale}:{},
                ...reservation?{reservation}:{},
                ...refund?{refund}:{},
                ...date?{$and: [{date: {$gte: dateStart}}, {date: {$lt: dateEnd}}]}:{},
                del: {$ne: true},
                ...cashbox?{$or: [{cashbox}, {cashboxRecipient: cashbox}]}:{},
                ...employment?{employment}:{},
                ...client?{client}:{},
                ...moneyRecipient?{moneyRecipient}:{},
                ...moneyArticle?{moneyArticle}:{},
                ...operation?{operation}:{},
                ...currency?{currency}:{},
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort('-date')
                .sort('-createdAt')
                .populate({
                    path: 'client',
                    select: '_id name'
                })
                .populate({
                    path: 'cashbox',
                    select: '_id name'
                })
                .populate({
                    path: 'employment',
                    select: '_id name'
                })
                .populate({
                    path: 'moneyRecipient',
                    select: '_id name'
                })
                .populate({
                    path: 'moneyArticle',
                    select: '_id name'
                })
                .populate({
                    path: 'cashboxRecipient',
                    select: '_id name'
                })
                .populate({
                    path: 'order',
                    select: '_id number'
                })
                .populate({
                    path: 'sale',
                    select: '_id number'
                })
                .populate({
                    path: 'reservation',
                    select: '_id number'
                })
                .populate({
                    path: 'refund',
                    select: '_id number'
                })
                .populate({
                    path: 'installment',
                    select: '_id number'
                })
                .lean()
        }
    },
    moneyFlowsCount: async(parent, {store, order, sale, reservation, refund, client, cashbox, employment, moneyRecipient, moneyArticle, operation, currency, date}, {user}) => {
        if(['admin'].includes(user.role)) {
            if(user.store) store = user.store
            let dateStart, dateEnd
            if (date) {
                dateStart = new Date(date)
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            return await MoneyFlow.countDocuments({
                ...store?{store}:{},
                ...order?{order}:{},
                ...sale?{sale}:{},
                ...reservation?{reservation}:{},
                ...refund?{refund}:{},
                ...date?{$and: [{date: {$gte: dateStart}}, {date: {$lt: dateEnd}}]}:{},
                del: {$ne: true},
                ...cashbox?{$or: [{cashbox}, {cashboxRecipient: cashbox}]}:{},
                ...employment?{employment}:{},
                ...client?{client}:{},
                ...moneyRecipient?{moneyRecipient}:{},
                ...moneyArticle?{moneyArticle}:{},
                ...operation?{operation}:{},
                ...currency?{currency}:{},
            })
                .lean()
        }
    }
};

const resolversMutation = {
    addMoneyFlow: async(parent, {installment, order, sale, reservation, refund, client, employment, cashboxRecipient, cashbox, moneyRecipient, moneyArticle, operation, info, amount, currency, date}, {user}) => {
        if(['admin'].includes(user.role)) {
            date = new Date(date)
            date.setHours(5, 0, 0, 0)
            cashbox = await Cashbox.findOne({_id: cashbox}).select('_id balance store').lean()
            let object = new MoneyFlow({
                number: (await MoneyFlow.countDocuments({}).lean())+1,
                store: cashbox.store,
                order,
                sale,
                reservation,
                refund,
                client,
                employment,
                moneyRecipient,
                cashboxRecipient,
                moneyArticle,
                cashbox: cashbox._id,
                operation,
                info,
                amount,
                currency,
                date
            });
            object = await MoneyFlow.create(object)

            if(order)
                await Order.updateOne({_id: order}, {paymentConfirmation: true})
            else if(reservation)
                await Reservation.updateOne({_id: reservation}, {paymentConfirmation: true})
            else if(refund)
                await Refund.updateOne({_id: refund}, {paymentConfirmation: true})
            else if(sale)
                await Sale.updateOne({_id: sale}, {paymentConfirmation: true})


            let index = undefined
            for(let i=0; i<cashbox.balance.length; i++) {
                if (cashbox.balance[i].currency === currency) {
                    index = i
                    break
                }
            }
            if(index===undefined) {
                if (operation === 'приход')
                    cashbox.balance = [
                        {
                            currency,
                            amount
                        },
                        ...cashbox.balance
                    ]
                else
                    cashbox.balance = [
                        {
                            currency,
                            amount: -amount
                        },
                        ...cashbox.balance
                    ]
            }
            else {
                if (operation === 'приход')
                    cashbox.balance[index].amount = checkFloat(cashbox.balance[index].amount + amount)
                else
                    cashbox.balance[index].amount = checkFloat(cashbox.balance[index].amount - amount)
            }
            await Cashbox.updateOne({_id: cashbox._id}, {balance: cashbox.balance})

            if(cashboxRecipient) {
                index = undefined
                cashboxRecipient = await Cashbox.findOne({_id: cashboxRecipient}).select('_id balance').lean()
                for (let i = 0; i < cashboxRecipient.balance.length; i++) {
                    if (cashboxRecipient.balance[i].currency === currency) {
                        index = i
                        break
                    }
                }
                if (index === undefined) {
                    if (operation === 'приход')
                        cashboxRecipient.balance = [
                            {
                                currency,
                                amount: -amount
                            },
                            ...cashboxRecipient.balance
                        ]
                    else
                        cashboxRecipient.balance = [
                            {
                                currency,
                                amount
                            },
                            ...cashboxRecipient.balance
                        ]
                }
                else {
                    if (operation === 'приход')
                        cashboxRecipient.balance[index].amount = checkFloat(cashboxRecipient.balance[index].amount - amount)
                    else
                        cashboxRecipient.balance[index].amount = checkFloat(cashboxRecipient.balance[index].amount + amount)
                }
                await Cashbox.updateOne({_id: cashboxRecipient._id}, {balance: cashboxRecipient.balance})
            }

            if(client){
                index = undefined
                client = await BalanceClient.findOne({client}).select('_id balance').lean()
                for(let i=0; i<client.balance.length; i++) {
                    if (client.balance[i].currency === currency) {
                        index = i
                        break
                    }
                }
                if(index===undefined) {
                    if (operation === 'приход')
                        client.balance = [
                            {
                                currency,
                                amount
                            },
                            ...client.balance
                        ]
                    else
                        client.balance = [
                            {
                                currency,
                                amount: -amount
                            },
                            ...client.balance
                        ]
                }
                else {
                    if (operation === 'приход')
                        client.balance[index].amount = checkFloat(client.balance[index].amount + amount)
                    else
                        client.balance[index].amount = checkFloat(client.balance[index].amount - amount)
                }
                await BalanceClient.updateOne({_id: client._id}, {balance: client.balance})
            }

            let history = new History({
                who: user._id,
                where: object._id,
                what: 'Создание'
            });
            await History.create(history)
            return await MoneyFlow.findById(object._id)
                .populate({
                    path: 'client',
                    select: '_id name'
                })
                .populate({
                    path: 'cashbox',
                    select: '_id name'
                })
                .populate({
                    path: 'employment',
                    select: '_id name'
                })
                .populate({
                    path: 'moneyRecipient',
                    select: '_id name'
                })
                .populate({
                    path: 'moneyArticle',
                    select: '_id name'
                })
                .populate({
                    path: 'cashboxRecipient',
                    select: '_id name'
                })
                .populate({
                    path: 'order',
                    select: '_id number'
                })
                .populate({
                    path: 'sale',
                    select: '_id number'
                })
                .populate({
                    path: 'reservation',
                    select: '_id number'
                })
                .populate({
                    path: 'refund',
                    select: '_id number'
                })
                .lean()
        }
        return {_id: 'ERROR'}
    },
    setMoneyFlow: async(parent, {_id, info, amount}, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await MoneyFlow.findById(_id)
            if(object) {
                let history = new History({
                    who: user._id,
                    where: object._id,
                    what: ''
                });
                if (info&&object.info!==info) {
                    history.what = `Информация:${object.info}→${info};\n`
                    object.info = info
                }
                if (amount!=undefined&&object.amount!=amount) {

                    let cashbox = await Cashbox.findOne({_id: object.cashbox}).select('_id balance').lean()
                    for(let i=0; i<cashbox.balance.length; i++) {
                        if (cashbox.balance[i].currency === object.currency) {
                            if (object.operation === 'приход')
                                cashbox.balance[i].amount = checkFloat(cashbox.balance[i].amount-object.amount+amount)
                            else
                                cashbox.balance[i].amount = checkFloat(cashbox.balance[i].amount+object.amount-amount)
                            break
                        }
                    }
                    await Cashbox.updateOne({_id: cashbox._id}, {balance: cashbox.balance})

                    if(object.cashboxRecipient) {
                        let cashboxRecipient = await Cashbox.findOne({_id: object.cashboxRecipient}).select('_id balance').lean()
                        for (let i = 0; i < cashboxRecipient.balance.length; i++) {
                            if (cashboxRecipient.balance[i].currency === object.currency) {
                                if (object.operation === 'приход')
                                    cashboxRecipient.balance[i].amount = checkFloat(cashboxRecipient.balance[i].amount + object.amount - amount)
                                else
                                    cashboxRecipient.balance[i].amount = checkFloat(cashboxRecipient.balance[i].amount - object.amount + amount)
                                break
                            }
                        }
                        await Cashbox.updateOne({_id: cashboxRecipient._id}, {balance: cashboxRecipient.balance})
                    }

                    if(object.client){
                        let client = await BalanceClient.findOne({client: object.client}).select('_id balance').lean()
                        for(let i=0; i<client.balance.length; i++) {
                            if (client.balance[i].currency === object.currency) {
                                if (object.operation === 'приход')
                                    client.balance[i].amount = checkFloat(client.balance[i].amount-object.amount+amount)
                                else
                                    client.balance[i].amount = checkFloat(client.balance[i].amount+object.amount-amount)
                                break
                            }
                        }
                        await BalanceClient.updateOne({_id: client._id}, {balance: client.balance})
                    }

                    history.what = `${history.what}Сумма:${object.amount}→${amount};`
                    object.amount = amount

                }
                await object.save();
                await History.create(history)
                return 'OK'
            }
        }
        return 'ERROR'
    },
    deleteMoneyFlow: async(parent, { _id }, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await MoneyFlow.findOne({_id})
            if(object) {

                let cashbox = await Cashbox.findOne({_id: object.cashbox}).select('_id balance').lean()
                for(let i=0; i<cashbox.balance.length; i++) {
                    if (cashbox.balance[i].currency === object.currency) {
                        if (object.operation === 'приход')
                            cashbox.balance[i].amount = checkFloat(cashbox.balance[i].amount - object.amount)
                        else
                            cashbox.balance[i].amount = checkFloat(cashbox.balance[i].amount + object.amount)
                        break
                    }
                }
                await Cashbox.updateOne({_id: cashbox._id}, {balance: cashbox.balance})
                if(object.cashboxRecipient) {
                    let cashboxRecipient = await Cashbox.findOne({_id: object.cashboxRecipient}).select('_id balance').lean()
                    for (let i = 0; i < cashboxRecipient.balance.length; i++) {
                        if (cashboxRecipient.balance[i].currency === object.currency) {
                            if (object.operation === 'приход')
                                cashboxRecipient.balance[i].amount = checkFloat(cashboxRecipient.balance[i].amount + object.amount)
                            else
                                cashboxRecipient.balance[i].amount = checkFloat(cashboxRecipient.balance[i].amount - object.amount)
                            break
                        }
                    }
                    await Cashbox.updateOne({_id: cashboxRecipient._id}, {balance: cashboxRecipient.balance})
                }
                if(object.client) {
                    let client = await BalanceClient.findOne({client: object.client}).select('_id balance').lean()
                    for(let i=0; i<client.balance.length; i++) {
                        if (client.balance[i].currency === object.currency) {
                            if (object.operation === 'приход')
                                client.balance[i].amount = checkFloat(client.balance[i].amount - object.amount)
                            else
                                client.balance[i].amount = checkFloat(client.balance[i].amount + object.amount)
                            break
                        }
                    }
                    await BalanceClient.updateOne({_id: client._id}, {balance: client.balance})
                }

                await MoneyFlow.deleteOne({_id})
                await History.deleteMany({where: _id})
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