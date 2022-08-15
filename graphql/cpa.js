const Cpa = require('../models/cpa');
const History = require('../models/history');
const { saveFile, deleteFile, urlMain, checkFloat } = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const randomstring = require('randomstring');

const type = `
  type Cpa {
    _id: ID
    createdAt: Date
    name: String
    emails: [String]
    phones: [String]
    percent: Float
    info: String
  }
`;

const query = `
    unloadCpas(search: String): String
    cpas(search: String, skip: Int, limit: Int): [Cpa]
    cpasCount(search: String): Int
    cpa(_id: ID!): Cpa
`;

const mutation = `
    uploadCpa(document: Upload!): String
    addCpa(name: String!, emails: [String]!, phones: [String]!, percent: Float!, info: String!): String
    setCpa(_id: ID!, name: String, emails: [String], phones: [String], percent: Float, info: String): String
    deleteCpa(_id: ID!): String
`;

const resolvers = {
    unloadCpas: async(parent, {search}, {user}) => {
        if(['admin', 'менеджер', 'менеджер/завсклад', 'управляющий'].includes(user.role)) {
            let res =  await Cpa.find({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
            })
                .sort('name')
                .lean()
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Выгрузка');
            for(let i = 0; i < res.length; i++) {
                worksheet.getRow(i+1).getCell(1).value = res[i]._id.toString()
                worksheet.getRow(i+1).getCell(2).value = res[i].name
                worksheet.getRow(i+1).getCell(3).value = res[i].percent
                worksheet.getRow(i+1).getCell(4).value = (res[i].phones.map(phone=>`+996${phone}`)).toString()
                worksheet.getRow(i+1).getCell(5).value = res[i].emails.toString()
                worksheet.getRow(i+1).getCell(6).value = res[i].info
            }
            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
    cpas: async(parent, {search, skip, limit}, {user}) => {
        if(['admin', 'менеджер', 'менеджер/завсклад', 'управляющий'].includes(user.role)) {
            return await Cpa.find({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? limit ? limit : 30 : 10000000000)
                .sort('name')
                .select('_id name createdAt percent')
                .lean()
        }
    },
    cpa: async(parent, {_id}, {user}) => {
        if(['admin', 'менеджер', 'менеджер/завсклад', 'управляющий'].includes(user.role)) {
            let res = await Cpa.findOne({
                _id,
            })
                .lean()
            return res
        }
    },
    cpasCount: async(parent, {search}, {user}) => {
        if(['admin', 'менеджер', 'менеджер/завсклад', 'управляющий'].includes(user.role)) {
            return await Cpa.countDocuments({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{}
            })
                .lean()
        }
        return 0
    },
};

const resolversMutation = {
    uploadCpa: async(parent, { document }, {user}) => {
        if(['admin', 'менеджер', 'менеджер/завсклад'].includes(user.role)) {
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
                        object = await Cpa.findById(_id)
                        if(object) {
                            let history = new History({
                                who: user._id,
                                where: object._id,
                                what: ''
                            });
                            if (row.getCell(2).value&&object.name!==row.getCell(2).value) {
                                history.what = `Название:${object.name}→${row.getCell(2)};\n`
                                object.name = row.getCell(2).value
                            }
                            if (row.getCell(3).value) {
                                row.getCell(3).value = checkFloat(row.getCell(3).value)
                                if (object.percent!==row.getCell(3).value) {
                                    history.what = `${history.what}Процент:${object.percent}→${row.getCell(3)};\n`
                                    object.percent = row.getCell(3).value
                                }
                            }
                            if (row.getCell(4).value) {
                                row.getCell(4).value = row.getCell(4).value.split(', ')
                                if(row.getCell(4).value.toString()!==object.phones.toString()) {
                                    history.what = `${history.what}Телефоны:${object.phones.toString()}→${row.getCell(4).value.toString()};\n`
                                    object.phones = row.getCell(4).value
                                }
                            }
                            if (row.getCell(5).value) {
                                row.getCell(5).value = row.getCell(5).value.split(', ')
                                if (object.emails.toString() !== row.getCell(5).value.toString()) {
                                    history.what = `${history.what}Emails:${object.emails.toString()}→${row.getCell(5).value.toString()};\n`
                                    object.emails = row.getCell(5).value
                                }
                            }
                            if (row.getCell(6).value&&object.info!==row.getCell(6).value) {
                                history.what = `${history.what}Комментарий:${object.info}→${row.getCell(6).value};\n`
                                object.info = row.getCell(6).value
                            }
                            await object.save();
                            await History.create(history)
                        }
                    }
                    else if(row.getCell(2).value&&row.getCell(3).value) {
                        row.getCell(4).value = row.getCell(4).value?row.getCell(4).value.split(', '):[]
                        row.getCell(5).value = row.getCell(5).value?row.getCell(5).value.split(', '):[]
                        object = new Cpa({
                            name: row.getCell(2).value,
                            emails: row.getCell(5).value,
                            phones: row.getCell(4).value,
                            percent: checkFloat(row.getCell(3).value),
                            info: row.getCell(6).value?row.getCell(6).value:'',
                        });
                        object = await Cpa.create(object)
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
    addCpa: async(parent, {name, emails, phones, percent, info}, {user}) => {
        if(['admin', 'менеджер', 'менеджер/завсклад'].includes(user.role)) {
            let object = new Cpa({
                name,
                emails,
                phones,
                percent,
                info
            });
            object = await Cpa.create(object)
            let history = new History({
                who: user._id,
                where: object._id,
                what: 'Создание'
            });
            await History.create(history)
            return object._id
        }
        return 'ERROR'
    },
    setCpa: async(parent, {_id, name, emails, phones, percent, info}, {user}) => {
        if(['admin', 'менеджер', 'менеджер/завсклад'].includes(user.role)) {
            let object = await Cpa.findOne({
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
                if (emails) {
                    history.what = `${history.what}Emails:${object.emails.toString()}→${emails.toString()};\n`
                    object.emails = emails
                }
                if (phones) {
                    history.what = `${history.what}Телефоны:${object.phones.toString()}→${phones.toString()};\n`
                    object.phones = phones
                }
                if (percent!=undefined) {
                    history.what = `${history.what}Процент:${object.percent}→${percent};\n`
                    object.percent = percent
                }
                if (info) {
                    history.what = `${history.what}Комментарий:${object.info}→${info};`
                    object.info = info
                }
                await object.save();
                await History.create(history)
                return 'OK'
            }
        }
        return 'ERROR'
    },
    deleteCpa: async(parent, { _id }, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await Cpa.findOne({_id})
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
    }
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;