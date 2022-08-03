const Salary = require('../models/salary');
const User = require('../models/user');
const History = require('../models/history');
const {checkFloat} = require('../module/const');

const type = `
  type Salary {
    _id: ID
    createdAt: Date
    employment: User
    date: Date
    salary: Float
    bid: Float
    actualDays: Float
    workingDay: Float
    debtStart: Float
    accrued: Float
    bonus: Float
    premium: Float
    penaltie: Float
    advance: Float
    pay: Float
    paid: Float
    debtEnd: Float
  }
`;

const query = `
    employmentsForSalary(search: String, date: Date!, store: ID, department: String, position: String): [User]
    salarys(skip: Int, date: Date!, search: String, store: ID, employment: ID, last: Boolean, department: String, position: String): [Salary]
    salarysCount(search: String, date: Date, store: ID, employment: ID, department: String, position: String): Int
`;

const mutation = `
    addSalary(employment: ID!, date: Date!, salary: Float!, bid: Float!, actualDays: Float!, accrued: Float!, workingDay: Float!, debtStart: Float!, premium: Float!, bonus: Float!, penaltie: Float!, advance: Float!, pay: Float!, paid: Float!, debtEnd: Float!): Salary
    setSalary(_id: ID!, salary: Float, bid: Float, actualDays: Float, workingDay: Float, debtStart: Float, premium: Float, accrued: Float, bonus: Float, penaltie: Float, advance: Float, pay: Float, paid: Float, debtEnd: Float): String
    deleteSalary(_id: ID!): String
`;

