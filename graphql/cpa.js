const Cpa = require('../models/cpa');
const History = require('../models/history');

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
    cpas(search: String, skip: Int, limit: Int): [Cpa]
    cpasCount(search: String): Int
    cpa(_id: ID!): Cpa
`;

const mutation = `
    addCpa(name: String!, emails: [String]!, phones: [String]!, percent: Float!, info: String!): String
    setCpa(_id: ID!, name: String, emails: [String], phones: [String], percent: Float, info: String): String
    deleteCpa(_id: ID!): String
`;

const resolvers = {
    cpas: async(parent, {search, skip, limit}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)) {
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
        if(['admin', 'менеджер'].includes(user.role)) {
            let res = await Cpa.findOne({
                _id,
            })
                .lean()
            return res
        }
    },
    cpasCount: async(parent, {search}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)) {
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
    addCpa: async(parent, {name, emails, phones, percent, info}, {user}) => {
        if(['admin'].includes(user.role)) {
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
        if(['admin'].includes(user.role)) {
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
                    history.what = `${history.what}Emails:${JSON.stringify(object.emails)}→${JSON.stringify(emails)};\n`
                    object.emails = emails
                }
                if (phones) {
                    history.what = `${history.what}Телефоны:${JSON.stringify(object.phones)}→${JSON.stringify(phones)};\n`
                    object.phones = phones
                }
                if (percent!=undefined) {
                    history.what = `${history.what}Процент:${object.percent}→${percent};\n`
                    object.percent = percent
                }
                if (info) {
                    history.what = `${history.what}Информация:${object.info}→${info};`
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