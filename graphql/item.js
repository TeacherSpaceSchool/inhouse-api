const Item = require('../models/item');
const WayItem = require('../models/wayItem');
const BalanceItem = require('../models/balanceItem');
const StoreBalanceItem = require('../models/storeBalanceItem');
const History = require('../models/history');
const { saveImage, deleteFile, urlMain } = require('../module/const');
const mongoose = require('mongoose');

const type = `
  type Item {
    _id: ID
    createdAt: Date
    ID: String
    name: String
    images: [String]
    priceUSD: Float
    primeCostUSD: Float
    priceKGS: Float
    primeCostKGS: Float
    discount: Float
    free: Float
    priceAfterDiscountKGS: Float
    info: String
    art: String
    unit: String
    size: String
    characteristics: [[String]]
    category: Category
    factory: Factory
    typeDiscount: String
 }
`;

const query = `
    items(skip: Int, limit: Int, search: String, category: ID, factory: ID, catalog: Boolean): [Item]
    itemsCount(search: String, category: ID, factory: ID): Int
    item(_id: String!): Item
`;

const mutation = `
    addItem(ID: String!, art: String!, typeDiscount: String!, name: String!, uploads: [Upload], priceUSD: Float!, primeCostUSD: Float!, priceKGS: Float!, primeCostKGS: Float!, discount: Float!, priceAfterDiscountKGS: Float!, info: String!, unit: String!, size: String!, characteristics: [[String]]!, category: ID!, factory: ID!): String
    setItem(_id: ID!, ID: String, art: String, typeDiscount: String, name: String, uploads: [Upload], images: [String], priceUSD: Float, primeCostUSD: Float, priceKGS: Float, primeCostKGS: Float, discount: Float, priceAfterDiscountKGS: Float, info: String, unit: String, size: String, characteristics: [[String]], category: ID, factory: ID): String
    deleteItem(_id: ID!): String
    kgsFromUsdItem(USD: Float!, ceil: Boolean!): String
`;

const resolvers = {
    items: async(parent, {skip, limit, search, category, factory, catalog}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)) {
            let catalogItems = {items: [], free: {}}
            if(catalog&&user.store) {
                const storeBalanceItems = await StoreBalanceItem.find({store: user.store, free: {$gt: 0}}).select('item free').lean()
                for(let i=0; i<storeBalanceItems.length; i++) {
                    catalogItems.items.push(storeBalanceItems[i].item)
                    catalogItems.free[storeBalanceItems[i].item] = storeBalanceItems[i].free
                }
            }
            let res = await Item.find({
                del: {$ne: true},
                ...catalog?{_id: {$in: catalogItems.items}}:{},
                ...search?{$or: [{name: {'$regex': search, '$options': 'i'}}, {ID: {'$regex': search, '$options': 'i'}}]}:{},
                ...category?{category}:{},
                ...factory?{factory}:{}
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? limit ? limit : 30 : 10000000000)
                .populate({
                    path: 'category',
                    select: 'name _id'
                })
                .populate({
                    path: 'factory',
                    select: 'name _id'
                })
                .sort('name')
                .lean()
            if(catalog) {
                for(let i=0; i<res.length; i++) {
                    res[i].free = catalogItems.free[res[i]._id]
                }
            }
            return res
        }
    },
    itemsCount: async(parent, {search, category, factory}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)) {
            return await Item.countDocuments({
                del: {$ne: true},
                ...search?{$or: [{name: {'$regex': search, '$options': 'i'}}, {ID: {'$regex': search, '$options': 'i'}}]}:{},
                ...category?{category}:{},
                ...factory?{factory}:{}
            })
                .lean()
        }
        return 0
    },
    item: async(parent, {_id}, {user}) => {
        if(['admin'].includes(user.role)) {
            return await Item.findOne({
                ...mongoose.isValidObjectId(_id)?{_id}:{ID: _id}
            })
                .populate({
                    path: 'category',
                    select: 'name _id'
                })
                .populate({
                    path: 'factory',
                    select: 'name _id'
                })
                .lean()
        }
    }
};

