const WithdrawHistory = require('../models/withdrawHistory');
const District = require('../models/district');
const WorkShift = require('../models/workshift');
const {cashierMaxDay} = require('../module/const');

const type = `
  type WithdrawHistory {
      _id: ID
      createdAt: Date
      number: String
      comment: String
      amount: Float
      legalObject: LegalObject
      branch: Branch
      cashier: User
      cashbox: Cashbox
      workShift: WorkShift
      syncMsg: String
  }
  type WithdrawHistorysCount {
      count: Int
      amount: Float
  }
`;

const query = `
    withdrawHistorys(skip: Int, date: String, legalObject: ID, branch: ID, cashbox: ID, cashier: ID, workShift: ID): [WithdrawHistory]
    withdrawHistorysCount(date: String, legalObject: ID, branch: ID, cashbox: ID, cashier: ID, workShift: ID): WithdrawHistorysCount
    withdrawHistory(_id: ID!): WithdrawHistory
`;

const resolvers = {
    withdrawHistorys: async(parent, {skip, date, legalObject, branch, cashbox, cashier, workShift}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'супервайзер', 'кассир'].includes(user.role)) {
            if(user.legalObject) legalObject = user.legalObject
            let dateStart, dateEnd, districts = [], workShiftsCashier = []
            if(user.role==='супервайзер'){
                districts = await District.find({
                    supervisors: user._id,
                })
                    .distinct('branchs')
                    .lean()
            }
            else if(user.role==='кассир'){
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
            return await WithdrawHistory.find({
                ...dateStart||'супервайзер'===user.role||branch?{
                    $and: [
                        ...dateStart?[{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]:[],
                        ...user.role==='супервайзер'?[{branch: {$in: districts}}]:[],
                        ...branch?[{branch}]:[]
                    ]
                }:{},
                ...legalObject ? {legalObject} : {},
                ...workShift||user.role==='кассир'?user.role==='кассир'?{workShift: {$in: workShiftsCashier}}:{workShift}:{},
                ...cashbox ? {cashbox} : {},
                ...cashier ? {cashier} : {},
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .sort('-createdAt')
                .populate({
                    path: 'cashier',
                    select: 'name _id role'
                })
                .populate({
                    path: 'cashbox',
                    select: 'name _id'
                })
                .populate({
                    path: 'legalObject',
                    select: 'name _id'
                })
                .populate({
                    path: 'branch',
                    select: 'name _id'
                })
                .populate({
                    path: 'workShift',
                    select: 'number _id'
                })
                .lean()
        }
    },
    withdrawHistorysCount: async(parent, {date, legalObject, branch, cashbox, cashier, workShift}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'кассир', 'супервайзер'].includes(user.role)) {
            if(user.legalObject) legalObject = user.legalObject
            let dateStart, dateEnd, districts = [], workShiftsCashier = []
            if(user.role==='супервайзер'){
                districts = await District.find({
                    supervisors: user._id,
                })
                    .distinct('branchs')
                    .lean()
            }
            else if(user.role==='кассир'){
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
            else {
                dateStart = new Date()
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            let withdrawHistorys = await WithdrawHistory.find({
                $and: [
                    {createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}},
                    ...user.role==='супервайзер'?[{branch: {$in: districts}}]:[],
                    ...branch?[{branch}]:[]
                ],
                ...legalObject ? {legalObject} : {},
                ...branch ? {branch} : {},
                ...workShift||user.role==='кассир'?user.role==='кассир'?{workShift: {$in: workShiftsCashier}}:{workShift}:{},
                ...cashbox ? {cashbox} : {},
                ...cashier ? {cashier} : {},
            })
                .select('amount')
                .lean()
            let res = {
                amount: 0,
                count: withdrawHistorys.length
            }
            for(let i=0; i<withdrawHistorys.length; i++)
                res.amount += withdrawHistorys[i].amount
            return res
        }
    },
    withdrawHistory: async(parent, {_id}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'супервайзер', 'кассир'].includes(user.role)) {
            let districts = [], workShiftsCashier = []
            if(user.role==='супервайзер'){
                districts = await District.find({
                    supervisors: user._id,
                })
                    .distinct('branchs')
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
            return await WithdrawHistory.findOne({
                _id,
                ...user.role==='супервайзер'?{branch: {$in: districts}}:{},
                ...user.role==='кассир'?{workShift: {$in: workShiftsCashier}}:{},
                ...user.legalObject ? {legalObject: user.legalObject} : {},
            })
                .sort('-createdAt')
                .populate({
                    path: 'cashier',
                    select: 'name _id role'
                })
                .populate({
                    path: 'cashbox',
                    select: 'name _id rnmNumber'
                })
                .populate({
                    path: 'legalObject',
                    select: 'name _id inn rateTaxe'
                })
                .populate({
                    path: 'branch',
                    select: 'name address _id'
                })
                .populate({
                    path: 'workShift',
                    select: 'number _id'
                })
                .lean()
        }
    },
};

module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;