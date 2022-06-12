const Cashbox = require('../models/cashbox');
const Branch = require('../models/branch');
const District = require('../models/district');
const IntegrationObject = require('../models/integrationObject');
const History = require('../models/history');
const {registerKkm} = require('../module/kkm');

const type = `
  type Cashbox {
    _id: ID
    createdAt: Date
    name: String
    legalObject: LegalObject
    branch: Branch
    presentCashier: User
    cash: Float
    del: Boolean
    endPayment: Date
    sync: Boolean
    syncMsg: String
    rnmNumber: String
  }
`;

const query = `
    cashboxes(skip: Int, search: String, legalObject: ID, branch: ID, filter: String, all: Boolean): [Cashbox]
    cashboxesCount(search: String, legalObject: ID, branch: ID, filter: String): Int
    cashboxesTrash(skip: Int, search: String): [Cashbox]
    cashbox(_id: ID!): Cashbox
`;

const mutation = `
    addCashbox(name: String!, legalObject: ID!, branch: ID!): String
    setCashbox(_id: ID!, name: String, branch: ID): String
    clearCashbox(_id: ID!): String
    deleteCashbox(_id: ID!): String
    restoreCashbox(_id: ID!): String
`;

const resolvers = {
    cashboxes: async(parent, {skip, search, legalObject, branch, filter, all}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'кассир', 'супервайзер'].includes(user.role)||(search&&search.length>2||all)&&user.role==='оператор') {
            if(user.legalObject) legalObject = user.legalObject
            let districts = []
            if(user.role==='супервайзер')
                districts = await District.find({
                    supervisors: user._id,
                })
                    .distinct('branchs')
                    .lean()
            return await Cashbox.find({
                del: {$ne: true},
                ...filter==='active'?{presentCashier: {$ne: null}}:{},
                ...search&&search.length?{$or: [{rnmNumber: {'$regex': search, '$options': 'i'}}, {name: {'$regex': search, '$options': 'i'}}]}:{},
                ...legalObject ? {legalObject} : {},
                ...['супервайзер', 'кассир'].includes(user.role)||branch?{
                    $and: [
                        ...user.role==='супервайзер'?[{branch: {$in: districts}}]:[],
                        ...user.role==='кассир'?[{branch: user.branch}]:[],
                        ...branch?[{branch}]:[]
                    ]
                }:{}
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .sort('name')
                .populate({
                    path: 'presentCashier',
                    select: 'name _id role'
                })
                .populate({
                    path: 'legalObject',
                    select: 'name _id'
                })
                .populate({
                    path: 'branch',
                    select: 'name _id'
                })
                .lean()
        }
        return []
    },
    cashboxesCount: async(parent, {search, legalObject, branch, filter}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'супервайзер'].includes(user.role)||search&&search.length>2&&user.role==='оператор') {
            if(user.legalObject) legalObject = user.legalObject
            let districts = []
            if(user.role==='супервайзер'){
                districts = await District.find({
                    supervisors: user._id,
                })
                    .distinct('branchs')
                    .lean()
            }
            return await Cashbox.countDocuments({
                ...filter==='active'?{presentCashier: {$ne: null}}:{},
                del: {$ne: true},
                ...search&&search.length?{$or: [{rnmNumber: {'$regex': search, '$options': 'i'}}, {name: {'$regex': search, '$options': 'i'}}]}:{},
                ...legalObject ? {legalObject: legalObject} : {},
                ...['супервайзер', 'кассир'].includes(user.role)||branch?{
                    $and: [
                        ...user.role==='супервайзер'?[{branch: {$in: districts}}]:[],
                        ...user.role==='кассир'?[{branch: user.branch}]:[],
                        ...branch?[{branch}]:[]
                    ]
                }:{}
            })
                .lean()
        }
        return 0
    },
    cashboxesTrash: async(parent, {skip, search}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)) {
            return await Cashbox.find({
                ...search&&search.length?{$or: [{rnmNumber: {'$regex': search, '$options': 'i'}}, {name: {'$regex': search, '$options': 'i'}}]}:{},
                del: true
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .sort('name')
                .populate({
                    path: 'presentCashier',
                    select: 'name _id role'
                })
                .populate({
                    path: 'legalObject',
                    select: 'name _id'
                })
                .populate({
                    path: 'branch',
                    select: 'name _id'
                })
                .lean()
        }
    },
    cashbox: async(parent, {_id}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'кассир', 'супервайзер', 'оператор'].includes(user.role)) {
            let districts = []
            if(user.role==='супервайзер'){
                districts = await District.find({
                    supervisors: user._id,
                })
                    .distinct('branchs')
                    .lean()
            }
            let res = await Cashbox.findOne({
                _id,
                ...user.legalObject ? {legalObject: user.legalObject, del: {$ne: true}} : {},
                ...user.role==='супервайзер'?{branch: {$in: districts}}:{},
                ...user.role==='кассир'?{branch: user.branch}:{}
            })
                .populate({
                    path: 'presentCashier',
                    select: 'name _id role'
                })
                .populate({
                    path: 'legalObject',
                    select: 'name _id'
                })
                .populate({
                    path: 'branch',
                    select: 'name _id'
                })
                .lean()
            return res
        }
    },
};

