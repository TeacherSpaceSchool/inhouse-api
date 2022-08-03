const Characteristic = require('../models/characteristic');
const History = require('../models/history');

const type = `
  type Characteristic {
      _id: ID
      createdAt: Date
      name: String
  }
`;

const query = `
    characteristics(skip: Int, search: String): [Characteristic]
    characteristicsCount(search: String): Int
`;

const mutation = `
    addCharacteristic(name: String!): Characteristic
    setCharacteristic(_id: ID!, name: String!): String
    deleteCharacteristic(_id: ID!): String
`;

const resolvers = {
    characteristics: async(parent, {skip, search}, {user}) => {
        if(user.role) {
            return await Characteristic.find({
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
            })
                .sort('name')
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .lean()
        }
    },
    characteristicsCount: async(parent, {search}, {user}) => {
        if(user.role) {
            return await Characteristic.countDocuments({
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
            })
                .lean()
        }
    },
};

const resolversMutation = {
    addCharacteristic: async(parent, {name}, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = new Characteristic({
                name,
            });
            object = await Characteristic.create(object)
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
    setCharacteristic: async(parent, {_id, name}, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await Characteristic.findById(_id)
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
    deleteCharacteristic: async(parent, { _id }, {user}) => {
        if(['admin'].includes(user.role)) {
            await Characteristic.deleteOne({_id})
            await History.deleteMany({where: _id})
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