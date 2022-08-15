const Cashbox = require('../models/cashbox');
const History = require('../models/history');
const { saveFile, deleteFile, urlMain } = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const randomstring = require('randomstring');
const Store = require('../models/store');

const type = `
  type Cashbox {
    _id: ID
    createdAt: Date
    name: String
    balance: [CurrencyBalance]
    store: Store
  }
`;

const query = `
    unloadCashboxes(search: String, store: ID): String
    cashboxes(skip: Int, search: String, store: ID): [Cashbox]
    cashboxesCount(search: String, store: ID): Int
`;

const mutation = `
    uploadCashbox(document: Upload!): String
    addCashbox(name: String!, store: ID!): Cashbox
    setCashbox(_id: ID!, name: String, store: ID): String
    deleteCashbox(_id: ID!): String
`;

const resolvers = {
    unloadCashboxes: async(parent, {search, store}, {user}) => {
        if(['admin', 'кассир', 'управляющий'].includes(user.role)) {
            if(user.store) store = user.store
            let res =  await Cashbox.find({
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
            for(let i = 0; i < res.length; i++) {
                let balance = ''
                for(let i1 = 0; i1 < res[i].balance.length; i1++) {
                    balance = `${balance?`${balance}, `:''}${res[i].balance[i1].currency}: ${res[i].balance[i1].amount}`
                }
                worksheet.getRow(i+1).getCell(1).value = res[i]._id.toString()
                worksheet.getRow(i+1).getCell(2).value = res[i].name
                worksheet.getRow(i+1).getCell(3).value = balance
                worksheet.getRow(i+1).getCell(4).value = `${res[i].store.name}|${res[i].store._id.toString()}`
            }
            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
    cashboxes: async(parent, {skip, search, store}, {user}) => {
        if(['admin', 'кассир', 'управляющий'].includes(user.role)) {
            if(user.store) store = user.store
            return await Cashbox.find({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
                ...store ? {store} : {}
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort('name')
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .lean()
        }
        return []
    },
    cashboxesCount: async(parent, {search, store}, {user}) => {
        if(['admin', 'кассир', 'управляющий'].includes(user.role)) {
            if(user.store) store = user.store
            return await Cashbox.countDocuments({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
                ...store ? {store} : {}
            })
                .lean()
        }
        return 0
    }
};

const resolversMutation = {
    uploadCashbox: async(parent, { document }, {user}) => {
        if(['admin'].includes(user.role)) {
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
                    if(_id) {
                        object = await Cashbox.findById(_id)
                        if(object) {
                            let history = new History({
                                who: user._id,
                                where: object._id,
                                what: ''
                            });
                            if (row.getCell(2).value&&object.name!==row.getCell(2).value) {
                                history.what = `Название:${object.name}→${row.getCell(2).value};\n`
                                object.name = row.getCell(2).value
                            }
                            if (row.getCell(3).value&&object.store.toString()!==row.getCell(3).value.toString()) {
                                history.what = `${history.what}Магазин:${object.store}→${row.getCell(3).value};`
                                object.store = row.getCell(3).value
                            }
                            await object.save();
                            await History.create(history)
                        }
                    }
                    else if(user.store||row.getCell(3).value&&(await Store.findById(row.getCell(3).value).select('_id').lean())){
                        object = new Cashbox({
                            name: row.getCell(2).value,
                            store: user.store?user.store:row.getCell(3).value,
                            balance: []
                        });
                        object = await Cashbox.create(object)
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
    addCashbox: async(parent, {name, store}, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = new Cashbox({
                name,
                store,
                balance: []
            });
            object = await Cashbox.create(object)
            let history = new History({
                who: user._id,
                where: object._id,
                what: 'Создание'
            });
            await History.create(history)
            return await Cashbox.findById(object._id)
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .lean()
        }
        return {_id: 'ERROR'}
    },
    setCashbox: async(parent, {_id, name, store}, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await Cashbox.findOne({_id})
            if(object) {
                let history = new History({
                    who: user._id,
                    where: object._id,
                    what: ''
                });
                if (name&&object.name!==name) {
                    history.what = `Название:${object.name}→${name};\n`
                    object.name = name
                }
                if (store&&object.store.toString()!==store.toString()) {
                    history.what = `${history.what}Магазин:${object.store}→${store};`
                    object.store = store
                }
                await object.save();
                await History.create(history)
                return 'OK'
            }
        }
        return 'ERROR'
    },
    deleteCashbox: async(parent, { _id }, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await Cashbox.findOne({_id})
            if(object) {
                object.del = true
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
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;