const Factory = require('../models/factory');
const Item = require('../models/item');
const History = require('../models/history');
const { saveFile, deleteFile, urlMain } = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const randomstring = require('randomstring');
const { checkUniqueName } = require('../module/const');
const mongoose = require('mongoose');

const type = `
  type Factory {
    _id: ID
    createdAt: Date
    name: String
  }
`;

const query = `
    unloadFactorys(search: String): String
    factorys(search: String, skip: Int): [Factory]
    factorysCount(search: String): Int
`;

const mutation = `
    uploadFactory(document: Upload!): String
    addFactory(name: String!): Factory
    setFactory(_id: ID!, name: String): String
    deleteFactory(_id: ID!): String
`;

const resolvers = {
    unloadFactorys: async(parent, {search}, {user}) => {
        if(['admin', 'менеджер/завсклад', 'завсклад', 'управляющий'].includes(user.role)) {
            let res = await Factory.find({
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
    factorys: async(parent, {search, skip}, {user}) => {
        if(user.role) {
            return await Factory.find({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort('name')
                .lean()
        }
    },
    factorysCount: async(parent, {search}, {user}) => {
        if(['admin', 'менеджер/завсклад', 'завсклад', 'управляющий'].includes(user.role)) {
            return await Factory.countDocuments({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
            })
                .lean()
        }
        return 0
    },
};

const resolversMutation = {
    uploadFactory: async(parent, { document }, {user}) => {
        if(['admin',  'завсклад',  'менеджер/завсклад'].includes(user.role)) {
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
                if(row.getCell(2).value&&await checkUniqueName(row.getCell(2).value, 'factory')) {
                    if(row.getCell(1).value&&!mongoose.Types.ObjectId.isValid(row.getCell(1).value))
                        row.getCell(1).value = (await Factory.findOne({name: row.getCell(1).value}).select('_id').lean())._id
                    _id = row.getCell(1).value
                    if(_id) {
                        object = await Factory.findById(_id)
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
                        object = new Factory({
                            name: row.getCell(2).value
                        });
                        object = await Factory.create(object)
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
    addFactory: async(parent, {name}, {user}) => {
        if(['admin', 'менеджер/завсклад', 'завсклад'].includes(user.role)&&await checkUniqueName(name, 'factory')) {
            let object = new Factory({
                name
            });
            object = await Factory.create(object)
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
    setFactory: async(parent, {_id, name}, {user}) => {
        if(['admin', 'менеджер/завсклад', 'завсклад'].includes(user.role)&&await checkUniqueName(name, 'factory')) {
            let object = await Factory.findOne({
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
    deleteFactory: async(parent, { _id }, {user}) => {
        if(['admin'].includes(user.role)) {

            if(await Item.countDocuments({factory: _id, del: {$ne: true}}).lean())
                return 'USED'

            let object = await Factory.findOne({_id})
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