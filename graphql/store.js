const Store = require('../models/store');
const Warehouse = require('../models/warehouse');
const User = require('../models/user');
const Cashbox = require('../models/cashbox');
const WayItem = require('../models/wayItem');
const Installment = require('../models/installment');
const History = require('../models/history');
const { saveFile, deleteFile, urlMain } = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const randomstring = require('randomstring');
const { checkUniqueName } = require('../module/const');
const mongoose = require('mongoose');

const type = `
  type Store {
    _id: ID
    createdAt: Date
    name: String
  }
`;

const query = `
    unloadStores(search: String): String
    stores(search: String, skip: Int): [Store]
    storesCount(search: String): Int
`;

const mutation = `
    uploadStore(document: Upload!): String
    addStore(name: String!): Store
    setStore(_id: ID!, name: String!): String
    deleteStore(_id: ID!): String
`;

const resolvers = {
    unloadStores: async(parent, {search}, {user}) => {
        if(['admin',  'управляющий'].includes(user.role)) {
            let res = await Store.find({
                ...user.store?{_id: user.store}:{},
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
            })
                .sort('name')
                .lean()
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Выгрузка');
            worksheet.getRow(1).getCell(1).font = {bold: true};
            worksheet.getRow(1).getCell(1).value = '_id'
            worksheet.getRow(1).getCell(2).font = {bold: true};
            worksheet.getRow(1).getCell(2).value = 'Название'
            for(let i = 0; i < res.length; i++) {
                worksheet.getRow(i+2).getCell(1).value = res[i]._id.toString()
                worksheet.getRow(i+2).getCell(2).value = res[i].name
            }
            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
    stores: async(parent, {search, skip}, {user}) => {
        if(user.role) {
            let res = await Store.find({
                ...user.store?{_id: user.store}:{},
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort('name')
                .lean()
            return res
        }
    },
    storesCount: async(parent, {search}, {user}) => {
        if(['admin',  'управляющий'].includes(user.role)) {
            return await Store.countDocuments({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
            })
                .lean()
        }
        return 0
    },
};

const resolversMutation = {
    uploadStore: async(parent, { document }, {user}) => {
        if (user.role === 'admin') {
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
                if(row.getCell(2).value&&await checkUniqueName(row.getCell(2).value, 'store')) {
                    if(row.getCell(1).value&&!mongoose.Types.ObjectId.isValid(row.getCell(1).value))
                        row.getCell(1).value = (await Store.findOne({name: row.getCell(1).value}).select('_id').lean())._id
                    _id = row.getCell(1).value
                    if(_id) {
                        object = await Store.findById(_id)
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
                    else {
                        object = new Store({
                            name: row.getCell(2).value
                        });
                        object = await Store.create(object)
                        let warehouse = new Warehouse({
                            name: 'Брак',
                            store: object._id
                        });
                        await Warehouse.create(warehouse)
                        warehouse = new Warehouse({
                            name: 'Реставрация',
                            store: object._id
                        });
                        await Warehouse.create(warehouse)
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
    addStore: async(parent, {name}, {user}) => {
        if(['admin'].includes(user.role)&&await checkUniqueName(name, 'store')) {
            let object = new Store({
                name
            });
            object = await Store.create(object)

            let warehouse = new Warehouse({
                name: 'Брак',
                store: object._id
            });
            await Warehouse.create(warehouse)
            warehouse = new Warehouse({
                name: 'Реставрация',
                store: object._id
            });
            await Warehouse.create(warehouse)

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
    setStore: async(parent, {_id, name}, {user}) => {
        if(['admin'].includes(user.role)&&await checkUniqueName(name, 'store')) {
            let object = await Store.findOne({
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
    deleteStore: async(parent, { _id }, {user}) => {
        if(['admin'].includes(user.role)) {

            let USED
            if(!USED)
                USED = await WayItem.countDocuments({store: _id/*, status: 'в пути'*/}).lean()
            if(!USED)
                USED = await Installment.countDocuments({store: _id/*, status: 'обработка'*/}).lean()
            if(!USED)
                USED = await Warehouse.countDocuments({store: _id, name: {$nin: ['Брак', 'Реставрация']}/*, del: {$ne: true}*/}).lean()
            if(!USED)
                USED = await Cashbox.countDocuments({store: _id/*, del: {$ne: true}*/}).lean()
            if(!USED)
                USED = await User.countDocuments({store: _id/*, del: {$ne: true}*/}).lean()
            if(USED)
                return 'USED'

            let object = await Store.findById(_id)
            if(object) {
                object.del = true
                object.name += '(удален)'
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