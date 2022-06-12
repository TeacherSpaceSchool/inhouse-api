const DepositHistory = require('../models/depositHistory');
const District = require('../models/district');
const WorkShift = require('../models/workshift');
const {cashierMaxDay} = require('../module/const');

const type = `
  type DepositHistory {
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
  type DepositHistorysCount {
      count: Int
      amount: Float
  }
`;

const query = `
    depositHistorys(skip: Int, date: String, legalObject: ID, branch: ID, cashbox: ID, cashier: ID, workShift: ID): [DepositHistory]
    depositHistorysCount(date: String, legalObject: ID, branch: ID, cashbox: ID, cashier: ID, workShift: ID): DepositHistorysCount
    depositHistory(_id: ID!): DepositHistory
`;

const resolvers = {
    depositHistorys: async(parent, {skip, date, legalObject, branch, cashbox, cashier, workShift}, {user}) => {
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
            return await DepositHistory.find({
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
    depositHistorysCount: async(parent, {date, legalObject, branch, cashbox, cashier, workShift}, {user}) => {
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
            let depositHistorys = await DepositHistory.find({
                $and: [
                    {createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}},
                    ...user.role==='супервайзер'?[{branch: {$in: districts}}]:[],
                    ...branch?[{branch}]:[]
                ],
                ...legalObject ? {legalObject} : {},
                ...workShift||user.role==='кассир'?user.role==='кассир'?{workShift: {$in: workShiftsCashier}}:{workShift}:{},
                ...cashbox ? {cashbox} : {},
                ...cashier ? {cashier} : {},
            })
                .select('amount')
                .lean()
            let res = {
                amount: 0,
                count: depositHistorys.length
            }
            for(let i=0; i<depositHistorys.length; i++)
                res.amount += depositHistorys[i].amount
            return res
        }
    },
    depositHistory: async(parent, {_id}, {user}) => {
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
            let res =  await DepositHistory.findOne({
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
            return res
        }
    },
};

module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;