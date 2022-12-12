const Item = require('../models/item');
const WayItem = require('../models/wayItem');
const BalanceItem = require('../models/balanceItem');
const StoreBalanceItem = require('../models/storeBalanceItem');
const History = require('../models/history');
const Category = require('../models/category');
const Reservation = require('../models/reservation');
const Factory = require('../models/factory');
const mongoose = require('mongoose');
const { saveImage, saveFile, deleteFile, urlMain, checkFloat } = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const randomstring = require('randomstring');
const { checkUniqueName } = require('../module/const');

const type = `
  type Item {
    _id: ID
    createdAt: Date
    ID: String
    type: String
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
    typeItems(search: String): [Item]
    unloadItems(search: String, type: String, category: ID, factory: ID): String
    items(skip: Int, store: ID, limit: Int, type: String, search: String, category: ID, factory: ID, catalog: Boolean): [Item]
    zeroItems(client: ID!, type: String, search: String, category: ID, factory: ID): [Item]
    itemsCount(search: String, category: ID, type: String, factory: ID): Int
    item(_id: String!): Item
`;

const mutation = `
    uploadItem(document: Upload!): String
    addItem(ID: String!, art: String!, type: String!, typeDiscount: String!, name: String!, uploads: [Upload], priceUSD: Float!, primeCostUSD: Float!, priceKGS: Float!, primeCostKGS: Float!, discount: Float!, priceAfterDiscountKGS: Float!, info: String!, unit: String!, size: String!, characteristics: [[String]]!, category: ID!, factory: ID!): String
    setItem(_id: ID!, ID: String, art: String, type: String, typeDiscount: String, name: String, uploads: [Upload], images: [String], priceUSD: Float, primeCostUSD: Float, priceKGS: Float, primeCostKGS: Float, discount: Float, priceAfterDiscountKGS: Float, info: String, unit: String, size: String, characteristics: [[String]], category: ID, factory: ID): String
    deleteItem(_id: ID!): String
    kgsFromUsdItem(USD: Float!, ceil: Boolean!): String
`;

