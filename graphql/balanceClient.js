const BalanceClient = require('../models/balanceClient');
const Installment = require('../models/installment');
const Client = require('../models/client');
const Sale = require('../models/sale');
const Order = require('../models/order');
const Reservation = require('../models/reservation');

const type = `
  type BalanceClient {
    _id: ID
    createdAt: Date
    client: Client
    balance: [CurrencyBalance]
  }
`;

const query = `
    balanceClients(search: String, skip: Int, debtor: String, client: ID): [BalanceClient]
    balanceClientsCount(search: String, debtor: String, client: ID): Int
`;

const resolvers = {
    balanceClients: async(parent, {search, skip, debtor, client}, {user}) => {
        if(['admin'].includes(user.role)) {
            let managerClients = []
            if(['менеджер', 'менеджер/завсклад'].includes(user.role)) {
                managerClients = [
                    ...(await Sale.find({manager: user._id}).distinct('client')).lean(),
                    ...(await Reservation.find({manager: user._id}).distinct('client')).lean(),
                    ...(await Order.find({manager: user._id}).distinct('client')).lean()
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
                    status: 'активна'
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
        if(['admin'].includes(user.role)) {
            let managerClients = []
            if(['менеджер', 'менеджер/завсклад'].includes(user.role)) {
                managerClients = [
                    ...(await Sale.find({manager: user._id}).distinct('client')).lean(),
                    ...(await Reservation.find({manager: user._id}).distinct('client')).lean(),
                    ...(await Order.find({manager: user._id}).distinct('client')).lean()
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
                    status: 'активна'
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