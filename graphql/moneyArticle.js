const MoneyArticle = require('../models/moneyArticle');
const History = require('../models/history');

const type = `
  type MoneyArticle {
      _id: ID
      createdAt: Date
      name: String
  }
`;

const query = `
    moneyArticles(skip: Int, search: String): [MoneyArticle]
    moneyArticlesCount(search: String): Int
`;

const mutation = `
    addMoneyArticle(name: String!): MoneyArticle
    setMoneyArticle(_id: ID!, name: String!): String
    deleteMoneyArticle(_id: ID!): String
`;

const resolvers = {
    moneyArticles: async(parent, {skip, search}, {user}) => {
        if(['admin'].includes(user.role)) {
            return await MoneyArticle.find({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{}
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort('name')
                .lean()
        }
    },
    moneyArticlesCount: async(parent, {search}, {user}) => {
        if(['admin'].includes(user.role)) {
            return await MoneyArticle.countDocuments({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{}
            })
                .lean()
        }
    },
};

const resolversMutation = {
    addMoneyArticle: async(parent, {name}, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = new MoneyArticle({
                name
            });
            object = await MoneyArticle.create(object)
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
    setMoneyArticle: async(parent, {_id, name}, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await MoneyArticle.findById(_id)
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
    deleteMoneyArticle: async(parent, { _id }, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await MoneyArticle.findOne({_id})
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