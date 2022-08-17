const Installment = require('../models/installment');
const Sale = require('../models/sale');
const History = require('../models/history');
const BalanceClient = require('../models/balanceClient');
const {checkFloat, pdDDMMYY, pdDDMMYYYY, urlMain } = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const randomstring = require('randomstring');

const type = `
  type Installment {
    _id: ID
    number: String
    createdAt: Date
    client: Client
    store: Store
    grid: [InstallmentGrid]
    info: String
    status: String
    debt: Float
    paid: Float
    amount: Float
    sale: Sale
    datePaid: Date
  }
  type InstallmentGrid {
    month: Date
    amount: Float
    paid: Float
    datePaid: Date
  }
  input InstallmentGridInput {
    month: Date
    amount: Float
    paid: Float
    datePaid: Date
  }
`;

const query = `
    unloadInstallments(search: String, _id: ID, client: ID, status: String, date: Date, soon: Boolean, late: Boolean, today: Boolean, store: ID): String
    installments(search: String, _id: ID, skip: Int, client: ID, status: String, date: Date, soon: Boolean, late: Boolean, today: Boolean, store: ID): [Installment]
    installmentsCount(search: String, _id: ID, client: ID, status: String, date: Date, soon: Boolean, late: Boolean, today: Boolean, store: ID): Int
`;

const mutation = `
    addInstallment(grid: [InstallmentGridInput]!, currency: String!, renew: Boolean, amount: Float!, client: ID!, sale: ID, debt: Float!, paid: Float!, datePaid: Date!, store: ID!): Installment
    setInstallment(_id: ID!, info: String, status: String): String
`;

const setGridInstallment = async ({_id, newAmount, oldAmount, month, type, user}) => {
    let installment = await Installment.findOne({
        _id,
    }).lean()
    let history = new History({
        who: user._id,
        where: _id
    });
    let paid = 0
    let datePaid
    for (let i = 0; i < installment.grid.length; i++) {
        if(pdDDMMYY(installment.grid[i].month)===pdDDMMYY(month)) {
            history.what = `${pdDDMMYY(installment.grid[i].month)}:${checkFloat(installment.grid[i].paid)}`
            if(type==='-') {
                installment.grid[i].paid = checkFloat(checkFloat(installment.grid[i].paid) + checkFloat(oldAmount) - newAmount)
            }
            else if(type==='+') {
                installment.grid[i].paid = checkFloat(checkFloat(installment.grid[i].paid) - checkFloat(oldAmount) + newAmount)
            }
            else {
                installment.grid[i].paid = newAmount
            }
            history.what = `${history.what}→${installment.grid[i].paid};\n`
        }
    }
    for (let i = 0; i < installment.grid.length; i++) {
        paid = checkFloat(paid + checkFloat(installment.grid[i].paid))
        if(!installment.grid[i].paid&&!datePaid)
            datePaid = installment.grid[i].month
    }
    let debt = checkFloat(installment.amount - paid)
    history.what = `${history.what}Долг:${installment.debt}→${debt};\n`
    history.what = `${history.what}Оплачено:${installment.paid}→${paid};\n`
    await Installment.updateOne({_id}, {debt, paid, datePaid, grid: installment.grid, ...installment.status!=='отмена'?debt<1?{status: 'оплачен'}:{status: 'активна'}:{}})
    await History.create(history)
}

