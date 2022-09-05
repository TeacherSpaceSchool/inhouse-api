const BalanceItem = require('../models/balanceItem');
const StoreBalanceItem = require('../models/storeBalanceItem');
const Item = require('../models/item');
const Warehouse = require('../models/warehouse');
const Store = require('../models/store');
const History = require('../models/history');
const { saveFile, deleteFile, urlMain, checkFloat } = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const randomstring = require('randomstring');

const type = `
  type BalanceItem {
    _id: ID
    createdAt: Date
    item: Item
    warehouse: Warehouse
    amount: Float
    store: Store
  }
`;

const query = `
    unloadBalanceItems(item: ID, warehouse: ID, store: ID): String
    itemsForBalanceItem(search: String, warehouse: ID!): [Item]
    balanceItems(item: ID, skip: Int, sort: String, warehouse: ID, store: ID): [BalanceItem]
    balanceItemsCount(item: ID, warehouse: ID, store: ID): Int
`;

const mutation = `
    uploadBalanceItem(document: Upload!): String
    addBalanceItem(item: ID!, warehouse: ID!, amount: Float!): BalanceItem
    setBalanceItem(item: ID!, warehouse: ID!, amount: Float!, type: String, warehouse2: String): String
`;

const resolvers = {
    unloadBalanceItems: async(parent, {item, warehouse, store}, {user}) => {
        if(['admin', 'менеджер', 'менеджер/завсклад', 'управляющий', 'завсклад'].includes(user.role)) {
            if(user.store) store = user.store
            let res =  await BalanceItem.find({
                ...item?{item}:{},
                ...warehouse?{warehouse}:{},
                ...store?{store}:{}
            })
                .sort('-amount')
                .populate({
                    path: 'item',
                    select: 'name _id unit'
                })
                .populate({
                    path: 'warehouse',
                    select: 'name _id'
                })
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .lean()
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Выгрузка');
            worksheet.getColumn(1).width = 40
            worksheet.getColumn(2).width = 40
            worksheet.getColumn(3).width = 40
            worksheet.getRow(1).getCell(1).font = {bold: true};
            worksheet.getRow(1).getCell(1).value = 'Модель'
            worksheet.getRow(1).getCell(2).font = {bold: true};
            worksheet.getRow(1).getCell(2).value = 'Склад'
            worksheet.getRow(1).getCell(3).font = {bold: true};
            worksheet.getRow(1).getCell(3).value = 'Магазин'
            worksheet.getRow(1).getCell(4).font = {bold: true};
            worksheet.getRow(1).getCell(4).value = 'Остаток'
            for(let i = 0; i < res.length; i++) {
                worksheet.getRow(i+2).getCell(1).value = res[i].item.name
                worksheet.getRow(i+2).getCell(2).value = res[i].warehouse.name
                worksheet.getRow(i+2).getCell(3).value = res[i].store.name
                worksheet.getRow(i+2).getCell(4).value = res[i].amount
            }
            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
    itemsForBalanceItem: async(parent, {search, warehouse}, {user}) => {
        if(['admin', 'менеджер/завсклад', 'завсклад'].includes(user.role)) {
            let usedItems = await BalanceItem.find({warehouse}).distinct('item').lean()
            let res = await Item.find({
                del: {$ne: true},
                _id: {$nin: usedItems},
                ...search?{$or: [{name: {'$regex': search, '$options': 'i'}}, {ID: {'$regex': search, '$options': 'i'}}]}:{},
            })
                .select('_id name')
                .sort('name')
                .lean()
            return res
        }
    },
    balanceItems: async(parent, {item, skip, sort, warehouse, store}, {user}) => {
        if(['admin', 'менеджер', 'менеджер/завсклад', 'управляющий', 'завсклад'].includes(user.role)) {
            if(user.store) store = user.store
            let res =  await BalanceItem.find({
                ...item?{item}:{},
                ...warehouse?{warehouse}:{},
                ...store?{store}:{}
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort(sort? sort : '-amount')
                .populate({
                    path: 'item',
                    select: 'name _id unit'
                })
                .populate({
                    path: 'warehouse',
                    select: 'name _id'
                })
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .lean()
            return res
        }
    },
    balanceItemsCount: async(parent, {item, warehouse, store}, {user}) => {
        if(['admin', 'менеджер', 'менеджер/завсклад', 'управляющий', 'завсклад'].includes(user.role)) {
            if(user.store) store = user.store
            return await BalanceItem.countDocuments({
                ...item?{item}:{},
                ...warehouse?{warehouse}:{},
                ...store?{store}:{}
            })
                .lean()
        }
        return 0
    },
};

const resolversMutation = {
    uploadBalanceItem: async(parent, { document }, {user}) => {
        if (['admin', 'завсклад',  'менеджер/завсклад'].includes(user.role)) {
            let {createReadStream, filename} = await document;
            let stream = createReadStream()
            filename = await saveFile(stream, filename);
            let xlsxpath = path.join(app.dirname, 'public', filename);
            let workbook = new ExcelJS.Workbook();
            workbook = await workbook.xlsx.readFile(xlsxpath);
            let worksheet = workbook.worksheets[0];
            let rowNumber = 1, row, object, item, warehouse, amount, store, nameWarehouse
            while(true) {
                row = worksheet.getRow(rowNumber);
                if(row.getCell(1).value&&row.getCell(2).value&&row.getCell(3).value) {
                    item = (await Item.findOne({name: row.getCell(1).value}).select('_id').lean())._id
                    store = (await Store.findOne({name: row.getCell(3).value}).select('_id').lean())._id
                    warehouse = await Warehouse.findOne({name: row.getCell(2).value, store}).select('_id name').lean()
                    nameWarehouse = warehouse.name
                    warehouse = warehouse._id
                    amount = checkFloat(row.getCell(4).value)
                    object = await BalanceItem.findOne({item, warehouse});
                    let storeBalanceItem = await StoreBalanceItem.findOne({store, item})
                    let check = true
                    if(!['Брак', 'Реставрация'].includes(nameWarehouse)) {
                        if (!storeBalanceItem) {
                            storeBalanceItem = new StoreBalanceItem({
                                store,
                                item,
                                amount,
                                reservation: 0,
                                sale: 0,
                                free: amount
                            });
                            await StoreBalanceItem.create(storeBalanceItem)
                        }
                        else {
                            storeBalanceItem.amount = checkFloat(storeBalanceItem.amount - object.amount + amount)
                            if (storeBalanceItem.amount < 0)
                                storeBalanceItem.amount = 0
                            if (storeBalanceItem.amount < (storeBalanceItem.reservation + storeBalanceItem.sale))
                                check = false
                            else
                                storeBalanceItem.free = checkFloat(storeBalanceItem.amount - (storeBalanceItem.reservation + storeBalanceItem.sale))
                            if (check)
                                await storeBalanceItem.save()
                            else
                                return 'ERROR'
                        }
                    }
                    if(!object){
                        object = new BalanceItem({
                            warehouse,
                            item,
                            amount,
                            store
                        });
                        object = await BalanceItem.create(object)
                        let history = new History({
                            who: user._id,
                            where: object._id,
                            what: 'Создание'
                        });
                        await History.create(history)
                    }
                    else {
                        let history = new History({
                            who: user._id,
                            where: object._id,
                            what: `Остаток:${object.amount}→`
                        });
                        object.amount = amount
                        history.what += `${object.amount};`
                        await object.save();
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
    addBalanceItem: async (parent, {item, warehouse, amount}, {user}) => {
        if (['admin', 'завсклад',  'менеджер/завсклад'].includes(user.role)&&!(await BalanceItem.countDocuments({warehouse, item}).lean())) {
            let store = (await Warehouse.findById(warehouse).select('store').lean()).store
            let nameWarehouse = (await Warehouse.findById(warehouse).select('name').lean()).name
            let object = new BalanceItem({
                warehouse,
                item,
                amount,
                store
            });
            object = await BalanceItem.create(object)
            if(!['Брак', 'Реставрация'].includes(nameWarehouse)) {
                let storeBalanceItem = await StoreBalanceItem.findOne({store, item})
                if (!storeBalanceItem) {
                    storeBalanceItem = new StoreBalanceItem({
                        store,
                        item,
                        amount,
                        reservation: 0,
                        sale: 0,
                        free: amount
                    });
                    await StoreBalanceItem.create(storeBalanceItem)
                }
                else {
                    storeBalanceItem.amount += amount
                    storeBalanceItem.free += amount
                    await storeBalanceItem.save()
                }
            }
            let history = new History({
                who: user._id,
                where: object._id,
                what: 'Создание'
            });
            await History.create(history)
            return await BalanceItem.findById(object._id)
                .populate({
                    path: 'item',
                    select: 'name _id'
                })
                .populate({
                    path: 'warehouse',
                    select: 'name _id'
                })
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .lean()
        }
        return {_id: 'ERROR'}
    },
    setBalanceItem: async (parent, {item, warehouse, amount, type, warehouse2}, {user}) => {
        if (['admin', 'завсклад',  'менеджер/завсклад'].includes(user.role)) {
            let object = await BalanceItem.findOne({item, warehouse});
            let nameWarehouse = (await Warehouse.findById(warehouse).select('name').lean()).name
            let store = (await Warehouse.findOne({_id: warehouse}).select('store').lean()).store
            let storeBalanceItem = await StoreBalanceItem.findOne({store, item})
            let check = true
            if(!['Брак', 'Реставрация'].includes(nameWarehouse)) {
                if (!storeBalanceItem) {
                    if (type !== '-') {
                        storeBalanceItem = new StoreBalanceItem({
                            store,
                            item,
                            amount,
                            reservation: 0,
                            sale: 0,
                            free: amount
                        });
                        await StoreBalanceItem.create(storeBalanceItem)
                    }
                    else
                        return 'ERROR'
                }
                else {
                    if (type === '+') {
                        storeBalanceItem.amount = checkFloat(storeBalanceItem.amount + amount)
                        storeBalanceItem.free = checkFloat(storeBalanceItem.free + amount)
                    }
                    else if (type === '-') {
                        if (object && storeBalanceItem.free >= amount && storeBalanceItem.amount >= amount) {
                            storeBalanceItem.amount = checkFloat(storeBalanceItem.amount - amount)
                            storeBalanceItem.free = checkFloat(storeBalanceItem.free - amount)
                        }
                        else
                            check = false
                    }
                    else {
                        storeBalanceItem.amount = checkFloat(storeBalanceItem.amount - object.amount + amount)
                        if (storeBalanceItem.amount < 0)
                            storeBalanceItem.amount = 0
                        if (storeBalanceItem.amount < (storeBalanceItem.reservation + storeBalanceItem.sale))
                            check = false
                        else
                            storeBalanceItem.free = checkFloat(storeBalanceItem.amount - (storeBalanceItem.reservation + storeBalanceItem.sale))
                    }
                    if (check)
                        await storeBalanceItem.save()
                    else
                        return 'ERROR'
                }
            }

            if(!object){
                if(type!=='-') {
                    object = new BalanceItem({
                        warehouse,
                        item,
                        amount,
                        store
                    });
                    object = await BalanceItem.create(object)
                    let history = new History({
                        who: user._id,
                        where: object._id,
                        what: warehouse2?`Перемещение со склада ${warehouse2}`:'Создание'
                    });
                    await History.create(history)
                }
                else
                    return 'ERROR'
            }
            else {
                let history = new History({
                    who: user._id,
                    where: object._id,
                    what: `Остаток:${object.amount}→`
                });
                if(type==='+')
                    object.amount = checkFloat(object.amount + amount)
                else if(type==='-') {
                    object.amount = checkFloat(object.amount - amount)
                    if(object.amount<0)
                        object.amount = 0
                }
                else
                    object.amount = amount
                history.what += `${object.amount};`
                if(warehouse2)
                    history.what = `${history.what}\nПеремещение ${type==='-'?'на склад':'со склада'} ${warehouse2}`
                await object.save();
                await History.create(history)
            }
            return 'OK'
        }
        return 'ERROR'
    },
}

module.exports.mutation = mutation;
module.exports.resolversMutation = resolversMutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;