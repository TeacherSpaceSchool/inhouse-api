const Installment = require('../models/installment');
const Sale = require('../models/sale');
const History = require('../models/history');
const BalanceClient = require('../models/balanceClient');
const {checkFloat} = require('../module/const');

const type = `
  type Installment {
    _id: ID
    number: String
    createdAt: Date
    client: Client
    store: Store
    grid: [InstallmentGrid]
    info: String
    status: String
    debt: Float
    paid: Float
    amount: Float
    sale: Sale
    datePaid: Date
  }
  type InstallmentGrid {
    month: Date
    amount: Float
    paid: Float
    datePaid: Date
  }
  input InstallmentGridInput {
    month: Date
    amount: Float
    paid: Float
    datePaid: Date
  }
`;

const query = `
    installments(_id: ID, skip: Int, client: ID, status: String, date: Date, soon: Boolean, late: Boolean, today: Boolean, store: ID): [Installment]
    installmentsCount(_id: ID, client: ID, status: String, date: Date, soon: Boolean, late: Boolean, today: Boolean, store: ID): Int
`;

const mutation = `
    addInstallment(grid: [InstallmentGridInput]!, currency: String!, renew: Boolean, amount: Float!, client: ID!, sale: ID, debt: Float!, paid: Float!, datePaid: Date!, store: ID!): Installment
    setInstallment(_id: ID!, info: String, status: String): String
`;

const setGridInstallment = async ({_id, newAmount, oldAmount, month, type, user}) => {
    let installment = await Installment.findOne({
        _id,
    }).lean()
    let history = new History({
        who: user._id,
        where: _id,
        what: ''
    });
    history.what = `Сетка:${JSON.stringify(installment.grid)}→`
    let paid = 0
    let datePaid
    for (let i = 0; i < installment.grid.length; i++) {
        if(installment.grid[i].month===month) {
            if(type==='-') {
                installment.grid[i].paid = checkFloat(installment.grid[i].paid + checkFloat(oldAmount) - newAmount)
            }
            else if(type==='+') {
                installment.grid[i].paid = checkFloat(installment.grid[i].paid - checkFloat(oldAmount) + newAmount)
            }
            else {
                installment.grid[i].paid = newAmount
            }
        }
    }
    for (let i = 0; i < installment.grid.length; i++) {
        paid = checkFloat(paid + installment.grid[i].paid)
        if(!installment.grid[i].paid&&!datePaid)
            datePaid = installment.grid[i].month
    }
    let debt = checkFloat(installment.amount - paid)
    history.what = `${history.what}${JSON.stringify(installment.grid)};\n`
    history.what = `${history.what}Дата оплаты:${installment.datePaid}→${datePaid};\n`
    history.what = `${history.what}Долг:${installment.debt}→${debt};\n`
    history.what = `${history.what}Оплачено:${installment.paid}→${paid};\n`
    await Installment.updateOne({_id}, {debt, paid, datePaid, grid: installment.grid})
}

const resolvers = {
    installments: async(parent, {_id, skip, client, date, status, late, soon, today, store}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)) {
            if(user.store) store = user.store
            let dateStart, dateEnd
            if(late||today) {
                date = new Date()
                date.setHours(0, 0, 0, 0)
            }
            else if (soon) {
                dateStart = new Date()
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 3)
            }
            else if (date) {
                dateStart = new Date(date)
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            let res = await Installment.find({
                ..._id ? {_id} : {},
                ...client ? {client} : {},
                ...store ? {store} : {},
                ...late? {datePaid: {$lt: date}, status: 'активна'} :
                    today? {datePaid: date, status: 'активна'}
                    :
                    {
                        ...status ? {status} : {},
                        ...dateStart?{$and: [{datePaid: {$gte: dateStart}}, {datePaid: {$lt: dateEnd}}]}:{}
                    }
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort('-createdAt')
                .populate({
                    path: 'sale',
                    select: 'number _id'
                })
                .populate({
                    path: 'client',
                    select: 'name _id'
                })
                .lean()
            return res
        }
    },
    installmentsCount: async(parent, {_id, client, status, late, today, soon, store, date}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)) {
            if(user.store) store = user.store
            let dateStart, dateEnd
            if(late||today) {
                date = new Date()
                date.setHours(0, 0, 0, 0)
            }
            else if (soon) {
                dateStart = new Date()
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 3)
            }
            else if (date) {
                dateStart = new Date(date)
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            return await Installment.countDocuments({
                ..._id ? {_id} : {},
                ...store ? {store} : {},
                ...client ? {client} : {},
                ...late? {datePaid: {$lt: date}, status: 'активна'} : today? {datePaid: date, status: 'активна'}
                    :
                    {
                        ...status ? {status} : {},
                        ...dateStart?{$and: [{datePaid: {$gte: dateStart}}, {datePaid: {$lt: dateEnd}}]}:{}
                    }
            })
                .lean()
        }
        return 0
    },
};

