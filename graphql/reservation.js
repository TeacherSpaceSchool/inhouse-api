const Reservation = require('../models/reservation');
const ItemReservation = require('../models/itemReservation');
const StoreBalanceItem = require('../models/storeBalanceItem');
const History = require('../models/history');
const BalanceClient = require('../models/balanceClient');
const {checkFloat, pdDDMMYYYY, urlMain, pdDDMMYYHHMM, checkDate } = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const randomstring = require('randomstring');

const type = `
  type Reservation {
    _id: ID
    createdAt: Date
    number: String
    manager: User
    paymentConfirmation: Boolean
    client: Client
    itemsReservation: [ItemFromList]
    store: Store
    amount: Float
    term: Date
    paid: Float
    paymentAmount: Float
    typePayment: String
    comment: String
    currency: String
    status: String
    sale: Sale
  }
`;

const query = `
    unloadReservations(search: String, item: ID, manager: ID, client: ID, store: ID, soon: Boolean, dateStart: Date, dateEnd: Date, status: String, late: Boolean, today: Boolean, _id: ID): String
    reservations(search: String, skip: Int, item: ID, items: Boolean, limit: Int, manager: ID, soon: Boolean, client: ID, store: ID, dateStart: Date, dateEnd: Date, status: String, late: Boolean, today: Boolean): [Reservation]
    reservationsCount(search: String, manager: ID, item: ID, client: ID, store: ID, soon: Boolean, dateStart: Date, dateEnd: Date, status: String, late: Boolean, today: Boolean): Int
    reservation(_id: ID!): Reservation
`;

const mutation = `
    addReservation(client: ID!, itemsReservation: [ItemFromListInput]!, term: Date!, amount: Float!, paid: Float!, typePayment: String!, comment: String!, currency: String): String
    setReservation(_id: ID!, itemsReservation: [ItemFromListInput], amount: Float, term: Date, paid: Float, comment: String, status: String): String
`;

