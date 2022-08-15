const Characteristic = require('../models/characteristic');
const History = require('../models/history');
const { saveFile, deleteFile, urlMain } = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const randomstring = require('randomstring');

const type = `
  type Characteristic {
      _id: ID
      createdAt: Date
      name: String
  }
`;

const query = `
    unloadCharacteristics(search: String): String
    characteristics(skip: Int, search: String): [Characteristic]
    characteristicsCount(search: String): Int
`;

const mutation = `
    uploadCharacteristic(document: Upload!): String
    addCharacteristic(name: String!): Characteristic
    setCharacteristic(_id: ID!, name: String!): String
    deleteCharacteristic(_id: ID!): String
`;

const resolvers = {
    unloadCharacteristics: async(parent, {search}, {user}) => {
        if(user.role) {
            let res = await Characteristic.find({
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
            })
                .sort('name')
                .lean()
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Выгрузка');
            for(let i = 0; i < res.length; i++) {
                worksheet.getRow(i+1).getCell(1).value = res[i]._id.toString()
                worksheet.getRow(i+1).getCell(2).value = res[i].name
            }
            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
    characteristics: async(parent, {skip, search}, {user}) => {
        if(user.role) {
            return await Characteristic.find({
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
            })
                .sort('name')
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .lean()
        }
    },
    characteristicsCount: async(parent, {search}, {user}) => {
        if(user.role) {
            return await Characteristic.countDocuments({
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
            })
                .lean()
        }
    },
};

const resolversMutation = {
    uploadCharacteristic: async(parent, { document }, {user}) => {
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
                        object = await Characteristic.findById(_id)
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
                        object = new Characteristic({
                            name: row.getCell(2).value
                        });
                        object = await Characteristic.create(object)
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
    addCharacteristic: async(parent, {name}, {user}) => {
        if(['admin',  'завсклад',  'менеджер/завсклад'].includes(user.role)) {
            let object = new Characteristic({
                name
            });
            object = await Characteristic.create(object)
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
    setCharacteristic: async(parent, {_id, name}, {user}) => {
        if(['admin',  'завсклад',  'менеджер/завсклад'].includes(user.role)) {
            let object = await Characteristic.findById(_id)
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
    deleteCharacteristic: async(parent, { _id }, {user}) => {
        if(['admin',  'завсклад',  'менеджер/завсклад'].includes(user.role)) {
            await Characteristic.deleteOne({_id})
            await History.deleteMany({where: _id})
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