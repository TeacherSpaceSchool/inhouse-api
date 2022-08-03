const Store = require('../models/store');
const Warehouse = require('../models/warehouse');
const User = require('../models/user');
const Cashbox = require('../models/cashbox');
const WayItem = require('../models/wayItem');
const Installment = require('../models/installment');
const History = require('../models/history');

const type = `
  type Store {
    _id: ID
    createdAt: Date
    name: String
  }
`;

const query = `
    stores(search: String, skip: Int): [Store]
    storesCount(search: String): Int
`;

const mutation = `
    addStore(name: String!): Store
    setStore(_id: ID!, name: String!): String
    deleteStore(_id: ID!): String
`;

const resolvers = {
    stores: async(parent, {search, skip}, {user}) => {
        if(['admin'].includes(user.role)) {
            return await Store.find({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort('name')
                .lean()
        }
    },
    storesCount: async(parent, {search}, {user}) => {
        if(['admin'].includes(user.role)) {
            return await Store.countDocuments({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
            })
                .lean()
        }
        return 0
    },
};

const resolversMutation = {
    addStore: async(parent, {name}, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = new Store({
                name
            });
            object = await Store.create(object)
            let history = new History({
                who: user._id,
                where: object._id,
                what: 'Создание'
            });
            await History.create(history)
            return object
        }
        return {_id: 'ERROR'}
    },
    setStore: async(parent, {_id, name}, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await Store.findOne({
                _id,
            })
            if(object) {
                let history = new History({
                    who: user._id,
                    where: object._id,
                    what: `Название:${object.name}→${name};`
                });
                object.name = name
                await object.save();
                await History.create(history)
                return 'OK'
            }
        }
        return 'ERROR'
    },
    deleteStore: async(parent, { _id }, {user}) => {
        if(['admin'].includes(user.role)) {

            let USED
            if(!USED)
                USED = await WayItem.countDocuments({store: _id/*, status: 'в пути'*/}).lean()
            if(!USED)
                USED = await Installment.countDocuments({store: _id/*, status: 'обработка'*/}).lean()
            if(!USED)
                USED = await Warehouse.countDocuments({store: _id/*, del: {$ne: true}*/}).lean()
            if(!USED)
                USED = await Cashbox.countDocuments({store: _id/*, del: {$ne: true}*/}).lean()
            if(!USED)
                USED = await User.countDocuments({store: _id/*, del: {$ne: true}*/}).lean()
            if(USED)
                return 'USED'

            let object = await Store.findById(_id)
            if(object) {
                object.del = true
                await object.save()
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
    }
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;