const resolvers = {
    unloadInstallments: async(parent, {search, _id, client, status, late, today, soon, store, date}, {user}) => {
        if(['admin', 'управляющий', 'кассир', 'менеджер', 'менеджер/завсклад', 'юрист'].includes(user.role)) {
            if(user.store) store = user.store
            let managerClients = []
            if(['менеджер', 'менеджер/завсклад'].includes(user.role))
                managerClients = await Sale.find({manager: user._id}).distinct('client').lean()
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
            let res = await Installment.find({
                ...search?{number: search}:{},
                ..._id ? {_id} : {},
                ...client||['менеджер', 'менеджер/завсклад'].includes(user.role) ? {$and: [
                    ...client?[{client}]:[],
                    ...['менеджер', 'менеджер/завсклад'].includes(user.role)?[{client: {$in: managerClients}}]:[]
                ]} : {},
                ...store ? {store} : {},
                ...late? {datePaid: {$lt: date}, status: {$in: ['активна', 'безнадежна']}} :
                    today? {datePaid: date, status: {$in: ['активна', 'безнадежна']}}
                        :
                        {
                            ...status ? {status} : {},
                            ...dateStart?{$and: [{datePaid: {$gte: dateStart}}, {datePaid: {$lt: dateEnd}}]}:{}
                        }
            })
                .sort('-createdAt')
                .populate({
                    path: 'sale',
                    select: 'number _id'
                })
                .populate({
                    path: 'client',
                    select: 'name _id'
                })
                .lean()
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Выгрузка');
            worksheet.getColumn(4).width = 5
            worksheet.getColumn(5).width = 15
            worksheet.getColumn(7).width = 15
            worksheet.getColumn(8).width = 15
            worksheet.getColumn(9).width = 12
            worksheet.getColumn(10).width = 12
            worksheet.getColumn(11).width = 12
            worksheet.getColumn(12).width = 12
            worksheet.getColumn(13).width = 12
            worksheet.getColumn(14).width = 12
            worksheet.getColumn(15).width = 12
            worksheet.getColumn(16).width = 12
            worksheet.getColumn(17).width = 12
            worksheet.getColumn(18).width = 12
            worksheet.getColumn(19).width = 12
            worksheet.getColumn(20).width = 12
            worksheet.getColumn(21).width = 12
            worksheet.getColumn(22).width = 12
            worksheet.getColumn(23).width = 12
            worksheet.getColumn(24).width = 12
            worksheet.getColumn(25).width = 12
            worksheet.getColumn(26).width = 12
            worksheet.getColumn(27).width = 12
            worksheet.getColumn(28).width = 12
            worksheet.getColumn(29).width = 12
            worksheet.getColumn(30).width = 12
            worksheet.getRow(1).getCell(1).font = {bold: true};
            worksheet.getRow(1).getCell(1).value = '№'
            worksheet.getRow(1).getCell(2).font = {bold: true};
            worksheet.getRow(1).getCell(2).value = 'Статус'
            worksheet.getRow(1).getCell(3).font = {bold: true};
            worksheet.getRow(1).getCell(3).value = 'Клиент'
            worksheet.getRow(1).getCell(4).font = {bold: true};
            worksheet.getRow(1).getCell(4).value = 'Комментарий'
            worksheet.getRow(1).getCell(5).font = {bold: true};
            worksheet.getRow(1).getCell(5).value = 'Дата оплаты'
            worksheet.getRow(1).getCell(6).font = {bold: true};
            worksheet.getRow(1).getCell(6).value = 'Долг'
            worksheet.getRow(1).getCell(7).font = {bold: true};
            worksheet.getRow(1).getCell(7).value = 'Сумма оплат'
            worksheet.getRow(1).getCell(8).font = {bold: true};
            worksheet.getRow(1).getCell(8).value = 'График оплат'
            let row = 2
            for(let i = 0; i < res.length; i++) {
                worksheet.getRow(row).getCell(1).value = res[i].number
                worksheet.getRow(row).getCell(2).value = res[i].status
                worksheet.getRow(row).getCell(3).alignment = {wrapText: true}
                worksheet.getRow(row).getCell(3).value = res[i].client.name
                if(res[i].sale) {
                    worksheet.getRow(row).getCell(3).value += `\nПродажа №${res[i].sale.number}`
                    worksheet.getRow(row).getCell(3).value += `\n${res[i].sale._id}`
                }
                worksheet.getRow(row).getCell(4).value = res[i].info
                worksheet.getRow(row).getCell(5).value = pdDDMMYYYY(res[i].datePaid)
                worksheet.getRow(row).getCell(6).value = res[i].debt
                worksheet.getRow(row).getCell(7).alignment = {wrapText: true, horizontal: 'right'}
                worksheet.getRow(row).getCell(7).value = `\n${res[i].amount}\n${res[i].paid}`
                for(let i1 = 0; i1 < res[i].grid.length; i1++) {
                    worksheet.getRow(row).getCell(8+i1).alignment = {wrapText: true, horizontal: 'right'}
                    worksheet.getRow(row).getCell(8+i1).value = `${pdDDMMYYYY(res[i].grid[i1].month)}\n${res[i].grid[i1].amount}\n${res[i].grid[i1].paid}`
                }
                row += 1
            }
            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
    installments: async(parent, {search, _id, skip, client, date, status, late, soon, today, store}, {user}) => {
        if(['admin', 'управляющий', 'кассир', 'менеджер', 'менеджер/завсклад', 'юрист'].includes(user.role)) {
            if(user.store) store = user.store
            let managerClients = []
            if(['менеджер', 'менеджер/завсклад'].includes(user.role))
                managerClients = await Sale.find({manager: user._id}).distinct('client').lean()
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
            let res = await Installment.find({
                ...search?{number: search}:{},
                ..._id ? {_id} : {},
                ...client||['менеджер', 'менеджер/завсклад'].includes(user.role) ? {$and: [
                    ...client?[{client}]:[],
                    ...['менеджер', 'менеджер/завсклад'].includes(user.role)?[{client: {$in: managerClients}}]:[]
                ]} : {},
                ...store ? {store} : {},
                ...late? {datePaid: {$lt: date}, status: {$in: ['активна', 'безнадежна']}} :
                    today? {datePaid: date, status: {$in: ['активна', 'безнадежна']}}
                    :
                    {
                        ...status ? {status} : {},
                        ...dateStart?{$and: [{datePaid: {$gte: dateStart}}, {datePaid: {$lt: dateEnd}}]}:{}
                    }
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort('-createdAt')
                .populate({
                    path: 'sale',
                    select: 'number _id'
                })
                .populate({
                    path: 'client',
                    select: 'name _id'
                })
                .lean()
            return res
        }
    },
    installmentsCount: async(parent, {search, _id, client, status, late, today, soon, store, date}, {user}) => {
        if(['admin', 'управляющий', 'кассир', 'менеджер', 'менеджер/завсклад', 'юрист'].includes(user.role)) {
            if(user.store) store = user.store
            let managerClients = []
            if(['менеджер', 'менеджер/завсклад'].includes(user.role))
                managerClients = await Sale.find({manager: user._id}).distinct('client').lean()
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
            return await Installment.countDocuments({
                ...search?{number: search}:{},
                ..._id ? {_id} : {},
                ...store ? {store} : {},
                ...client||['менеджер', 'менеджер/завсклад'].includes(user.role) ? {$and: [
                    ...client?[{client}]:[],
                    ...['менеджер', 'менеджер/завсклад'].includes(user.role)?[{client: {$in: managerClients}}]:[]
                ]} : {},
                ...late? {datePaid: {$lt: date}, status: {$in: ['активна', 'безнадежна']}} : today? {datePaid: date, status: {$in: ['активна', 'безнадежна']}}
                    :
                    {
                        ...status ? {status} : {},
                        ...dateStart?{$and: [{datePaid: {$gte: dateStart}}, {datePaid: {$lt: dateEnd}}]}:{}
                    }
            })
                .lean()
        }
        return 0
    },
};

const resolversMutation = {
    addInstallment: async(parent, {renew, grid, debt, client, currency, amount, paid, sale, datePaid, store}, {user}) => {
        if(['admin', 'кассир', 'менеджер', 'менеджер/завсклад'].includes(user.role)) {
            if(user.store) store = user.store
            let object = new Installment({
                number: (await Installment.countDocuments({}).lean())+1,
                client,
                grid,
                info: '',
                status: 'активна',
                debt,
                sale,
                paid,
                datePaid,
                amount,
                store
            });
            object = await Installment.create(object)
            if(sale)
                await Sale.updateOne({_id: sale}, {installment: object._id})

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
                        amount: sale?-debt:-amount
                    },
                    ...balanceClient.balance
                ]
            else
                balanceClient.balance[index].amount = checkFloat(balanceClient.balance[index].amount - (sale?debt:amount))

            if(renew) {
                let installments = await Installment.find({client, store, status: {$in: ['активна', 'безнадежна']}, _id: {$ne: object._id}})
                for(let i=0; i<installments.length; i++) {

                    balanceClient.balance[index].amount = checkFloat(balanceClient.balance[index].amount + installments[i].debt)

                    installments[i].status = 'перерасчет'
                    await installments[i].save()

                    let history = new History({
                        who: user._id,
                        where: installments[i]._id,
                        what: 'Перерасчет'
                    });
                    await History.create(history)
                }
            }

            await BalanceClient.updateOne({_id: balanceClient._id}, {balance: balanceClient.balance})
            let history = new History({
                who: user._id,
                where: object._id,
                what: 'Создание'
            });
            await History.create(history)
            return await Installment.findOne({_id: object._id})
                .populate({
                    path: 'sale',
                    select: 'number _id'
                })
                .populate({
                    path: 'client',
                    select: 'name _id'
                })
                .lean()
        }
        return {_id: 'ERROR'}
    },
    setInstallment: async(parent, {_id, info, status}, {user}) => {
        if(['admin', 'кассир'].includes(user.role)) {
            let object = await Installment.findOne({
                _id,
            })
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
                if (status&&object.status!==status) {
                    history.what = `${history.what}Статус:${object.status}→${status};`
                    object.status = status
                    if(status==='отмена') {

                        let balanceClient = await BalanceClient.findOne({client: object.client}).lean(), index
                        for(let i=0; i<balanceClient.balance.length; i++) {
                            if (balanceClient.balance[i].currency === 'сом') {
                                index = i
                                break
                            }
                        }
                        balanceClient.balance[index].amount = checkFloat(balanceClient.balance[index].amount + object.debt)
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

module.exports.setGridInstallment = setGridInstallment;
module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;