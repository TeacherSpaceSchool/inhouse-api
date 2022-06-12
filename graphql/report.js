const Report = require('../models/report');
const District = require('../models/district');
const Cashbox = require('../models/cashbox');
const LegalObject = require('../models/legalObject');
const WorkShift = require('../models/workshift');
const {cashierMaxDay} = require('../module/const');

const type = `
  type Report {
    _id: ID
    createdAt: Date
    branch: Branch
    legalObject: LegalObject
    cashbox: Cashbox
    workShift: WorkShift
    number: String
    type: String
    start: Date
    end: Date
    cashEnd: Float
    deposit: Float
    withdraw: Float
    discount: Float
    extra: Float
    cash: Float
    cashless: Float
    saleAll: Float
    consignationAll: Float
    paidConsignationAll: Float
    prepaymentAll: Float
    returnedAll: Float
    buyAll: Float
    returnedBuyAll: Float
    sale: Float
    saleCount: Float
    consignation: Float
    consignationCount: Float
    paidConsignation: Float
    paidConsignationCount: Float
    prepayment: Float
    prepaymentCount: Float
    returned: Float
    returnedCount: Float
    buy: Float
    buyCount: Float
    returnedBuy: Float
    returnedBuyCount: Float
    sync: Boolean
    syncMsg: String
  }
`;

const query = `
    reports(skip: Int, date: String, legalObject: ID, cashbox: ID, workShift: ID, filter: String): [Report]
    reportsCount(date: String, legalObject: ID, branch: ID, cashbox: ID, workShift: ID, filter: String): Int
    report(_id: ID!): Report
`;

const mutation = `
    generateReportX(cashbox: ID!): ID
`;

const resolvers = {
    reports: async(parent, {skip, date, legalObject, cashbox, workShift, filter}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'супервайзер', 'кассир'].includes(user.role)) {
            if (user.legalObject) legalObject = user.legalObject
            let dateStart, dateEnd, districts = [], workShiftsCashier = []
            if (user.role === 'супервайзер') {
                districts = await District.find({
                    supervisors: user._id,
                })
                    .distinct('branchs')
                    .lean()
                districts = await Cashbox.find({
                    branch: {$in: districts},
                })
                    .distinct('_id')
                    .lean()
            }
            else if (user.role === 'кассир') {
                let dateStartCashier = new Date()
                dateStartCashier.setDate(dateStartCashier.getDate() - cashierMaxDay)
                workShiftsCashier = await WorkShift
                    .findOne({
                        legalObject: user.legalObject,
                        branch: user.branch,
                        cashier: user._id,
                        createdAt: {$gte: dateStartCashier}
                    })
                    .distinct('_id')
                    .lean()
            }
            if (date && date.length) {
                dateStart = new Date(date)
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            return await Report.find({
                ...dateStart || 'супервайзер'===user.role || cashbox ? {
                    $and: [
                        ...dateStart ? [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}] : [],
                        ...user.role === 'супервайзер' ? [{cashbox: {$in: districts}}] : [],
                        ...cashbox? [{cashbox}] : []
                    ]
                } : {},
                ...filter? {type: filter} : {},
                ...legalObject? {legalObject} : {},
                ...workShift||user.role==='кассир'?user.role==='кассир'?{workShift: {$in: workShiftsCashier}}:{workShift}:{},
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .sort('-createdAt')
                .populate({
                    path: 'legalObject',
                    select: 'name _id'
                })
                .populate({
                    path: 'cashbox',
                    select: 'name _id'
                })
                .populate({
                    path: 'branch',
                    select: 'name _id address'
                })
                .populate({
                    path: 'workShift',
                    select: 'number _id'
                })
                .lean()
        }
    },
    reportsCount: async(parent, {date, legalObject, cashbox, filter, workShift}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'супервайзер', 'кассир'].includes(user.role)) {
            if(user.legalObject) legalObject = user.legalObject
            let dateStart, dateEnd, districts = [], workShiftsCashier = []
            if(user.role==='супервайзер'){
                districts = await District.find({
                    supervisors: user._id,
                })
                    .distinct('branchs')
                    .lean()
                districts = await Cashbox.find({
                    branch: {$in: districts},
                })
                    .distinct('_id')
                    .lean()
            }
            else if (user.role === 'кассир') {
                let dateStartCashier = new Date()
                dateStartCashier.setDate(dateStartCashier.getDate() - cashierMaxDay)
                workShiftsCashier = await WorkShift
                    .findOne({
                        legalObject: user.legalObject,
                        branch: user.branch,
                        cashier: user._id,
                        createdAt: {$gte: dateStartCashier}
                    })
                    .distinct('_id')
                    .lean()
            }
            if (date&&date.length) {
                dateStart = new Date(date)
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            return await Report.countDocuments({
                ...dateStart||'супервайзер'===user.role||cashbox?{
                    $and: [
                        ...dateStart?[{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]:[],
                        ...user.role==='супервайзер'?[{cashbox: {$in: districts}}]:[],
                        ...cashbox?[{cashbox}]:[]
                    ]
                }:{},
                ...filter?{type: filter}:{},
                ...legalObject ? {legalObject} : {},
                ...workShift||user.role==='кассир'?user.role==='кассир'?{workShift: {$in: workShiftsCashier}}:{workShift}:{},
            })
                .lean()
        }
    },
    report: async(parent, {_id}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'супервайзер', 'кассир'].includes(user.role)) {
            let districts = [], workShiftsCashier = []
            if(user.role==='супервайзер'){
                districts = await District.find({
                    supervisors: user._id,
                })
                    .distinct('branchs')
                    .lean()
                districts = await Cashbox.find({
                    branch: {$in: districts},
                })
                    .distinct('_id')
                    .lean()
            }
            else if (user.role === 'кассир') {
                let dateStartCashier = new Date()
                dateStartCashier.setDate(dateStartCashier.getDate() - cashierMaxDay)
                workShiftsCashier = await WorkShift
                    .findOne({
                        legalObject: user.legalObject,
                        branch: user.branch,
                        cashier: user._id,
                        createdAt: {$gte: dateStartCashier}
                    })
                    .distinct('_id')
                    .lean()
            }
            return await Report.findOne({
                _id,
                ...user.legalObject ? {legalObject: user.legalObject} : {},
                ...'супервайзер' === user.role ? {cashbox: {$in: districts}} : {},
                ...user.role === 'кассир' ? {workShift: {$in: workShiftsCashier}} : {},
            })
                .populate({
                    path: 'legalObject',
                    select: 'name inn _id rateTaxe'
                })
                .populate({
                    path: 'branch',
                    select: 'name address _id'
                })
                .populate({
                    path: 'cashbox',
                    select: 'name rnmNumber _id'
                })
                .populate({
                    path: 'workShift',
                    select: 'number _id'
                })
                .lean()
        }
    },
};

