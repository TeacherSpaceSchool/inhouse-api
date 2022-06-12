const LegalObject = require('../models/legalObject');
const IntegrationObject = require('../models/integrationObject');
const Integration = require('../models/integration');
const CategoryLegalObject = require('../models/categoryLegalObject');
const WorkShift = require('../models/workshift');
const User = require('../models/user');
const History = require('../models/history');
const District = require('../models/district');
const {tpDataByINNforBusinessActivity, registerTaxPayer} = require('../module/kkm');
const {ugnsTypes, taxpayerTypes} = require('../module/const');

const type = `
  type LegalObject {
    _id: ID
    createdAt: Date
    name: String
    inn: String
    email: [String]
    address: String
    phone: [String]
    status: String
    taxpayerType: String
    ugns: String
    responsiblePerson: String
    del: Boolean
    ofd: Boolean
    sync: Boolean
    syncMsg: String
    agent: User
    rateTaxe: String
    ndsType: String
    nspType: String
  }
  type INN {
    inn: String
    rayonCode: String
    fullName: String
    ZIP: String
    fullAddress: String
    message: String
  }
`;

const query = `
    tpDataByINNforBusinessActivity(inn: String): INN
    legalObjects(skip: Int, search: String): [LegalObject]
    legalObjectsCount(search: String): Int
    legalObjectsTrash(skip: Int, search: String): [LegalObject]
    legalObject(_id: ID!): LegalObject
`;

const mutation = `
    addLegalObject(name: String!, agent: ID, rateTaxe: String!, ndsType: String!, nspType: String!, ofd: Boolean!, inn: String!, address: String!, email: [String]!, phone: [String]!, taxpayerType: String!, ugns: String!, responsiblePerson: String!): String
    setLegalObject(_id: ID!, name: String, agent: ID, rateTaxe: String, ofd: Boolean, address: String, ndsType: String, nspType: String, email: [String], phone: [String], taxpayerType: String, ugns: String, responsiblePerson: String): String
    onoffLegalObject(_id: ID!): String
    deleteLegalObject(_id: ID!): String
    restoreLegalObject(_id: ID!): String
`;

const resolvers = {
    tpDataByINNforBusinessActivity: async(parent, {inn}, {user}) => {
        if(['admin', 'superadmin', 'оператор'].includes(user.role)) {
            return tpDataByINNforBusinessActivity(inn)
        }
    },
    legalObjects: async(parent, {skip, search}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)||search&&search.length>2&&user.role==='оператор') {
            return await LegalObject.find({
                ...search&&search.length?{$or: [{name: {'$regex': search, '$options': 'i'}}, {inn: {'$regex': search, '$options': 'i'}}]}:{},
                del: {$ne: true},
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .select('_id createdAt name inn address phone status del sync')
                .sort('name')
                .lean()
        }
        return []
    },
    legalObjectsCount: async(parent, {search}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)||search&&search.length>2&&user.role==='оператор') {
            return await LegalObject.countDocuments({
                ...search&&search.length?{$or: [{name: {'$regex': search, '$options': 'i'}}, {inn: {'$regex': search, '$options': 'i'}}]}:{},
                del: {$ne: true},
            })
                .lean()
        }
        return 0
    },
    legalObjectsTrash: async(parent, {skip, search}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)) {
            return await LegalObject.find({
                ...search&&search.length?{$or: [{name: {'$regex': search, '$options': 'i'}}, {inn: {'$regex': search, '$options': 'i'}}]}:{},
                del: true
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .select('_id createdAt name inn address phone status _id del sync')
                .sort('name')
                .lean()
        }
    },
    legalObject: async(parent, {_id}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'оператор', 'кассир'].includes(user.role)) {
            let res = await LegalObject.findOne({
                ...user.legalObject?{del: {$ne: true}} : {},
                _id: user.legalObject?user.legalObject:_id
            })
                .populate({
                    path: 'agent',
                    select: 'name _id'
                })
                .lean()
            return user.role==='кассир'?{
                _id: res._id,
                ndsType: res.ndsType,
                nspType: res.nspType
            }:res
        }
    },
};

