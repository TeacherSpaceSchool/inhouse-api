const Category = require('../models/category');
const Item = require('../models/item');
const History = require('../models/history');
const { saveFile, deleteFile, urlMain } = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const randomstring = require('randomstring');


const type = `
  type Category {
      _id: ID
      createdAt: Date
      name: String
  }
`;

const query = `
    unloadCategorys(search: String): String
    categorys(skip: Int, search: String): [Category]
    categorysCount(search: String): Int
`;

const mutation = `
    uploadCategory(document: Upload!): String
    addCategory(name: String!): Category
    setCategory(_id: ID!, name: String!): String
    deleteCategory(_id: ID!): String
`;

const resolvers = {
    unloadCategorys: async(parent, {search}, {user}) => {
        if(user.role) {
            let res = await Category.find({
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
    categorys: async(parent, {skip, search}, {user}) => {
        if(user.role) {
            return await Category.find({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{}
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort('name')
                .lean()
        }
    },
    categorysCount: async(parent, {search}, {user}) => {
        if(user.role) {
            return await Category.countDocuments({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{}
            })
                .lean()
        }
    }
};

const resolversMutation = {
    uploadCategory: async(parent, { document }, {user}) => {
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
                if(row.getCell(2).value) {
                    _id = row.getCell(1).value
                    if(_id) {
                        object = await Category.findById(_id)
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
                        object = new Category({
                            name: row.getCell(2).value
                        });
                        object = await Category.create(object)
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
    addCategory: async(parent, {name}, {user}) => {
        if(['admin',  'завсклад',  'менеджер/завсклад'].includes(user.role)) {
            let object = new Category({
                name
            });
            object = await Category.create(object)
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
    setCategory: async(parent, {_id, name}, {user}) => {
        if(['admin',  'завсклад',  'менеджер/завсклад'].includes(user.role)) {
            let object = await Category.findById(_id)
            if(object) {
                let history = new History({
                    who: user._id,
                    where: object._id,
                    what: `Название:${object.name}→${name};\n`
                });
                object.name = name
                await object.save();
                await History.create(history)
                return 'OK'
            }
        }
        return 'ERROR'
    },
    deleteCategory: async(parent, { _id }, {user}) => {
        if(['admin',  'завсклад',  'менеджер/завсклад'].includes(user.role)) {
            let object = await Category.findOne({_id})
            if(object) {
                object.del = true
                await object.save()
                let history = new History({
                    who: user._id,
                    where: _id,
                    what: 'Удаление'
                });
                await Item.updateMany({category: _id}, {category: undefined})
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