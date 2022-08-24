const MoneyFlow = require('../models/moneyFlow');
const BalanceClient = require('../models/balanceClient');
const Cashbox = require('../models/cashbox');
const History = require('../models/history');
const Doc = require('../models/doc');
const Order = require('../models/order');
const Sale = require('../models/sale');
const Installment = require('../models/installment');
const Client = require('../models/client');
const User = require('../models/user');
const MoneyRecipient = require('../models/moneyRecipient');
const MoneyArticle = require('../models/moneyArticle');
const Reservation = require('../models/reservation');
const Refund = require('../models/refund');
const {setGridInstallment} = require('./installment');
const {saveFile, deleteFile, urlMain, checkFloat, pdDDMMYYYY, checkDate} = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const numberToWord = require('../module/numberToWord');
const randomstring = require('randomstring');

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
    exchangeRate: Float
    amountEnd: Float
    currency: String
    number: String
    date: Date
    order: Order
    sale: Sale
    installment: Installment
    installmentMonth: Date
    reservation: Reservation
    refund: Refund
  }
`;

const query = `
    unloadMoneyFlows(search: String, store: ID, client: ID, order: ID, installment: ID, sale: ID, reservation: ID, refund: ID, cashbox: ID, employment: ID, moneyRecipient: ID, moneyArticle: ID, operation: String, currency: String, date: Date): String
    getRKO(_id: ID!): String
    getPKO(_id: ID!): String
    moneyFlows(search: String, store: ID, skip: Int, installment: ID, order: ID, sale: ID, reservation: ID, refund: ID, cashbox: ID, client: ID, employment: ID, moneyRecipient: ID, moneyArticle: ID, operation: String, currency: String, date: Date): [MoneyFlow]
    moneyFlowsCount(search: String, store: ID, client: ID, order: ID, installment: ID, sale: ID, reservation: ID, refund: ID, cashbox: ID, employment: ID, moneyRecipient: ID, moneyArticle: ID, operation: String, currency: String, date: Date): Int
`;

const mutation = `
    uploadMoneyFlow(document: Upload!): String
    addMoneyFlow(installment: ID, installmentMonth: Date, exchangeRate: Float!, amountEnd: Float!, client: ID, employment: ID, order: ID, sale: ID, reservation: ID, refund: ID, cashboxRecipient: ID, cashbox: ID!, moneyRecipient: ID, moneyArticle: ID!, operation: String!, info: String!, amount: Float!, currency: String!, date: Date!): MoneyFlow
    setMoneyFlow(_id: ID!, info: String, amount: Float, moneyArticle: ID, exchangeRate: Float, amountEnd: Float): String
    deleteMoneyFlow(_id: ID!): String
