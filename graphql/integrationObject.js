const IntegrationObject = require('../models/integrationObject');
const Branch = require('../models/branch');
const User = require('../models/user');
const Item = require('../models/item');
const District = require('../models/district');
const Cashbox = require('../models/cashbox');
const Client = require('../models/client');

const type = `
  type IntegrationObject {
    _id: ID
    createdAt: Date
    type: String
    legalObject: LegalObject
    UUID: String
    branch: Branch
    user: User
    cashbox: Cashbox
    client: Client
    item: Item
    district: District
  }
`;

const query = `
    branchsForIntegrationObjects(search: String, legalObject: ID!): [Branch]
    itemsForIntegrationObjects(search: String, legalObject: ID!): [Item]
    districtsForIntegrationObjects(search: String, legalObject: ID!): [District]
    usersForIntegrationObjects(search: String, legalObject: ID!): [User]
    cashboxesForIntegrationObjects(search: String, legalObject: ID!): [Cashbox]
    clientsForIntegrationObjects(search: String, legalObject: ID!): [Client]
    integrationObjects(skip: Int, search: String, legalObject: ID!, type: String): [IntegrationObject]
    integrationObjectsCount(search: String, legalObject: ID!, type: String): Int
    integrationObject(_id: ID!): IntegrationObject
`;

const mutation = `
    addIntegrationObject(legalObject: ID!, UUID: String!, branch: ID, user: ID, item: ID, district: ID, cashbox: ID, client: ID, type: String!): String
    setIntegrationObject(_id: ID!, UUID: String): String
    deleteIntegrationObject(_id: ID!): String
`;

