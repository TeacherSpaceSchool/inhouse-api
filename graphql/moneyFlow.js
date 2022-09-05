const MoneyFlow = require('../models/moneyFlow');
const BalanceClient = require('../models/balanceClient');
const Cashbox = require('../models/cashbox');
const BalanceCashboxDay = require('../models/balanceCashboxDay');
const History = require('../models/history');
const Doc = require('../models/doc');
const Order = require('../models/order');
const Sale = require('../models/sale');
const Store = require('../models/store');
const Installment = require('../models/installment');
const Client = require('../models/client');
const User = require('../models/user');
const MoneyRecipient = require('../models/moneyRecipient');
const MoneyArticle = require('../models/moneyArticle');
const Reservation = require('../models/reservation');
const Refund = require('../models/refund');
const {setGridInstallment} = require('./installment');
const {saveFile, deleteFile, urlMain, checkFloat, pdDDMMYYYY, checkDate} = require('../module/const');
const {setBalanceCashboxDay} = require('../module/balanceCashboxDay');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const numberToWord = require('../module/numberToWord');
const randomstring = require('randomstring');
const operations = {'приход': 1, 'расход': 2}
const currencies = {'сом': 0, 'доллар': 1, 'рубль': 2, 'тенге': 3, 'юань': 4}

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
    unloadMoneyFlows(search: String, store: ID, client: ID, order: ID, installment: ID, sale: ID, reservation: ID, refund: ID, cashbox: ID, employment: ID, moneyRecipient: ID, moneyArticle: ID, operation: String, currency: String, dateStart: Date, dateEnd: Date): String
    getRKO(_id: ID!): String
    getPKO(_id: ID!): String
    moneyFlows(search: String, store: ID, skip: Int, installment: ID, order: ID, sale: ID, reservation: ID, refund: ID, cashbox: ID, client: ID, employment: ID, moneyRecipient: ID, moneyArticle: ID, operation: String, currency: String, dateStart: Date, dateEnd: Date): [MoneyFlow]
    moneyFlowsCount(search: String, store: ID, client: ID, order: ID, installment: ID, sale: ID, reservation: ID, refund: ID, cashbox: ID, employment: ID, moneyRecipient: ID, moneyArticle: ID, operation: String, currency: String, dateStart: Date, dateEnd: Date): [[String]]
`;

const mutation = `
    uploadMoneyFlow(document: Upload!): String
    addMoneyFlow(installment: ID, installmentMonth: Date, exchangeRate: Float!, amountEnd: Float!, client: ID, employment: ID, order: ID, sale: ID, reservation: ID, refund: ID, cashboxRecipient: ID, cashbox: ID!, moneyRecipient: ID, moneyArticle: ID!, operation: String!, info: String!, amount: Float!, currency: String!, date: Date!): MoneyFlow
    setMoneyFlow(_id: ID!, info: String, clearRecipient: Boolean, amount: Float, moneyArticle: ID, exchangeRate: Float, amountEnd: Float, client: ID, employment: ID, installment: ID, installmentMonth: Date, order: ID, sale: ID, reservation: ID, refund: ID, cashboxRecipient: ID, moneyRecipient: ID): String
    deleteMoneyFlow(_id: ID!): String
