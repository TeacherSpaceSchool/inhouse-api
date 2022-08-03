const Factory = require('../models/factory');
const Item = require('../models/item');
const History = require('../models/history');

const type = `
  type Factory {
    _id: ID
    createdAt: Date
    name: String
  }
`;

const query = `
    factorys(search: String, skip: Int): [Factory]
    factorysCount(search: String): Int
`;

const mutation = `
    addFactory(name: String!): Factory
    setFactory(_id: ID!, name: String): String
    deleteFactory(_id: ID!): String
`;

const resolvers = {
    factorys: async(parent, {search, skip}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)) {
            return await Factory.find({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort('name')
                .lean()
        }
    },
    factorysCount: async(parent, {search}, {user}) => {
        if(['admin'].includes(user.role)) {
            return await Factory.countDocuments({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
            })
                .lean()
        }
        return 0
    },
};

const resolversMutation = {
    addFactory: async(parent, {name}, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = new Factory({
                name
            });
            object = await Factory.create(object)
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
    setFactory: async(parent, {_id, name}, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await Factory.findOne({
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
    deleteFactory: async(parent, { _id }, {user}) => {
        if(['admin'].includes(user.role)) {

            if(await Item.countDocuments({factory: _id, del: {$ne: true}}).lean())
                return 'USED'

            let object = await Factory.findOne({_id})
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