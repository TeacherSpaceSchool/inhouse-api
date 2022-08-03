const MoneyRecipient = require('../models/moneyRecipient');
const History = require('../models/history');

const type = `
  type MoneyRecipient {
    _id: ID
    createdAt: Date
    name: String
  }
`;

const query = `
    moneyRecipients(search: String, skip: Int): [MoneyRecipient]
    moneyRecipientsCount(search: String): Int
`;

const mutation = `
    addMoneyRecipient(name: String!): MoneyRecipient
    setMoneyRecipient(_id: ID!, name: String!): String
    deleteMoneyRecipient(_id: ID!): String
`;

const resolvers = {
    moneyRecipients: async(parent, {search, skip}, {user}) => {
        if(['admin'].includes(user.role)) {
            return await MoneyRecipient.find({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort('name')
                .lean()
        }
    },
    moneyRecipientsCount: async(parent, {search}, {user}) => {
        if(['admin'].includes(user.role)) {
            return await MoneyRecipient.countDocuments({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
            })
                .lean()
        }
        return 0
    },
};

const resolversMutation = {
    addMoneyRecipient: async(parent, {name}, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = new MoneyRecipient({
                name
            });
            object = await MoneyRecipient.create(object)
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
    setMoneyRecipient: async(parent, {_id, name}, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await MoneyRecipient.findOne({
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
    deleteMoneyRecipient: async(parent, { _id }, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await MoneyRecipient.findOne({_id})
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