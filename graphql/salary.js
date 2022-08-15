const Salary = require('../models/salary');
const User = require('../models/user');
const History = require('../models/history');
const {saveFile, deleteFile, urlMain, checkFloat, pdMonthYYYY, checkDate} = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const randomstring = require('randomstring');

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
    unloadSalarys(search: String, date: Date, store: ID, employment: ID, department: String, position: String): String
    employmentsForSalary(search: String, date: Date!, store: ID, department: String, position: String): [User]
    salarys(skip: Int, date: Date!, search: String, store: ID, employment: ID, last: Boolean, department: String, position: String): [Salary]
    salarysCount(search: String, date: Date, store: ID, employment: ID, department: String, position: String): Int
`;

const mutation = `
    uploadSalary(document: Upload!): String
    addSalary(employment: ID!, date: Date!, salary: Float!, bid: Float!, actualDays: Float!, accrued: Float!, workingDay: Float!, debtStart: Float!, premium: Float!, bonus: Float!, penaltie: Float!, advance: Float!, pay: Float!, paid: Float!, debtEnd: Float!): Salary
    setSalary(_id: ID!, salary: Float, bid: Float, actualDays: Float, workingDay: Float, debtStart: Float, premium: Float, accrued: Float, bonus: Float, penaltie: Float, advance: Float, pay: Float, paid: Float, debtEnd: Float): String
    deleteSalary(_id: ID!): String
