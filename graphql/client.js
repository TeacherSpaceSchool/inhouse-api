const Client = require('../models/client');
const Installment = require('../models/installment');
const History = require('../models/history');
const BalanceClient = require('../models/balanceClient');
const { saveFile, deleteFile, urlMain, pdDDMMYYYY } = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const randomstring = require('randomstring');

const type = `
  type Client {
    _id: ID
    createdAt: Date
    name: String
    emails: [String]
    phones: [String]
    address: String
    address1: String
    geo: [Float]
    info: String
    work: String
    passport: String
    inn: String
    level: String
    birthday: Date
  }
`;

const query = `
    unloadClients(search: String, level: String): String
    clients(search: String, skip: Int, level: String, limit: Int): [Client]
    clientsCount(search: String, level: String): Int
    client(_id: ID!): Client
`;

const mutation = `
    uploadClient(document: Upload!): String
    addClient(name: String!, address1: String!, emails: [String]!, geo: [Float], phones: [String]!, address: String!, info: String!, work: String!, passport: String!, inn: String!, level: String!, birthday: Date!): String
    setClient(_id: ID!, address1: String, name: String, emails: [String], geo: [Float], phones: [String], address: String, info: String, work: String, passport: String, inn: String, level: String, birthday: Date): String
    deleteClient(_id: ID!): String
`;

