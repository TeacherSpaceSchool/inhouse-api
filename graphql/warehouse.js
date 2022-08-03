const Warehouse = require('../models/warehouse');
const BalanceItem = require('../models/balanceItem');
const History = require('../models/history');

const type = `
  type Warehouse {
    _id: ID
    createdAt: Date
    name: String
    store: Store
    item: Item
    amount: Float
  }
`;

const query = `
    warehouses(search: String, skip: Int, store: ID): [Warehouse]
    warehousesCount(search: String, store: ID): Int
`;

const mutation = `
    addWarehouse(name: String!, store: ID!): Warehouse
    setWarehouse(_id: ID!, name: String!): String
    deleteWarehouse(_id: ID!): String
`;

const resolvers = {
    warehouses: async(parent, {search, skip, store}, {user}) => {
        if(['admin'].includes(user.role)) {
            if(user.store) store = user.store
            let res =  await Warehouse.find({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
                ...store?{store}:{},
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .sort('name')
                .lean()
            return res
        }
    },
    warehousesCount: async(parent, {search, store}, {user}) => {
        if(['admin'].includes(user.role)) {
            if(user.store) store = user.store
            return await Warehouse.countDocuments({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
                ...store?{store}:{},
            })
                .lean()
        }
        return 0
    },
};

const resolversMutation = {
    addWarehouse: async(parent, {name, store}, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = new Warehouse({
                name,
                store
            });
            object = await Warehouse.create(object)
            let history = new History({
                who: user._id,
                where: object._id,
                what: 'Создание'
            });
            await History.create(history)
            return await Warehouse.findById(object._id)
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .lean()
        }
        return 'ERROR'
    },
    setWarehouse: async(parent, {_id, name}, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await Warehouse.findOne({
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
    deleteWarehouse: async(parent, { _id }, {user}) => {
        if(['admin'].includes(user.role)) {
            if(await BalanceItem.countDocuments({warehouse: _id, amount: {$ne: 0}}).lean())
                return 'USED'
            let object = await Warehouse.findOne({_id})
            if(object) {
                object.del = true
                await object.save()
                await BalanceItem.deleteMany({warehouse: _id})
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