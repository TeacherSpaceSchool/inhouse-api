const Refund = require('../models/refund');
const Installment = require('../models/installment');
const Sale = require('../models/sale');
const History = require('../models/history');
const ItemRefund = require('../models/itemRefund');
const BalanceClient = require('../models/balanceClient');
const {checkFloat} = require('../module/const');
const Salary = require('../models/salary');

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
    refunds(skip: Int, limit: Int, manager: ID, client: ID, store: ID, date: Date, status: String): [Refund]
    refundsCount(manager: ID, client: ID, store: ID, date: Date, status: String): Int
    refund(_id: ID!): Refund
`;

const mutation = `
    addRefund(client: ID!, discount: Float!, itemsRefund: [ItemFromListInput]!, amount: Float!, comment: String!, currency: String!, sale: ID!): String
    setRefund(_id: ID!, comment: String, status: String): String
`;

const resolvers = {
    refunds: async(parent, {skip, manager, client, store, limit, date, status}, {user}) => {
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
            return await Refund.find({
                ...manager?{manager}:{},
                ...client?{client}:{},
                ...store?{store}:{},
                ...date?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{},
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
        }
    },
    refundsCount: async(parent, {client, store, manager, date, status}, {user}) => {
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
            return await Refund.countDocuments({
                ...manager?{manager}:{},
                ...client?{client}:{},
                ...store?{store}:{},
                ...date?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{},
                ...status?{status}:{},
            })
                .lean()
        }
    },
    refund: async(parent, {_id}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)) {
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
                    select: '_id number'
                })
                .populate('itemsRefund')
                .lean()
            return res
        }
    },
};

const resolversMutation = {
    addRefund: async(parent, {client, discount, itemsRefund, amount, comment, currency, sale}, {user}) => {
        if('менеджер'===user.role) {
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

            let balanceClient = await BalanceClient.findOne({client}).lean(), index
            for(let i=0; i<balanceClient.balance.length; i++) {
                if (balanceClient.balance[i].currency === currency) {
                    index = i
                    break
                }
            }
            balanceClient.balance[index].amount = checkFloat(balanceClient.balance[index].amount + amount)
            await BalanceClient.updateOne({_id: balanceClient._id}, {balance: balanceClient.balance})
            if(sale.installment) {
                let history = new History({
                    who: user._id,
                    where: sale.installment,
                    what: 'Возврат продажи'
                });
                await History.create(history)
                let installment = await Installment.findOne({_id: sale.installment}).lean()
                installment.amount = installment.amount - amount
                installment.debt = installment.amount - installment.paid
                if(installment.debt<0)
                    installment.debt = 0
                let grid = [...installment.grid]
                let gridDebt = installment.amount - grid[0].paid
                if(gridDebt<0)
                    gridDebt = 0
                let monthInstallment = grid.length-1
                let paidInstallment = checkFloat(gridDebt/monthInstallment)
                for(let i = 0; i < monthInstallment; i++)
                    grid[i+1].amount = paidInstallment
                if(!installment.debt)
                    installment.status = 'оплачен'

                await Installment.updateOne({_id: sale.installment}, {amount: installment.amount, debt: installment.debt, status: installment.status, grid})
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
                    let prevDate = new Date(date)
                    prevDate.setMonth(prevDate.getMonth() - 1)
                    let debtStart = await Salary.findOne({
                        employment: object.manager,
                        date: prevDate
                    }).select('debtEnd').lean()
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
                        pay: newBonusManager,
                        paid: 0,
                        debtEnd: newBonusManager
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
                    _salary = await Salary.findOne({date: {$gt: lastSalary.date}, employment: object.manager, _id: {$ne: object._id}})
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
        if(['admin', 'менеджер'].includes(user.role)) {
            let object = await Refund.findById(_id)
            if(object&&object.status!=='принят') {
                let history = new History({
                    who: user._id,
                    where: object._id,
                    what: ''
                });
                if (comment) {
                    history.what = `${history.what}Информация:${object.info}→${comment};\n`
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

                        let balanceClient = await BalanceClient.findOne({client: object.client}).lean()
                        for(let i=0; i<balanceClient.balance.length; i++) {
                            if (balanceClient.balance[i].currency === object.currency) {
                                index = i
                                break
                            }
                        }
                        balanceClient.balance[index].amount = checkFloat(balanceClient.balance[index].amount - object.amount)
                        await BalanceClient.updateOne({_id: balanceClient._id}, {balance: balanceClient.balance})

                        if(sale.installment) {
                            let history = new History({
                                who: user._id,
                                where: sale.installment,
                                what: 'Отмена возврата'
                            });
                            await History.create(history)
                            let installment = await Installment.findOne({_id: sale.installment}).lean()
                            installment.amount = installment.amount + object.amount
                            installment.debt = installment.amount - installment.paid
                            let grid = [...installment.grid]
                            let gridDebt = installment.amount - grid[0].paid
                            let monthInstallment = grid.length-1
                            let paidInstallment = checkFloat(gridDebt/monthInstallment)
                            for(let i = 0; i < monthInstallment; i++)
                                grid[i+1].amount = paidInstallment
                            if(installment.debt<1)
                                installment.status = 'оплачен'
                            else
                                installment.status = 'активна'
                            await Installment.updateOne({_id: sale.installment}, {amount: installment.amount, debt: installment.debt, status: installment.status, grid})
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
                                let prevDate = new Date(date)
                                prevDate.setMonth(prevDate.getMonth() - 1)
                                let debtStart = await Salary.findOne({
                                    employment: object.manager,
                                    date: prevDate
                                }).select('debtEnd').lean()
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
                                    pay: newBonusManager,
                                    paid: 0,
                                    debtEnd: newBonusManager
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
                                _salary = await Salary.findOne({date: {$gt: lastSalary.date}, employment: object.manager, _id: {$ne: object._id}})
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