const resolvers = {
    unloadReservations: async(parent, {search, item, client, store, manager, dateStart, dateEnd, soon, status, late, today, _id}, {user}) => {
        if(['admin', 'управляющий',  'кассир', 'менеджер', 'менеджер/завсклад', 'завсклад'].includes(user.role)) {
            if(user.store) store = user.store
            let date
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
            else {
                dateStart = checkDate(dateStart)
                dateStart.setHours(0, 0, 0, 0)
                if(dateEnd)
                    dateEnd = new Date(dateEnd)
                else {
                    dateEnd = new Date(dateStart)
                    dateEnd.setDate(dateEnd.getDate() + 1)
                }
                dateEnd.setHours(0, 0, 0, 0)
            }
            if (item) {
                item = await ItemRefund.find({item}).distinct('_id').lean()
            }
            let res = await Reservation.find(
                _id?
                    {
                        _id
                    }
                    :
                    {
                        ...item?{itemsReservation: {$in: item}}:{},
                        ...search?{number: search}:{},
                        ...user.role==='менеджер'?{manager: user._id}:manager?{manager}:{},
                        ...client?{client}:{},
                        ...store?{store}:{},
                        ...late?
                            {term: {$lt: date}, status: 'обработка'}
                            :
                            today?
                                {term: date, status: 'обработка'}
                                :
                                soon?
                                    {$and: [{term: {$gte: dateStart}}, {term: {$lt: dateEnd}}], status: 'обработка'}
                                    :
                                    {
                                        ...status?status==='оплата'?{status: {$ne: 'отмена'}}:{status}:{},
                                        $and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]
                                    }

                    }
            )
                .sort('-createdAt')
                .populate({
                    path: 'manager',
                    select: '_id name'
                })
                .populate({
                    path: 'client',
                    select: '_id name'
                })
                .populate({
                    path: 'store',
                    select: '_id name'
                })
                .populate({
                    path: 'sale',
                    select: '_id number'
                })
                .populate('itemsReservation')
                .lean()
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Выгрузка');
            let cell = 1
            worksheet.getColumn(cell).width = 5
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = '№'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Статус'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Магазин'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Дата'
            cell += 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Тип товара'
            cell += 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Фабрика'
            cell += 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Категория'
            cell += 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Товар'
            cell += 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Размер'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Количество'
            cell += 1
            worksheet.getColumn(cell).width = 17
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Сумма'
            cell += 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Клиент'
            cell += 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Менеджер'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Срок'
            cell += 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Комментарий'
            let row = 1
            for(let i = 0; i < res.length; i++) {
                for(let i1 = 0; i1 < res[i].itemsReservation.length; i1++) {
                    cell = 1
                    worksheet.getRow(row+1).getCell(cell).value = res[i].number;
                    cell += 1
                    worksheet.getRow(row+1).getCell(cell).value = res[i].status;
                    cell += 1
                    worksheet.getRow(row+1).getCell(cell).value = res[i].store.name;
                    cell += 1
                    worksheet.getRow(row+1).getCell(cell).value = pdDDMMYYHHMM(res[i].createdAt);
                    cell += 1
                    worksheet.getRow(row+1).getCell(cell).value = res[i].itemsReservation[i1].type;
                    cell += 1
                    worksheet.getRow(row+1).getCell(cell).value = res[i].itemsReservation[i1].factory;
                    cell += 1
                    worksheet.getRow(row+1).getCell(cell).value = res[i].itemsReservation[i1].category;
                    cell += 1
                    worksheet.getRow(row+1).getCell(cell).value = res[i].itemsReservation[i1].name;
                    cell += 1
                    worksheet.getRow(row+1).getCell(cell).value = res[i].itemsReservation[i1].size;
                    cell += 1
                    worksheet.getRow(row+1).getCell(cell).value = res[i].itemsReservation[i1].count;
                    cell += 1
                    worksheet.getRow(row+1).getCell(cell).value = res[i].itemsReservation[i1].amount;
                    cell += 1
                    worksheet.getRow(row+1).getCell(cell).value = res[i].client.name;
                    cell += 1
                    worksheet.getRow(row+1).getCell(cell).value = res[i].manager.name;
                    cell += 1
                    worksheet.getRow(row+1).getCell(cell).value = pdDDMMYYHHMM(res[i].term);
                    cell += 1
                    worksheet.getRow(row+1).getCell(cell).value = res[i].comment;
                    row += 1
                }
            }
            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
    reservations: async(parent, {search, item, skip, manager, items, client, store, soon, limit, dateStart, dateEnd, status, late, today}, {user}) => {
        if(['admin', 'управляющий',  'кассир', 'менеджер', 'менеджер/завсклад', 'завсклад'].includes(user.role)) {
            if(user.store) store = user.store
            let date
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
            else if (dateStart) {
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
            if (item) {
                item = await ItemReservation.find({item}).distinct('_id').lean()
            }
            let res = await Reservation.find({
                ...item?{itemsReservation: {$in: item}}:{},
                ...search?{number: search}:{},
                ...user.role==='менеджер'?{manager: user._id}:manager?{manager}:{},
                ...client?{client}:{},
                ...store?{store}:{},
                ...late?
                    {term: {$lt: date}, status: 'обработка'}
                    :
                    today?
                        {term: date, status: 'обработка'}
                        :
                        soon?
                            {$and: [{term: {$gte: dateStart}}, {term: {$lt: dateEnd}}], status: 'обработка'}
                            :
                            {
                                ...status?status==='оплата'?{status: {$ne: 'отмена'}}:{status}:{},
                                ...dateStart?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{}
                            }

            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? limit ? limit : 30 : 10000000000)
                .sort('-createdAt')
                .populate({
                    path: 'manager',
                    select: '_id name'
                })
                .populate({
                    path: 'client',
                    select: '_id name'
                })
                .populate({
                    path: 'store',
                    select: '_id name'
                })
                .populate({
                    path: 'sale',
                    select: '_id number'
                })
                .lean()
            if(items) {
                for (let i = 0; i < res.length; i++) {
                    res[i].itemsReservation = await ItemReservation.find({_id: {$in: res[i].itemsReservation}}).lean()
                }
            }
            return res
        }
    },
    reservationsCount: async(parent, {search, item, client, store, manager, dateStart, dateEnd, soon, status, late, today}, {user}) => {
        if(['admin', 'управляющий',  'кассир', 'менеджер', 'менеджер/завсклад', 'завсклад'].includes(user.role)) {
            if(user.store) store = user.store
            let date
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
            else {
                dateStart = checkDate(dateStart)
                dateStart.setHours(0, 0, 0, 0)
                if(dateEnd)
                    dateEnd = new Date(dateEnd)
                else {
                    dateEnd = new Date(dateStart)
                    dateEnd.setDate(dateEnd.getDate() + 1)
                }
                dateEnd.setHours(0, 0, 0, 0)
            }
            if (item) {
                item = await ItemReservation.find({item}).distinct('_id').lean()
            }
            return await Reservation.countDocuments({
                ...item?{itemsReservation: {$in: item}}:{},
                ...search?{number: search}:{},
                ...user.role==='менеджер'?{manager: user._id}:manager?{manager}:{},
                ...client?{client}:{},
                ...store?{store}:{},
                ...late?
                    {term: {$lt: date}, status: 'обработка'}
                    :
                    today?
                        {term: date, status: 'обработка'}
                        :
                        soon?
                            {$and: [{term: {$gte: dateStart}}, {term: {$lt: dateEnd}}], status: 'обработка'}
                            :
                            {
                                ...status?status==='оплата'?{status: {$ne: 'отмена'}}:{status}:{},
                                $and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]
                            }
            })
                .lean()
        }
    },
    reservation: async(parent, {_id}, {user}) => {
        if(['admin', 'управляющий',  'кассир', 'менеджер', 'менеджер/завсклад', 'завсклад'].includes(user.role)) {
            let res = await Reservation.findOne({
                _id,
            })
                .populate({
                    path: 'manager',
                    select: '_id name'
                })
                .populate({
                    path: 'client',
                    select: '_id name'
                })
                .populate({
                    path: 'store',
                    select: '_id name'
                })
                .populate({
                    path: 'sale',
                    select: '_id number'
                })
                .populate('itemsReservation')
                .lean()
            return res
        }
    },
};

const resolversMutation = {
    addReservation: async(parent, {client, itemsReservation, term, paid, typePayment, amount, comment, currency}, {user}) => {
        if(['менеджер', 'менеджер/завсклад'].includes(user.role)) {
            for(let i=0; i<itemsReservation.length; i++) {
                itemsReservation[i] = new ItemReservation(itemsReservation[i]);
                let storeBalanceItem = await StoreBalanceItem.findOne({store: user.store, item: itemsReservation[i].item})
                storeBalanceItem.reservation = checkFloat(storeBalanceItem.reservation + itemsReservation[i].count)
                storeBalanceItem.free = checkFloat(storeBalanceItem.free - itemsReservation[i].count)
                await storeBalanceItem.save()
                itemsReservation[i] = (await ItemReservation.create(itemsReservation[i]))._id
            }
            term = new Date(term)
            term.setHours(0, 0, 0, 0)
            let object = new Reservation({
                number: (await Reservation.countDocuments({}).lean())+1,
                manager: user._id,
                client,
                itemsReservation,
                store: user.store,
                term,
                paid,
                amount,
                typePayment,
                comment,
                currency,
                status: 'обработка'
            });
            object = await Reservation.create(object)
            let history = new History({
                who: user._id,
                where: object._id,
                what: 'Создание'
            });
            await History.create(history)

            if(paid) {
                let balanceClient = await BalanceClient.findOne({client})
                balanceClient.balance = checkFloat(balanceClient.balance - paid)
                await balanceClient.save()
            }
            return object._id
        }
        return 'ERROR'
    },
    setReservation: async(parent, {_id, itemsReservation, amount, term, paid, comment, status}, {user}) => {
        if(['admin', 'менеджер', 'менеджер/завсклад'].includes(user.role)) {
            let object = await Reservation.findOne({
                _id,
                ...['менеджер'/*, 'менеджер/завсклад'*/].includes(user.role)?{manager: user._id}:{}
            })
            if(object&&object.status==='обработка') {
                let history = new History({
                    who: user._id,
                    where: object._id,
                    what: ''
                });
                if (itemsReservation) {
                    history.what = 'Позиции;\n'
                    let storeBalanceItem, oldItemReservation, newItemReservation, newIdsItemReservation = [], newItemsReservation = []
                    for(let i=0; i<itemsReservation.length; i++) {
                        if(itemsReservation[i]._id)
                            newIdsItemReservation.push(itemsReservation[i]._id)
                    }
                    for(let i=0; i<object.itemsReservation.length; i++) {
                        oldItemReservation = await ItemReservation.findOne({_id: object.itemsReservation[i]}).lean()
                        storeBalanceItem = await StoreBalanceItem.findOne({store: object.store, item: oldItemReservation.item})
                        storeBalanceItem.reservation = checkFloat(storeBalanceItem.reservation - oldItemReservation.count)
                        storeBalanceItem.free = checkFloat(storeBalanceItem.free + oldItemReservation.count)
                        await storeBalanceItem.save()
                        if(!newIdsItemReservation.includes(object.itemsReservation[i].toString()))
                            await ItemReservation.deleteOne({_id: object.itemsReservation[i]})
                        else
                            newItemsReservation.push(object.itemsReservation[i])
                    }
                    for(let i=0; i<itemsReservation.length; i++) {
                        if(itemsReservation[i]._id) {
                            await ItemReservation.updateOne({_id: itemsReservation[i]._id}, itemsReservation[i])
                        }
                        else {
                            newItemReservation = new ItemReservation(itemsReservation[i]);
                            newItemsReservation.push((await ItemReservation.create(newItemReservation))._id)
                        }
                        storeBalanceItem = await StoreBalanceItem.findOne({store: object.store, item: itemsReservation[i].item})
                        storeBalanceItem.reservation = checkFloat(storeBalanceItem.reservation + itemsReservation[i].count)
                        storeBalanceItem.free = checkFloat(storeBalanceItem.free - itemsReservation[i].count)
                        await storeBalanceItem.save()
                    }
                    await Reservation.updateOne({_id}, {itemsReservation: newItemsReservation})
                }
                if (paid!=undefined) {
                    history.what = `${history.what}Оплачено:${object.paid}→${paid};\n`

                    let balanceClient = await BalanceClient.findOne({client: object.client})
                    balanceClient.balance = checkFloat(balanceClient.balance + object.paid - paid)
                    await balanceClient.save()

                    object.paid = paid
                }
                if (amount!=undefined) {
                    history.what = `${history.what}Итого:${object.amount}→${amount};\n`
                    object.amount = amount
                }
                if (term) {
                    term = new Date(term)
                    term.setHours(0, 0, 0, 0)
                    history.what = `${history.what}Срок:${pdDDMMYYYY(object.term)}→${pdDDMMYYYY(term)};\n`
                    object.term = term
                }
                if (comment) {
                    history.what = `${history.what}Комментарий:${object.comment}→${comment};\n`
                    object.comment = comment
                }
                if (status) {
                    history.what = `${history.what}Статус:${object.status}→${status};`
                    object.status = status
                    await ItemReservation.updateMany({_id: {$in: object.itemsReservation}}, {status})
                    if(status==='отмена') {
                        let balanceClient = await BalanceClient.findOne({client: object.client})
                        balanceClient.balance = checkFloat(balanceClient.balance + object.paid)
                        await balanceClient.save()

                        itemsReservation = await ItemReservation.find({_id: {$in: object.itemsReservation}}).lean()
                        for(let i=0; i<itemsReservation.length; i++) {
                            let storeBalanceItem = await StoreBalanceItem.findOne({store: object.store, item: itemsReservation[i].item})
                            storeBalanceItem.reservation = checkFloat(storeBalanceItem.reservation - itemsReservation[i].count)
                            storeBalanceItem.free = checkFloat(storeBalanceItem.free + itemsReservation[i].count)
                            await storeBalanceItem.save()
                        }
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

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;