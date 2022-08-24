const Warehouse = require('../models/warehouse');
const BalanceItem = require('../models/balanceItem');
const History = require('../models/history');
const { saveFile, deleteFile, urlMain } = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const randomstring = require('randomstring');
const Store = require('../models/store');
const { checkUniqueName } = require('../module/const');

const type = `
  type Warehouse {
    _id: ID
    createdAt: Date
    name: String
    store: Store
    item: Item
    amount: Float
  }
`;

const query = `
    unloadWarehouses(search: String, store: ID): String
    warehouses(search: String, skip: Int, store: ID): [Warehouse]
    warehousesCount(search: String, store: ID): Int
`;

const mutation = `
    uploadWarehouse(document: Upload!): String
    addWarehouse(name: String!, store: ID!): Warehouse
    setWarehouse(_id: ID!, name: String!): String
    deleteWarehouse(_id: ID!): String
`;

const resolvers = {
    unloadWarehouses: async(parent, {search, store}, {user}) => {
        if(['admin', 'менеджер/завсклад', 'управляющий', 'завсклад'].includes(user.role)) {
            if(user.store) store = user.store
            let res =  await Warehouse.find({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
                ...store?{store}:{},
            })
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .sort('name')
                .lean()
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Выгрузка');
            worksheet.getRow(1).getCell(1).font = {bold: true};
            worksheet.getRow(1).getCell(1).value = '_id'
            worksheet.getColumn(2).width = 40
            worksheet.getRow(1).getCell(2).font = {bold: true};
            worksheet.getRow(1).getCell(2).value = 'Название'
            worksheet.getColumn(3).width = 40
            worksheet.getRow(1).getCell(3).font = {bold: true};
            worksheet.getRow(1).getCell(3).value = 'Магазин'
            for(let i = 0; i < res.length; i++) {
                worksheet.getRow(i+2).getCell(1).value = res[i]._id.toString()
                worksheet.getRow(i+2).getCell(2).value = res[i].name
                worksheet.getRow(i+2).getCell(3).alignment = {wrapText: true}
                worksheet.getRow(i+2).getCell(3).value = `${res[i].store.name}\n${res[i].store._id.toString()}`
            }
            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
    warehouses: async(parent, {search, skip, store}, {user}) => {
        if(['admin', 'менеджер/завсклад', 'управляющий', 'завсклад'].includes(user.role)) {
            if(user.store) store = user.store
            let res =  await Warehouse.find({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
                ...store?{store}:{},
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .sort('name')
                .lean()
            return res
        }
    },
    warehousesCount: async(parent, {search, store}, {user}) => {
        if(['admin', 'менеджер/завсклад', 'управляющий', 'завсклад'].includes(user.role)) {
            if(user.store) store = user.store
            return await Warehouse.countDocuments({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
                ...store?{store}:{},
            })
                .lean()
        }
        return 0
    },
};

const resolversMutation = {
    uploadWarehouse: async(parent, { document }, {user}) => {
        if(['admin', 'менеджер/завсклад', 'завсклад'].includes(user.role)) {
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
                if(row.getCell(2).value) {
                    if(row.getCell(3).value&&row.getCell(3).value.split('|')[1]) {
                        row.getCell(3).value = row.getCell(3).value.split('|')[1]
                    }
                    _id = row.getCell(1).value
                    if(_id&&await checkUniqueName(row.getCell(2).value, 'warehouse')) {
                        object = await Warehouse.findById(_id)
                        if(object) {
                            let history = new History({
                                who: user._id,
                                where: object._id,
                                what: `Название:${object.name}→${row.getCell(2).value};`
                            });
                            object.name = row.getCell(2).value
                            await object.save();
                            await History.create(history)
                        }
                    }
                    else if(
                        (user.store||row.getCell(3).value&&(await Store.findById(row.getCell(3).value).select('_id').lean()))
                        &&await checkUniqueName(row.getCell(2).value, 'warehouse')
                    ) {
                        object = new Warehouse({
                            name: row.getCell(2).value,
                            store: user.store?user.store:row.getCell(3).value
                        });
                        object = await Warehouse.create(object)
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
    addWarehouse: async(parent, {name, store}, {user}) => {
        if(['admin', 'менеджер/завсклад', 'завсклад'].includes(user.role)&&await checkUniqueName(name, 'warehouse')) {
            let object = new Warehouse({
                name,
                store
            });
            object = await Warehouse.create(object)
            let history = new History({
                who: user._id,
                where: object._id,
                what: 'Создание'
            });
            await History.create(history)
            return await Warehouse.findById(object._id)
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .lean()
        }
        return {_id: 'ERROR'}
    },
    setWarehouse: async(parent, {_id, name}, {user}) => {
        if(['admin', 'менеджер/завсклад', 'завсклад'].includes(user.role)&&await checkUniqueName(name, 'warehouse')) {
            let object = await Warehouse.findOne({
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
    deleteWarehouse: async(parent, { _id }, {user}) => {
        if(['admin', 'менеджер/завсклад', 'завсклад'].includes(user.role)) {
            if(await BalanceItem.countDocuments({warehouse: _id, amount: {$ne: 0}}).lean())
                return 'USED'
            let object = await Warehouse.findOne({_id})
            if(object) {
                object.del = true
                await object.save()
                await BalanceItem.deleteMany({warehouse: _id})
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