const Promotion = require('../models/promotion');
const { saveFile, deleteFile, urlMain } = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const randomstring = require('randomstring');
const { checkUniqueName } = require('../module/const');
const History = require('../models/history');
const mongoose = require('mongoose');

const type = `
  type Promotion {
    _id: ID
    createdAt: Date
    name: String
    store: Store
  }
`;

const query = `
    unloadPromotions(search: String): String
    promotions(search: String, skip: Int, limit: Int): [Promotion]
    promotionsCount(search: String): Int
`;

const mutation = `
    uploadPromotion(document: Upload!): String
    addPromotion(name: String!): Promotion
    setPromotion(_id: ID!, name: String): String
    deletePromotion(_id: ID!): String
`;

const resolvers = {
    unloadPromotions: async(parent, {search}, {user}) => {
        if(['admin', 'менеджер', 'менеджер/завсклад', 'управляющий'].includes(user.role)) {
            let res =  await Promotion.find({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{}
            })
                .sort('name')
                .lean()
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Выгрузка');
            worksheet.getRow(1).getCell(1).font = {bold: true};
            worksheet.getRow(1).getCell(1).value = '_id'
            worksheet.getRow(1).getCell(3).font = {bold: true};
            worksheet.getRow(1).getCell(3).value = 'Название'
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
    promotions: async(parent, {search, skip, limit}, {user}) => {
        if(['admin', 'менеджер', 'менеджер/завсклад', 'управляющий'].includes(user.role)) {
            let res = await Promotion.find({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{}
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? limit ? limit : 30 : 10000000000)
                .sort('name')
                .select('_id created name geo inn level address')
                .lean()
            return res
        }
    },
    promotionsCount: async(parent, {search}, {user}) => {
        if(['admin', 'менеджер', 'менеджер/завсклад', 'управляющий'].includes(user.role)) {
            return await Promotion.countDocuments({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{}
            })
                .lean()
        }
        return 0
    },
};

const resolversMutation = {
    uploadPromotion: async(parent, { document }, {user}) => {
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
                    if(row.getCell(1).value&&!mongoose.Types.ObjectId.isValid(row.getCell(1).value))
                        row.getCell(1).value = (await Promotion.findOne({name: row.getCell(1).value}).select('_id').lean())._id
                    _id = row.getCell(1).value
                    if(_id) {
                        object = await Promotion.findById(_id)
                        if(object) {
                            let history = new History({
                                who: user._id,
                                where: object._id,
                                what: ''
                            });
                            if (row.getCell(2).value&&object.name!==row.getCell(2).value&&await checkUniqueName(row.getCell(2).value, 'promotion')) {
                                history.what = `${history.what}Название:${object.name}→${row.getCell(2).value};\n`
                                object.name = row.getCell(2).value
                            }
                            await object.save();
                            await History.create(history)
                        }
                    }
                    else if(row.getCell(2).value&&await checkUniqueName(row.getCell(2).value, 'promotion')){
                        object = new Promotion({
                            name: row.getCell(2).value,
                        });
                        object = await Promotion.create(object)
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
    addPromotion: async(parent, {name}, {user}) => {
        if(['admin'].includes(user.role)&&await checkUniqueName(name, 'promotion')) {
            let object = new Promotion({
                name
            });
            object = await Promotion.create(object)
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
    setPromotion: async(parent, {_id, name}, {user}) => {
        if(['admin'].includes(user.role)&&await checkUniqueName(name, 'promotion')) {
            let object = await Promotion.findOne({
                _id,
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
                await object.save();
                await History.create(history)
                return 'OK'
            }
        }
        return 'ERROR'
    },
    deletePromotion: async(parent, { _id }, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await Promotion.findOne({_id})
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