const resolversMutation = {
    addItem: async(parent, {art, ID, typeDiscount, name, uploads, priceUSD, primeCostUSD, priceKGS, primeCostKGS, discount, priceAfterDiscountKGS, info, unit, size, characteristics, category, factory}, {user}) => {
        if(['admin'].includes(user.role)) {
            let images = []
            for (let i = 0; i < uploads.length; i++) {
                let {createReadStream, filename} = await uploads[i];
                let stream = createReadStream()
                filename = await saveImage(stream, filename)
                images = [urlMain + filename, ...images]
            }
            let object = new Item({
                ID,
                name,
                images,
                priceUSD,
                primeCostUSD,
                priceKGS,
                primeCostKGS,
                discount,
                priceAfterDiscountKGS,
                info,
                unit,
                size,
                characteristics,
                category,
                typeDiscount,
                factory,
                art
            });
            let history = new History({
                who: user._id,
                where: object._id,
                what: 'Создание'
            });
            await History.create(history)
            object = await Item.create(object)
            return object._id
        }
        return 'ERROR'
    },
    setItem: async(parent, {_id, art, ID, name, uploads, typeDiscount, images, priceUSD, primeCostUSD, priceKGS, primeCostKGS, discount, priceAfterDiscountKGS, info, unit, size, characteristics, category, factory}, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await Item.findOne({
                _id
            })
            if(object) {
                let history = new History({
                    who: user._id,
                    where: object._id,
                    what: ''
                });
                if (name) {
                    history.what = `Название:${object.name}→${name};\n`
                    object.name = name
                }
                if (ID) {
                    history.what = `${history.what}ID:${object.ID}→${ID};\n`
                    object.ID = ID
                }
                if (typeDiscount) {
                    history.what = `${history.what}Тип скидки:${object.typeDiscount}→${typeDiscount};\n`
                    object.typeDiscount = typeDiscount
                }
                if (priceUSD!=undefined) {
                    history.what = `${history.what}Цена USD:${object.priceUSD}→${priceUSD};\n`
                    object.priceUSD = priceUSD
                }
                if (art!=undefined) {
                    history.what = `${history.what}Артикул:${object.art}→${art};\n`
                    object.art = art
                }
                if (primeCostUSD!=undefined) {
                    history.what = `${history.what}Себестоимость USD:${object.primeCostUSD}→${primeCostUSD};\n`
                    object.primeCostUSD = primeCostUSD
                }
                if (priceKGS!=undefined) {
                    history.what = `${history.what}Цена сом:${object.priceKGS}→${priceKGS};\n`
                    object.priceKGS = priceKGS
                }
                if (primeCostKGS!=undefined) {
                    history.what = `${history.what}Себестоимость сом:${object.primeCostKGS}→${primeCostKGS};\n`
                    object.primeCostKGS = primeCostKGS
                }
                if (discount!=undefined) {
                    history.what = `${history.what}Скидка:${object.discount}→${discount};\n`
                    object.discount = discount
                }
                if (priceAfterDiscountKGS!=undefined) {
                    history.what = `${history.what}Цена после скидки сом:${object.priceAfterDiscountKGS}→${priceAfterDiscountKGS};\n`
                    object.priceAfterDiscountKGS = priceAfterDiscountKGS
                }
                if (unit) {
                    history.what = `${history.what}Ед.изм.:${object.unit}→${unit};\n`
                    object.unit = unit
                }
                if (info) {
                    history.what = `${history.what}Информация:${object.info}→${info};\n`
                    object.info = info
                }
                if (size) {
                    history.what = `${history.what}Размер:${object.size}→${size};\n`
                    object.size = size
                }
                if (characteristics) {
                    history.what = `${history.what}Характеристики:${JSON.stringify(object.characteristics)}→${JSON.stringify(characteristics)};\n`
                    object.characteristics = characteristics
                }
                if(images||uploads) {
                    history.what = `${history.what}Изображения;\n`
                    if (images) {
                        for (let i = 0; i < object.images.length; i++) {
                            if (!images.includes(object.images[i])) {
                                await deleteFile(object.images[i])
                                object.images.splice(i, 1)
                                i -= 1
                            }
                        }
                    }
                    if (uploads) {
                        for (let i = 0; i < uploads.length; i++) {
                            let {createReadStream, filename} = await uploads[i];
                            let stream = createReadStream()
                            filename = await saveImage(stream, filename)
                            images = [urlMain + filename, ...object.images]
                        }
                    }
                    object.images = images
                }
                if (category&&object.category!==category) {
                    history.what = `${history.what}Категория:${object.category}→${category};\n`
                    object.category = category
                }
                if (factory&&object.factory!==factory) {
                    history.what = `${history.what}Фабрика:${object.factory}→${factory};`
                    object.factory = factory
                }
                await object.save();
                await History.create(history)
                return 'OK'
            }
        }
        return 'ERROR'
    },
    deleteItem: async(parent, { _id }, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await Item.findOne({_id})

            let USED
            let balancedItems = await BalanceItem.find({item: _id})
            for(let i=0; i<balancedItems.length; i++) {
                if(balancedItems[i].amount){
                    USED = true
                    break
                }
            }
            if(!USED)
                USED = await WayItem.countDocuments({item: _id, status: {$ne: 'прибыл'}}).lean()
            if(USED)
                return 'USED'

            if (object) {
                object.del = true
                for (let i = 0; i < object.images.length; i++)
                    await deleteFile(object.images[i])
                object.images = []
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
    kgsFromUsdItem: async(parent, { USD, ceil }, {user}) => {
        if(['admin'].includes(user.role)) {
            let items = await Item.find({del: {$ne: true}})
            for (let i = 0; i < items.length; i++) {
                items[i].primeCostKGS = items[i].primeCostUSD*USD
                if(ceil)
                    items[i].primeCostKGS = Math.ceil(items[i].primeCostKGS)
                items[i].priceKGS = items[i].priceUSD*USD
                if(ceil)
                    items[i].priceKGS = Math.ceil(items[i].priceKGS)
                if(items[i].typeDiscount==='%')
                    items[i].priceAfterDiscountKGS = items[i].priceKGS - items[i].priceKGS/100*items[i].discount
                else
                    items[i].priceAfterDiscountKGS = items[i].priceKGS - items[i].discount
                if(ceil)
                    items[i].priceAfterDiscountKGS = Math.ceil(items[i].priceAfterDiscountKGS)
                await items[i].save()
            }
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