const resolvers = {
    employmentsForSalary: async(parent, {search, date, store, department, position}, {user}) => {
        if(['admin'].includes(user.role)) {
            if(user.store) store = user.store
            date.setHours(0, 0, 0, 0)
            date.setDate(1)
            let usedEmployments = await Salary.find({date, ...store?{store}:{}}).distinct('employment').lean()
            return await User.find({
                del: {$ne: true},
                role: {$ne: 'admin'},
                _id: {$nin: usedEmployments},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
                ...department?{department}:{},
                ...position?{position}:{},
            })
                .select('_id name')
                .sort('name')
                .lean()
        }
    },
    salarys: async(parent, {skip, date, search, store, employment, last, department, position}, {user}) => {
        if(['admin'].includes(user.role)) {
            if(user.store) store = user.store
            date.setHours(0, 0, 0, 0)
            date.setDate(1)
            let searchUsers = []
            if((search||department||position)&&!employment)
                searchUsers = await User.find({
                    ...department?{department}:{},
                    ...position?{position}:{},
                    name: {'$regex': search, '$options': 'i'}
                }).distinct('_id').lean()
            let res = await Salary.find({
                ...employment?{employment}:search||department||position?{employment: {$in: searchUsers}}:{},
                ...store?{store}:{},
                ...last?{date: {$lt: date}}:{date}
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort('-createdAt')
                .populate({
                    path: 'employment',
                    select: 'name _id department position'
                })
                .lean()
            return res
        }
    },
    salarysCount: async(parent, {search, date, store, employment, department, position}, {user}) => {
        if(['admin'].includes(user.role)) {
            if(user.store) store = user.store
            date.setHours(0, 0, 0, 0)
            date.setDate(1)
            let searchUsers = []
            if((search||department||position)&&!employment)
                searchUsers = await User.find({
                    ...department?{department}:{},
                    ...position?{position}:{},
                    name: {'$regex': search, '$options': 'i'}
                }).distinct('_id').lean()
            return await Salary.countDocuments({
                ...employment?{employment}:search||department||position?{employment: {$in: searchUsers}}:{},
                ...store?{store}:{},
                date
            })
                .lean()
        }
    }
};

const resolversMutation = {
    addSalary: async(parent, {employment, date, salary, bid, actualDays, workingDay, debtStart, premium, accrued, bonus, penaltie, advance, pay, paid, debtEnd}, {user}) => {
        date.setHours(0, 0, 0, 0)
        date.setDate(1)
        if(['admin'].includes(user.role)&&!(await Salary.countDocuments({employment, date}).lean())) {
             employment = await User.findOne({_id: employment}).select('_id store').lean()
            let object = new Salary({
                employment: employment._id,
                store: employment.store,
                date,
                salary,
                bid,
                actualDays,
                workingDay,
                debtStart,
                premium,
                bonus,
                accrued,
                penaltie,
                advance,
                pay,
                paid,
                debtEnd
            });

            let lastSalary = object
            let lastDebtEnd = object.debtEnd
            while(lastSalary) {
                salary = await Salary.findOne({date: {$gt: lastSalary.date}, employment: object.employment, _id: {$ne: object._id}})
                if(salary) {
                    salary.debtStart = lastDebtEnd
                    salary.pay = checkFloat(salary.debtStart+salary.accrued+salary.bonus+salary.premium-salary.penaltie-salary.advance)
                    salary.debtEnd = checkFloat(salary.pay-salary.paid)
                    lastDebtEnd = salary.debtEnd
                    await salary.save()
                }
                lastSalary = salary
            }

            await Salary.create(object)
            let history = new History({
                who: user._id,
                where: object._id,
                what: 'Создание'
            });
            await History.create(history)
            return await Salary.findById(object._id)
                .populate({
                    path: 'employment',
                    select: 'name _id'
                })
                .lean()
        }
        return {_id: 'ERROR'}
    },
    setSalary: async(parent, {_id, salary, bid, actualDays, workingDay, debtStart, premium, accrued, bonus, penaltie, advance, pay, paid, debtEnd}, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await Salary.findById(_id)
            if(object) {
                let history = new History({
                    who: user._id,
                    where: object._id,
                    what: ''
                });
                if (salary!=undefined&&salary!==object.salary) {
                    history.what = `Оклад:${object.salary}→${salary};\n`
                    object.salary = salary
                }
                if (bid!=undefined&&bid!==object.bid) {
                    history.what = `${history.what}Ставка:${object.bid}→${bid};\n`
                    object.bid = bid
                }
                if (actualDays!=undefined&&actualDays!==object.actualDays) {
                    history.what = `${history.what}Фак дни:${object.actualDays}→${actualDays};\n`
                    object.actualDays = actualDays
                }
                if (workingDay!=undefined&&workingDay!==object.workingDay) {
                    history.what = `${history.what}Раб дни:${object.workingDay}→${workingDay};\n`
                    object.workingDay = workingDay
                }
                if (debtStart!=undefined&&debtStart!==object.debtStart) {
                    history.what = `${history.what}Долг на начало:${object.debtStart}→${debtStart};\n`
                    object.debtStart = debtStart
                }
                if (accrued!=undefined&&accrued!==object.accrued) {
                    history.what = `${history.what}Начислено:${object.accrued}→${accrued};\n`
                    object.accrued = accrued
                }
                if (premium!=undefined&&premium!==object.premium) {
                    history.what = `${history.what}Премия:${object.premium}→${premium};\n`
                    object.premium = premium
                }
                if (bonus!=undefined&&bonus!==object.bonus) {
                    history.what = `${history.what}Бонус:${object.bonus}→${bonus};\n`
                    object.bonus = bonus
                }
                if (penaltie!=undefined&&penaltie!==object.penaltie) {
                    history.what = `${history.what}Штрафы:${object.penaltie}→${penaltie};\n`
                    object.penaltie = penaltie
                }
                if (advance!=undefined&&advance!==object.advance) {
                    history.what = `${history.what}Авансы:${object.advance}→${advance};\n`
                    object.advance = advance
                }
                if (pay!=undefined&&pay!==object.pay) {
                    history.what = `${history.what}К оплате:${object.pay}→${pay};\n`
                    object.pay = pay
                }
                if (paid!=undefined&&paid!==object.paid) {
                    history.what = `${history.what}Оплачено:${object.paid}→${paid};\n`
                    object.paid = paid
                }
                if (debtEnd!=undefined&&debtEnd!==object.debtEnd) {
                    history.what = `${history.what}Долг на конец:${object.debtEnd}→${debtEnd};`
                    object.debtEnd = debtEnd

                    let lastSalary = object
                    let lastDebtEnd = object.debtEnd
                    let salary
                    while(lastSalary) {
                        salary = await Salary.findOne({date: {$gt: lastSalary.date}, employment: object.employment, _id: {$ne: object._id}})
                        if(salary) {
                            salary.debtStart = lastDebtEnd
                            salary.pay = checkFloat(salary.debtStart+salary.accrued+salary.bonus+salary.premium-salary.penaltie-salary.advance)
                            salary.debtEnd = checkFloat(salary.pay-salary.paid)
                            lastDebtEnd = salary.debtEnd
                            await salary.save()
                        }
                        lastSalary = salary
                    }

                }
                await object.save();
                await History.create(history)
                return 'OK'
            }
        }
        return 'ERROR'
    },
    deleteSalary: async(parent, { _id }, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await Salary.findOne({_id})
            if(object) {

                let lastSalary = await Salary.findOne({date: {$lt: object.date}, employment: object.employment, _id: {$ne: object._id}}).select('debtEnd date').lean()
                let lastDebtEnd = lastSalary?lastSalary.debtEnd:0
                lastSalary = lastSalary?lastSalary:object
                let salary
                while(lastSalary) {
                    salary = await Salary.findOne({date: {$gt: lastSalary.date}, employment: object.employment, _id: {$ne: object._id}})
                    if(salary) {
                        salary.debtStart = lastDebtEnd
                        salary.pay = checkFloat(salary.debtStart+salary.accrued+salary.bonus+salary.premium-salary.penaltie-salary.advance)
                        salary.debtEnd = checkFloat(salary.pay-salary.paid)
                        lastDebtEnd = salary.debtEnd
                        await salary.save()
                    }
                    lastSalary = salary
                }

                await Salary.deleteOne({_id})
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