const Branch = require('../models/branch');
const User = require('../models/user');
const WorkShift = require('../models/workshift');
const LegalObject = require('../models/legalObject');
const District = require('../models/district');
const IntegrationObject = require('../models/integrationObject');
const History = require('../models/history');
const {registerSalesPoint} = require('../module/kkm');
const {ugnsTypes, pTypes, bTypes} = require('../module/const');

const type = `
  type Branch {
    _id: ID
    createdAt: Date
    legalObject: LegalObject
    bType: String
    pType: String
    ugns: String
    name: String
    address: String
    geo: [Float]
    del: Boolean
    sync: Boolean
    syncMsg: String
    uniqueId: String
  }
`;

const query = `
    branchs(skip: Int, search: String, legalObject: ID): [Branch]
    branchsCount(search: String, legalObject: ID): Int
    branchsTrash(skip: Int, search: String): [Branch]
    branch(_id: ID!): Branch
`;

const mutation = `
    addBranch(legalObject: ID!, bType: String!, pType: String!, ugns: String!, name: String!, address: String!, geo: [Float]): String
    setBranch(_id: ID!, bType: String, pType: String, ugns: String, name: String, address: String, geo: [Float]): String
    deleteBranch(_id: ID!): String
    restoreBranch(_id: ID!): String
`;

const resolvers = {
    branchs: async(parent, {skip, search, legalObject}, {user}) => {
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
            return await Branch.find({
                ...user.role==='супервайзер'?{_id: {$in: districts}}:{},
                ...search&&search.length?{name: {'$regex': search, '$options': 'i'}}:{},
                ...legalObject?{legalObject}:{},
                del: {$ne: true},
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .sort('name')
                .populate({
                    path: 'legalObject',
                    select: 'name _id'
                })
                .lean()
        }
        return []
    },
    branchsCount: async(parent, {search, legalObject}, {user}) => {
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
            return await Branch.countDocuments({
                ...user.role==='супервайзер'?{_id: {$in: districts}}:{},
                ...search&&search.length?{name: {'$regex': search, '$options': 'i'}}:{},
                ...legalObject?{legalObject}:{},
                del: {$ne: true},
            })
                .lean()
        }
        return 0
    },
    branchsTrash: async(parent, {skip, search}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)) {
            return await Branch.find({
                ...search&&search.length?{name: {'$regex': search, '$options': 'i'}}:{},
                del: true
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .sort('name')
                .populate({
                    path: 'legalObject',
                    select: 'name _id'
                })
                .lean()
        }
    },
    branch: async(parent, {_id}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'супервайзер', 'оператор'].includes(user.role)) {
            let districts = []
            if(user.role==='супервайзер'){
                districts = await District.find({
                    supervisors: user._id,
                })
                    .distinct('branchs')
                    .lean()
            }
            return await Branch.findOne({
                ...user.role==='супервайзер'?{$and: [{_id: {$in: districts}}, {_id}]}:{_id},
                ...user.legalObject?{legalObject: user.legalObject, del: {$ne: true}}:{}
            })
                .populate({
                    path: 'legalObject',
                    select: 'name _id'
                })
                .lean()
        }
    },
};

