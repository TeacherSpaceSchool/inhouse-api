const Cashbox = require('../models/cashbox');
const History = require('../models/history');

const type = `
  type Cashbox {
    _id: ID
    createdAt: Date
    name: String
    balance: [CurrencyBalance]
    store: Store
  }
`;

const query = `
    cashboxes(skip: Int, search: String, store: ID): [Cashbox]
    cashboxesCount(search: String, store: ID): Int
`;

const mutation = `
    addCashbox(name: String!, store: ID!): Cashbox
    setCashbox(_id: ID!, name: String, store: ID): String
    deleteCashbox(_id: ID!): String
`;

const resolvers = {
    cashboxes: async(parent, {skip, search, store}, {user}) => {
        if(['admin'].includes(user.role)) {
            if(user.store) store = user.store
            return await Cashbox.find({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
                ...store ? {store} : {}
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort('name')
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .lean()
        }
        return []
    },
    cashboxesCount: async(parent, {search, store}, {user}) => {
        if(['admin'].includes(user.role)) {
            if(user.store) store = user.store
            return await Cashbox.countDocuments({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
                ...store ? {store} : {}
            })
                .lean()
        }
        return 0
    }
};

const resolversMutation = {
    addCashbox: async(parent, {name, store}, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = new Cashbox({
                name,
                store,
                balance: []
            });
            object = await Cashbox.create(object)
            let history = new History({
                who: user._id,
                where: object._id,
                what: 'Создание'
            });
            await History.create(history)
            return await Cashbox.findById(object._id)
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .lean()
        }
        return {_id: 'ERROR'}
    },
    setCashbox: async(parent, {_id, name, store}, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await Cashbox.findOne({_id})
            if(object) {
                let history = new History({
                    who: user._id,
                    where: object._id,
                    what: ''
                });
                if (name&&object.name!==name) {
                    history.what = `Название:${object.name}→${name};\n`
                    object.name = name
                }
                if (store&&object.store!=store) {
                    history.what = `${history.what}Магазин:${object.store}→${store};`
                    object.store = store
                }
                await object.save();
                await History.create(history)
                return 'OK'
            }
        }
        return 'ERROR'
    },
    deleteCashbox: async(parent, { _id }, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await Cashbox.findOne({_id})
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
    },
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;