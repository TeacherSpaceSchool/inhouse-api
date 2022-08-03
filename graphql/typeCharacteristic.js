const TypeCharacteristic = require('../models/typeCharacteristic');
const History = require('../models/history');

const type = `
  type TypeCharacteristic {
      _id: ID
      createdAt: Date
      name: String
  }
`;

const query = `
    typeCharacteristics(skip: Int, search: String): [TypeCharacteristic]
    typeCharacteristicsCount(search: String): Int
`;

const mutation = `
    addTypeCharacteristic(name: String!): TypeCharacteristic
    setTypeCharacteristic(_id: ID!, name: String!): String
    deleteTypeCharacteristic(_id: ID!): String
`;

const resolvers = {
    typeCharacteristics: async(parent, {skip, search}, {user}) => {
        if(user.role) {
            return await TypeCharacteristic.find({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{}
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort('name')
                .lean()
        }
    },
    typeCharacteristicsCount: async(parent, {search}, {user}) => {
        if(user.role) {
            return await TypeCharacteristic.countDocuments({
                ...search?{name: {'$regex': search, '$options': 'i'}}:{}
            })
                .lean()
        }
    }
};

const resolversMutation = {
    addTypeCharacteristic: async(parent, {name}, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = new TypeCharacteristic({
                name
            });
            object = await TypeCharacteristic.create(object)
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
    setTypeCharacteristic: async(parent, {_id, name}, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await TypeCharacteristic.findById(_id)
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
    deleteTypeCharacteristic: async(parent, { _id }, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await TypeCharacteristic.findOne({_id})
            if(object) {
                await TypeCharacteristic.deleteOne({_id})
                await History.deleteMany({where: _id})
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