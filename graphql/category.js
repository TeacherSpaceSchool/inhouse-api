const Category = require('../models/category');
const Item = require('../models/item');

const type = `
  type Category {
      _id: ID
      createdAt: Date
      type: String
      name: String
      category: Category
      del: Boolean
  }
  type CategoryLegalObject {
    _id: ID
    createdAt: Date
    categorys: [Category]
    legalObject: LegalObject
  }
`;

const query = `
    categorys(skip: Int, search: String, category: ID, type: String): [Category]
    categorysCount(search: String, category: ID, type: String): Int
`;

const mutation = `
    addCategory(name: String!, category: ID, type: String!): Category
    setCategory(_id: ID!, name: String): String
    deleteCategory(_id: ID!): String
`;

const resolvers = {
    categorys: async(parent, {skip, search, category, type}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'кассир', 'супервайзер'].includes(user.role)) {
            return await Category.find({
                del: {$ne: true},
                category,
                ...type?{type}:{},
                ...search&&search.length?{name: {'$regex': search, '$options': 'i'}}:{}
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .sort('name')
                .populate({
                    path: 'category',
                    select: 'name _id'
                })
                .lean()
        }
    },
    categorysCount: async(parent, {search, category, type}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)) {
            return await Category.countDocuments({
                del: {$ne: true},
                category,
                ...type?{type}:{},
                ...search&&search.length?{name: {'$regex': search, '$options': 'i'}}:{}
            })
                .lean()
        }
    },
};

const resolversMutation = {
    addCategory: async(parent, {name, category, type}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let _object = new Category({
                type,
                name,
                category
            });
            _object = await Category.create(_object)
            if(_object.category)
                await _object.populate({path: 'category', select: 'name _id'})
            return _object
        }
    },
    setCategory: async(parent, {_id, name}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let object = await Category.findById(_id)
            if(name)object.name = name
            await object.save();
            return 'OK'
        }
        return 'ERROR'
    },
    deleteCategory: async(parent, { _id }, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let deleteCategorys = [_id], findCategorys = [_id]
            while (findCategorys.length){
                findCategorys = await Category.find({category: {$in: findCategorys}}).distinct('_id').lean()
                deleteCategorys = [...deleteCategorys, ...findCategorys]
            }
            await Category.updateMany({_id: {$in: deleteCategorys}}, {del: true})
            await Item.updateMany({category: {$in: deleteCategorys}}, {category: undefined})
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