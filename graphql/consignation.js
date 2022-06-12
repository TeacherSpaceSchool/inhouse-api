const Consignation = require('../models/consignation');
const Client = require('../models/client');

const type = `
  type Consignation {
    _id: ID
    createdAt: Date
    legalObject: LegalObject
    client: Client
    consignation: Float
    paid: Float
    debt: Float
  }
`;

const query = `
    consignation(_id: ID!): Consignation
    consignations(skip: Int, search: String, legalObject: ID): [Consignation]
    consignationsCount(search: String, legalObject: ID): Int
`;

const resolvers = {
    consignation: async(parent, {_id}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'кассир', 'супервайзер'].includes(user.role)) {
            let legalObject
            if(user.legalObject) legalObject = user.legalObject
            return await Consignation.findOne({
                $or: [{_id}, {client: _id}],
                ...legalObject ? {legalObject: legalObject} : {}
            })
                .populate({
                    path: 'legalObject',
                    select: 'name _id'
                })
                .populate({
                    path: 'client',
                    select: 'name _id'
                })
                .lean()
        }
    },
    consignations: async(parent, {skip, search, legalObject}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'кассир', 'супервайзер'].includes(user.role)) {
            if(user.legalObject) legalObject = user.legalObject
            let searchClients = []
            if(search&&search.length){
                searchClients = await Client.find({
                    $or: [{name: {'$regex': search, '$options': 'i'}}, {inn: {'$regex': search, '$options': 'i'}}]
                }).distinct('_id').lean()
            }
            return await Consignation.find({
                consignation: {$gt: 0},
                ...search&&search.length?{client: {$in: searchClients}}:{},
                ...legalObject ? {legalObject: legalObject} : {}
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .sort('-debt')
                .populate({
                    path: 'legalObject',
                    select: 'name _id'
                })
                .populate({
                    path: 'client',
                    select: 'name _id'
                })
                .lean()
        }
    },
    consignationsCount: async(parent, {search, legalObject}, {user}) => {
        if(['admin', 'superadmin', 'управляющий',/*].includes(user.role)||search&&search.length>2&&[*/'кассир', 'супервайзер'].includes(user.role)) {
            if(user.legalObject) legalObject = user.legalObject
            let searchClients = []
            if(search&&search.length){
                searchClients = await Client.find({
                    $or: [{name: {'$regex': search, '$options': 'i'}}, {inn: {'$regex': search, '$options': 'i'}}]
                }).distinct('_id').lean()
            }
            return await Consignation.countDocuments({
                consignation: {$gt: 0},
                ...search&&search.length?{client: {$in: searchClients}}:{},
                ...legalObject ? {legalObject: legalObject} : {}
            })
                .lean()
        }
        return 0
    },
};

module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;