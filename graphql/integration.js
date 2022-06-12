const Integration = require('../models/integration');
const IntegrationObject = require('../models/integrationObject');
const LegalObject = require('../models/legalObject');

const type = `
  type Integration {
    _id: ID
    createdAt: Date
    legalObject: LegalObject
    IP: String
    password: String
  }
`;

const query = `
    legalObjectsForIntegrations(search: String): [LegalObject]
    integrations(skip: Int, search: String, legalObject: ID): [Integration]
    integrationsCount(search: String, legalObject: ID): Int
    integration(_id: ID!): Integration
`;

const mutation = `
    addIntegration(legalObject: ID!, IP: String!, password: String!): String
    setIntegration(_id: ID!, IP: String, password: String): String
    deleteIntegration(_id: ID!): String
`;

const resolvers = {
    legalObjectsForIntegrations: async(parent, {search}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let usedLegalObjects = await Integration.find().distinct('legalObject').lean()
            return await LegalObject.find({
                _id: {$nin: usedLegalObjects},
                ...search && search.length ? {$or: [{name: {'$regex': search, '$options': 'i'}}, {inn: {'$regex': search, '$options': 'i'}}]} : {},
                del: {$ne: true},
            })
                .sort('name')
                .select('_id name')
                .lean()
        }
    },
    integrations: async(parent, {skip, search, legalObject}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let searchLegalObject = []
            if(search&&search.length){
                searchLegalObject = await LegalObject.find({$or: [{name: {'$regex': search, '$options': 'i'}}, {inn: {'$regex': search, '$options': 'i'}}]}).distinct('_id').lean()
            }
            return await Integration.find({
                ...search&&search.length?{$or: [{legalObject: {$in: searchLegalObject}}, {password: {'$regex': search, '$options': 'i'}}]}:{},
                ...legalObject?{legalObject}:{},
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .sort('-createdAt')
                .populate({
                    path: 'legalObject',
                    select: '_id createdAt name inn address phone status del'
                })
                .lean()
        }
    },
    integrationsCount: async(parent, {search, legalObject}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let searchLegalObject = []
            if(search&&search.length){
                searchLegalObject = await LegalObject.find({$or: [{name: {'$regex': search, '$options': 'i'}}, {inn: {'$regex': search, '$options': 'i'}}]}).distinct('_id').lean()
            }
            return await Integration.countDocuments({
                ...search&&search.length?{$or: [{legalObject: {$in: searchLegalObject}}, {password: {'$regex': search, '$options': 'i'}}]}:{},
                ...legalObject?{legalObject}:{},
            })
                .lean()
        }
    },
    integration: async(parent, {_id}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            return await Integration.findOne({_id})
                .populate({
                    path: 'legalObject',
                    select: 'name _id'
                })
                .lean()
        }
    },
};

const resolversMutation = {
    addIntegration: async(parent, {legalObject, IP, password}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add&&password.length) {
            let _object = new Integration({
                legalObject, IP, password
            });
            _object = await Integration.create(_object)
            return _object._id
        }
        return 'ERROR'
    },
    setIntegration: async(parent, {_id, IP, password}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let object = await Integration.findById(_id)
            if(IP!=null)object.IP = IP
            if(password)object.password = password
            await object.save();
            return 'OK'
        }
        return 'ERROR'
    },
    deleteIntegration: async(parent, { _id }, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let legalObject = (await Integration.findOne({_id}).select('legalObject').lean()).legalObject
            await Integration.deleteOne({_id})
            await IntegrationObject.deleteMany({legalObject})
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