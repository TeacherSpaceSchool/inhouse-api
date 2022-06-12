const District = require('../models/district');
const Branch = require('../models/branch');
const User = require('../models/user');
const IntegrationObject = require('../models/integrationObject');

const type = `
  type District {
    _id: ID
    createdAt: Date
    legalObject: LegalObject
    name: String
    branchs: [Branch]
    cashiers: [User]
    supervisors: [User]
  }
`;

const query = `
    branchsForDistricts(skip: Int, search: String, legalObject: ID!): [Branch]
    cashiersForDistricts(skip: Int, search: String, legalObject: ID!): [User]
    districts(skip: Int, search: String, legalObject: ID): [District]
    districtsCount(search: String, legalObject: ID): Int
    district(_id: ID!): District
`;

const mutation = `
    addDistrict(legalObject: ID!, name: String!, branchs: [ID]!, cashiers: [ID]!, supervisors: [ID]!): String
    setDistrict(_id: ID!, name: String, branchs: [ID], cashiers: [ID], supervisors: [ID]): String
    deleteDistrict(_id: ID!): String
`;

const resolvers = {
    branchsForDistricts: async(parent, {skip, search, legalObject}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'супервайзер'].includes(user.role)) {
            if(user.legalObject) legalObject = user.legalObject
            let usedBranchs = await District.find({legalObject}).distinct('branchs').lean()
            return await Branch.find({
                _id: {$nin: usedBranchs},
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
    },
    cashiersForDistricts: async(parent, {skip, search, legalObject}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'супервайзер'].includes(user.role)) {
            if(user.legalObject) legalObject = user.legalObject
            let usedCashiers = await District.find({legalObject}).distinct('cashiers').lean()
            return await User.find({
                role: 'кассир',
                _id: {$nin: usedCashiers},
                ...search && search.length ? {name: {'$regex': search, '$options': 'i'}} : {},
                ...legalObject ? {legalObject} : {},
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
    },
    districts: async(parent, {skip, search, legalObject}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'супервайзер'].includes(user.role)) {
            if(user.legalObject) legalObject = user.legalObject
            let searchUsers = [], searchBranchs = [], districts = []
            if(user.role==='супервайзер'){
                districts = await District.find({
                    supervisors: user._id,
                })
                    .distinct('_id')
                    .lean()
            }
            if(search&&search.length){
                searchUsers = await User.find({name: {'$regex': search, '$options': 'i'}}).distinct('_id').lean()
                searchBranchs = await Branch.find({name: {'$regex': search, '$options': 'i'}}).distinct('_id').lean()
            }
            return await District.find({
                ...user.role==='супервайзер'?{_id: {$in: districts}}:{},
                ...search&&search.length?{$or: [
                    {name: {'$regex': search, '$options': 'i'}},
                    {cashiers: {$in: searchUsers}},
                    {supervisors: {$in: searchUsers}},
                    {branchs: {$in: searchBranchs}},
                ]}:{},
                ...legalObject?{legalObject}:{},
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .sort('name')
                .populate({
                    path: 'legalObject',
                    select: 'name _id'
                })
                .populate({
                    path: 'branchs',
                    select: 'name _id'
                })
                .populate({
                    path: 'cashiers',
                    select: 'name _id'
                })
                .populate({
                    path: 'supervisors',
                    select: 'name _id'
                })
                .lean()
        }
    },
    districtsCount: async(parent, {search, legalObject}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'супервайзер'].includes(user.role)) {
            if(user.legalObject) legalObject = user.legalObject
            let searchUsers = [], searchBranchs = [], districts = []
            if(user.role==='супервайзер'){
                districts = await District.find({
                    supervisors: user._id,
                })
                    .distinct('_id')
                    .lean()
            }
            if(search&&search.length){
                searchUsers = await User.find({name: {'$regex': search, '$options': 'i'}}).distinct('_id').lean()
                searchBranchs = await Branch.find({name: {'$regex': search, '$options': 'i'}}).distinct('_id').lean()
            }
            return await District.countDocuments({
                ...user.role==='супервайзер'?{_id: {$in: districts}}:{},
                ...search&&search.length?{$or: [
                    {name: {'$regex': search, '$options': 'i'}},
                    {cashiers: {$in: searchUsers}},
                    {supervisors: {$in: searchUsers}},
                    {branchs: {$in: searchBranchs}},
                ]}:{},
                ...legalObject?{legalObject}:{},
            })
                .lean()
        }
    },
    district: async(parent, {_id}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'супервайзер'].includes(user.role)) {
            let districts = []
            if(user.role==='супервайзер'){
                districts = await District.find({
                    supervisors: user._id,
                })
                    .distinct('_id')
                    .lean()
            }
            return await District.findOne({
                ...user.role==='супервайзер'?{_id: {$in: districts}}:{},
                ...user.legalObject?{legalObject: user.legalObject}:{},
                _id
            })
                .populate({
                    path: 'legalObject',
                    select: 'name _id'
                })
                .populate({
                    path: 'branchs',
                    populate: {
                        path: 'legalObject',
                        select: 'name _id'
                    }
                })
                .populate({
                    path: 'cashiers',
                    select: 'name _id'
                })
                .populate({
                    path: 'supervisors',
                    select: 'name _id'
                })
                .lean()
        }
    },
};

const resolversMutation = {
    addDistrict: async(parent, {legalObject, name, branchs, cashiers, supervisors}, {user}) => {
        if(['admin', 'superadmin', 'управляющий'].includes(user.role)&&user.add) {
            let _object = new District({
                legalObject, branchs, cashiers, supervisors, name
            });
            _object = await District.create(_object)
            return _object._id
        }
        return 'ERROR'
    },
    setDistrict: async(parent, {_id, name, branchs, cashiers, supervisors}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'супервайзер'].includes(user.role)&&user.add) {
            let object = await District.findOne({
                ...user.role==='супервайзер'?{supervisors: user._id}:{},
                _id
            })
            if(name)object.name = name
            if(branchs)object.branchs = branchs
            if(cashiers)object.cashiers = cashiers
            if(supervisors)object.supervisors = supervisors
            await object.save();
            return 'OK'
        }
        return 'ERROR'
    },
    deleteDistrict: async(parent, { _id }, {user}) => {
        if(['admin', 'superadmin', 'управляющий'].includes(user.role)&&user.add) {
            await District.deleteOne({_id})
            await IntegrationObject.deleteOne({district: _id})
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