`;

const resolvers = {
    unloadMoneyFlows: async(parent, {search, store, order, sale, installment, reservation, refund, client, cashbox, employment, moneyRecipient, moneyArticle, operation, currency, dateStart, dateEnd}, {user}) => {
        if(['admin', 'управляющий', 'кассир', 'менеджер', 'менеджер/завсклад', 'юрист'].includes(user.role)) {
            if(user.store) store = user.store
            dateStart = checkDate(dateStart)
            dateStart.setHours(0, 0, 0, 0)
            if(dateEnd)
                dateEnd = new Date(dateEnd)
            else {
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            dateEnd.setHours(0, 0, 0, 0)
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
                    del: {$ne: true},
                    ...employment?{employment}:{},
                    ...cashbox?[{cashbox}, {cashboxRecipient: cashbox}]:[],
                    ...dateStart||client||'юрист'===user.role?{$and: [
                        ...dateStart?[
                            {date: {$gte: dateStart}},
                            {date: {$lt: dateEnd}}
                        ]:[],
                        ...client?[{client}]:[],
                        ...'юрист'===user.role?[{client: {$ne: null}}]:[],
                    ]}:{},
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
            let count = [[res.length], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]]
            for(let i = 0; i < res.length; i++) {
                count[operations[res[i].operation]][currencies[res[i].currency]] = checkFloat(count[operations[res[i].operation]][currencies[res[i].currency]] + res[i].amount)
            }
            let startBalanceCashboxDay = await BalanceCashboxDay.find({
                ...store?{store} : {},
                date: dateStart,
                ...cashbox?{cashbox}:{}
            })
                .select('cashbox startBalance endBalance')
                .populate({
                    path: 'cashbox',
                    select: 'name _id'
                })
                .lean()
            let endBalanceCashboxDay
            if(dateEnd) {
                dateEnd.setDate(dateEnd.getDate()-1)
                endBalanceCashboxDay = await BalanceCashboxDay.find({
                    ...store?{store} : {},
                    date: dateEnd,
                    ...cashbox?{cashbox}:{}
                })
                    .select('cashbox startBalance endBalance')
                    .populate({
                        path: 'cashbox',
                        select: 'name _id'
                    })
                    .lean()
            }
            else
                endBalanceCashboxDay = [...startBalanceCashboxDay]
            let balanceCashboxDay = {}, amount
            for(let i = 0; i < startBalanceCashboxDay.length; i++) {
                cashbox = startBalanceCashboxDay[i].cashbox._id
                if(!balanceCashboxDay[cashbox])
                    balanceCashboxDay[cashbox] = {
                        name: startBalanceCashboxDay[i].cashbox.name,
                        startBalance: {'сом': 0, 'доллар': 0, 'рубль': 0, 'тенге': 0, 'юань': 0},
                        endBalance: {'сом': 0, 'доллар': 0, 'рубль': 0, 'тенге': 0, 'юань': 0}
                    }
                for(let i1=0; i1<startBalanceCashboxDay[i].startBalance.length; i1++) {
                    currency = startBalanceCashboxDay[i].startBalance[i1].currency
                    amount = startBalanceCashboxDay[i].startBalance[i1].amount
                    balanceCashboxDay[cashbox].startBalance[currency] = amount
                }
            }
            for(let i = 0; i < endBalanceCashboxDay.length; i++) {
                cashbox = endBalanceCashboxDay[i].cashbox._id
                if(!balanceCashboxDay[cashbox])
                    balanceCashboxDay[cashbox] = {
                        name: endBalanceCashboxDay[i].cashbox.name,
                        startBalance: {'сом': 0, 'доллар': 0, 'рубль': 0, 'тенге': 0, 'юань': 0},
                        endBalance: {'сом': 0, 'доллар': 0, 'рубль': 0, 'тенге': 0, 'юань': 0}
                    }
                for(let i1=0; i1<endBalanceCashboxDay[i].endBalance.length; i1++) {
                    currency = endBalanceCashboxDay[i].endBalance[i1].currency
                    amount = endBalanceCashboxDay[i].endBalance[i1].amount
                    balanceCashboxDay[cashbox].endBalance[currency] = amount
                }
            }
            balanceCashboxDay = Object.values(balanceCashboxDay)
            for(let i = 0; i < balanceCashboxDay.length; i++) {
                count[3+i] = [
                    balanceCashboxDay[i].name,
                    `${balanceCashboxDay[i].startBalance['сом']}→${balanceCashboxDay[i].endBalance['сом']}`,
                    `${balanceCashboxDay[i].startBalance['доллар']}→${balanceCashboxDay[i].endBalance['доллар']}`,
                    `${balanceCashboxDay[i].startBalance['рубль']}→${balanceCashboxDay[i].endBalance['рубль']}`,
                    `${balanceCashboxDay[i].startBalance['тенге']}→${balanceCashboxDay[i].endBalance['тенге']}`,
                    `${balanceCashboxDay[i].startBalance['юань']}→${balanceCashboxDay[i].endBalance['юань']}`
                ]
            }
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Выгрузка');
            let row = 1
            worksheet.getRow(row).getCell(1).font = {bold: true};
            worksheet.getRow(row).getCell(1).value = 'Всего'
            worksheet.getRow(row).getCell(2).value = count[0][0]
            row += 1
            worksheet.getRow(row).getCell(1).font = {bold: true};
            worksheet.getRow(row).getCell(1).value = 'Приход'
            worksheet.getRow(row).getCell(2).value = `сом: ${count[1][0]}`
            worksheet.getRow(row).getCell(3).value = `доллар: ${count[1][1]}`
            worksheet.getRow(row).getCell(4).value = `рубль: ${count[1][2]}`
            worksheet.getRow(row).getCell(5).value = `тенге: ${count[1][3]}`
            worksheet.getRow(row).getCell(6).value = `юань: ${count[1][4]}`
            row += 1
            worksheet.getRow(row).getCell(1).font = {bold: true};
            worksheet.getRow(row).getCell(1).value = 'Расход'
            worksheet.getRow(row).getCell(2).value = `сом: ${count[2][0]}`
            worksheet.getRow(row).getCell(3).value = `доллар: ${count[2][1]}`
            worksheet.getRow(row).getCell(4).value = `рубль: ${count[2][2]}`
            worksheet.getRow(row).getCell(5).value = `тенге: ${count[2][3]}`
            worksheet.getRow(row).getCell(6).value = `юань: ${count[2][4]}`
            for(let i = 3; i < 10; i++) {
                if(count[i]){
                    row += 1
                    worksheet.getRow(row).getCell(1).font = {bold: true};
                    worksheet.getRow(row).getCell(1).value = count[i][0]
                    worksheet.getRow(row).getCell(2).value = `сом: ${count[i][1]}`
                    worksheet.getRow(row).getCell(3).value = `доллар: ${count[i][2]}`
                    worksheet.getRow(row).getCell(4).value = `рубль: ${count[i][3]}`
                    worksheet.getRow(row).getCell(5).value = `тенге: ${count[i][4]}`
                    worksheet.getRow(row).getCell(6).value = `юань: ${count[i][5]}`
                }
            }
            row += 2
            worksheet.getColumn(1).width = 15
            worksheet.getRow(row).getCell(1).font = {bold: true};
            worksheet.getRow(row).getCell(1).value = 'Дата/Номер'
            worksheet.getColumn(2).width = 25
            worksheet.getRow(row).getCell(2).font = {bold: true};
            worksheet.getRow(row).getCell(2).value = 'Касса'
            worksheet.getColumn(3).width = 25
            worksheet.getRow(row).getCell(3).font = {bold: true};
            worksheet.getRow(row).getCell(3).value = 'Получатель'
            worksheet.getColumn(4).width = 25
            worksheet.getRow(row).getCell(4).font = {bold: true};
            worksheet.getRow(row).getCell(4).value = 'Статья'
            worksheet.getColumn(5).width = 15
            worksheet.getRow(row).getCell(5).font = {bold: true};
            worksheet.getRow(row).getCell(5).value = 'Сумма'
            worksheet.getRow(row).getCell(6).font = {bold: true};
            worksheet.getRow(row).getCell(6).value = 'Валюта'
            worksheet.getRow(row).getCell(7).font = {bold: true};
            worksheet.getRow(row).getCell(7).value = 'Курс'
            worksheet.getRow(row).getCell(8).font = {bold: true};
            worksheet.getColumn(8).width = 15
            worksheet.getRow(row).getCell(8).value = 'Итого'
            worksheet.getRow(row).getCell(9).font = {bold: true};
            worksheet.getRow(row).getCell(9).value = 'Коментарий'
            for(let i = 0; i < res.length; i++) {
                row += 1
                worksheet.getRow(row).getCell(1).value = `${pdDDMMYYYY(res[i].date)}/${res[i].number}`
                worksheet.getRow(row).getCell(2).alignment = {wrapText: true}
                worksheet.getRow(row).getCell(2).value = res[i].cashbox.name
                worksheet.getRow(row).getCell(3).alignment = {wrapText: true}
                if(res[i].client) {
                    worksheet.getRow(row).getCell(3).value = res[i].client.name
                    if(res[i].sale)
                        worksheet.getRow(row).getCell(3).value += `\nПродажа №${res[i].sale.number}`
                    else if(res[i].refund)
                        worksheet.getRow(row).getCell(3).value += `\nВозврат №${res[i].refund.number}`
                    else if(res[i].reservation)
                        worksheet.getRow(row).getCell(3).value += `\nБронь №${res[i].reservation.number}`
                    else if(res[i].order)
                        worksheet.getRow(row).getCell(3).value += `\nНа заказ №${res[i].order.number}`
                    if(res[i].installment) {
                        worksheet.getRow(row).height = 60
                        worksheet.getRow(row).getCell(3).value += `\nРассрочка №${res[i].installment.number}`
                        worksheet.getRow(row).getCell(3).value += `\n${pdDDMMYYYY(res[i].installmentMonth)}`
                    }
                }
                else if(res[i].moneyRecipient)
                    worksheet.getRow(row).getCell(3).value = res[i].moneyRecipient.name
                else if(res[i].employment)
                    worksheet.getRow(row).getCell(3).value = res[i].employment.name
                else if(res[i].cashboxRecipient)
                    worksheet.getRow(row).getCell(3).value = res[i].cashboxRecipient.name
                else
                    worksheet.getRow(row).getCell(3).value = 'не указан'
                worksheet.getRow(row).getCell(4).value = res[i].moneyArticle.name
                worksheet.getRow(row).getCell(5).value = checkFloat(`${res[i].operation==='расход'?'-':''}${res[i].amount}`)
                worksheet.getRow(row).getCell(6).value = res[i].currency
                worksheet.getRow(row).getCell(7).value = res[i].exchangeRate
                worksheet.getRow(row).getCell(8).value = checkFloat(`${res[i].operation==='расход'?'-':''}${res[i].amountEnd}`)
                worksheet.getRow(row).getCell(9).value = res[i].info
            }
            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
    getRKO: async(parent, {_id}, {user}) => {
        if(['admin', 'управляющий', 'кассир', 'менеджер', 'менеджер/завсклад', 'юрист'].includes(user.role)) {
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
            worksheet.getRow(20).getCell(8).value = moneyFlow.amountEnd;
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
            worksheet.getRow(29).getCell(3).value = await numberToWord(moneyFlow.amountEnd, 'all')
            date = new Date()
            worksheet.getRow(35).getCell(3).value = `${date.getDate()<10?'0':''}${date.getDate()}.${date.getMonth()<9?'0':''}${date.getMonth()+1}.${date.getFullYear()}`
            let xlsxname = `РКО-${moneyFlow.number}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname

        }
    },
    getPKO: async(parent, {_id}, {user}) => {
        if(['admin', 'управляющий', 'кассир', 'менеджер', 'менеджер/завсклад', 'юрист'].includes(user.role)) {
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
            let float = (moneyFlow.amountEnd.toString().split('.'))[1]
            worksheet.getRow(13).getCell(43).value = moneyFlow.number
            worksheet.getRow(13).getCell(55).value = `${date.getDate()<10?'0':''}${date.getDate()}.${date.getMonth()<9?'0':''}${date.getMonth()+1}.${date.getFullYear()}`
            worksheet.getRow(19).getCell(41).value = moneyFlow.amountEnd;
            worksheet.getRow(21).getCell(11).value = moneyFlow.client?moneyFlow.client.name:
                moneyFlow.moneyRecipient?moneyFlow.moneyRecipient.name:
                    moneyFlow.employment?moneyFlow.employment.name:
                        moneyFlow.cashboxRecipient?moneyFlow.cashboxRecipient.name:'не указан'
            worksheet.getRow(23).getCell(11).value = moneyFlow.moneyArticle.name
            worksheet.getRow(25).getCell(8).value = await numberToWord(moneyFlow.amountEnd)
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
            worksheet.getRow(19).getCell(81).value = moneyFlow.amountEnd;
            worksheet.getRow(21).getCell(75).value = await numberToWord(moneyFlow.amountEnd)
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
    moneyFlows: async(parent, {search, store, order, installment, sale, reservation, refund, skip, cashbox, client, employment, moneyRecipient, moneyArticle, operation, currency, dateStart, dateEnd}, {user}) => {
        if(['admin', 'управляющий', 'кассир', 'менеджер', 'менеджер/завсклад', 'юрист'].includes(user.role)) {
            if(user.store) store = user.store
            if (dateStart) {
                dateStart = new Date(dateStart)
                dateStart.setHours(0, 0, 0, 0)
                if(dateEnd)
                    dateEnd = new Date(dateEnd)
                else {
                    dateEnd = new Date(dateStart)
                    dateEnd.setDate(dateEnd.getDate() + 1)
                }
                dateEnd.setHours(0, 0, 0, 0)
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
                    del: {$ne: true},
                    ...employment?{employment}:{},
                    ...cashbox?[{cashbox}, {cashboxRecipient: cashbox}]:[],
                    ...dateStart||client||'юрист'===user.role?{$and: [
                        ...dateStart?[
                            {date: {$gte: dateStart}},
                            {date: {$lt: dateEnd}}
                        ]:[],
                        ...client?[{client}]:[],
                        ...'юрист'===user.role?[{client: {$ne: null}}]:[],
                    ]}:{},
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
                return res
            }
            else return []
        }
    },
    moneyFlowsCount: async(parent, {search, store, order, sale, installment, reservation, refund, client, cashbox, employment, moneyRecipient, moneyArticle, operation, currency, dateStart, dateEnd}, {user}) => {
        if(['admin', 'управляющий', 'кассир', /*'менеджер', 'менеджер/завсклад', */'юрист'].includes(user.role)) {
            if(user.store) store = user.store
            dateStart = checkDate(dateStart)
            dateStart.setHours(0, 0, 0, 0)
            if(dateEnd)
                dateEnd = new Date(dateEnd)
            else {
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            dateEnd.setHours(0, 0, 0, 0)
            if(!['менеджер', 'менеджер/завсклад'].includes(user.role)||order||installment||sale||reservation||refund) {
                let moneyFlows = await MoneyFlow.find({
                    ...search?{number: search}:{},
                    ...store?{store}:{},
                    ...installment?{installment}:{},
                    ...order?{order}:{},
                    ...sale?{sale}:{},
                    ...reservation?{reservation}:{},
                    ...refund?{refund}:{},
                    del: {$ne: true},
                    ...employment?{employment}:{},
                    ...cashbox?[{cashbox}, {cashboxRecipient: cashbox}]:[],
                    ...dateStart||client||'юрист'===user.role?{$and: [
                        ...dateStart?[
                            {date: {$gte: dateStart}},
                            {date: {$lt: dateEnd}}
                        ]:[],
                        ...client?[{client}]:[],
                        ...'юрист'===user.role?[{client: {$ne: null}}]:[],
                    ]}:{},
                    ...moneyRecipient?{moneyRecipient}:{},
                    ...moneyArticle?{moneyArticle}:{},
                    ...operation?{operation}:{},
                    ...currency?{currency}:{},
                })
                    .select('operation amount currency date')
                    .lean()
                let res = [[moneyFlows.length], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]]
                for(let i = 0; i < moneyFlows.length; i++) {
                    res[operations[moneyFlows[i].operation]][currencies[moneyFlows[i].currency]] = checkFloat(res[operations[moneyFlows[i].operation]][currencies[moneyFlows[i].currency]] + moneyFlows[i].amount)
                }
                let startBalanceCashboxDay = await BalanceCashboxDay.find({
                    ...store?{store} : {},
                    date: dateStart,
                    ...cashbox?{cashbox}:{}
                })
                    .select('cashbox startBalance endBalance')
                    .populate({
                        path: 'cashbox',
                        select: 'name _id'
                    })
                    .lean()
                let endBalanceCashboxDay
                if(dateEnd) {
                    dateEnd.setDate(dateEnd.getDate()-1)
                    endBalanceCashboxDay = await BalanceCashboxDay.find({
                        ...store?{store} : {},
                        date: dateEnd,
                        ...cashbox?{cashbox}:{}
                    })
                        .select('cashbox startBalance endBalance')
                        .populate({
                            path: 'cashbox',
                            select: 'name _id'
                        })
                        .lean()
                }
                else
                    endBalanceCashboxDay = [...startBalanceCashboxDay]
                let balanceCashboxDay = {}, amount
                for(let i = 0; i < startBalanceCashboxDay.length; i++) {
                    cashbox = startBalanceCashboxDay[i].cashbox._id
                    if(!balanceCashboxDay[cashbox])
                        balanceCashboxDay[cashbox] = {
                            name: startBalanceCashboxDay[i].cashbox.name,
                            startBalance: {'сом': 0, 'доллар': 0, 'рубль': 0, 'тенге': 0, 'юань': 0},
                            endBalance: {'сом': 0, 'доллар': 0, 'рубль': 0, 'тенге': 0, 'юань': 0}
                        }
                    for(let i1=0; i1<startBalanceCashboxDay[i].startBalance.length; i1++) {
                        currency = startBalanceCashboxDay[i].startBalance[i1].currency
                        amount = startBalanceCashboxDay[i].startBalance[i1].amount
                        balanceCashboxDay[cashbox].startBalance[currency] = amount
                    }
                }
                for(let i = 0; i < endBalanceCashboxDay.length; i++) {
                    cashbox = endBalanceCashboxDay[i].cashbox._id
                    if(!balanceCashboxDay[cashbox])
                        balanceCashboxDay[cashbox] = {
                            name: endBalanceCashboxDay[i].cashbox.name,
                            startBalance: {'сом': 0, 'доллар': 0, 'рубль': 0, 'тенге': 0, 'юань': 0},
                            endBalance: {'сом': 0, 'доллар': 0, 'рубль': 0, 'тенге': 0, 'юань': 0}
                        }
                    for(let i1=0; i1<endBalanceCashboxDay[i].endBalance.length; i1++) {
                        currency = endBalanceCashboxDay[i].endBalance[i1].currency
                        amount = endBalanceCashboxDay[i].endBalance[i1].amount
                        balanceCashboxDay[cashbox].endBalance[currency] = amount
                    }
                }
                balanceCashboxDay = Object.values(balanceCashboxDay)
                for(let i = 0; i < balanceCashboxDay.length; i++) {
                    res[3+i] = [
                        balanceCashboxDay[i].name,
                        `${balanceCashboxDay[i].startBalance['сом']}→${balanceCashboxDay[i].endBalance['сом']}`,
                        balanceCashboxDay[i].startBalance['доллар']!=0||balanceCashboxDay[i].endBalance['доллар']!=0?`${balanceCashboxDay[i].startBalance['доллар']}→${balanceCashboxDay[i].endBalance['доллар']}`:'',
                        balanceCashboxDay[i].startBalance['рубль']!=0||balanceCashboxDay[i].endBalance['рубль']!=0?`${balanceCashboxDay[i].startBalance['рубль']}→${balanceCashboxDay[i].endBalance['рубль']}`:'',
                        balanceCashboxDay[i].startBalance['тенге']!=0||balanceCashboxDay[i].endBalance['тенге']!=0?`${balanceCashboxDay[i].startBalance['тенге']}→${balanceCashboxDay[i].endBalance['тенге']}`:'',
                        balanceCashboxDay[i].startBalance['юань']!=0||balanceCashboxDay[i].endBalance['юань']!=0?`${balanceCashboxDay[i].startBalance['юань']}→${balanceCashboxDay[i].endBalance['юань']}`:''
                    ]
                }
                return res
            }
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
            let rowNumber = 1, row
            while(true) {
                let object, cashbox, client, cashboxRecipient, moneyRecipient, employment, store, date, moneyArticle, clearRecipient
                row = worksheet.getRow(rowNumber);
                if(row.getCell(8).value) {
                    if(row.getCell(3).value)
                        store = (await Store.findOne({name: row.getCell(3).value}).select('_id').lean())._id
                    if(row.getCell(4).value)
                        cashbox = await Cashbox.findOne({name: row.getCell(4).value}).select('_id balance store').lean()
                    if(row.getCell(5).value==='клиент')
                        client = (await Client.findOne({name: row.getCell(6).value}).select('_id').lean())._id
                    else if(row.getCell(5).value==='сотрудник')
                        employment = (await User.findOne({name: row.getCell(6).value, store}).select('_id').lean())._id
                    else if(row.getCell(5).value==='касса')
                        cashboxRecipient = (await Cashbox.findOne({name: row.getCell(6).value, store}).lean())._id
                    else if(row.getCell(5).value==='получатель денег')
                        moneyRecipient = (await MoneyRecipient.findOne({name: row.getCell(6).value}).select('_id').lean())._id
                    else
                        clearRecipient = true
                    if(row.getCell(7).value)
                        moneyArticle = (await MoneyArticle.findOne({name: row.getCell(7).value}).select('_id').lean())._id

                    date = row.getCell(2).value.split('.')
                    date = checkDate(`${date[1]}.${date[0]}.${date[2]}`)
                    date.setHours(0, 0, 0, 0)

                    if(row.getCell(1).value) {
                        object = await MoneyFlow.findOne({
                            number: checkFloat(row.getCell(1).value),
                            date
                        })
                        if(object) {
                            let history = new History({
                                who: user._id,
                                where: object._id,
                                what: ''
                            });
                            if (clearRecipient||client||employment||cashboxRecipient||moneyRecipient) {
                                //удаляем старые оплаты баланса
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
                                    let client = await BalanceClient.findOne({client: object.client})
                                    if (object.operation === 'приход')
                                        client.balance = checkFloat(client.balance - object.amountEnd)
                                    else
                                        client.balance = checkFloat(client.balance + object.amountEnd)
                                    await client.save()
                                }
                                object.client = client?client:null
                                object.employment = employment?employment:null
                                object.order = null
                                object.sale = null
                                object.reservation = null
                                object.refund = null
                                object.cashboxRecipient = cashboxRecipient?cashboxRecipient:null
                                object.moneyRecipient = moneyRecipient?moneyRecipient:null
                                object.installment = null
                                object.installmentMonth = null
                                //добавляем новые оплаты баланса

                                if(cashboxRecipient) {
                                    let index = undefined
                                    cashboxRecipient = await Cashbox.findOne({_id: cashboxRecipient}).select('_id balance').lean()
                                    for (let i = 0; i < cashboxRecipient.balance.length; i++) {
                                        if (cashboxRecipient.balance[i].currency === object.currency) {
                                            index = i
                                            break
                                        }
                                    }
                                    if (index === undefined) {
                                        if (object.operation === 'приход')
                                            cashboxRecipient.balance = [
                                                {
                                                    currency: object.currency,
                                                    amount: -object.amount
                                                },
                                                ...cashboxRecipient.balance
                                            ]
                                        else
                                            cashboxRecipient.balance = [
                                                {
                                                    currency: object.currency,
                                                    amount: object.amount
                                                },
                                                ...cashboxRecipient.balance
                                            ]
                                    }
                                    else {
                                        if (object.operation === 'приход')
                                            cashboxRecipient.balance[index].amount = checkFloat(cashboxRecipient.balance[index].amount - object.amount)
                                        else
                                            cashboxRecipient.balance[index].amount = checkFloat(cashboxRecipient.balance[index].amount + object.amount)
                                    }
                                    await Cashbox.updateOne({_id: cashboxRecipient._id}, {balance: cashboxRecipient.balance})
                                }

                                if(client){
                                    client = await BalanceClient.findOne({client})
                                    if (object.operation === 'приход')
                                        client.balance = checkFloat(client.balance + object.amountEnd)
                                    else
                                        client.balance = checkFloat(client.balance - object.amountEnd)
                                    await client.save()
                                }

                            }

                            if (row.getCell(12).value&&object.info!==row.getCell(12).value) {
                                history.what = `Комментарий:${object.info}→${row.getCell(12).value};\n`
                                object.info = row.getCell(12).value
                            }
                            if(row.getCell(9).value) {
                                let amount = checkFloat(row.getCell(9).value)
                                if (object.amount!=amount) {

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
                                    await setBalanceCashboxDay({cashbox: cashbox._id, newAmount: amount, oldAmount: object.amount, currency: object.currency, operation: object.operation, date: object.date})

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
                            }
                            if (
                                moneyArticle&&
                                object.moneyArticle.toString()!==moneyArticle.toString()
                            ) {
                                history.what = 'Статья;\n'
                                object.moneyArticle = moneyArticle
                            }
                            if (row.getCell(11).value) {
                                let exchangeRate = checkFloat(row.getCell(11).value)
                                if(object.currency==='сом')
                                    exchangeRate = 1
                                if(object.exchangeRate!==exchangeRate) {
                                    history.what = `${history.what}Курс:${object.exchangeRate}→${exchangeRate};\n`
                                    object.exchangeRate = exchangeRate
                                }
                            }
                            let amountEnd = checkFloat(object.exchangeRate*object.amount)
                            if (object.amountEnd!==amountEnd) {

                                if(object.installment)
                                    setGridInstallment({_id: object.installment, newAmount: amountEnd, oldAmount: object.amountEnd, month: object.installmentMonth, type: '+', user})

                                if(object.client){
                                    let client = await BalanceClient.findOne({client: object.client})
                                    if (object.operation === 'приход')
                                        client.balance = checkFloat(client.balance-object.amountEnd+amountEnd)
                                    else
                                        client.balance = checkFloat(client.balance+object.amountEnd-amountEnd)
                                    await client.save()
                                }

                                history.what = `${history.what}Итого:${object.amountEnd}→${amountEnd};`
                                object.amountEnd = amountEnd

                            }
                            await object.save();
                            await History.create(history)
                        }
                    }
                    else if(
                        !row.getCell(1).value&&
                        store&&
                        date&&
                        cashbox&&
                        moneyArticle&&
                        row.getCell(8).value&&(['приход', 'расход'].includes(row.getCell(8).value))&&
                        row.getCell(9).value&&
                        row.getCell(10).value&&(['сом', 'доллар', 'рубль', 'тенге', 'юань'].includes(row.getCell(10).value))&&
                        row.getCell(11).value
                    ){
                        let number = await MoneyFlow.findOne({date}).select('number').sort('-createdAt').lean()
                        number = checkFloat(number?number.number:0) + 1
                        let operation = row.getCell(8).value
                        let amount = checkFloat(row.getCell(9).value)
                        let currency = row.getCell(10).value
                        let exchangeRate = checkFloat(row.getCell(11).value)
                        if(currency==='сом')
                            exchangeRate = 1
                        let amountEnd = checkFloat(exchangeRate*amount)
                        object = new MoneyFlow({
                            number,
                            store: cashbox.store,
                            cashbox: cashbox._id,
                            client: client,
                            employment: employment,
                            moneyRecipient: moneyRecipient,
                            cashboxRecipient: cashboxRecipient,
                            moneyArticle,
                            operation,
                            currency,
                            info: row.getCell(12).value,
                            amount,
                            exchangeRate,
                            amountEnd,
                            date
                        });

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
                        await setBalanceCashboxDay({cashbox: cashbox._id, newAmount: amount, oldAmount: 0, currency, operation, date})
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
                            client = await BalanceClient.findOne({client})
                            if (operation === 'приход')
                                client.balance = checkFloat(client.balance + amountEnd)
                            else
                                client.balance = checkFloat(client.balance - amountEnd)
                            await client.save()
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
            let number = await MoneyFlow.findOne({date}).select('number').sort('-createdAt').lean()
            number = checkFloat(number?number.number:0) + 1
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
            await setBalanceCashboxDay({cashbox: cashbox._id, newAmount: amount, oldAmount: 0, currency, operation, date})

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
                client = await BalanceClient.findOne({client})
                if (operation === 'приход')
                    client.balance = checkFloat(client.balance + amountEnd)
                else
                    client.balance = checkFloat(client.balance - amountEnd)
                await client.save()
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
    setMoneyFlow: async(parent, {_id, info, clearRecipient, amount, exchangeRate, amountEnd, moneyArticle, installment, installmentMonth, client, employment, order, sale, reservation, refund, cashboxRecipient, moneyRecipient}, {user}) => {
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

                if (clearRecipient||client||employment||order||sale||reservation||refund||cashboxRecipient||moneyRecipient) {
                    //удаляем старые оплаты баланса
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
                        let client = await BalanceClient.findOne({client: object.client})
                        if (object.operation === 'приход')
                            client.balance = checkFloat(client.balance - object.amountEnd)
                        else
                            client.balance = checkFloat(client.balance + object.amountEnd)
                        await client.save()
                    }
                    object.client = client?client:null
                    object.employment = employment?employment:null
                    object.order = order?order:null
                    object.sale = sale?sale:null
                    object.reservation = reservation?reservation:null
                    object.refund = refund?refund:null
                    object.cashboxRecipient = cashboxRecipient?cashboxRecipient:null
                    object.moneyRecipient = moneyRecipient?moneyRecipient:null
                    object.installment = installment?installment:null
                    object.installmentMonth = installmentMonth?installmentMonth:null
                    //добавляем новые оплаты баланса
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
                            await setGridInstallment({_id: installmentObject._id, newAmount: object.amountEnd, oldAmount: 0, month: installmentObject.grid[0].month, type: '+', user})
                            object.installment = installmentObject._id
                            object.installmentMonth = installmentObject.grid[0].month
                        }
                        saleObject.paymentConfirmation = true
                        await saleObject.save()
                    }
                    else if(installment)
                        await setGridInstallment({_id: installment, newAmount: object.amountEnd, oldAmount: 0, month: installmentMonth, type: '+', user})

                    if(cashboxRecipient) {
                        let index = undefined
                        cashboxRecipient = await Cashbox.findOne({_id: cashboxRecipient}).select('_id balance').lean()
                        for (let i = 0; i < cashboxRecipient.balance.length; i++) {
                            if (cashboxRecipient.balance[i].currency === object.currency) {
                                index = i
                                break
                            }
                        }
                        if (index === undefined) {
                            if (object.operation === 'приход')
                                cashboxRecipient.balance = [
                                    {
                                        currency: object.currency,
                                        amount: -object.amount
                                    },
                                    ...cashboxRecipient.balance
                                ]
                            else
                                cashboxRecipient.balance = [
                                    {
                                        currency: object.currency,
                                        amount: object.amount
                                    },
                                    ...cashboxRecipient.balance
                                ]
                        }
                        else {
                            if (object.operation === 'приход')
                                cashboxRecipient.balance[index].amount = checkFloat(cashboxRecipient.balance[index].amount - object.amount)
                            else
                                cashboxRecipient.balance[index].amount = checkFloat(cashboxRecipient.balance[index].amount + object.amount)
                        }
                        await Cashbox.updateOne({_id: cashboxRecipient._id}, {balance: cashboxRecipient.balance})
                    }

                    if(client){
                        client = await BalanceClient.findOne({client})
                        if (object.operation === 'приход')
                            client.balance = checkFloat(client.balance + object.amountEnd)
                        else
                            client.balance = checkFloat(client.balance - object.amountEnd)
                        await client.save()
                    }

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
                    await setBalanceCashboxDay({cashbox: cashbox._id, newAmount: amount, oldAmount: object.amount, currency: object.currency, operation: object.operation, date: object.date})

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

                    history.what = `${history.what}Курс:${object.exchangeRate}→${exchangeRate};\n`
                    object.exchangeRate = exchangeRate

                }
                if (amountEnd!=undefined&&object.amountEnd!=amountEnd) {

                    if(object.installment)
                        setGridInstallment({_id: object.installment, newAmount: amountEnd, oldAmount: object.amountEnd, month: object.installmentMonth, type: '+', user})

                    if(object.client){
                        let client = await BalanceClient.findOne({client: object.client})
                        if (object.operation === 'приход')
                            client.balance = checkFloat(client.balance-object.amountEnd+amountEnd)
                        else
                            client.balance = checkFloat(client.balance+object.amountEnd-amountEnd)
                        await client.save()
                    }

                    history.what = `${history.what}Итого:${object.amountEnd}→${amountEnd};\n`
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
                await setBalanceCashboxDay({cashbox: cashbox._id, newAmount: 0, oldAmount: object.amount, currency: object.currency, operation: object.operation, date: object.date})

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
                    let client = await BalanceClient.findOne({client: object.client})
                    if (object.operation === 'приход')
                        client.balance = checkFloat(client.balance - object.amountEnd)
                    else
                        client.balance = checkFloat(client.balance + object.amountEnd)
                    await client.save()
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