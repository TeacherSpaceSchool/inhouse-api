const Sale = require('../models/sale');
const Cpa = require('../models/cpa');
const History = require('../models/history');
const { saveFile, deleteFile, urlMain, checkFloat } = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const randomstring = require('randomstring');
const { checkUniqueName } = require('../module/const');
const mongoose = require('mongoose');

const type = `
  type Cpa {
    _id: ID
    createdAt: Date
    name: String
    emails: [String]
    phones: [String]
    info: String
  }
`;

const query = `
    unloadStatisticCpa(cpa: ID, dateStart: Date!, dateEnd: Date, store: ID): String
    unloadCpas(search: String): String
    statisticCpa(cpa: ID, dateStart: Date!, dateEnd: Date, store: ID, skip: Int): [[String]]
    cpas(search: String, skip: Int, limit: Int): [Cpa]
    cpasCount(search: String): Int
    cpa(_id: ID!): Cpa
`;

const mutation = `
    uploadCpa(document: Upload!): String
    addCpa(name: String!, emails: [String]!, phones: [String]!, info: String!): String
    setCpa(_id: ID!, name: String, emails: [String], phones: [String], info: String): String
    deleteCpa(_id: ID!): String
`;

const resolvers = {
    statisticCpa: async(parent, {cpa, dateStart, dateEnd, store, skip}, {user}) => {
        if(['admin', 'управляющий'].includes(user.role)) {
            if(user.store) store = user.store
            if (dateStart) {
                dateStart = new Date(dateStart)
                dateStart.setHours(0, 0, 0, 0)
                if(dateEnd)
                    dateEnd = new Date(dateEnd)
                else {
                    dateEnd = new Date(dateStart)
                    dateEnd.setDate(dateEnd.getDate() + 1)
                }
                dateEnd.setHours(0, 0, 0, 0)
            }
            let statistic = {}, allCount = 0, allBonusCpa = 0
            let data = await Sale.find({
                ...dateStart?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{},
                ...store?{store}:{},
                ...cpa?{cpa}:{cpa: {$ne: null}},
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort('-createdAt')
                .select('cpa bonusCpa')
                .populate({
                    path: 'cpa',
                    select: '_id name'
                })
                .lean()
            for(let i=0; i<data.length; i++) {
                if(!statistic[data[i].cpa._id]) {
                    allCount += 1
                    statistic[data[i].cpa._id] = [
                        data[i].cpa.name,
                        0
                    ]
                }
                statistic[data[i].cpa._id][1] += data[i].bonusCpa
                allBonusCpa += data[i].bonusCpa
            }
            data = Object.values(statistic)
            data = data.sort(function(a, b) {
                return b[1] - a[1]
            });
            if(!skip)
                data = [
                    [
                        allCount,
                        checkFloat(allBonusCpa)
                    ],
                    ...data
                ]
            return data
        }
    },
    unloadStatisticCpa: async(parent, {cpa, dateStart, dateEnd, store}, {user}) => {
        if(['admin', 'управляющий'].includes(user.role)) {
            if(user.store) store = user.store
            if (dateStart) {
                dateStart = new Date(dateStart)
                dateStart.setHours(0, 0, 0, 0)
                if(dateEnd)
                    dateEnd = new Date(dateEnd)
                else {
                    dateEnd = new Date(dateStart)
                    dateEnd.setDate(dateEnd.getDate() + 1)
                }
                dateEnd.setHours(0, 0, 0, 0)
            }
            let statistic = {}
            let data = await Sale.find({
                ...dateStart?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{},
                ...store?{store}:{},
                ...cpa?{cpa}:{cpa: {$ne: null}},
            })
                .sort('-createdAt')
                .select('cpa bonusCpa')
                .populate({
                    path: 'cpa',
                    select: '_id name'
                })
                .lean()
            for(let i=0; i<data.length; i++) {
                if(!statistic[data[i].cpa._id]) {
                    statistic[data[i].cpa._id] = [
                        data[i].cpa.name,
                        0
                    ]
                }
                statistic[data[i].cpa._id][1] += data[i].bonusCpa
            }
            data = Object.values(statistic)
            data = data.sort(function(a, b) {
                return b[1] - a[1]
            });
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Выгрузка');
            worksheet.getColumn(1).width = 40
            worksheet.getRow(1).getCell(1).font = {bold: true};
            worksheet.getRow(1).getCell(1).value = 'Дизайнер'
            worksheet.getRow(1).getCell(2).font = {bold: true};
            worksheet.getRow(1).getCell(2).value = 'Бонус'
            for(let i = 0; i < data.length; i++) {
                worksheet.getRow(i+2).getCell(1).value = data[i][0]
                worksheet.getRow(i+2).getCell(2).value = data[i][1]
            }
            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
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
            worksheet.getRow(1).getCell(1).font = {bold: true};
            worksheet.getRow(1).getCell(1).value = '_id'
            worksheet.getRow(1).getCell(2).font = {bold: true};
            worksheet.getRow(1).getCell(2).value = 'ФИО'
            worksheet.getRow(1).getCell(3).font = {bold: true};
            worksheet.getRow(1).getCell(3).value = 'Телефоны'
            worksheet.getRow(1).getCell(4).font = {bold: true};
            worksheet.getRow(1).getCell(4).value = 'Email'
            worksheet.getRow(1).getCell(5).font = {bold: true};
            worksheet.getRow(1).getCell(5).value = 'Комментарий'
            for(let i = 0; i < res.length; i++) {
                worksheet.getRow(i+2).getCell(1).value = res[i]._id.toString()
                worksheet.getRow(i+2).getCell(2).value = res[i].name
                worksheet.getRow(i+2).getCell(3).value = (res[i].phones.map(phone=>`+996${phone}`)).toString()
                worksheet.getRow(i+2).getCell(4).value = res[i].emails.toString()
                worksheet.getRow(i+2).getCell(5).value = res[i].info
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
                .select('_id name createdAt')
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
                    if(row.getCell(1).value&&!mongoose.Types.ObjectId.isValid(row.getCell(1).value))
                        row.getCell(1).value = (await Cpa.findOne({name: row.getCell(1).value}).select('_id').lean())._id
                    _id = row.getCell(1).value
                    if(_id) {
                        object = await Cpa.findById(_id)
                        if(object) {
                            let history = new History({
                                who: user._id,
                                where: object._id,
                                what: ''
                            });
                            if (row.getCell(2).value&&object.name!==row.getCell(2).value&&await checkUniqueName(row.getCell(2).value, 'cpa')) {
                                history.what = `Название:${object.name}→${row.getCell(2)};\n`
                                object.name = row.getCell(2).value
                            }
                            if (row.getCell(3).value) {
                                row.getCell(3).value = row.getCell(3).value.toString().split(', ')
                                if(row.getCell(3).value.toString()!==object.phones.toString()) {
                                    history.what = `${history.what}Телефоны:${object.phones.toString()}→${row.getCell(3).value.toString()};\n`
                                    object.phones = row.getCell(3).value
                                }
                            }
                            if (row.getCell(4).value) {
                                row.getCell(4).value = row.getCell(4).value.toString().split(', ')
                                if (object.emails.toString() !== row.getCell(4).value.toString()) {
                                    history.what = `${history.what}Emails:${object.emails.toString()}→${row.getCell(4).value.toString()};\n`
                                    object.emails = row.getCell(4).value
                                }
                            }
                            if (row.getCell(5).value&&object.info!==row.getCell(5).value) {
                                history.what = `${history.what}Комментарий:${object.info}→${row.getCell(5).value};\n`
                                object.info = row.getCell(5).value
                            }
                            await object.save();
                            await History.create(history)
                        }
                    }
                    else if(row.getCell(2).value&&await checkUniqueName(row.getCell(2).value, 'cpa')) {
                        row.getCell(3).value = row.getCell(3).value?row.getCell(3).value.toString().split(', '):[]
                        row.getCell(4).value = row.getCell(4).value?row.getCell(4).value.toString().split(', '):[]
                        object = new Cpa({
                            name: row.getCell(2).value,
                            phones: row.getCell(3).value,
                            emails: row.getCell(4).value,
                            info: row.getCell(5).value?row.getCell(5).value:'',
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
    addCpa: async(parent, {name, emails, phones, info}, {user}) => {
        if(['admin', 'менеджер', 'менеджер/завсклад'].includes(user.role)&&await checkUniqueName(name, 'cpa')) {
            let object = new Cpa({
                name,
                emails,
                phones,
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
    setCpa: async(parent, {_id, name, emails, phones, info}, {user}) => {
        if(['admin', 'менеджер', 'менеджер/завсклад'].includes(user.role)&&await checkUniqueName(name, 'cpa')) {
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