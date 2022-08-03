const Doc = require('../models/doc');
const History = require('../models/history');

const type = `
  type Doc {
    _id: ID
    createdAt: Date
    name: String
    address: String
    inn: String
    okpo: String
    bank: String
    court: String
    bik: String
    director: String
    wallet: String
    phoneCheckInstallment: String
    account: String
  }
`;

const query = `
    doc: Doc
`;

const mutation = `
    setDoc(name: String!, court: String!, wallet: String!, phoneCheckInstallment: String!, address: String!, inn: String!, okpo: String!, bank: String!, bik: String!, account: String!, director: String!): String
`;

const resolvers = {
    doc: async(parent, ctx, {user}) => {
        if(user.role) {
            let res = await Doc.findOne({})
                .lean()
            return res?res:{
                name: '',
                address: '',
                inn: '',
                okpo: '',
                bank: '',
                court: '',
                bik: '',
                account: '',
                wallet: '',
                phoneCheckInstallment: '',
                director: ''
            }
        }
    }
};

const resolversMutation = {
    setDoc: async(parent, {wallet, phoneCheckInstallment, court, name, address, inn, okpo, bank, bik, account, director}, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await Doc.findOne()
            let history
            if (!object) {
                let object = new Doc({
                    name,
                    address,
                    inn,
                    okpo,
                    court,
                    bank,
                    bik,
                    account,
                    wallet,
                    phoneCheckInstallment,
                    director
                });
                await Doc.create(object)
                history = new History({
                    who: user._id,
                    where: object._id,
                    what: ''
                })
                history.what = 'Создание'
            }
            else {
                history = new History({
                    who: user._id,
                    where: object._id,
                    what: ''
                })
                if (name) {
                    history.what = `Название:${object.name}→${name};\n`
                    object.name = name
                }
                if (court) {
                    history.what += `Суд:${object.court}→${court};\n`
                    object.court = court
                }
                if (address) {
                    history.what += `Адрес:${object.address}→${address};\n`
                    object.address = address
                }
                if (inn) {
                    history.what += `ИНН:${object.inn}→${inn};\n`
                    object.inn = inn
                }
                if (okpo) {
                    history.what += `ОКПО:${object.okpo}→${okpo};\n`
                    object.okpo = okpo
                }
                if (bank) {
                    history.what += `Банк:${object.bank}→${bank};\n`
                    object.bank = bank
                }
                if (bik) {
                    history.what += `БИК:${object.bik}→${bik};\n`
                    object.bik = bik
                }
                if (account) {
                    history.what += `Счет:${object.account}→${account};\n`
                    object.account = account
                }
                if (wallet) {
                    history.what += `Кошелек:${object.wallet}→${wallet};\n`
                    object.wallet = wallet
                }
                if (phoneCheckInstallment) {
                    history.what += `Телефон проверки:${object.phoneCheckInstallment}→${phoneCheckInstallment};\n`
                    object.phoneCheckInstallment = phoneCheckInstallment
                }
                if (director) {
                    history.what += `Директор:${object.director}→${director};`
                    object.director = director
                }
                await object.save();
            }
            await History.create(history)
            return 'OK'
        }
        return 'ERROR'
    }
}

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;