`;

const resolvers = {
    unloadMoneyFlows: async(parent, {search, store, order, sale, installment, reservation, refund, client, cashbox, employment, moneyRecipient, moneyArticle, operation, currency, date}, {user}) => {
        if(['admin', 'управляющий', 'кассир', 'менеджер', 'менеджер/завсклад'].includes(user.role)) {
            if(user.store) store = user.store
            let dateStart, dateEnd
            if (date) {
                dateStart = new Date(date)
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            let res
            if(!['менеджер', 'менеджер/завсклад'].includes(user.role)||order||installment||sale||reservation||refund)
                res = await MoneyFlow.find({
                    ...search?{number: search}:{},
                    ...store?{store}:{},
                    ...installment?{installment}:{},
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
            else
                res = []
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Выгрузка');
            worksheet.getColumn(2).width = 15
            worksheet.getColumn(3).width = 40
            worksheet.getColumn(4).width = 40
            worksheet.getColumn(5).width = 40
            worksheet.getRow(1).getCell(1).font = {bold: true};
            worksheet.getRow(1).getCell(1).value = '_id'
            worksheet.getRow(1).getCell(2).font = {bold: true};
            worksheet.getRow(1).getCell(2).value = 'Дата'
            worksheet.getRow(1).getCell(3).font = {bold: true};
            worksheet.getRow(1).getCell(3).value = 'Касса'
            worksheet.getRow(1).getCell(4).font = {bold: true};
            worksheet.getRow(1).getCell(4).value = 'Получатель'
            worksheet.getRow(1).getCell(5).font = {bold: true};
            worksheet.getRow(1).getCell(5).value = 'Статья'
            worksheet.getRow(1).getCell(6).font = {bold: true};
            worksheet.getRow(1).getCell(6).value = 'Сумма'
            worksheet.getRow(1).getCell(7).font = {bold: true};
            worksheet.getRow(1).getCell(7).value = 'Валюта'
            worksheet.getRow(1).getCell(8).font = {bold: true};
            worksheet.getRow(1).getCell(8).value = 'Коментарий'
            for(let i = 0; i < res.length; i++) {
                worksheet.getRow(i+2).getCell(1).value = `${res[i]._id.toString()}`
                worksheet.getRow(i+2).getCell(2).value = `${pdDDMMYYYY(res[i].date)}/${res[i].number}`
                worksheet.getRow(i+2).getCell(3).alignment = {wrapText: true}
                worksheet.getRow(i+2).getCell(3).value = `${res[i].cashbox.name}\n${res[i].cashbox._id.toString()}`
                worksheet.getRow(i+2).getCell(4).alignment = {wrapText: true}
                if(res[i].client) {
                    worksheet.getRow(i+2).getCell(4).value = `${res[i].client.name}\n${res[i].client._id.toString()}`
                    if(res[i].sale)
                        worksheet.getRow(i+2).getCell(4).value += `\nПродажа №${res[i].sale.number}\n${res[i].sale._id.toString()}`
                    else if(res[i].refund)
                        worksheet.getRow(i+2).getCell(4).value += `\nВозврат №${res[i].refund.number}\n${res[i].refund._id.toString()}`
                    else if(res[i].reservation)
                        worksheet.getRow(i+2).getCell(4).value += `\nБронь №${res[i].reservation.number}\n${res[i].reservation._id.toString()}`
                    else if(res[i].order)
                        worksheet.getRow(i+2).getCell(4).value += `\nНа заказ №${res[i].order.number}\n${res[i].order._id.toString()}`
                    if(res[i].installment) {
                        worksheet.getRow(i+2).height = 60
                        worksheet.getRow(i+2).getCell(4).value += `\nРассрочка №${res[i].installment.number}\n${res[i].installment._id.toString()}`
                        worksheet.getRow(i+2).getCell(4).value += `\n${pdDDMMYYYY(res[i].installmentMonth)}`
                    }
                }
                else if(res[i].moneyRecipient)
                    worksheet.getRow(i+2).getCell(4).value = `${res[i].moneyRecipient.name}\n${res[i].moneyRecipient._id.toString()}`
                else if(res[i].employment)
                    worksheet.getRow(i+2).getCell(4).value = `${res[i].employment.name}\n${res[i].employment._id.toString()}`
                else if(res[i].cashboxRecipient)
                    worksheet.getRow(i+2).getCell(4).value = `${res[i].cashboxRecipient.name}\n${res[i].cashboxRecipient._id.toString()}`
                else
                    worksheet.getRow(i+2).getCell(4).value = 'не указан'
                worksheet.getRow(i+2).getCell(5).alignment = {wrapText: true}
                worksheet.getRow(i+2).getCell(5).value = `${res[i].moneyArticle.name}\n${res[i].moneyArticle._id.toString()}`
                worksheet.getRow(i+2).getCell(6).value = `${res[i].operation==='расход'?'-':''}${res[i].amount}`
                worksheet.getRow(i+2).getCell(7).value = res[i].currency
                worksheet.getRow(i+2).getCell(8).value = res[i].info
            }
            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
    getRKO: async(parent, {_id}, {user}) => {
        if(['admin', 'управляющий', 'кассир', 'менеджер', 'менеджер/завсклад'].includes(user.role)) {
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
            let RKOfile = path.join(app.dirname, 'docs', 'RKO.xlsx');
            let workbook = new ExcelJS.Workbook();
            workbook = await workbook.xlsx.readFile(RKOfile);
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
        if(['admin', 'управляющий', 'кассир', 'менеджер', 'менеджер/завсклад'].includes(user.role)) {
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
    moneyFlows: async(parent, {search, store, order, installment, sale, reservation, refund, skip, cashbox, client, employment, moneyRecipient, moneyArticle, operation, currency, date}, {user}) => {
        if(['admin', 'управляющий', 'кассир', 'менеджер', 'менеджер/завсклад'].includes(user.role)) {
            if(user.store) store = user.store
            let dateStart, dateEnd
            if (date) {
                dateStart = new Date(date)
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            if(!['менеджер', 'менеджер/завсклад'].includes(user.role)||order||installment||sale||reservation||refund) {
                let res = await MoneyFlow.find({
                    ...search?{number: search}:{},
                    ...store?{store}:{},
                    ...installment?{installment}:{},
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
                console.log(res)
                return res
            }
            else return []
        }
    },
    moneyFlowsCount: async(parent, {search, store, order, sale, installment, reservation, refund, client, cashbox, employment, moneyRecipient, moneyArticle, operation, currency, date}, {user}) => {
        if(['admin', 'управляющий', 'кассир', 'менеджер', 'менеджер/завсклад'].includes(user.role)) {
            if(user.store) store = user.store
            let dateStart, dateEnd
            if (date) {
                dateStart = new Date(date)
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            if(!['менеджер', 'менеджер/завсклад'].includes(user.role)||order||installment||sale||reservation||refund)
                return await MoneyFlow.countDocuments({
                    ...search?{number: search}:{},
                    ...store?{store}:{},
                    ...installment?{installment}:{},
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
            else return 0
        }
    }
};

const resolversMutation = {
    uploadMoneyFlow: async(parent, { document }, {user}) => {
        if(['admin', 'кассир'].includes(user.role)) {
            let {createReadStream, filename} = await document;
            let stream = createReadStream()
            filename = await saveFile(stream, filename);
            let xlsxpath = path.join(app.dirname, 'public', filename);
            let workbook = new ExcelJS.Workbook();
            workbook = await workbook.xlsx.readFile(xlsxpath);
            let worksheet = workbook.worksheets[0];
            let rowNumber = 1, row, _id, object
            while(true) {
                row = worksheet.getRow(rowNumber);
                if(row.getCell(8).value) {
                    if(row.getCell(3).value&&row.getCell(3).value.split('|')[1]) {
                        row.getCell(3).value = row.getCell(3).value.split('|')[1]
                    }
                    if(row.getCell(4).value&&row.getCell(4).value.split('|')[1]) {
                        row.getCell(4).value = row.getCell(4).value.split('|')[1]
                    }
                    if(row.getCell(5).value&&row.getCell(5).value.split('|')[1]) {
                        row.getCell(5).value = row.getCell(5).value.split('|')[1]
                    }
                    if(row.getCell(7).value&&row.getCell(7).value.split('|')[1]) {
                        row.getCell(7).value = row.getCell(7).value.split('|')[1]
                    }
                    _id = row.getCell(1).value
                    if(_id) {
                        object = await MoneyFlow.findById(_id)
                        if(object) {
                            let history = new History({
                                who: user._id,
                                where: object._id,
                                what: ''
                            });
                            if (row.getCell(11).value&&object.info!==row.getCell(11).value) {
                                history.what = `Комментарий:${object.info}→${row.getCell(11).value};\n`
                                object.info = row.getCell(11).value
                            }
                            if(row.getCell(9).value) {
                                let amount = checkFloat(row.getCell(9).value)
                                if (object.amount!=amount) {

                                    if(object.installment)
                                        setGridInstallment({_id: object.installment, newAmount: amount, oldAmount: object.amount, month: object.installmentMonth, type: '+', user})

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
                            }
                            await object.save();
                            await History.create(history)
                        }
                    }
                    else if(
                        row.getCell(2).value&&
                        row.getCell(3).value&&(await Cashbox.findById(row.getCell(3).value).select('_id').lean())&&
                        row.getCell(4).value&&(
                            (await Client.findById(row.getCell(4).value).select('_id').lean())||
                            (await User.findById(row.getCell(4).value).select('_id').lean())||
                            (await Cashbox.findById(row.getCell(4).value).select('_id').lean())||
                            (await MoneyRecipient.findById(row.getCell(4).value).select('_id').lean())
                        )&&
                        (!row.getCell(5).value||((await Client.findById(row.getCell(4).value).select('_id').lean())&&(
                            (await Sale.findById(row.getCell(5).value).select('_id').lean())||
                            (await Order.findById(row.getCell(5).value).select('_id').lean())||
                            (await Reservation.findById(row.getCell(5).value).select('_id').lean())||
                            (await Refund.findById(row.getCell(5).value).select('_id').lean())||
                            (await Installment.findById(row.getCell(5).value).select('_id').lean())
                        )))&&
                        (!(await Installment.findById(row.getCell(5).value).select('_id').lean())||row.getCell(6).value)&&
                        row.getCell(7).value&&(await MoneyArticle.findById(row.getCell(7).value).select('_id').lean())&&
                        row.getCell(8).value&&(['приход', 'расход'].includes(row.getCell(8).value))&&
                        row.getCell(9).value&&
                        row.getCell(10).value&&(['сом', 'доллар', 'рубль', 'тенге', 'юань'].includes(row.getCell(10).value))&&
                        row.getCell(11).value
                    ){
                        if((await Client.findById(row.getCell(4).value).select('_id').lean()))
                            row.getCell(10).value = 'сом'
                        let date = row.getCell(2).value.split('.')
                        date = checkDate(`${date[1]}.${date[0]}.${date[2]}`)
                        date.setHours(0, 0, 0, 0)
                        let cashbox = await Cashbox.findById(row.getCell(3).value).select('_id balance store').lean()
                        let number = await MoneyFlow.findOne().sort('-createdAt').select('number').lean()
                        number = (number?checkFloat(number.number):0) + 1
                        let client = await Client.findById(row.getCell(4).value).select('_id').lean()
                        let employment = await User.findById(row.getCell(4).value).select('_id').lean()
                        let cashboxRecipient = await Cashbox.findById(row.getCell(4).value).select('_id').lean()
                        let moneyRecipient = await MoneyRecipient.findById(row.getCell(4).value).select('_id').lean()
                        let order = await Order.findById(row.getCell(5).value).select('_id').lean()
                        let sale = await Sale.findById(row.getCell(5).value).select('_id').lean()
                        let reservation = await Reservation.findById(row.getCell(5).value).select('_id').lean()
                        let refund = await Refund.findById(row.getCell(5).value).select('_id').lean()
                        let installment = await Installment.findById(row.getCell(5).value).select('_id grid').lean()
                        let installmentMonth
                        if(row.getCell(6).value) {
                            installmentMonth = row.getCell(6).value.split('.')
                            installmentMonth = new Date(`${installmentMonth[1]}.${installmentMonth[0]}.${installmentMonth[2]}`)
                            installmentMonth.setHours(0, 0, 0, 0)
                        }
                        if(installment) {
                            let installmentMonths = []
                            for(let i=0; i<installment.grid.length; i++) {
                                installmentMonths.push(installment.grid[i].month)
                            }
                            if(!installmentMonths.includes(installmentMonth))
                                return 'ERROR'
                        }
                        let amount = checkFloat(row.getCell(9).value)
                        let operation = row.getCell(8).value
                        let currency = row.getCell(10).value
                        let object = new MoneyFlow({
                            number,
                            store: cashbox.store,
                            installment: installment?installment._id:null,
                            installmentMonth,
                            order: order?order._id:null,
                            sale: sale?sale._id:null,
                            reservation: reservation?reservation._id:null,
                            refund: refund?refund._id:null,
                            client: client?client._id:null,
                            employment: employment?employment._id:null,
                            moneyRecipient: moneyRecipient?moneyRecipient._id:null,
                            cashboxRecipient: cashboxRecipient?cashboxRecipient._id:null,
                            moneyArticle: row.getCell(7).value,
                            cashbox: cashbox._id,
                            operation,
                            currency,
                            info: row.getCell(11).value,
                            amount,
                            date
                        });

                        if(order&&operation==='приход')
                            await Order.updateOne({_id: order}, {paymentConfirmation: true})
                        else if(reservation&&operation==='приход')
                            await Reservation.updateOne({_id: reservation}, {paymentConfirmation: true})
                        else if(refund&&operation==='расход')
                            await Refund.updateOne({_id: refund}, {paymentConfirmation: true})
                        else if(sale&&operation==='приход') {
                            let saleObject = await Sale.findById(sale)
                            if(saleObject.installment) {
                                let installmentObject = await Installment.findById(saleObject.installment).lean()
                                await setGridInstallment({_id: installmentObject._id, newAmount: amount, oldAmount: 0, month: installmentObject.grid[0].month, type: '+', user})
                                object.installment = installmentObject._id
                                object.installmentMonth = installmentObject.grid[0].month
                            }
                            saleObject.paymentConfirmation = true
                            await saleObject.save()
                        }
                        else if(installment&&operation==='приход')
                            await setGridInstallment({_id: installment, newAmount: amount, oldAmount: 0, month: installmentMonth, type: '+', user})

                        object = await MoneyFlow.create(object)

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
                    }
                    rowNumber++
                }
                else break
            }
            await deleteFile(filename)
            return 'OK'
        }
        return 'ERROR'
    },
    addMoneyFlow: async(parent, {installment, installmentMonth, order, exchangeRate, amountEnd, sale, reservation, refund, client, employment, cashboxRecipient, cashbox, moneyRecipient, moneyArticle, operation, info, amount, currency, date}, {user}) => {
        if(['admin', 'кассир'].includes(user.role)) {
            date = new Date(date)
            date.setHours(0, 0, 0, 0)
            cashbox = await Cashbox.findOne({_id: cashbox}).select('_id balance store').lean()
            let number = await MoneyFlow.findOne().sort('-createdAt').select('number').lean()
            number = (number?checkFloat(number.number):0) + 1
            let object = new MoneyFlow({
                number,
                store: cashbox.store,
                installment,
                installmentMonth,
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
                date,
                exchangeRate,
                amountEnd
            });

            if(order)
                await Order.updateOne({_id: order}, {paymentConfirmation: true})
            else if(reservation)
                await Reservation.updateOne({_id: reservation}, {paymentConfirmation: true})
            else if(refund)
                await Refund.updateOne({_id: refund}, {paymentConfirmation: true})
            else if(sale) {
                let saleObject = await Sale.findById(sale)
                if(saleObject.installment) {
                    let installmentObject = await Installment.findById(saleObject.installment).lean()
                    await setGridInstallment({_id: installmentObject._id, newAmount: amountEnd, oldAmount: 0, month: installmentObject.grid[0].month, type: '+', user})
                    object.installment = installmentObject._id
                    object.installmentMonth = installmentObject.grid[0].month
                }
                saleObject.paymentConfirmation = true
                await saleObject.save()
            }
            else if(installment)
                await setGridInstallment({_id: installment, newAmount: amountEnd, oldAmount: 0, month: installmentMonth, type: '+', user})

            object = await MoneyFlow.create(object)

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
                                amount: amountEnd
                            },
                            ...client.balance
                        ]
                    else
                        client.balance = [
                            {
                                currency,
                                amount: -amountEnd
                            },
                            ...client.balance
                        ]
                }
                else {
                    if (operation === 'приход')
                        client.balance[index].amount = checkFloat(client.balance[index].amount + amountEnd)
                    else
                        client.balance[index].amount = checkFloat(client.balance[index].amount - amountEnd)
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
                .populate({
                    path: 'installment',
                    select: '_id number'
                })
                .lean()
        }
        return {_id: 'ERROR'}
    },
    setMoneyFlow: async(parent, {_id, info, amount, exchangeRate, amountEnd, moneyArticle}, {user}) => {
        if(['admin', 'кассир'].includes(user.role)) {
            let object = await MoneyFlow.findById(_id)
            if(object) {
                let history = new History({
                    who: user._id,
                    where: object._id,
                    what: ''
                });
                if (info&&object.info!==info) {
                    history.what = `Комментарий:${object.info}→${info};\n`
                    object.info = info
                }
                if (moneyArticle&&object.moneyArticle.toString()!==moneyArticle.toString()) {
                    history.what = 'Статья;\n'
                    object.moneyArticle = moneyArticle
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

                    history.what = `${history.what}Сумма:${object.amount}→${amount};`
                    object.amount = amount

                }
                if (exchangeRate!=undefined&&object.exchangeRate!=exchangeRate) {

                    history.what = `${history.what}Курс:${object.exchangeRate}→${exchangeRate};`
                    object.exchangeRate = exchangeRate

                }
                if (amountEnd!=undefined&&object.amountEnd!=amountEnd) {

                    if(object.installment)
                        setGridInstallment({_id: object.installment, newAmount: amountEnd, oldAmount: object.amountEnd, month: object.installmentMonth, type: '+', user})

                    if(object.client){
                        let client = await BalanceClient.findOne({client: object.client}).select('_id balance').lean()
                        for(let i=0; i<client.balance.length; i++) {
                            if (client.balance[i].currency === object.currency) {
                                if (object.operation === 'приход')
                                    client.balance[i].amount = checkFloat(client.balance[i].amount-object.amountEnd+amountEnd)
                                else
                                    client.balance[i].amount = checkFloat(client.balance[i].amount+object.amountEnd-amountEnd)
                                break
                            }
                        }
                        await BalanceClient.updateOne({_id: client._id}, {balance: client.balance})
                    }

                    history.what = `${history.what}Итого:${object.amountEnd}→${amountEnd};`
                    object.amountEnd = amountEnd

                }
                await object.save();
                await History.create(history)
                return 'OK'
            }
        }
        return 'ERROR'
    },
    deleteMoneyFlow: async(parent, { _id }, {user}) => {
        if(['admin', 'кассир'].includes(user.role)) {
            let object = await MoneyFlow.findOne({_id})
            if(object) {

                if(object.order)
                    await Order.updateOne({_id: object.order}, {paymentConfirmation: false})
                else if(object.reservation)
                    await Reservation.updateOne({_id: object.reservation}, {paymentConfirmation: false})
                else if(object.refund)
                    await Refund.updateOne({_id: object.refund}, {paymentConfirmation: false})
                else if(object.sale)
                    await Sale.updateOne({_id: object.sale}, {paymentConfirmation: false})
                if(object.installment)
                    setGridInstallment({_id: object.installment, newAmount: object.amountEnd, oldAmount: 0, month: object.installmentMonth, type: '-', user})

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
                                client.balance[i].amount = checkFloat(client.balance[i].amount - object.amountEnd)
                            else
                                client.balance[i].amount = checkFloat(client.balance[i].amount + object.amountEnd)
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