const resolversMutation = {
    addBranch: async(parent, {legalObject, bType, pType, ugns, name, address, geo}, {user}) => {
        if(['admin', 'superadmin', 'оператор'].includes(user.role)&&user.add) {
            let _object = new Branch({
                legalObject, bType, pType, ugns, name, address, geo
            });

            let inn = await LegalObject.findOne({_id: legalObject, sync: true}).select('inn').lean()
            if(inn) {
                inn = inn.inn
                let sync = await registerSalesPoint({
                    tpInn: inn,
                    name,
                    pType: pType === 'Прочее' ? '9999' : pTypes.indexOf(pType),
                    bType: bType === 'Прочее' ? '9999' : bTypes.indexOf(bType),
                    ugns: ugnsTypes[_object.ugns],
                    factAddress: address,
                    xCoordinate: _object.geo ? _object.geo[0] : null,
                    yCoordinate: _object.geo ? _object.geo[1] : null,
                    regType: '1'
                })
                _object.sync = sync.sync
                _object.syncMsg = sync.syncMsg
                if (sync.uniqueId) _object.uniqueId = sync.uniqueId
            }
            else {
                _object.sync = false
                _object.syncMsg = 'Нет ИНН'
            }

            _object = await Branch.create(_object)
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
    setBranch: async(parent, {_id, bType, pType, ugns, name, address, geo}, {user}) => {
        if(['admin', 'superadmin', 'оператор'].includes(user.role)&&user.add&&!(await WorkShift.findOne({branch: _id, end: null}).select('_id').lean())) {
            let object = await Branch.findById(_id)
            let history = new History({
                who: user._id,
                where: object._id,
                what: ''
            });
            if(name){
                history.what = `name:${object.name}→${name};`
                object.name = name
            }
            if(address){
                history.what = `${history.what} address:${object.address}→${address};`
                object.address = address
            }
            if(bType){
                history.what = `${history.what} bType:${object.bType}→${bType};`
                object.bType = bType
            }
            if(ugns){
                history.what = `${history.what} ugns:${object.ugns}→${ugns};`
                object.ugns = ugns
            }
            if(pType){
                history.what = `${history.what} pType:${object.pType}→${pType};`
                object.pType = pType
            }
            if(geo){
                history.what = `${history.what} Геолокация;`
                object.geo = geo
            }

            if(name||bType||pType||ugns||address||geo||!object.sync) {
                let inn = await LegalObject.findOne({_id: object.legalObject, sync: true}).select('inn').lean()
                if(inn) {
                    inn = inn.inn
                    let sync = await registerSalesPoint({
                        tpInn: inn,
                        name: object.name,
                        pType: object.pType === 'Прочее' ? '9999' : pTypes.indexOf(object.pType),
                        bType: object.bType === 'Прочее' ? '9999' : bTypes.indexOf(object.bType),
                        ugns: ugnsTypes[object.ugns],
                        factAddress: object.address,
                        xCoordinate: object.geo ? object.geo[0] : null,
                        yCoordinate: object.geo ? object.geo[1] : null,
                        regType: !object.uniqueId ? '1' : '2',
                        uniqueId: object.uniqueId
                    })
                    object.sync = sync.sync
                    object.syncMsg = sync.syncMsg
                    if (!object.uniqueId && sync.uniqueId) object.uniqueId = sync.uniqueId
                }
                else {
                    object.sync = false
                    object.syncMsg = 'Нет ИНН'
                }
            }

            await object.save();
            await History.create(history)
            return 'OK'
        }
        return 'ERROR'
    },
    deleteBranch: async(parent, { _id }, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add&&!(await WorkShift.findOne({branch: _id, end: null}).select('_id').lean())) {
            let object = await Branch.findOne({_id})
            object.del = true

            let inn = await LegalObject.findOne({_id: object.legalObject, sync: true}).select('inn').lean()
            if(inn) {
                inn = inn.inn
                let sync = await registerSalesPoint({
                    tpInn: inn,
                    name: object.name,
                    pType: object.pType==='Прочее'?'9999':pTypes.indexOf(object.pType),
                    bType: object.bType==='Прочее'?'9999':bTypes.indexOf(object.bType),
                    ugns: ugnsTypes[object.ugns],
                    factAddress: object.address,
                    xCoordinate: object.geo?object.geo[0]:null,
                    yCoordinate: object.geo?object.geo[1]:null,
                    regType: '3',
                    uniqueId: object.uniqueId
                })
                object.sync = sync.sync
                object.syncMsg = sync.syncMsg
                if(!object.uniqueId&&sync.uniqueId) object.uniqueId = sync.uniqueId
            }
            else {
                object.sync = false
                object.syncMsg = 'Нет ИНН'
            }
            await object.save();

            await User.updateMany({branch: _id}, {branch: null})
            await District.updateMany({branchs: _id}, {$pull: { branchs: _id}})
            await IntegrationObject.deleteOne({branch: _id})
            let history = new History({
                who: user._id,
                where: _id,
                what: 'Удаление'
            });
            await History.create(history)
            return 'OK'
        }
        return 'ERROR'
    },
    restoreBranch: async(parent, { _id }, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let object = await Branch.findOne({_id})
            object.del = false

            let inn = await LegalObject.findOne({_id: object.legalObject, sync: true}).select('inn').lean()
            if(inn) {
                inn = inn.inn
                let sync = await registerSalesPoint({
                    tpInn: inn,
                    name: object.name,
                    pType: object.pType==='Прочее'?'9999':pTypes.indexOf(object.pType),
                    bType: object.bType==='Прочее'?'9999':bTypes.indexOf(object.bType),
                    ugns: ugnsTypes[object.ugns],
                    factAddress: object.address,
                    xCoordinate: object.geo?object.geo[0]:null,
                    yCoordinate: object.geo?object.geo[1]:null,
                    regType: !object.uniqueId?'1':'2',
                    uniqueId: object.uniqueId
                })
                object.sync = sync.sync
                object.syncMsg = sync.syncMsg
                if(sync.uniqueId&&!object.uniqueId) object.uniqueId = sync.uniqueId
            }
            else {
                object.sync = false
                object.syncMsg = 'Нет ИНН'
            }

            await object.save();
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