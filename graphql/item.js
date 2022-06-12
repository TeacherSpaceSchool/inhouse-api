const Item = require('../models/item');
const CategoryLegalObject = require('../models/categoryLegalObject');
const Category = require('../models/category');
const ItemBarCode = require('../models/itemBarCode');
const IntegrationObject = require('../models/integrationObject');

const type = `
  type Item {
    _id: ID
    createdAt: Date
    quick: Boolean
    category: Category
    legalObject: LegalObject
    price: Float
    unit: String
    barCode: String
    name: String
    type: String
    del: Boolean
    editedPrice: Boolean
    tnved: String
    mark: Boolean
    priority: Int
 }
`;

const query = `
    items(skip: Int, limit: Int, search: String, category: ID, type: String, legalObject: ID, quick: Boolean): [Item]
    itemsCount(search: String, category: ID, type: String, legalObject: ID): Int
    item(_id: ID): Item
`;

const mutation = `
    addItem(legalObject: ID!, category: ID, quick: Boolean!, priority: Int!, price: Float!, tnved: String!, mark: Boolean!, editedPrice: Boolean!, unit: String!, barCode: String, name: String!, type: String!): String
    setItem(_id: ID!, category: ID, tnved: String, mark: Boolean, quick: Boolean, priority: Int, price: Float, editedPrice: Boolean, unit: String, barCode: String, name: String, type: String): String
    deleteItem(_id: ID!): String
`;

const resolvers = {
    items: async(parent, {skip, limit, search, category, type, legalObject, quick}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'кассир', 'супервайзер'].includes(user.role)) {
            if(user.legalObject) legalObject = user.legalObject
            if(quick) {
                let res = await Item.find({
                    del: {$ne: true},
                    quick: true,
                    legalObject,
                })
                    .sort('-priority')
                    .populate({
                        path: 'category',
                        select: 'name _id'
                    })
                    .populate({
                        path: 'legalObject',
                        select: 'name _id'
                    })
                    .lean()
                return res
            }
            else {
                if (!search) {
                    let categorys = (await CategoryLegalObject.findOne({legalObject}).select('categorys').lean()).categorys
                    return [
                        ...skip === 0 ? (await Category.find({
                            del: {$ne: true},
                            category,
                            _id: {$in: categorys},
                            ...type && type.length ? {type} : {}
                        })
                            .sort('name')
                            .populate({
                                path: 'category',
                                select: 'name _id'
                            })
                            .lean()) : [],
                        ...(await Item.find({
                            del: {$ne: true},
                            category,
                            ...type && type.length ? {type} : {},
                            legalObject
                        })
                            .skip(skip)
                            .limit(limit ? limit : 30)
                            .sort('name')
                            .populate({
                                path: 'category',
                                select: 'name _id'
                            })
                            .populate({
                                path: 'legalObject',
                                select: 'name _id'
                            })
                            .lean())
                    ]
                }
                else {
                    let res = await Item.find({
                            del: {$ne: true},
                            ...type && type.length ? {type} : {},
                            legalObject,
                            $or: [{name: {'$regex': search, '$options': 'i'}}, {
                                barCode: {
                                    '$regex': search,
                                    '$options': 'i'
                                }
                            }]
                        }
                    )
                        .skip(skip != undefined ? skip : 0)
                        .limit(limit ? limit : skip != undefined ? 30 : 10000000000)
                        .sort('name')
                        .populate({
                            path: 'category',
                            select: 'name _id'
                        })
                        .populate({
                            path: 'legalObject',
                            select: 'name _id'
                        })
                        .lean()
                    return res
                }
            }
        }
    },
    itemsCount: async(parent, {search, category, type, legalObject}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'кассир', 'супервайзер'].includes(user.role)) {
            if(user.legalObject) legalObject = user.legalObject
            if(search)
                return await Item.countDocuments({
                    del: {$ne: true},
                    ...type&&type.length?{type}:{},
                    $or: [{name: {'$regex': search, '$options': 'i'}}, {barCode: {'$regex': search, '$options': 'i'}}],
                    legalObject
                })
                    .lean()
            else
                return await Item.countDocuments({
                        del: {$ne: true},
                        ...type&&type.length ? {type} : {},
                        legalObject,
                        category
                    })
                    .lean()
        }
    },
    item: async(parent, {_id}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'кассир', 'супервайзер'].includes(user.role)) {
            return await Item.findOne({...user.legalObject?{legalObject: user.legalObject}:{}, _id})
                .populate({
                    path: 'category',
                    select: 'name _id'
                })
                .populate({
                    path: 'legalObject',
                    select: 'name _id'
                })
                .lean()
        }
    }
};

