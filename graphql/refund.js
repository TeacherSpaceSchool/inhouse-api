const Refund = require('../models/refund');
const Installment = require('../models/installment');
const Sale = require('../models/sale');
const History = require('../models/history');
const ItemRefund = require('../models/itemRefund');
const BalanceClient = require('../models/balanceClient');
const Salary = require('../models/salary');
const {checkFloat, urlMain, pdDDMMYYHHMM, checkDate } = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const randomstring = require('randomstring');

const type = `
  type Refund {
    _id: ID
    paymentConfirmation: Boolean
    createdAt: Date
    number: String
    manager: User
    client: Client
    itemsRefund: [ItemFromList]
    amount: Float
    store: Store
    comment: String
    currency: String
    status: String
    sale: Sale
    discount: Float
}
`;

const query = `
    unloadRefunds(search: String, manager: ID, client: ID, store: ID, dateStart: Date, dateEnd: Date, status: String, _id: ID): String
    refunds(search: String, skip: Int, limit: Int, manager: ID, client: ID, store: ID, dateStart: Date, dateEnd: Date, status: String): [Refund]
    refundsCount(search: String, manager: ID, client: ID, store: ID, dateStart: Date, dateEnd: Date, status: String): Int
    refund(_id: ID!): Refund
`;

const mutation = `
    addRefund(client: ID!, discount: Float!, itemsRefund: [ItemFromListInput]!, amount: Float!, comment: String!, currency: String!, sale: ID!): String
    setRefund(_id: ID!, comment: String, status: String): String
`;

const resolvers = {
    unloadRefunds: async(parent, {search, client, store, manager, dateStart, dateEnd, status, _id}, {user}) => {
        if(['admin', 'управляющий',  'кассир', 'менеджер', 'менеджер/завсклад', 'завсклад'].includes(user.role)) {
            if(user.store) store = user.store
            dateStart = checkDate(dateStart)
            dateStart.setHours(0, 0, 0, 0)
            if(dateEnd)
                dateEnd = new Date(dateEnd)
            else {
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            let res = await Refund.find(
                _id?
                    {
                        _id
                    }
                    :
                    {
                        ...search?{number: search}:{},
                        ...user.role==='менеджер'?{manager: user._id}:manager?{manager}:{},
                        ...client?{client}:{},
                        ...store?{store}:{},
                        $and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}],
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
                    select: '_id number order paid amounEnd'
                })
                .populate('itemsRefund')
                .lean()
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Выгрузка');
            let cell = 1
            worksheet.getColumn(cell).width = 5
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = '№'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Статус'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Магазин'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Дата'
            cell += 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Тип товара'
            cell += 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Фабрика'
            cell += 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Категория'
            cell += 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Товар'
            cell += 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Размер'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Количество'
            cell += 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Тип продажи'
            cell += 1
            worksheet.getColumn(cell).width = 17
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Сумма без уценки'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Уценка'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Уценка %'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Итоговая сумма'
            cell += 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Клиент'
            cell += 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Менеджер'
            cell += 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Комментарий'
            let row = 1, discountPrecent, discountItem
            for(let i = 0; i < res.length; i++) {
                discountPrecent = checkFloat(res[i].discount*100/res[i].amountStart)
                for(let i1 = 0; i1 < res[i].itemsRefund.length; i1++) {
                    cell = 1
                    worksheet.getRow(row+1).getCell(cell).value = res[i].number;
                    cell += 1
                    worksheet.getRow(row+1).getCell(cell).value = res[i].status;
                    cell += 1
                    worksheet.getRow(row+1).getCell(cell).value = res[i].store.name;
                    cell += 1
                    worksheet.getRow(row+1).getCell(cell).value = pdDDMMYYHHMM(res[i].createdAt);
                    cell += 1
                    worksheet.getRow(row+1).getCell(cell).value = res[i].itemsRefund[i1].type;
                    cell += 1
                    worksheet.getRow(row+1).getCell(cell).value = res[i].itemsRefund[i1].factory;
                    cell += 1
                    worksheet.getRow(row+1).getCell(cell).value = res[i].itemsRefund[i1].category;
                    cell += 1
                    worksheet.getRow(row+1).getCell(cell).value = res[i].itemsRefund[i1].name;
                    cell += 1
                    worksheet.getRow(row+1).getCell(cell).value = res[i].itemsRefund[i1].size;
                    cell += 1
                    worksheet.getRow(row+1).getCell(cell).value = res[i].itemsRefund[i1].count;
                    cell += 1
                    worksheet.getRow(row+1).getCell(cell).value = res[i].sale.paid<res[i].sale.amounEnd?'Рассрочка':res[i].sale.order?'Заказ':'Наличка';
                    cell += 1
                    worksheet.getRow(row+1).getCell(cell).value = checkFloat(res[i].itemsRefund[i1].amount);
                    cell += 1
                    discountItem = checkFloat(res[i].itemsRefund[i1].amount/100*discountPrecent)
                    worksheet.getRow(row+1).getCell(cell).value = discountItem;
                    cell += 1
                    worksheet.getRow(row+1).getCell(cell).value = `${discountPrecent}%`;
                    cell += 1
                    worksheet.getRow(row+1).getCell(cell).value = checkFloat(res[i].itemsRefund[i1].amount-discountItem);
                    cell += 1
                    worksheet.getRow(row+1).getCell(cell).value = res[i].client.name;
                    cell += 1
                    worksheet.getRow(row+1).getCell(cell).value = res[i].manager.name;
                    cell += 1
                    worksheet.getRow(row+1).getCell(cell).value = res[i].comment;
                    row += 1
                }
            }
            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
    refunds: async(parent, {search, skip, manager, client, store, limit, dateStart, dateEnd, status}, {user}) => {
        if(['admin', 'управляющий',  'кассир', 'менеджер', 'менеджер/завсклад', 'завсклад'].includes(user.role)) {
            if(user.store) store = user.store
            if(['менеджер', 'менеджер/завсклад'].includes(user.role)) manager = user._id
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
            let res = await Refund.find({
                ...search?{number: search}:{},
                ...user.role==='менеджер'?{manager: user._id}:manager?{manager}:{},
                ...client?{client}:{},
                ...store?{store}:{},
                ...dateStart?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{},
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
                    select: '_id number order'
                })
                .lean()
            return res
        }
    },
    refundsCount: async(parent, {search, client, store, manager, dateStart, dateEnd, status}, {user}) => {
        if(['admin', 'управляющий',  'кассир', 'менеджер', 'менеджер/завсклад', 'завсклад'].includes(user.role)) {
            if(user.store) store = user.store
            if(['менеджер', 'менеджер/завсклад'].includes(user.role)) manager = user._id
            dateStart = checkDate(dateStart)
            dateStart.setHours(0, 0, 0, 0)
            if(dateEnd)
                dateEnd = new Date(dateEnd)
            else {
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            dateEnd.setHours(0, 0, 0, 0)
            return await Refund.countDocuments({
                ...search?{number: search}:{},
                ...user.role==='менеджер'?{manager: user._id}:manager?{manager}:{},
                ...client?{client}:{},
                ...store?{store}:{},
                $and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}],
                ...status?status==='оплата'?{status: {$ne: 'отмена'}}:{status}:{},
            })
                .lean()
        }
    },
    refund: async(parent, {_id}, {user}) => {
        if(['admin', 'управляющий',  'кассир', 'менеджер', 'менеджер/завсклад', 'завсклад'].includes(user.role)) {
            let res = await Refund.findOne({
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
                    select: '_id number order'
                })
                .populate('itemsRefund')
                .lean()
            return res
        }
    },
};

