const TypeCharacteristic = require('../models/typeCharacteristic');
const History = require('../models/history');
const { saveFile, deleteFile, urlMain } = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const randomstring = require('randomstring');

const type = `
  type TypeCharacteristic {
      _id: ID
      createdAt: Date
      name: String
  }
`;

const query = `
    unloadTypeCharacteristics(search: String): String
    typeCharacteristics(skip: Int, search: String): [TypeCharacteristic]
    typeCharacteristicsCount(search: String): Int
`;

const mutation = `
    uploadTypeCharacteristic(document: Upload!): String
    addTypeCharacteristic(name: String!): TypeCharacteristic
    setTypeCharacteristic(_id: ID!, name: String!): String
    deleteTypeCharacteristic(_id: ID!): String
`;

const resolvers = {
    unloadTypeCharacteristics: async(parent, {search}, {user}) => {
        if(user.role) {
            let res = await TypeCharacteristic.find({
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
    typeCharacteristics: async(parent, {skip, search}, {user}) => {
        if(user.role) {
            return await TypeCharacteristic.find({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{}
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort('name')
                .lean()
        }
    },
    typeCharacteristicsCount: async(parent, {search}, {user}) => {
        if(user.role) {
            return await TypeCharacteristic.countDocuments({
                ...search?{name: {'$regex': search, '$options': 'i'}}:{}
            })
                .lean()
        }
    }
};

const resolversMutation = {
    uploadTypeCharacteristic: async(parent, { document }, {user}) => {
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
                        object = await TypeCharacteristic.findById(_id)
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
                        object = new TypeCharacteristic({
                            name: row.getCell(2).value
                        });
                        object = await TypeCharacteristic.create(object)
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
    addTypeCharacteristic: async(parent, {name}, {user}) => {
        if(['admin',  'завсклад',  'менеджер/завсклад'].includes(user.role)) {
            let object = new TypeCharacteristic({
                name
            });
            object = await TypeCharacteristic.create(object)
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
    setTypeCharacteristic: async(parent, {_id, name}, {user}) => {
        if(['admin',  'завсклад',  'менеджер/завсклад'].includes(user.role)) {
            let object = await TypeCharacteristic.findById(_id)
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
    deleteTypeCharacteristic: async(parent, { _id }, {user}) => {
        if(['admin',  'завсклад',  'менеджер/завсклад'].includes(user.role)) {
            let object = await TypeCharacteristic.findOne({_id})
            if(object) {
                await TypeCharacteristic.deleteOne({_id})
                await History.deleteMany({where: _id})
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