const resolversMutation = {
    addItem: async(parent, {legalObject, quick, category, price, unit, barCode, name, type, editedPrice, tnved, mark, priority}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'кассир', 'супервайзер'].includes(user.role)&&user.add) {
            if(user.legalObject) legalObject = user.legalObject
            if(category) {
                let categoryLegalObject = await CategoryLegalObject.findOne({legalObject})
                let addCategorys = [category], findCategory = category
                while (findCategory) {
                    findCategory = (await Category.findOne({_id: findCategory}).select('category').lean()).category
                    if(findCategory)
                        addCategorys = [...addCategorys, findCategory]
                }
                categoryLegalObject.categorys = [...categoryLegalObject.categorys, ...addCategorys]
                await categoryLegalObject.save()
            }
            let _object = new Item({
                category: category,
                legalObject,
                price,
                unit,
                barCode,
                priority,
                name,
                type,
                quick,
                editedPrice,
                tnved,
                mark
            });
            if(barCode&&barCode.length&&!(await ItemBarCode.findOne({barCode}).select('_id').lean())){
                let newItemBarCode = new ItemBarCode({barCode, name, check: false})
                await ItemBarCode.create(newItemBarCode)
            }
            _object = await Item.create(_object)
            return _object._id
        }
        return 'ERROR'
    },
    setItem: async(parent, {_id, category, quick, price, unit, barCode, name, type, editedPrice, tnved, mark, priority}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'кассир', 'супервайзер'].includes(user.role)&&user.add) {
            let object = await Item.findOne({
                ...user.legalObject?{legalObject: user.legalObject}:{},
                _id
            })
            if(name)object.name = name
            if(unit)object.unit = unit
            if(barCode)object.barCode = barCode
            if(type)object.type = type
            if(tnved)object.tnved = tnved
            if(quick!=undefined)object.quick = quick
            if(mark!=undefined)object.mark = mark
            if(priority!=undefined)object.priority = priority
            if(price!=undefined)object.price = price
            if(editedPrice!=undefined)object.editedPrice = editedPrice
            if(category!=object.category) {
                let categoryLegalObject = await CategoryLegalObject.findOne({legalObject: object.legalObject})
                if (object.category) {
                    let deleteCategorys = [object.category], findCategory = object.category
                    while (findCategory) {
                        findCategory = (await Category.findOne({_id: findCategory}).select('category').lean()).category
                        if (findCategory)
                            deleteCategorys = [...deleteCategorys, findCategory]
                    }
                    for (let i = 0; i < deleteCategorys.length; i++) {
                        categoryLegalObject.categorys.splice(categoryLegalObject.categorys.indexOf(deleteCategorys[i]), 1)
                    }
                }
                if (category) {
                    let addCategorys = [category], findCategory = category
                    while (findCategory) {
                        findCategory = (await Category.findOne({_id: findCategory}).select('category').lean()).category
                        if (findCategory)
                            addCategorys = [...addCategorys, findCategory]
                    }
                    categoryLegalObject.categorys = [...categoryLegalObject.categorys, ...addCategorys]
                }
                await categoryLegalObject.save()
                object.category = category
            }
            await object.save();
            return 'OK'
        }
        return 'ERROR'
    },
    deleteItem: async(parent, { _id }, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'кассир', 'супервайзер'].includes(user.role)&&user.add) {
            let item = await Item.findOne({
                ...user.legalObject?{legalObject: user.legalObject}:{},
                _id
            })
                .select('category legalObject')
                .lean()
            if(item) {
                if (item.category) {
                    let categoryLegalObject = await CategoryLegalObject.findOne({legalObject: item.legalObject})
                    let deleteCategorys = [item.category], findCategory = item.category
                    while (findCategory) {
                        findCategory = (await Category.findOne({_id: findCategory}).select('category').lean()).category
                        if (findCategory)
                            deleteCategorys = [...deleteCategorys, findCategory]
                    }
                    for (let i = 0; i < deleteCategorys.length; i++) {
                        categoryLegalObject.categorys.splice(categoryLegalObject.categorys.indexOf(deleteCategorys[i]), 1)
                    }
                    await categoryLegalObject.save()
                }
                await Item.updateOne({_id}, {del: true, category: undefined})
                await IntegrationObject.deleteOne({item: _id})
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