const Category = require('../models/category');
const Item = require('../models/item');
const History = require('../models/history');

const type = `
  type Category {
      _id: ID
      createdAt: Date
      name: String
  }
`;

const query = `
    categorys(skip: Int, search: String): [Category]
    categorysCount(search: String): Int
`;

const mutation = `
    addCategory(name: String!): Category
    setCategory(_id: ID!, name: String!): String
    deleteCategory(_id: ID!): String
`;

const resolvers = {
    categorys: async(parent, {skip, search}, {user}) => {
        if(user.role) {
            return await Category.find({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{}
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort('name')
                .lean()
        }
    },
    categorysCount: async(parent, {search}, {user}) => {
        if(['admin'].includes(user.role)) {
            return await Category.countDocuments({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{}
            })
                .lean()
        }
    }
};

const resolversMutation = {
    addCategory: async(parent, {name}, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = new Category({
                name
            });
            object = await Category.create(object)
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
    setCategory: async(parent, {_id, name}, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await Category.findById(_id)
            if(object) {
                let history = new History({
                    who: user._id,
                    where: object._id,
                    what: `Название:${object.name}→${name};\n`
                });
                object.name = name
                await object.save();
                await History.create(history)
                return 'OK'
            }
        }
        return 'ERROR'
    },
    deleteCategory: async(parent, { _id }, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await Category.findOne({_id})
            if(object) {
                object.del = true
                await object.save()
                let history = new History({
                    who: user._id,
                    where: _id,
                    what: 'Удаление'
                });
                await Item.updateMany({category: _id}, {category: undefined})
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