const resolversMutation = {
    addCashbox: async(parent, {name, legalObject, branch}, {user}) => {
        if(['admin', 'superadmin', 'оператор'].includes(user.role)&&user.add) {
           let _object = new Cashbox({
                name,
                legalObject,
                branch,
                cash: 0
            });

           let uniqueId = (await Branch.findById(branch).select('uniqueId').lean()).uniqueId
           if(uniqueId) {
                let sync = await registerKkm({
                    spId: uniqueId,
                    name,
                    number: _object._id.toString(),
                    regType: '1'
                })
                _object.sync = sync.sync
                _object.syncMsg = sync.syncMsg
                if (sync.rnmNumber) _object.rnmNumber = sync.rnmNumber
           }
           else {
               _object.sync = false
               _object.syncMsg = 'Нет uniqueId'
           }

            _object = await Cashbox.create(_object)
            let history = new History({
                who: user._id,
                where: _object._id,
                what: 'Создание'
            });
            await History.create(history)
            return _object._id
        }
        return 'ERROR'
    },
    setCashbox: async(parent, {_id, name, branch}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'супервайзер', 'оператор'].includes(user.role)&&user.add) {
            let object = await Cashbox.findOne({_id, presentCashier: null})
            if(object) {
                let history = new History({
                    who: user._id,
                    where: object._id,
                    what: ''
                });
                if (name) {
                    history.what = `name:${object.name}→${name};`
                    object.name = name
                }
                if (branch) {
                    history.what = `${history.what} branch:${object.branch}→${branch};`
                    object.branch = branch
                }
                if (name || branch || !object.sync) {
                    let uniqueId = (await Branch.findById(object.branch).select('uniqueId').lean()).uniqueId
                    if (uniqueId) {
                        let sync = await registerKkm({
                            spId: uniqueId,
                            name: object.name,
                            number: object._id.toString(),
                            regType: !object.rnmNumber ? '1' : '2',
                            rnmNumber: object.rnmNumber
                        })
                        object.sync = sync.sync
                        object.syncMsg = sync.syncMsg
                        if (sync.rnmNumber && !object.rnmNumber) object.rnmNumber = sync.rnmNumber
                    }
                    else {
                        object.sync = false
                        object.syncMsg = 'Нет uniqueId'
                    }
                }
                await object.save();
                await History.create(history)
                return 'OK'
            }
        }
        return 'ERROR'
    },
    clearCashbox: async(parent, { _id }, {user}) => {
        if('superadmin'===user.role) {
            await Cashbox.updateOne(
                {
                    _id,
                    presentCashier: null
                },
                {
                    sale: 0,
                    consignation: 0,
                    paidConsignation: 0,
                    prepayment: 0,
                    returned: 0,
                    buy: 0,
                    returnedBuy: 0
                }
            )
            let history = new History({
                who: user._id,
                where: _id,
                what: 'Обнуление'
            });
            await History.create(history)
            return 'OK'
        }
        return 'ERROR'
    },
    deleteCashbox: async(parent, { _id }, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let object = await Cashbox.findOne({_id, presentCashier: null})
            if(object) {
                object.del = true

                let uniqueId = (await Branch.findById(object.branch).select('uniqueId').lean()).uniqueId
                if (uniqueId) {
                    let sync = await registerKkm({
                        spId: uniqueId,
                        name: object.name,
                        number: object._id.toString(),
                        regType: '3',
                        rnmNumber: object.rnmNumber
                    })
                    object.sync = sync.sync
                    object.syncMsg = sync.syncMsg
                    if (sync.rnmNumber && !object.rnmNumber) object.rnmNumber = sync.rnmNumber
                }
                else {
                    object.sync = false
                    object.syncMsg = 'Нет uniqueId'
                }

                await object.save()
                await IntegrationObject.deleteOne({cashbox: _id})
                let history = new History({
                    who: user._id,
                    where: _id,
                    what: 'Удаление'
                });
                await History.create(history)
                return 'OK'
            }
        }
        return 'ERROR'
    },
    restoreCashbox: async(parent, { _id }, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let object = await Cashbox.findOne({_id})
            object.del = false

            let uniqueId = (await Branch.findById(object.branch).select('uniqueId').lean()).uniqueId
            if (uniqueId) {
                let sync = await registerKkm({
                    spId: uniqueId,
                    name: object.name,
                    number: object._id.toString(),
                    regType: !object.rnmNumber?'1':'2',
                    rnmNumber: object.rnmNumber
                })
                object.sync = sync.sync
                object.syncMsg = sync.syncMsg
                if (sync.rnmNumber && !object.rnmNumber) object.rnmNumber = sync.rnmNumber
            }
            else {
                object.sync = false
                object.syncMsg = 'Нет uniqueId'
            }

            await object.save()
            let history = new History({
                who: user._id,
                where: _id,
                what: 'Восстановление'
            });
            await History.create(history)
            return 'OK'
        }
        return 'ERROR'
    }
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;