const resolversMutation = {
    addRefund: async(parent, {client, discount, itemsRefund, amount, comment, currency, sale}, {user}) => {
        if(['менеджер', 'менеджер/завсклад'].includes(user.role)) {
            for(let i=0; i<itemsRefund.length; i++) {
                itemsRefund[i] = new ItemRefund(itemsRefund[i]);
                itemsRefund[i] = (await ItemRefund.create(itemsRefund[i]))._id
            }
            let object = new Refund({
                number: (await Refund.countDocuments({}).lean())+1,
                manager: user._id,
                client,
                discount,
                itemsRefund,
                store: user.store,
                amount,
                sale,
                comment,
                currency,
                status: 'обработка'
            });
            sale = await Sale.findById(sale).lean()
            let refunds = [...sale.refunds?sale.refunds:[], object._id]
            await Sale.updateOne({_id: sale._id}, {refunds, status: 'возврат'})
            object = await Refund.create(object)
            let history = new History({
                who: user._id,
                where: object._id,
                what: 'Создание'
            });
            await History.create(history)

            let balanceClient = await BalanceClient.findOne({client})
            balanceClient.balance = checkFloat(balanceClient.balance + amount)
            await balanceClient.save()

            if(sale.installment) {
                let installment = await Installment.findOne({_id: sale.installment, status: {$nin: ['перерасчет', 'отмена']}}).lean()
                if(installment) {
                    let history = new History({
                        who: user._id,
                        where: sale.installment,
                        what: 'Возврат продажи'
                    });
                    await History.create(history)
                    installment.amount = installment.amount - amount
                    installment.debt = installment.amount - installment.paid
                    if (installment.debt < 0)
                        installment.debt = 0
                    let grid = [...installment.grid]
                    let gridDebt = installment.amount - checkFloat(grid[0].amount)
                    if (gridDebt < 0)
                        gridDebt = 0
                    let monthInstallment = grid.length - 1
                    let paidInstallment = checkFloat(gridDebt / monthInstallment)

                    let remainder = 0
                    if(gridDebt) {
                        remainder = paidInstallment % (paidInstallment >= 100 ? 100 : 1)
                        remainder = Math.round(remainder * monthInstallment)
                        if (remainder)
                            paidInstallment = checkFloat((gridDebt - remainder) / monthInstallment)
                    }

                    for (let i = 0; i < monthInstallment; i++)
                        grid[i + 1].amount = paidInstallment

                    grid[grid.length-1].amount += remainder

                    if (!installment.debt)
                        installment.status = 'оплачен'

                    await Installment.updateOne({_id: sale.installment}, {
                        amount: installment.amount,
                        debt: installment.debt,
                        status: installment.status,
                        grid
                    })
                }
            }

            //Бонус менеджера
            if(sale.bonusManager) {
                let newBonusManager = checkFloat(sale.bonusManager*(sale.amountEnd-amount)/sale.amountEnd)

                let date = new Date(sale.createdAt)
                date.setHours(0, 0, 0, 0)
                date.setDate(1)
                let salary = await Salary.findOne({employment: sale.manager, date})
                if (salary) {
                    let history = new History({
                        who: user._id,
                        where: salary._id,
                        what: `Бонус:${salary.bonus}`
                    });
                    salary.bonus = checkFloat(salary.bonus - sale.bonusManager + newBonusManager)
                    salary.pay = checkFloat(salary.debtStart + salary.accrued + salary.bonus + salary.premium - salary.penaltie - salary.advance)
                    salary.debtEnd = checkFloat(salary.pay - salary.paid)
                    await salary.save()
                    history.what += `→${salary.bonus};`
                    await History.create(history)
                }
                else {
                    let debtStart = await Salary.findOne({employment: sale.manager, date: {$lt: date}}).select('debtEnd').sort('-date').lean()
                    if (debtStart)
                        debtStart = debtStart.debtEnd
                    else
                        debtStart = 0
                    salary = new Salary({
                        employment: sale.manager,
                        store: sale.store,
                        date,
                        salary: 0,
                        bid: 0,
                        actualDays: 0,
                        workingDay: 0,
                        debtStart,
                        premium: 0,
                        bonus: newBonusManager,
                        accrued: 0,
                        penaltie: 0,
                        advance: 0,
                        pay: newBonusManager+debtStart,
                        paid: 0,
                        debtEnd: newBonusManager+debtStart
                    });
                    salary = await Salary.create(salary)
                    let history = new History({
                        who: user._id,
                        where: salary._id,
                        what: 'Создание'
                    });
                    await History.create(history)
                }

                let lastSalary = salary
                let lastDebtEnd = salary.debtEnd
                let _salary
                while(lastSalary) {
                    _salary = await Salary.findOne({date: {$gt: lastSalary.date}, employment: sale.manager, _id: {$ne: object._id}}).sort('date')
                    if(_salary) {
                        _salary.debtStart = lastDebtEnd
                        _salary.pay = checkFloat(_salary.debtStart+_salary.accrued+_salary.bonus+_salary.premium-_salary.penaltie-_salary.advance)
                        _salary.debtEnd = checkFloat(_salary.pay-_salary.paid)
                        lastDebtEnd = _salary.debtEnd
                        await _salary.save()
                    }
                    lastSalary = _salary
                }

                await Sale.updateOne({_id: sale._id}, {bonusManager: newBonusManager})
            }

            return object._id
        }
        return 'ERROR'
    },
    setRefund: async(parent, {_id, comment, status}, {user}) => {
        if(['admin', 'менеджер', 'менеджер/завсклад', 'завсклад'].includes(user.role)) {
            let object = await Refund.findById(_id)
            if(object&&object.status!=='принят') {
                let history = new History({
                    who: user._id,
                    where: object._id,
                    what: ''
                });
                if (comment) {
                    history.what = `${history.what}Комментарий:${object.info}→${comment};\n`
                    object.info = comment
                }
                if (status) {
                    history.what = `${history.what}Статус:${object.status}→${status};`
                    object.status = status
                    if(status==='отмена') {
                        let sale = await Sale.findById(object.sale).lean()
                        let index = 0
                        for(let i=0; i<sale.refunds.length; i++) {
                            if(sale.refunds[i].toString()===object._id.toString()) {
                                index = i
                                break
                            }
                        }
                        let refunds = [...sale.refunds]
                        refunds.splice(index, 1)
                        await Sale.updateOne({_id: sale._id}, {refunds, status: 'доставлен'})

                        let balanceClient = await BalanceClient.findOne({client: object.client})
                        balanceClient.balance = checkFloat(balanceClient.balance - object.amount)
                        await balanceClient.save()

                        if(sale.installment) {
                            let installment = await Installment.findOne({_id: sale.installment, status: {$nin: ['перерасчет', 'отмена']}}).lean()
                            if(installment) {
                                let history = new History({
                                    who: user._id,
                                    where: sale.installment,
                                    what: 'Отмена возврата'
                                });
                                await History.create(history)
                                installment.amount = sale.amountEnd
                                installment.debt = installment.amount - installment.paid
                                let grid = [...installment.grid]
                                let gridDebt = installment.amount - checkFloat(grid[0].amount)
                                let monthInstallment = grid.length - 1
                                let paidInstallment = checkFloat(gridDebt / monthInstallment)

                                let remainder = paidInstallment % (paidInstallment >= 100 ? 100 : 1)
                                remainder = Math.round(remainder * monthInstallment)
                                if (remainder)
                                    paidInstallment = checkFloat((gridDebt - remainder) / monthInstallment)

                                for (let i = 0; i < monthInstallment; i++)
                                    grid[i + 1].amount = paidInstallment

                                grid[grid.length-1].amount += remainder

                                if (!installment.debt)
                                    installment.status = 'оплачен'
                                else
                                    installment.status = 'активна'
                                await Installment.updateOne({_id: sale.installment}, {
                                    amount: installment.amount,
                                    debt: installment.debt,
                                    status: installment.status,
                                    grid
                                })
                            }
                        }


                        //Бонус менеджера
                        if(sale.bonusManager) {
                            let newBonusManager = checkFloat(sale.bonusManager*sale.amountEnd/(sale.amountEnd-object.amount))

                            let date = new Date(sale.createdAt)
                            date.setHours(0, 0, 0, 0)
                            date.setDate(1)
                            let salary = await Salary.findOne({employment: sale.manager, date})
                            if (salary) {
                                let history = new History({
                                    who: user._id,
                                    where: salary._id,
                                    what: `Бонус:${salary.bonus}`
                                });
                                salary.bonus = checkFloat(salary.bonus - sale.bonusManager + newBonusManager)
                                salary.pay = checkFloat(salary.debtStart + salary.accrued + salary.bonus + salary.premium - salary.penaltie - salary.advance)
                                salary.debtEnd = checkFloat(salary.pay - salary.paid)
                                await salary.save()
                                history.what += `→${salary.bonus};`
                                await History.create(history)
                            }
                            else {
                                let debtStart = await Salary.findOne({employment: sale.manager, date: {$lt: date}}).select('debtEnd').sort('-date').lean()
                                if (debtStart)
                                    debtStart = debtStart.debtEnd
                                else
                                    debtStart = 0
                                salary = new Salary({
                                    employment: sale.manager,
                                    store: sale.store,
                                    date,
                                    salary: 0,
                                    bid: 0,
                                    actualDays: 0,
                                    workingDay: 0,
                                    debtStart,
                                    premium: 0,
                                    bonus: newBonusManager,
                                    accrued: 0,
                                    penaltie: 0,
                                    advance: 0,
                                    pay: newBonusManager+debtStart,
                                    paid: 0,
                                    debtEnd: newBonusManager+debtStart
                                });
                                salary = await Salary.create(salary)
                                let history = new History({
                                    who: user._id,
                                    where: salary._id,
                                    what: 'Создание'
                                });
                                await History.create(history)
                            }

                            let lastSalary = salary
                            let lastDebtEnd = salary.debtEnd
                            let _salary
                            while(lastSalary) {
                                _salary = await Salary.findOne({date: {$gt: lastSalary.date}, employment: sale.manager, _id: {$ne: object._id}}).sort('date')
                                if(_salary) {
                                    _salary.debtStart = lastDebtEnd
                                    _salary.pay = checkFloat(_salary.debtStart+_salary.accrued+_salary.bonus+_salary.premium-_salary.penaltie-_salary.advance)
                                    _salary.debtEnd = checkFloat(_salary.pay-_salary.paid)
                                    lastDebtEnd = _salary.debtEnd
                                    await _salary.save()
                                }
                                lastSalary = _salary
                            }

                            await Sale.updateOne({_id: sale._id}, {bonusManager: newBonusManager})
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