const resolversMutation = {
    addLegalObject: async(parent, {name, agent, rateTaxe, ndsType, nspType, inn, address, phone, taxpayerType, ugns, email, responsiblePerson, ofd}, {user}) => {
        if(['admin', 'superadmin', 'оператор'].includes(user.role)&&user.add&&name!=='Налогоплательщик'&&!(await LegalObject.findOne({inn}).select('_id').lean())) {
            let _object = new LegalObject({
                name,
                inn,
                ndsType,
                nspType,
                address,
                agent,
                phone,
                status: 'active',
                taxpayerType,
                ugns,
                email,
                rateTaxe,
                responsiblePerson,
                ofd: ['superadmin', 'admin'].includes(user.role)?ofd:true
            });

            let sync = await registerTaxPayer({
                tpType: taxpayerTypes[taxpayerType],
                inn,
                name,
                ugns: ugnsTypes[ugns],
                legalAddress: address,
                responsiblePerson,
                regType: '1'
            })
            _object.sync = sync.sync
            _object.syncMsg = sync.syncMsg

            _object = await LegalObject.create(_object)
            let categoryLegalObject = new CategoryLegalObject({
                categorys: [],
                legalObject: _object._id
            });
            await CategoryLegalObject.create(categoryLegalObject)
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
    setLegalObject: async(parent, {_id, agent, rateTaxe, name, ndsType, nspType, address, phone, email, taxpayerType, ugns, ofd, responsiblePerson}, {user}) => {
        if(['admin', 'superadmin', 'оператор'].includes(user.role)&&user.add&&!(await WorkShift.findOne({legalObject: _id, end: null}).select('_id').lean())) {
            let object = await LegalObject.findById(_id)
            let history = new History({
                who: user._id,
                where: object._id,
                what: ''
            });
            if(name&&name!=='Налогоплательщик'){
                history.what = `name:${object.name}→${name};`
                object.name = name
            }
            if(agent!==object.agent){
                history.what = `${history.what} agent:${object.agent}→${agent};`
                object.agent = agent
            }
            if(address){
                history.what = `${history.what} address:${object.address}→${address};`
                object.address = address
            }
            if(ndsType){
                history.what = `${history.what} ndsType:${object.ndsType}→${ndsType};`
                object.ndsType = ndsType
            }
            if(nspType){
                history.what = `${history.what} nspType:${object.nspType}→${nspType};`
                object.nspType = nspType
            }
            if(rateTaxe){
                history.what = `${history.what} rateTaxe:${object.rateTaxe}→${rateTaxe};`
                object.rateTaxe = rateTaxe
            }
            if(phone){
                history.what = `${history.what} phone:${object.phone}→${phone};`
                object.phone = phone
            }
            if(taxpayerType){
                history.what = `${history.what} taxpayerType:${object.taxpayerType}→${taxpayerType};`
                object.taxpayerType = taxpayerType
            }
            if(ugns){
                history.what = `${history.what} ugns:${object.ugns}→${ugns};`
                object.ugns = ugns
            }
            if(responsiblePerson){
                history.what = `${history.what} responsiblePerson:${object.responsiblePerson}→${responsiblePerson};`
                object.responsiblePerson = responsiblePerson
            }
            if(email){
                history.what = `${history.what} email:${object.email}→${email};`
                object.email = email
            }
            if(['superadmin', 'admin'].includes(user.role)&&user.add&&ofd!==undefined){
                history.what = `${history.what} ofd:${object.ofd}→${ofd};`
                object.ofd = ofd
            }

            if(name||taxpayerType||ugns||address||responsiblePerson||!object.sync) {
                let sync = await registerTaxPayer({
                    tpType: taxpayerTypes[object.taxpayerType],
                    inn: object.inn,
                    name: object.name,
                    ugns: ugnsTypes[object.ugns],
                    legalAddress: object.address,
                    responsiblePerson: object.responsiblePerson,
                    regType: '2'
                })
                object.sync = sync.sync
                object.syncMsg = sync.syncMsg
            }

            await object.save();
            await History.create(history)
            return 'OK'
        }
        return 'ERROR'
    },
    onoffLegalObject: async(parent, { _id }, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add&&!(await WorkShift.findOne({legalObject: _id, end: null}).select('_id').lean())) {
            let object = await LegalObject.findOne({_id})
            object.status = object.status==='active'?'deactive':'active'
            if(object.status==='deactive')
                await User.updateMany({legalObject: _id}, {status: 'deactive'})
            object.save()
            let history = new History({
                who: user._id,
                where: object._id,
                what: object.status==='active'?'Включение':'Отключение'
            });
            await History.create(history)
            return 'OK'
        }
        return 'ERROR'
    },
    deleteLegalObject: async(parent, { _id }, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add&&!(await WorkShift.findOne({legalObject: _id, end: null}).select('_id').lean())) {
            let object = await LegalObject.findOne({_id})
            object.del = true

            let sync = await registerTaxPayer({
                tpType: taxpayerTypes[object.taxpayerType],
                inn: object.inn,
                name: object.name,
                ugns: ugnsTypes[object.ugns],
                legalAddress: object.address,
                responsiblePerson: object.responsiblePerson,
                regType: '3'
            })
            object.sync = sync.sync
            object.syncMsg = sync.syncMsg

            await object.save();
            await User.updateMany({legalObject: _id}, {status: 'deactive'})
            await Integration.deleteOne({legalObject: _id})
            await IntegrationObject.deleteMany({legalObject: _id})
            await District.deleteMany({legalObject: _id})
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
    restoreLegalObject: async(parent, { _id }, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let object = await LegalObject.findOne({_id})
            object.del = false

            let sync = await registerTaxPayer({
                tpType: taxpayerTypes[object.taxpayerType],
                inn: object.inn,
                name: object.name,
                ugns: ugnsTypes[object.ugns],
                legalAddress: object.address,
                responsiblePerson: object.responsiblePerson,
                regType: '2'
            })
            object.sync = sync.sync
            object.syncMsg = sync.syncMsg

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