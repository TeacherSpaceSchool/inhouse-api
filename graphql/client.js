const Client = require('../models/client');
const Installment = require('../models/installment');
const History = require('../models/history');
const BalanceClient = require('../models/balanceClient');

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
    clients(search: String, skip: Int, level: String, limit: Int): [Client]
    clientsCount(search: String, level: String): Int
    client(_id: ID!): Client
`;

const mutation = `
    addClient(name: String!, address1: String!, emails: [String]!, geo: [Float], phones: [String]!, address: String!, info: String!, work: String!, passport: String!, inn: String!, level: String!, birthday: Date!): String
    setClient(_id: ID!, address1: String, name: String, emails: [String], geo: [Float], phones: [String], address: String, info: String, work: String, passport: String, inn: String, level: String, birthday: Date): String
    deleteClient(_id: ID!): String
`;

const resolvers = {
    clients: async(parent, {search, skip, level, limit}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)) {
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
        if(['admin', 'менеджер'].includes(user.role)) {
            let res = await Client.findOne({
                _id,
            })
                .lean()
            return res
        }
    },
    clientsCount: async(parent, {search, level}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)) {
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
    addClient: async(parent, {name, address1, emails, phones, geo, address, info, work, passport, inn, level, birthday}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)) {
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
        if(['admin', 'менеджер'].includes(user.role)) {
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
                    history.what = `${history.what}Emails:${JSON.stringify(object.emails)}→${JSON.stringify(emails)};\n`
                    object.emails = emails
                }
                if (phones) {
                    history.what = `${history.what}Телефоны:${JSON.stringify(object.phones)}→${JSON.stringify(phones)};\n`
                    object.phones = phones
                }
                if (address) {
                    history.what = `${history.what}Адрес:${object.address}→${address};\n`
                    object.address = address
                }
                if (address1) {
                    history.what = `${history.what}Адрес1:${object.address1}→${address1};\n`
                    object.address1 = address1
                }
                if (geo) {
                    history.what = `${history.what}Гео:${object.geo}→${geo};\n`
                    object.geo = geo
                }
                if (info) {
                    history.what = `${history.what}Информация:${object.info}→${info};\n`
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
                    history.what = `${history.what}level:${object.level}→${level};\n`
                    object.level = level
                }
                if (birthday) {
                    history.what = `${history.what}birthday:${object.birthday}→${birthday};`
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
        if(['admin', 'менеджер'].includes(user.role)) {
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