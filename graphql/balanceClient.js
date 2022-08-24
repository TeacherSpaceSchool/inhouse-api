const BalanceClient = require('../models/balanceClient');
const Installment = require('../models/installment');
const Client = require('../models/client');
const Sale = require('../models/sale');
const Order = require('../models/order');
const Reservation = require('../models/reservation');
const { urlMain } = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const randomstring = require('randomstring');

const type = `
  type BalanceClient {
    _id: ID
    createdAt: Date
    client: Client
    balance: [CurrencyBalance]
  }
`;

const query = `
    unloadBalanceClients(search: String, debtor: String, client: ID): String
    balanceClients(search: String, skip: Int, debtor: String, client: ID): [BalanceClient]
    balanceClientsCount(search: String, debtor: String, client: ID): Int
`;

const resolvers = {
    unloadBalanceClients: async(parent, {search, debtor, client}, {user}) => {
        if(['admin', 'кассир', 'менеджер', 'менеджер/завсклад', 'управляющий'].includes(user.role)) {
            let managerClients = []
            if(['менеджер', 'менеджер/завсклад'].includes(user.role)) {
                managerClients = [
                    ...(await Sale.find({manager: user._id}).distinct('client').lean()),
                    ...(await Reservation.find({manager: user._id}).distinct('client').lean()),
                    ...(await Order.find({manager: user._id}).distinct('client').lean())
                ]
            }
            let searchClients = await Client.find({
                ...search ? {$or: [
                    {name: {'$regex': search, '$options': 'i'}},
                    {inn: {'$regex': search, '$options': 'i'}}
                ]}:{
                    del: {$ne: true}
                }
            })
                .distinct('_id')
                .lean()
            let installmentClients
            if(!debtor||debtor!=='all') {
                installmentClients = await Installment.find({
                    status: {$in: ['активна', 'безнадежна']}
                })
                    .distinct('client')
                    .lean()
            }
            let res = await BalanceClient.find({
                ...client?
                    {
                        client
                    }
                    :
                    {
                        $and: [
                            {client: {$in: searchClients}},
                            ...['менеджер', 'менеджер/завсклад'].includes(user.role)?[{client: {$in: managerClients}}]:[],
                            {'balance.currency': {$exists: true}},
                            ...debtor==='all'?
                                [{balance: {$elemMatch: {amount: {$lt: 0}}}}]
                                :
                                debtor==='installment'?
                                    [{balance: {$elemMatch: {amount: {$lt: 0}}}}, {client: {$in: installmentClients}}]
                                    :
                                    debtor==='payment'?
                                        [{balance: {$elemMatch: {amount: {$lt: 0}}}}, {client: {$nin: installmentClients}}]
                                        :
                                        []
                        ]
                    }
            })
                .populate({
                    path: 'client',
                    select: 'name _id'
                })
                .sort('-updatedAt')
                .lean()
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Выгрузка');
            worksheet.getColumn(1).width = 40
            worksheet.getRow(1).getCell(1).font = {bold: true};
            worksheet.getRow(1).getCell(1).value = 'Клиент'
            worksheet.getColumn(2).width = 30
            worksheet.getRow(1).getCell(2).font = {bold: true};
            worksheet.getRow(1).getCell(2).value = 'Баланс'
            for(let i = 0; i < res.length; i++) {
                let balance = ''
                for(let i1 = 0; i1 < res[i].balance.length; i1++) {
                    balance = `${balance?`${balance}\n`:''}${res[i].balance[i1].currency}: ${res[i].balance[i1].amount}`
                }
                worksheet.getRow(i+2).getCell(1).alignment = {wrapText: true}
                worksheet.getRow(i+2).getCell(1).value = `${res[i].client.name}\n${res[i].client._id.toString()}`
                worksheet.getRow(i+2).getCell(2).alignment = {wrapText: true}
                worksheet.getRow(i+2).getCell(2).value = balance
            }
            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
    balanceClients: async(parent, {search, skip, debtor, client}, {user}) => {
        if(['admin', 'кассир', 'менеджер', 'менеджер/завсклад', 'управляющий'].includes(user.role)) {
            let managerClients = []
            if(['менеджер', 'менеджер/завсклад'].includes(user.role)) {
                managerClients = [
                    ...(await Sale.find({manager: user._id}).distinct('client').lean()),
                    ...(await Reservation.find({manager: user._id}).distinct('client').lean()),
                    ...(await Order.find({manager: user._id}).distinct('client').lean())
                ]
            }
            let searchClients = await Client.find({
                ...search ? {$or: [
                    {name: {'$regex': search, '$options': 'i'}},
                    {inn: {'$regex': search, '$options': 'i'}}
                ]}:{
                    del: {$ne: true}
                }
            })
                .distinct('_id')
                .lean()
            let installmentClients
            if(!debtor||debtor!=='all') {
                installmentClients = await Installment.find({
                    status: {$in: ['активна', 'безнадежна']}
                })
                    .distinct('client')
                    .lean()
            }
            let res = await BalanceClient.find({
                ...client?
                    {
                        client
                    }
                    :
                    {
                        $and: [
                            {client: {$in: searchClients}},
                            ...['менеджер', 'менеджер/завсклад'].includes(user.role)?[{client: {$in: managerClients}}]:[],
                            {'balance.currency': {$exists: true}},
                            ...debtor==='all'?
                                [{balance: {$elemMatch: {amount: {$lt: 0}}}}]
                                :
                            debtor==='installment'?
                                [{balance: {$elemMatch: {amount: {$lt: 0}}}}, {client: {$in: installmentClients}}]
                                :
                            debtor==='payment'?
                                [{balance: {$elemMatch: {amount: {$lt: 0}}}}, {client: {$nin: installmentClients}}]
                                :
                                []
                        ]
                    }
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .populate({
                    path: 'client',
                    select: 'name _id'
                })
                .sort('-updatedAt')
                .lean()
            return res
        }
    },
    balanceClientsCount: async(parent, {search, debtor, client}, {user}) => {
        if(['admin', 'кассир', 'менеджер', 'менеджер/завсклад', 'управляющий'].includes(user.role)) {
            let managerClients = []
            if(['менеджер', 'менеджер/завсклад'].includes(user.role)) {
                managerClients = [
                    ...(await Sale.find({manager: user._id}).distinct('client').lean()),
                    ...(await Reservation.find({manager: user._id}).distinct('client').lean()),
                    ...(await Order.find({manager: user._id}).distinct('client').lean())
                ]
            }
            let searchClients = await Client.find({
                ...search ? {$or: [
                    {name: {'$regex': search, '$options': 'i'}},
                    {inn: {'$regex': search, '$options': 'i'}}
                ]}:{
                    del: {$ne: true}
                }
            })
                .distinct('_id')
                .lean()
            let installmentClients
            if(!debtor||debtor!=='all') {
                installmentClients = await Installment.find({
                    status: {$in: ['активна', 'безнадежна']}
                })
                    .distinct('client')
                    .lean()
            }
            return await BalanceClient.countDocuments({
                ...client?
                    {
                        client
                    }
                    :
                    {
                        $and: [
                            {client: {$in: searchClients}},
                            ...['менеджер', 'менеджер/завсклад'].includes(user.role)?[{client: {$in: managerClients}}]:[],
                            {'balance.currency': {$exists: true}},
                            ...debtor==='all'?
                                [{balance: {$elemMatch: {amount: {$lt: 0}}}}]
                                :
                                debtor==='installment'?
                                    [{balance: {$elemMatch: {amount: {$lt: 0}}}}, {client: {$in: installmentClients}}]
                                    :
                                    debtor==='payment'?
                                        [{balance: {$elemMatch: {amount: {$lt: 0}}}}, {client: {$nin: installmentClients}}]
                                        :
                                        []
                        ]
                    }
            })
                .lean()
        }
        return 0
    },
};

module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;