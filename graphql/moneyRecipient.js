const MoneyRecipient = require('../models/moneyRecipient');
const History = require('../models/history');
const { saveFile, deleteFile, urlMain } = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const randomstring = require('randomstring');


const type = `
  type MoneyRecipient {
    _id: ID
    createdAt: Date
    name: String
  }
`;

const query = `
    unloadMoneyRecipients(search: String): String
    moneyRecipients(search: String, skip: Int): [MoneyRecipient]
    moneyRecipientsCount(search: String): Int
`;

const mutation = `
    uploadMoneyRecipient(document: Upload!): String
    addMoneyRecipient(name: String!): MoneyRecipient
    setMoneyRecipient(_id: ID!, name: String!): String
    deleteMoneyRecipient(_id: ID!): String
`;

const resolvers = {
    unloadMoneyRecipients: async(parent, {search}, {user}) => {
        if(['admin', 'управляющий', 'кассир'].includes(user.role)) {
            let res = await MoneyRecipient.find({
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
    moneyRecipients: async(parent, {search, skip}, {user}) => {
        if(['admin', 'управляющий', 'кассир'].includes(user.role)) {
            return await MoneyRecipient.find({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort('name')
                .lean()
        }
    },
    moneyRecipientsCount: async(parent, {search}, {user}) => {
        if(['admin', 'управляющий', 'кассир'].includes(user.role)) {
            return await MoneyRecipient.countDocuments({
                del: {$ne: true},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
            })
                .lean()
        }
        return 0
    },
};

const resolversMutation = {
    uploadMoneyRecipient: async(parent, { document }, {user}) => {
        if(['admin', 'кассир'].includes(user.role)) {
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
                        object = await MoneyRecipient.findById(_id)
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
                        object = new MoneyRecipient({
                            name: row.getCell(2).value
                        });
                        object = await MoneyRecipient.create(object)
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
    addMoneyRecipient: async(parent, {name}, {user}) => {
        if(['admin', 'кассир'].includes(user.role)) {
            let object = new MoneyRecipient({
                name
            });
            object = await MoneyRecipient.create(object)
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
    setMoneyRecipient: async(parent, {_id, name}, {user}) => {
        if(['admin', 'кассир'].includes(user.role)) {
            let object = await MoneyRecipient.findOne({
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
    deleteMoneyRecipient: async(parent, { _id }, {user}) => {
        if(['admin', 'кассир'].includes(user.role)) {
            let object = await MoneyRecipient.findOne({_id})
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