const resolversMutation = {
    addInstallment: async(parent, {renew, grid, debt, client, currency, amount, paid, sale, datePaid, store}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)) {
            if(user.store) store = user.store
            let object = new Installment({
                number: (await Installment.countDocuments({}).lean())+1,
                client,
                grid,
                info: '',
                status: 'активна',
                debt,
                sale,
                paid,
                datePaid,
                amount,
                store
            });
            object = await Installment.create(object)
            if(sale)
                await Sale.updateOne({_id: sale}, {installment: object._id})

            let balanceClient = await BalanceClient.findOne({client}).lean(), index
            for(let i=0; i<balanceClient.balance.length; i++) {
                if (balanceClient.balance[i].currency === currency) {
                    index = i
                    break
                }
            }
            if(index===undefined)
                balanceClient.balance = [
                    {
                        currency,
                        amount: sale?-debt:-amount
                    },
                    ...balanceClient.balance
                ]
            else
                balanceClient.balance[index].amount = checkFloat(balanceClient.balance[index].amount - (sale?debt:amount))
            await BalanceClient.updateOne({_id: balanceClient._id}, {balance: balanceClient.balance})

            if(renew) {
                let installments = await Installment.find({client, store, status: 'активна', _id: {$ne: object._id}})
                for(let i=0; i<installments.length; i++) {

                    balanceClient.balance[index].amount = checkFloat(balanceClient.balance[index].amount + debt)

                    installments[i].status = 'перерасчет'
                    await installments[i].save()

                    let history = new History({
                        who: user._id,
                        where: installments[i]._id,
                        what: 'Перерасчет'
                    });
                    await History.create(history)
                }
            }

            let history = new History({
                who: user._id,
                where: object._id,
                what: 'Создание'
            });
            await History.create(history)
            return await Installment.findOne({_id: object._id})
                .populate({
                    path: 'sale',
                    select: 'number _id'
                })
                .populate({
                    path: 'client',
                    select: 'name _id'
                })
                .lean()
        }
        return {_id: 'ERROR'}
    },
    setInstallment: async(parent, {_id, info, status}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)) {
            let object = await Installment.findOne({
                _id,
            })
            if(object) {
                let history = new History({
                    who: user._id,
                    where: object._id,
                    what: ''
                });
                if (paid!=undefined&&object.paid!==paid) {

                    let balanceClient = await BalanceClient.findOne({client: object.client}).lean(), index
                    for(let i=0; i<balanceClient.balance.length; i++) {
                        if (balanceClient.balance[i].currency === 'сом') {
                            index = i
                            break
                        }
                    }
                    balanceClient.balance[index].amount = checkFloat(balanceClient.balance[index].amount - object.paid + paid)
                    await BalanceClient.updateOne({_id: balanceClient._id}, {balance: balanceClient.balance})

                    history.what = `${history.what}Оплачено:${object.paid}→${paid};\n`
                    object.paid = paid
                }
                if (grid&&JSON.stringify(object.grid)!==JSON.stringify(grid)) {
                    history.what = `${history.what}Сетка:${JSON.stringify(object.grid)}→${JSON.stringify(grid)};\n`
                    object.grid = grid
                }
                if (info&&object.info!==info) {
                    history.what = `${history.what}Информация:${object.info}→${info};\n`
                    object.info = info
                }
                if (status&&object.status!==status) {
                    history.what = `${history.what}Статус:${object.status}→${status};`
                    object.status = status
                    if(status==='отмена') {

                        let balanceClient = await BalanceClient.findOne({client: object.client}).lean(), index
                        for(let i=0; i<balanceClient.balance.length; i++) {
                            if (balanceClient.balance[i].currency === 'сом') {
                                index = i
                                break
                            }
                        }
                        balanceClient.balance[index].amount = checkFloat(balanceClient.balance[index].amount + object.debt)
                        await BalanceClient.updateOne({_id: balanceClient._id}, {balance: balanceClient.balance})

                    }
                }
                await object.save();
                await History.create(history)
                return 'OK'
            }
        }
        return 'ERROR'
    }
};

module.exports.setGridInstallment = setGridInstallment;
module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;