const resolversMutation = {
    generateReportX: async(parent, {cashbox}, {user}) => {
        if (user.role === 'кассир') {
            cashbox = await WorkShift
                .findOne({
                    legalObject: user.legalObject,
                    branch: user.branch,
                    cashier: user._id,
                    end: null
                })
                .select('cashbox')
                .sort('-createdAt')
                .lean()
            if(cashbox)
                cashbox = cashbox.cashbox
        }
        cashbox = await Cashbox.findOne({
                _id: cashbox,
                ...user.legalObject?{legalObject: user.legalObject}:{},
                presentCashier: {$ne: null}
            })
            .lean()
        let workShift = await WorkShift.findOne({
            end: null,
            legalObject: cashbox.legalObject,
            cashbox: cashbox._id
        }).lean()
        if((['управляющий', 'супервайзер', 'кассир', 'superadmin'].includes(user.role)||user.role==='admin'&&user.add)&&cashbox&&workShift&&((new Date()-workShift.start)/1000/60/60)<24) {
            let number = (await Report.countDocuments({cashbox: cashbox._id, type: 'X'}).lean())+1;
            let report = new Report({
                number,
                branch: workShift.branch,
                legalObject: cashbox.legalObject,
                cashbox: cashbox._id,
                workShift: workShift._id,
                type: 'X',
                start: new Date(),
                cashEnd: cashbox.cash,
                deposit: workShift.deposit,
                withdraw: workShift.withdraw,
                discount: workShift.discount,
                extra: workShift.extra,
                cash: workShift.cash,
                cashless: workShift.cashless,
                saleAll: cashbox.sale,
                consignationAll: cashbox.consignation,
                paidConsignationAll: cashbox.paidConsignation,
                prepaymentAll: cashbox.prepayment,
                returnedAll: cashbox.returned,
                buyAll: cashbox.buy,
                returnedBuyAll: cashbox.returnedBuy,
                sale: workShift.sale,
                saleCount: workShift.saleCount,
                consignation: workShift.consignation,
                consignationCount: workShift.consignationCount,
                paidConsignation: workShift.paidConsignation,
                paidConsignationCount: workShift.paidConsignationCount,
                prepayment: workShift.prepayment,
                prepaymentCount: workShift.prepaymentCount,
                returned: workShift.returned,
                returnedCount: workShift.returnedCount,
                buy: workShift.buy,
                buyCount: workShift.buyCount,
                returnedBuy: workShift.returnedBuy,
                returnedBuyCount: workShift.returnedBuyCount
            });
            if(!(await LegalObject.findOne({ofd: true, _id: cashbox.legalObject}).select('ofd').lean())) {
                report.sync = true
                report.syncMsg = 'Фискальный режим отключен'
            }
            report = await Report.create(report)
            return report._id
        }
        return undefined
    }
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;