const resolvers = {
    itemsForIntegrationObjects: async(parent, {search, legalObject}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let usedItems = await IntegrationObject.find({legalObject}).distinct('item').lean()
            return await Item.find({
                _id: {$nin: usedItems},
                ...search && search.length ? {name: {'$regex': search, '$options': 'i'}} : {},
                del: {$ne: true},
            })
                .sort('name')
                .select('name _id')
                .lean()
        }
    },
    districtsForIntegrationObjects: async(parent, {search, legalObject}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let usedDistricts = await IntegrationObject.find({legalObject}).distinct('district').lean()
            return await District.find({
                _id: {$nin: usedDistricts},
                ...search && search.length ? {name: {'$regex': search, '$options': 'i'}} : {},
                del: {$ne: true},
            })
                .sort('name')
                .select('name _id')
                .lean()
        }
    },
    clientsForIntegrationObjects: async(parent, {search, legalObject}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let usedClients = await IntegrationObject.find({legalObject}).distinct('client').lean()
            return await Client.find({
                _id: {$nin: usedClients},
                ...search && search.length ? {$or: [{name: {'$regex': search, '$options': 'i'}}, {inn: {'$regex': search, '$options': 'i'}}]} : {},
                del: {$ne: true},
            })
                .sort('name')
                .select('name _id inn')
                .lean()
        }
    },
    cashboxesForIntegrationObjects: async(parent, {search, legalObject}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let usedCashboxes = await IntegrationObject.find({legalObject}).distinct('cashbox').lean()
            return await Cashbox.find({
                _id: {$nin: usedCashboxes},
                ...search&&search.length?{$or: [{rnmNumber: {'$regex': search, '$options': 'i'}}, {name: {'$regex': search, '$options': 'i'}}]}:{},
                del: {$ne: true},
            })
                .sort('name')
                .select('name _id')
                .lean()
        }
    },
    usersForIntegrationObjects: async(parent, {search, legalObject}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let usedCashiers = await IntegrationObject.find({legalObject}).distinct('user').lean()
            return await User.find({
                _id: {$nin: usedCashiers},
                ...search && search.length ? {name: {'$regex': search, '$options': 'i'}} : {},
                role: {$in: ['кассир', 'супервайзер']},
                del: {$ne: true},
            })
                .sort('name')
                .select('name _id')
                .lean()
        }
    },
    branchsForIntegrationObjects: async(parent, {search, legalObject}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let usedBranchs = await IntegrationObject.find({legalObject}).distinct('branch').lean()
            return await Branch.find({
                _id: {$nin: usedBranchs},
                ...search && search.length ? {name: {'$regex': search, '$options': 'i'}} : {},
                del: {$ne: true},
            })
                .sort('name')
                .select('name _id')
                .lean()
        }
    },
    integrationObjects: async(parent, {skip, search, legalObject, type}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let searchClients = []
            let searchCashboxes = []
            let searchCashiers = []
            let searchBranchs = []
            if(search&&search.length){
                searchClients = await Client.find({$or: [{name: {'$regex': search, '$options': 'i'}}, {inn: {'$regex': search, '$options': 'i'}}]}).distinct('_id').lean()
                searchCashboxes = await Cashbox.find({$or: [{rnmNumber: {'$regex': search, '$options': 'i'}}, {name: {'$regex': search, '$options': 'i'}}]}).distinct('_id').lean()
                searchCashiers = await User.find({name: {'$regex': search, '$options': 'i'}}).distinct('_id').lean()
                searchBranchs = await Branch.find({name: {'$regex': search, '$options': 'i'}}).distinct('_id').lean()
            }
            return await IntegrationObject.find({
                ...search&&search.length?{$or: [
                    {UUID: {'$regex': search, '$options': 'i'}},
                    {cashbox: {$in: searchCashboxes}},
                    {branch: {$in: searchBranchs}},
                    {user: {$in: searchCashiers}},
                    {client: {$in: searchClients}}
                ]}:{},
                ...type&&type.length?{type}:{},
                legalObject
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .sort('-createdAt')
                .populate({
                    path: 'cashbox',
                    select: 'name _id'
                })
                .populate({
                    path: 'branch',
                    select: 'name _id'
                })
                .populate({
                    path: 'user',
                    select: 'name _id'
                })
                .populate({
                    path: 'client',
                    select: 'name _id'
                })
                .populate({
                    path: 'item',
                    select: 'name _id'
                })
                .populate({
                    path: 'district',
                    select: 'name _id'
                })
                .populate({
                    path: 'legalObject',
                    select: 'name _id'
                })
                .lean()
        }
    },
    integrationObjectsCount: async(parent, {search, legalObject, type}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let searchClients = []
            let searchCashboxes = []
            let searchCashiers = []
            let searchBranchs = []
            if(search&&search.length){
                searchClients = await Client.find({name: {'$regex': search, '$options': 'i'}}).distinct('_id').lean()
                searchCashboxes = await Cashbox.find({$or: [{rnmNumber: {'$regex': search, '$options': 'i'}}, {name: {'$regex': search, '$options': 'i'}}]}).distinct('_id').lean()
                searchCashiers = await User.find({name: {'$regex': search, '$options': 'i'}}).distinct('_id').lean()
                searchBranchs = await Branch.find({name: {'$regex': search, '$options': 'i'}}).distinct('_id').lean()
            }
            return await IntegrationObject.countDocuments({
                ...search&&search.length?{$or: [
                    {UUID: {'$regex': search, '$options': 'i'}},
                    {cashbox: {$in: searchCashboxes}},
                    {branch: {$in: searchBranchs}},
                    {user: {$in: searchCashiers}},
                    {client: {$in: searchClients}}
                ]}:{},
                ...type&&type.length?{type}:{},
                legalObject
            })
                .lean()
        }
    },
    integrationObject: async(parent, {_id}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            return await IntegrationObject.findOne({
                _id
            })
                .populate({
                    path: 'cashbox',
                    select: 'name _id'
                })
                .populate({
                    path: 'branch',
                    select: 'name _id'
                })
                .populate({
                    path: 'user',
                    select: 'name _id'
                })
                .populate({
                    path: 'client',
                    select: 'name _id'
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
    addIntegrationObject: async(parent, ctx, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let _object = new IntegrationObject({
                legalObject: ctx.legalObject, UUID: ctx.UUID, branch: ctx.branch, user: ctx.user, cashbox: ctx.cashbox, client: ctx.client, type: ctx.type, item: ctx.item, district: ctx.district
            });
            await IntegrationObject.create(_object)
            return 'OK'
        }
        return 'ERROR'
    },
    setIntegrationObject: async(parent, {_id, UUID}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let object = await IntegrationObject.findById(_id)
            if(UUID)object.UUID = UUID
            await object.save();
            return 'OK'
        }
        return 'ERROR'
    },
    deleteIntegrationObject: async(parent, { _id }, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            await IntegrationObject.deleteOne({_id})
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