const resolvers = {
    unloadClients: async(parent, {search, level}, {user}) => {
        if(['admin', 'менеджер', 'завсклад', 'кассир', 'доставщик', 'менеджер/завсклад', 'управляющий', 'юрист'].includes(user.role)) {
            let res =  await Client.find({
                del: {$ne: true},
                ...search?{$or: [{name: {'$regex': search, '$options': 'i'}}, {inn: {'$regex': search, '$options': 'i'}}]}:{},
                ...level ? {level} : {}
            })
                .sort('name')
                .lean()
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Выгрузка');
            for(let i = 0; i < res.length; i++) {
                worksheet.getRow(i+1).getCell(1).value = res[i]._id.toString()
                worksheet.getRow(i+1).getCell(2).value = res[i].level
                worksheet.getRow(i+1).getCell(3).value = res[i].name
                worksheet.getRow(i+1).getCell(4).value = res[i].inn
                worksheet.getRow(i+1).getCell(5).value = res[i].passport
                worksheet.getRow(i+1).getCell(6).value = res[i].work
                worksheet.getRow(i+1).getCell(7).value = res[i].address
                worksheet.getRow(i+1).getCell(8).value = res[i].address1
                worksheet.getRow(i+1).getCell(9).value = pdDDMMYYYY(res[i].birthday)
                worksheet.getRow(i+1).getCell(10).value = (res[i].phones.map(phone=>`+996${phone}`)).toString()
                worksheet.getRow(i+1).getCell(11).value = res[i].emails.toString()
                worksheet.getRow(i+1).getCell(12).value = res[i].info
            }
            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
    clients: async(parent, {search, skip, level, limit}, {user}) => {
        if(['admin', 'менеджер', 'завсклад', 'кассир', 'доставщик', 'менеджер/завсклад', 'управляющий', 'юрист'].includes(user.role)) {
            let res = await Client.find({
                del: {$ne: true},
                ...search?{$or: [{name: {'$regex': search, '$options': 'i'}}, {inn: {'$regex': search, '$options': 'i'}}]}:{},
                ...level ? {level} : {}
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? limit ? limit : 30 : 10000000000)
                .sort('name')
                .select('_id created name geo inn level address')
                .lean()
            return res
        }
    },
    client: async(parent, {_id}, {user}) => {
        if(['admin', 'менеджер', 'завсклад', 'кассир', 'доставщик', 'менеджер/завсклад', 'управляющий', 'юрист'].includes(user.role)) {
            let res = await Client.findOne({
                _id,
            })
                .lean()
            return res
        }
    },
    clientsCount: async(parent, {search, level}, {user}) => {
        if(['admin', 'менеджер', 'завсклад', 'кассир', 'доставщик', 'менеджер/завсклад', 'управляющий', 'юрист'].includes(user.role)) {
            return await Client.countDocuments({
                del: {$ne: true},
                ...search?{$or: [{name: {'$regex': search, '$options': 'i'}}, {inn: {'$regex': search, '$options': 'i'}}]}:{},
                ...level ? {level} : {}
            })
                .lean()
        }
        return 0
    },
};

const resolversMutation = {
    uploadClient: async(parent, { document }, {user}) => {
        if(['admin', 'менеджер', 'менеджер/завсклад', 'кассир'].includes(user.role)) {
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
                        object = await Client.findById(_id)
                        if(object) {
                            let history = new History({
                                who: user._id,
                                where: object._id,
                                what: ''
                            });
                            if (row.getCell(2).value&&['Бронза', 'Серебро', 'Золото', 'Платина'].includes(row.getCell(2).value)&&object.level!==row.getCell(2).value) {
                                history.what = `Уровень:${object.level}→${row.getCell(2).value};\n`
                                object.level = row.getCell(2).value
                            }
                            if (row.getCell(3).value&&object.name!==row.getCell(3).value) {
                                history.what = `${history.what}ФИО:${object.name}→${row.getCell(3).value};\n`
                                object.name = row.getCell(3).value
                            }
                            if (row.getCell(4).value&&object.inn!==row.getCell(4).value) {
                                history.what = `${history.what}ИНН:${object.inn}→${row.getCell(4).value};\n`
                                object.inn = row.getCell(4).value
                            }
                            if (row.getCell(5).value&&object.passport!==row.getCell(5).value) {
                                history.what = `${history.what}Паспорт:${object.passport}→${row.getCell(5).value};\n`
                                object.passport = row.getCell(5).value
                            }
                            if (row.getCell(6).value&&object.work!==row.getCell(6).value) {
                                history.what = `${history.what}Работа:${object.work}→${row.getCell(6).value};\n`
                                object.work = row.getCell(6).value
                            }
                            if (row.getCell(7).value&&object.address!==row.getCell(7).value) {
                                history.what = `${history.what}Адрес проживания:${object.address}→${row.getCell(7).value};\n`
                                object.address = row.getCell(7).value
                            }
                            if (row.getCell(8).value&&object.address1!==row.getCell(8).value) {
                                history.what = `${history.what}Адрес прописки:${object.address1}→${row.getCell(8).value};\n`
                                object.address1 = row.getCell(8).value
                            }
                            if(row.getCell(9).value) {
                                if (pdDDMMYYYY(object.birthday)!==row.getCell(9).value) {
                                    history.what = `${history.what}День рождения:${pdDDMMYYYY(object.birthday)}→${row.getCell(9).value};\n`
                                    row.getCell(9).value = row.getCell(9).value.split('.')
                                    object.startWork = new Date(`${row.getCell(9).value[1]}.${row.getCell(9).value[0]}.${row.getCell(9).value[2]}`)
                                    object.startWork.setHours(0, 0, 0, 0)
                                }
                            }
                            if (row.getCell(10).value) {
                                row.getCell(10).value = row.getCell(10).value.split(', ')
                                if(row.getCell(10).value.toString()!==object.phones.toString()) {
                                    history.what = `${history.what}Телефоны:${object.phones.toString()}→${row.getCell(10).value.toString()};\n`
                                    object.phones = row.getCell(10).value
                                }
                            }
                            if (row.getCell(11).value) {
                                row.getCell(11).value = row.getCell(11).value.split(', ')
                                if (object.emails.toString() !== row.getCell(11).value.toString()) {
                                    history.what = `${history.what}Emails:${object.emails.toString()}→${row.getCell(11).value.toString()};\n`
                                    object.emails = row.getCell(11).value
                                }
                            }
                            if (row.getCell(12).value&&object.info!==row.getCell(12).value) {
                                history.what = `${history.what}Комментарий:${object.info}→${row.getCell(12).value};\n`
                                object.info = row.getCell(12).value
                            }
                            await object.save();
                            await History.create(history)
                        }
                    }
                    else if(row.getCell(2).value&&['Бронза', 'Серебро', 'Золото', 'Платина'].includes(row.getCell(2).value)&&row.getCell(3).value&&row.getCell(4).value&&row.getCell(5).value&&row.getCell(6).value&&row.getCell(7).value&&row.getCell(8).value&&row.getCell(9).value){
                        row.getCell(9).value = row.getCell(9).value.split('.')
                        row.getCell(9).value = new Date(`${row.getCell(9).value[1]}.${row.getCell(9).value[0]}.${row.getCell(9).value[2]}`)
                        row.getCell(9).value.setHours(0, 0, 0, 0)
                        row.getCell(10).value = row.getCell(10).value?row.getCell(10).value.split(', '):[]
                        row.getCell(11).value = row.getCell(11).value?row.getCell(11).value.split(', '):[]
                        object = new Client({
                            name: row.getCell(3).value,
                            emails: row.getCell(11).value,
                            phones: row.getCell(10).value,
                            address: row.getCell(7).value,
                            address1: row.getCell(8).value,
                            info: row.getCell(12).value?row.getCell(12).value:'',
                            work: row.getCell(6).value,
                            passport: row.getCell(5).value,
                            inn: row.getCell(4).value,
                            level: row.getCell(2).value,
                            birthday: row.getCell(9).value
                        });
                        object = await Client.create(object)
                        let balanceClient = new BalanceClient({
                            client: object._id,
                            balance: []
                        });
                        await BalanceClient.create(balanceClient)
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
    addClient: async(parent, {name, address1, emails, phones, geo, address, info, work, passport, inn, level, birthday}, {user}) => {
        if(['admin', 'менеджер', 'менеджер/завсклад', 'кассир'].includes(user.role)) {
            let object = new Client({
                name,
                emails,
                phones,
                address,
                address1,
                info,
                work,
                passport,
                inn,
                geo,
                level,
                birthday
            });
            object = await Client.create(object)
            let balanceClient = new BalanceClient({
                client: object._id,
                balance: []
            });
            await BalanceClient.create(balanceClient)
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
    setClient: async(parent, {_id, name, emails, phones, geo, address, address1, info, work, passport, inn, level, birthday}, {user}) => {
        if(['admin', 'менеджер', 'менеджер/завсклад', 'кассир'].includes(user.role)) {
            let object = await Client.findOne({
                _id,
            })
            if(object) {
                let history = new History({
                    who: user._id,
                    where: object._id,
                    what: ''
                });
                if (name) {
                    history.what = `ФИО:${object.name}→${name};\n`
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
                if (address) {
                    history.what = `${history.what}Адрес проживания:${object.address}→${address};\n`
                    object.address = address
                }
                if (address1) {
                    history.what = `${history.what}Адрес прописки:${object.address1}→${address1};\n`
                    object.address1 = address1
                }
                if (geo) {
                    history.what = `${history.what}Гео:${object.geo}→${geo};\n`
                    object.geo = geo
                }
                if (info) {
                    history.what = `${history.what}Комментарий:${object.info}→${info};\n`
                    object.info = info
                }
                if (work) {
                    history.what = `${history.what}Работа:${object.work}→${work};\n`
                    object.work = work
                }
                if (passport) {
                    history.what = `${history.what}Паспорт:${object.passport}→${passport};\n`
                    object.passport = passport
                }
                if (inn) {
                    history.what = `${history.what}ИНН:${object.inn}→${inn};\n`
                    object.inn = inn
                }
                if (level) {
                    history.what = `${history.what}Уровень:${object.level}→${level};\n`
                    object.level = level
                }
                if (birthday) {
                    history.what = `${history.what}День рождения:${object.birthday}→${birthday};`
                    object.birthday = birthday
                }
                await object.save();
                await History.create(history)
                return 'OK'
            }
        }
        return 'ERROR'
    },
    deleteClient: async(parent, { _id }, {user}) => {
        if(['admin'].includes(user.role)) {
            if(await Installment.countDocuments({client: _id, status: 'активна'}).lean())
                return 'USED'
            if(await BalanceClient.countDocuments({client: _id, balance: {$elemMatch: {amount: {$gte: 0}}}}).lean())
                return 'USED'
            let object = await Client.findOne({_id})
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