`;

const resolvers = {
    unloadSalarys: async(parent, {date, search, store, employment, department, position}, {user}) => {
        if(['admin', 'управляющий', 'кассир'].includes(user.role)) {
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
                ...employment?{employment}:(search||department||position)?{employment: {$in: searchUsers}}:{},
                ...store?{store}:{},
                date
            })
                .sort(employment?'-date':'-createdAt')
                .populate({
                    path: 'employment',
                    select: 'name _id department position'
                })
                .lean()
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Выгрузка');
            for(let i = 0; i < res.length; i++) {
                worksheet.getRow(i+1).getCell(1).value = pdMonthYYYY(res[i].date)
                worksheet.getRow(i+1).getCell(2).value = `${res[i].employment.name}|${res[i].employment._id}\n${res[i].employment.position}`
                worksheet.getRow(i+1).getCell(3).value = res[i].salary
                worksheet.getRow(i+1).getCell(4).value = res[i].bid
                worksheet.getRow(i+1).getCell(5).value = res[i].actualDays
                worksheet.getRow(i+1).getCell(6).value = res[i].workingDay
                worksheet.getRow(i+1).getCell(7).value = res[i].debtStart
                worksheet.getRow(i+1).getCell(8).value = res[i].accrued
                worksheet.getRow(i+1).getCell(9).value = res[i].premium
                worksheet.getRow(i+1).getCell(10).value = res[i].bonus
                worksheet.getRow(i+1).getCell(11).value = res[i].penaltie
                worksheet.getRow(i+1).getCell(12).value = res[i].advance
                worksheet.getRow(i+1).getCell(13).value = res[i].pay
                worksheet.getRow(i+1).getCell(14).value = res[i].paid
                worksheet.getRow(i+1).getCell(15).value = res[i].debtEnd
            }
            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
    employmentsForSalary: async(parent, {search, date, store, department, position}, {user}) => {
        if(['admin', 'кассир'].includes(user.role)) {
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
        if(['admin', 'управляющий', 'кассир'].includes(user.role)) {
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
                ...employment?{employment}:(search||department||position)?{employment: {$in: searchUsers}}:{},
                ...store?{store}:{},
                ...last?{date: {$lt: date}}:{date}
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort((employment||last)?'-date':'-createdAt')
                .populate({
                    path: 'employment',
                    select: 'name _id department position'
                })
                .lean()
            return res
        }
    },
    salarysCount: async(parent, {date, search, store, employment, department, position}, {user}) => {
        if(['admin', 'управляющий', 'кассир'].includes(user.role)) {
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
            let res = await Salary.countDocuments({
                ...employment?{employment}:(search||department||position)?{employment: {$in: searchUsers}}:{},
                ...store?{store}:{},
                date
            })
                .lean()
            return res
        }
    }
};

const resolversMutation = {
    uploadSalary: async(parent, { document }, {user}) => {
        if(['admin', 'кассир'].includes(user.role)) {
            let {createReadStream, filename} = await document;
            let stream = createReadStream()
            filename = await saveFile(stream, filename);
            let xlsxpath = path.join(app.dirname, 'public', filename);
            let workbook = new ExcelJS.Workbook();
            workbook = await workbook.xlsx.readFile(xlsxpath);
            let worksheet = workbook.worksheets[0];
            let rowNumber = 1, row, object
            while(true) {
                row = worksheet.getRow(rowNumber);
                if(row.getCell(2).value&&row.getCell(2).value.split('|')[1]) {
                    row.getCell(2).value = row.getCell(2).value.split('|')[1]
                }
                if(row.getCell(1).value&&row.getCell(2).value&&(await User.findById(row.getCell(2).value).select('_id').lean())) {
                    let employment = await User.findById(row.getCell(2).value).select('_id store').lean()
                    let date = row.getCell(1).value.split('.')
                    date = checkDate(`${date[0]}.01.${date[1]}`)
                    date.setHours(0, 0, 0, 0)
                    object = await Salary.findOne({
                        employment,
                        date
                    })

                    if(object) {
                        let history = new History({
                            who: user._id,
                            where: object._id,
                            what: ''
                        });
                        if(row.getCell(3).value) {
                            let salary = checkFloat(row.getCell(3).value)
                            if (salary !== object.salary) {
                                history.what = `Оклад:${object.salary}→${salary};\n`
                                object.salary = salary
                            }
                        }
                        if(row.getCell(4).value) {
                            let bid = checkFloat(row.getCell(4).value)
                            if (bid !== object.bid) {
                                history.what = `${history.what}Ставка:${object.bid}→${bid};\n`
                                object.bid = bid
                            }
                        }
                        if(row.getCell(5).value) {
                            let actualDays = checkFloat(row.getCell(5).value)
                            if (actualDays !== object.actualDays) {
                                history.what = `${history.what}Фак дни:${object.actualDays}→${actualDays};\n`
                                object.actualDays = actualDays
                            }
                        }
                        if(row.getCell(6).value) {
                            let workingDay = checkFloat(row.getCell(6).value)
                            if (workingDay !== object.workingDay) {
                                history.what = `${history.what}Раб дни:${object.workingDay}→${workingDay};\n`
                                object.workingDay = workingDay
                            }
                        }
                        object.accrued = checkFloat((object.workingDay?(object.salary/object.workingDay*object.actualDays):0)+object.bid*object.actualDays)
                        if(row.getCell(7).value) {
                            let premium = checkFloat(row.getCell(7).value)
                            if (premium !== object.premium) {
                                history.what = `${history.what}Премия:${object.premium}→${premium};\n`
                                object.premium = premium
                            }
                        }
                        if(row.getCell(8).value) {
                            let bonus = checkFloat(row.getCell(8).value)
                            if (bonus !== object.bonus) {
                                history.what = `${history.what}Бонус:${object.bonus}→${bonus};\n`
                                object.bonus = bonus
                            }
                        }
                        if(row.getCell(9).value) {
                            let penaltie = checkFloat(row.getCell(9).value)
                            if (penaltie !== object.penaltie) {
                                history.what = `${history.what}Штрафы:${object.penaltie}→${penaltie};\n`
                                object.penaltie = penaltie
                            }
                        }
                        if(row.getCell(10).value) {
                            let advance = checkFloat(row.getCell(10).value)
                            if (advance !== object.advance) {
                                history.what = `${history.what}Авансы:${object.advance}→${advance};\n`
                                object.advance = advance
                            }
                        }
                        object.pay = checkFloat(object.debtStart+object.accrued+object.bonus+object.premium-object.penaltie-object.advance)
                        if(row.getCell(11).value) {
                            let paid = checkFloat(row.getCell(11).value)
                            if (paid !== object.paid) {
                                history.what = `${history.what}Оплачено:${object.paid}→${paid};\n`
                                object.paid = paid
                            }
                        }
                        let debtEnd = checkFloat(object.pay-object.paid)
                        if (debtEnd!==object.debtEnd) {
                            history.what = `${history.what}Долг на конец:${object.debtEnd}→${debtEnd};`
                            object.debtEnd = debtEnd

                            let lastSalary = object
                            let lastDebtEnd = object.debtEnd
                            let salary
                            while(lastSalary) {
                                salary = await Salary.findOne({date: {$gt: lastSalary.date}, employment: object.employment, _id: {$ne: object._id}}).sort('date')
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
                    }
                    else {
                        let salary = checkFloat(row.getCell(3).value)
                        let bid = checkFloat(row.getCell(4).value)
                        let actualDays = checkFloat(row.getCell(5).value)
                        let workingDay = checkFloat(row.getCell(6).value)
                        let debtStart = await Salary.findOne({employment: employment._id, date: {$lt: date}, last: true}).sort('-date').lean()
                        debtStart = debtStart?debtStart.debtEnd:0
                        let accrued = checkFloat((workingDay?(salary/workingDay*actualDays):0)+bid*actualDays)
                        let premium = checkFloat(row.getCell(7).value)
                        let bonus = checkFloat(row.getCell(8).value)
                        let penaltie = checkFloat(row.getCell(9).value)
                        let advance = checkFloat(row.getCell(10).value)
                        let pay = checkFloat(debtStart+accrued+bonus+premium-penaltie-advance)
                        let paid = checkFloat(row.getCell(11).value)
                        let debtEnd = checkFloat(pay-paid)
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
                            salary = await Salary.findOne({date: {$gt: lastSalary.date}, employment: object.employment, _id: {$ne: object._id}}).sort('date')
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
    addSalary: async(parent, {employment, date, salary, bid, actualDays, workingDay, debtStart, premium, accrued, bonus, penaltie, advance, pay, paid, debtEnd}, {user}) => {
        date.setHours(0, 0, 0, 0)
        date.setDate(1)
        if(['admin', 'кассир'].includes(user.role)&&!(await Salary.countDocuments({employment, date}).lean())) {
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
                salary = await Salary.findOne({date: {$gt: lastSalary.date}, employment: object.employment, _id: {$ne: object._id}}).sort('date')
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
                    select: 'name _id department position'
                })
                .lean()
        }
        return {_id: 'ERROR'}
    },
    setSalary: async(parent, {_id, salary, bid, actualDays, workingDay, debtStart, premium, accrued, bonus, penaltie, advance, pay, paid, debtEnd}, {user}) => {
        if(['admin', 'кассир'].includes(user.role)) {
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
                        salary = await Salary.findOne({date: {$gt: lastSalary.date}, employment: object.employment, _id: {$ne: object._id}}).sort('date')
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
        if(['admin', 'кассир'].includes(user.role)) {
            let object = await Salary.findOne({_id})
            if(object) {

                let lastSalary = await Salary.findOne({date: {$lt: object.date}, employment: object.employment, _id: {$ne: object._id}}).select('debtEnd date').lean()
                let lastDebtEnd = lastSalary?lastSalary.debtEnd:0
                lastSalary = lastSalary?lastSalary:object
                let salary
                while(lastSalary) {
                    salary = await Salary.findOne({date: {$gt: lastSalary.date}, employment: object.employment, _id: {$ne: object._id}}).sort('date')
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