const resolvers = {
    typeItems: async(parent, {search}, {user}) => {
        if(user.role) {
            let res = await Item.find({
                ...search?{type: {'$regex': search, '$options': 'i'}}:{},
            })
                .distinct('type')
                .lean()
            let typeItems = []
            for(let i=0; i<res.length; i++) {
                typeItems = [...typeItems, {name: res[i]}]
            }
            return typeItems
        }
        return []
    },
    unloadItems: async(parent, {search, category, factory, type}, {user}) => {
        if(user.role) {
            let res =  await Item.find({
                del: {$ne: true},
                ...search?{$or: [{name: {'$regex': search, '$options': 'i'}}, {ID: {'$regex': search, '$options': 'i'}}]}:{},
                ...category?{category}:{},
                ...factory?{factory}:{},
                ...type?{type}:{}
            })
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
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Выгрузка');
            let cell = 1
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = '_id'
            cell += 1
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Название'
            cell += 1
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Артикул'
            cell += 1
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'ID'
            cell += 1
            worksheet.getColumn(cell).width = 40
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Тип товара'
            cell += 1
            worksheet.getColumn(cell).width = 40
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Категория'
            cell += 1
            worksheet.getColumn(cell).width = 40
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Фабрика'
            cell += 1
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Цена в долларах'
            cell += 1
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Цена в сомах'
            cell += 1
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Себестоимость в долларах'
            cell += 1
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Себестоимость в сомах'
            cell += 1
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Скидка в сомах'
            cell += 1
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Цена после скидки в сомах'
            cell += 1
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Единица измерения'
            cell += 1
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Размер'
            cell += 1
            worksheet.getColumn(cell).width = 30
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Характеристики'
            cell += 1
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Комментарий'
            for(let i = 0; i < res.length; i++) {
                let characteristics = ''
                for(let i1 = 0; i1 < res[i].characteristics.length; i1++) {
                    characteristics = `${characteristics?`${characteristics}\n`:''}${res[i].characteristics[i1][0]}: ${res[i].characteristics[i1][1]}`
                }
                cell = 1
                worksheet.getRow(i+2).getCell(cell).value = res[i]._id.toString()
                cell += 1
                worksheet.getRow(i+2).getCell(cell).value = res[i].name
                cell += 1
                worksheet.getRow(i+2).getCell(cell).value = res[i].art
                cell += 1
                worksheet.getRow(i+2).getCell(cell).value = res[i].ID
                cell += 1
                worksheet.getRow(i+2).getCell(cell).value = res[i].type
                cell += 1
                worksheet.getRow(i+2).getCell(cell).value = res[i].category.name
                cell += 1
                worksheet.getRow(i+2).getCell(cell).value = res[i].factory.name
                cell += 1
                worksheet.getRow(i+2).getCell(cell).value = res[i].priceUSD
                cell += 1
                worksheet.getRow(i+2).getCell(cell).value = res[i].priceKGS
                cell += 1
                worksheet.getRow(i+2).getCell(cell).value = res[i].primeCostUSD
                cell += 1
                worksheet.getRow(i+2).getCell(cell).value = res[i].primeCostKGS
                cell += 1
                worksheet.getRow(i+2).getCell(cell).value = res[i].discount
                cell += 1
                worksheet.getRow(i+2).getCell(cell).value = res[i].priceAfterDiscountKGS
                cell += 1
                worksheet.getRow(i+2).getCell(cell).value = res[i].unit
                cell += 1
                worksheet.getRow(i+2).getCell(cell).value = res[i].size
                cell += 1
                worksheet.getRow(i+2).getCell(cell).alignment = {wrapText: true}
                cell += 1
                worksheet.getRow(i+2).getCell(cell).value = characteristics
                cell += 1
                worksheet.getRow(i+2).getCell(cell).value = res[i].comment
            }
            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
    items: async(parent, {skip, store, limit, search, category, factory, catalog, type}, {user}) => {
        if(user.role) {
            let catalogItems = {items: [], free: {}}
            if(catalog&&(store||user.store)) {
                const storeBalanceItems = await StoreBalanceItem.find({store: store?store:user.store, free: {$gt: 0}}).select('item free').lean()
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
                ...factory?{factory}:{},
                ...type?{type}:{}
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
    zeroItems: async(parent, {client, search, category, factory, type}, {user}) => {
        if(user.role) {
            const reservations = await Reservation.find({
                store: user.store,
                manager: user._id,
                client,
                status: 'обработка'
            })
                .select('itemsReservation')
                .populate({
                    path: 'itemsReservation',
                    select: 'item'
                })
                .lean()
            let itemsFromReservation = []
            for(let i = 0; i < reservations.length; i++) {
                for(let i1 = 0; i1 < reservations[i].itemsReservation.length; i1++) {
                    itemsFromReservation.push(reservations[i].itemsReservation[i1].item)
                }
            }
            const zeroBalanceItems = await StoreBalanceItem.find({
                store: user.store,
                item: {$in: itemsFromReservation},
                free: 0
            })
                .distinct('item')
                .lean()
            let res = await Item.find({
                del: {$ne: true},
                _id: {$in: zeroBalanceItems},
                ...search?{$or: [{name: {'$regex': search, '$options': 'i'}}, {ID: {'$regex': search, '$options': 'i'}}]}:{},
                ...category?{category}:{},
                ...factory?{factory}:{},
                ...type?{type}:{}
            })
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
            for(let i=0; i<res.length; i++) {
                res[i].free = 0
            }
            return res
        }
    },
    itemsCount: async(parent, {search, category, factory, type}, {user}) => {
        if(user.role) {
            return await Item.countDocuments({
                del: {$ne: true},
                ...search?{$or: [{name: {'$regex': search, '$options': 'i'}}, {ID: {'$regex': search, '$options': 'i'}}]}:{},
                ...category?{category}:{},
                ...factory?{factory}:{},
                ...type?{type}:{}
            })
                .lean()
        }
        return 0
    },
    item: async(parent, {_id}, {user}) => {
        if(user.role) {
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
    uploadItem: async(parent, { document }, {user}) => {
        if(['admin', 'завсклад',  'менеджер/завсклад'].includes(user.role)) {
            let {createReadStream, filename} = await document;
            let stream = createReadStream()
            filename = await saveFile(stream, filename);
            let xlsxpath = path.join(app.dirname, 'public', filename);
            let workbook = new ExcelJS.Workbook();
            workbook = await workbook.xlsx.readFile(xlsxpath);
            let worksheet = workbook.worksheets[0];
            let rowNumber = 1, row, _id, object
            while(true) {
                row = worksheet.getRow(rowNumber);
                if(row.getCell(2).value&&checkFloat(row.getCell(8).value)>=0&&checkFloat(row.getCell(9).value)>=0&&checkFloat(row.getCell(10).value)>=0&&checkFloat(row.getCell(11).value)>=0&&checkFloat(row.getCell(12).value)>=0) {
                    if(row.getCell(6).value)
                        row.getCell(6).value = (await Category.findOne({name: row.getCell(6).value}).select('_id').lean())._id
                    if(row.getCell(7).value)
                        row.getCell(7).value = (await Factory.findOne({name: row.getCell(7).value}).select('_id').lean())._id
                    if(row.getCell(1).value&&!mongoose.Types.ObjectId.isValid(row.getCell(1).value))
                        row.getCell(1).value = (await Item.findOne({name: row.getCell(1).value}).select('_id').lean())._id
                    _id = row.getCell(1).value
                    if(_id) {
                        object = await Item.findById(_id)
                        if(object) {
                            let history = new History({
                                who: user._id,
                                where: object._id,
                                what: ''
                            });
                            if (row.getCell(2).value&&object.name!==row.getCell(2).value&&await checkUniqueName(row.getCell(2).value, 'item')) {
                                history.what = `Название:${object.name}→${row.getCell(2)};\n`
                                object.name = row.getCell(2).value
                            }
                            if (row.getCell(3).value&&object.art!==row.getCell(3).value) {
                                history.what = `${history.what}Артикул:${object.art}→${row.getCell(3)};\n`
                                object.art = row.getCell(3).value
                            }
                            if (row.getCell(4).value&&object.ID!==row.getCell(4).value) {
                                history.what = `${history.what}ID:${object.ID}→${row.getCell(4)};\n`
                                object.ID = row.getCell(4).value
                            }
                            if (row.getCell(5).value&&object.type!==row.getCell(5).value.toString()) {
                                history.what = `${history.what}Тип товара:${object.type}→${row.getCell(5)};\n`
                                object.type = row.getCell(5).value
                            }
                            if (row.getCell(6).value&&object.category.toString()!==row.getCell(6).value.toString()) {
                                history.what = `${history.what}Категория:${object.category}→${row.getCell(6)};\n`
                                object.category = row.getCell(6).value
                            }
                            if (row.getCell(7).value&&object.factory.toString()!==row.getCell(7).value.toString()) {
                                history.what = `${history.what}Фабрика:${object.factory}→${row.getCell(7)};\n`
                                object.factory = row.getCell(7).value
                            }
                            if (row.getCell(8).value) {
                                row.getCell(8).value = checkFloat(row.getCell(8).value)
                                if (object.priceUSD!==row.getCell(8).value) {
                                    history.what = `${history.what}Цена в долларах:${object.priceUSD}→${row.getCell(8)};\n`
                                    object.priceUSD = row.getCell(8).value
                                }
                            }
                            if (row.getCell(9).value) {
                                row.getCell(9).value = checkFloat(row.getCell(9).value)
                                if (object.priceKGS!==row.getCell(9).value) {
                                    history.what = `${history.what}Цена в сомах:${object.priceKGS}→${row.getCell(9)};\n`
                                    object.priceKGS = row.getCell(9).value
                                }
                            }
                            if (row.getCell(10).value) {
                                row.getCell(10).value = checkFloat(row.getCell(10).value)
                                if (object.primeCostUSD!==row.getCell(10).value) {
                                    history.what = `${history.what}Себестоимость в долларах:${object.primeCostUSD}→${row.getCell(10)};\n`
                                    object.primeCostUSD = row.getCell(10).value
                                }
                            }
                            if (row.getCell(11).value) {
                                row.getCell(11).value = checkFloat(row.getCell(11).value)
                                if (object.primeCostKGS!==row.getCell(11).value) {
                                    history.what = `${history.what}Себестоимость в сомах:${object.primeCostKGS}→${row.getCell(11)};\n`
                                    object.primeCostKGS = row.getCell(11).value
                                }
                            }
                            if (row.getCell(12).value) {
                                row.getCell(12).value = checkFloat(row.getCell(12).value)
                                if (object.discount!==row.getCell(12).value) {
                                    history.what = `${history.what}Скидка:${object.discount}→${row.getCell(12)};\n`
                                    object.discount = row.getCell(12).value
                                    object.typeDiscount = 'сом'
                                }
                            }
                            let priceAfterDiscountKGS = checkFloat(object.priceKGS - object.discount)
                            if(priceAfterDiscountKGS!==object.priceAfterDiscountKGS) {
                                history.what = `${history.what}Цена после скидки в сомах:${object.priceKGS}→${priceAfterDiscountKGS};\n`
                                object.priceAfterDiscountKGS = priceAfterDiscountKGS
                            }
                            if (row.getCell(13).value&&object.unit!==row.getCell(13).value) {
                                history.what = `${history.what}Единица измерения:${object.unit}→${row.getCell(13).value};\n`
                                object.unit = row.getCell(13).value
                            }
                            if (row.getCell(14).value&&object.size!==row.getCell(14).value) {
                                history.what = `${history.what}Размер:${object.size}→${row.getCell(14).value};\n`
                                object.size = row.getCell(14).value
                            }
                            if (row.getCell(15).value) {
                                row.getCell(15).value = row.getCell(15).value.toString().split(', ')
                                for(let i=0; i<row.getCell(15).value.length; i++) {
                                    row.getCell(15).value[i] = row.getCell(15).value[i].split(': ')
                                }
                                if (object.characteristics.toString()!==row.getCell(15).value.toString()) {
                                    history.what = `${history.what}Характеристики:${object.characteristics}→${row.getCell(15).value};\n`
                                    object.characteristics = row.getCell(15).value
                                }
                            }
                            if (row.getCell(16).value&&object.info!==row.getCell(16).value) {
                                history.what = `${history.what}Комментарий:${object.info}→${row.getCell(16).value};\n`
                                object.info = row.getCell(16).value
                            }
                            await object.save();
                            await History.create(history)
                        }
                    }
                    else if(row.getCell(2).value&&await checkUniqueName(row.getCell(2).value, 'item')&&row.getCell(5).value&&row.getCell(6).value&&row.getCell(7).value&&row.getCell(9).value) {
                        if(row.getCell(15).value) {
                            row.getCell(15).value = row.getCell(15).value.toString().split(', ')
                            for(let i=0; i<row.getCell(15).value.length; i++) {
                                row.getCell(15).value[i] = row.getCell(15).value[i].split(': ')
                            }
                        }
                        else row.getCell(15).value = []
                        object = new Item({
                            name: row.getCell(2).value,
                            art: row.getCell(3).value?row.getCell(3).value:'',
                            ID: row.getCell(4).value?row.getCell(4).value:'',
                            type: row.getCell(5).value,
                            category: row.getCell(6).value,
                            factory: row.getCell(7).value,
                            priceUSD: checkFloat(row.getCell(8).value),
                            priceKGS: checkFloat(row.getCell(9).value),
                            primeCostUSD: checkFloat(row.getCell(10).value),
                            primeCostKGS: checkFloat(row.getCell(11).value),
                            discount: checkFloat(row.getCell(12).value),
                            unit: row.getCell(13).value?row.getCell(13).value:'шт',
                            size: row.getCell(14).value?row.getCell(14).value:'',
                            characteristics: row.getCell(15).value,
                            info: row.getCell(16).value?row.getCell(16).value:'',
                            images: [],
                            typeDiscount: 'сом'
                        });
                        object.priceAfterDiscountKGS = checkFloat(object.priceKGS - object.discount)
                        object = await Item.create(object)
                        let history = new History({
                            who: user._id,
                            where: object._id,
                            what: 'Создание'
                        });
                        await History.create(history)
                    }
                    rowNumber++
                }
                else break
            }
            await deleteFile(filename)
            return 'OK'
        }
        return 'ERROR'
    },
    addItem: async(parent, {art, ID, typeDiscount, type, name, uploads, priceUSD, primeCostUSD, priceKGS, primeCostKGS, discount, priceAfterDiscountKGS, info, unit, size, characteristics, category, factory}, {user}) => {
        if(['admin', 'завсклад',  'менеджер/завсклад'].includes(user.role)&&await checkUniqueName(name, 'item')) {
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
                type,
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
    setItem: async(parent, {_id, art, ID, type, name, uploads, typeDiscount, images, priceUSD, primeCostUSD, priceKGS, primeCostKGS, discount, priceAfterDiscountKGS, info, unit, size, characteristics, category, factory}, {user}) => {
        if(['admin', 'завсклад',  'менеджер/завсклад'].includes(user.role)&&await checkUniqueName(name, 'item')) {
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
                if (type!=undefined) {
                    history.what = `${history.what}Тип:${object.type}→${type};\n`
                    object.type = type
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
                    history.what = `${history.what}Комментарий:${object.info}→${info};\n`
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
                    images = [...object.images]
                    if (uploads) {
                        for (let i = 0; i < uploads.length; i++) {
                            let {createReadStream, filename} = await uploads[i];
                            let stream = createReadStream()
                            filename = await saveImage(stream, filename)
                            images = [urlMain + filename, ...images]
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
        if(['admin', 'завсклад',  'менеджер/завсклад'].includes(user.role)) {
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
                object.name += '(удален)'
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
        if(['admin', 'завсклад',  'менеджер/завсклад'].includes(user.role)) {
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