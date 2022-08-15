const WayItem = require('../models/wayItem');
const Item = require('../models/item');
const History = require('../models/history');
const { sendWebPush } = require('../module/webPush');
const { pdDDMMYYYY } = require('../module/const');

const type = `
  type WayItem {
    _id: ID
    createdAt: Date
    store: Store
    item: Item
    bookings: [WayItemBooking]
    amount: Float
    status: String
    arrivalDate: Date
    order: Order
  }
  type WayItemBooking {
    manager: User
    client: Client
    amount: Float
  }
  input WayItemBookingInput {
    manager: ID
    nameManager: String
    client: ID
    nameClient: String
    amount: Float
  }
`;

const query = `
    wayItem(_id: ID!): WayItem
    wayItems(skip: Int, item: ID, store: ID, date: Date, status: String, soon: Boolean, late: Boolean, today: Boolean): [WayItem]
    wayItemsCount(item: ID, store: ID, date: Date, status: String, soon: Boolean, late: Boolean, today: Boolean): Int
`;

const mutation = `
    addWayItem(item: ID!, store: ID!, order: ID, bookings: [WayItemBookingInput]!, amount: Float!, arrivalDate: Date): WayItem
    setWayItem(_id: ID!, bookings: [WayItemBookingInput], amount: Float, arrivalDate: Date, status: String): String
`;

const resolvers = {
    wayItem: async(parent, {_id}, {user}) => {
        if(['admin', 'управляющий', 'менеджер', 'менеджер/завсклад', 'завсклад'].includes(user.role)) {
            let res = await WayItem.findOne({
                _id
            })
                .populate({
                    path: 'item',
                    select: 'name _id unit'
                })
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .populate({
                    path: 'order',
                    select: 'number _id'
                })
                .lean()
            for(let i1=0; i1<res.bookings.length; i1++) {
                res.bookings[i1].manager = {
                    name: res.bookings[i1].nameManager,
                    _id: res.bookings[i1].manager
                }
                res.bookings[i1].client = {
                    name: res.bookings[i1].nameClient,
                    _id: res.bookings[i1].client
                }
            }
            return res
        }
    },
    wayItems: async(parent, {skip, item, store, date, status, late, today, soon}, {user}) => {
        if(['admin', 'управляющий', 'менеджер', 'менеджер/завсклад', 'завсклад'].includes(user.role)) {
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
            let res = await WayItem.find({
                ...item ? {item} : {},
                ...store ? {store} : {},
                ...late? {arrivalDate: {$lt: date}, status: 'в пути'}
                    :
                    today?
                        {arrivalDate: date, status: 'в пути'}
                        :
                        {
                            ...status ? {status} : {},
                            ...dateStart?{$and: [{arrivalDate: {$gte: dateStart}}, {arrivalDate: {$lt: dateEnd}}]}:{}
                        }
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort('-createdAt')
                .populate({
                    path: 'item',
                    select: 'name _id unit'
                })
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .populate({
                    path: 'order',
                    select: 'number _id'
                })
                .lean()
            for(let i=0; i<res.length; i++) {
                for(let i1=0; i1<res[i].bookings.length; i1++) {
                    res[i].bookings[i1].manager = {
                        name: res[i].bookings[i1].nameManager,
                        _id: res[i].bookings[i1].manager
                    }
                    res[i].bookings[i1].client = {
                        name: res[i].bookings[i1].nameClient,
                        _id: res[i].bookings[i1].client
                    }
                }
            }
            return res
        }
    },
    wayItemsCount: async(parent, {item, date, store, status, late, today, soon}, {user}) => {
        if(['admin', 'управляющий', 'менеджер', 'менеджер/завсклад', 'завсклад'].includes(user.role)) {
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
            return await WayItem.countDocuments({
                ...item ? {item} : {},
                ...store ? {store} : {},
                ...late? {arrivalDate: {$lt: date}, status: 'в пути'} : today? {arrivalDate: date, status: 'в пути'}
                    :
                    {
                        ...status ? {status} : {},
                        ...dateStart?{$and: [{arrivalDate: {$gte: dateStart}}, {arrivalDate: {$lt: dateEnd}}]}:{}
                    }
            })
                .lean()
        }
        return 0
    },
};

const resolversMutation = {
    addWayItem: async(parent, {item, store, bookings, amount, arrivalDate, order}, {user}) => {
        if(['admin', 'менеджер/завсклад', 'завсклад'].includes(user.role)) {
            if(arrivalDate&&arrivalDate.toString()!=='Invalid Date') {
                arrivalDate = new Date(arrivalDate)
                arrivalDate.setHours(0, 0, 0, 0)
            }
            else
                arrivalDate = null
            let object = new WayItem({
                item,
                store,
                bookings,
                amount,
                status: 'в пути',
                arrivalDate,
                order
            });
            object = await WayItem.create(object)
            let history = new History({
                who: user._id,
                where: object._id,
                what: 'Создание'
            });
            await History.create(history)
            let res = await WayItem.findById(object._id)
                .populate({
                    path: 'item',
                    select: 'name _id unit'
                })
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .populate({
                    path: 'order',
                    select: 'number _id'
                })
                .populate({
                    path: 'bookings',
                    populate: {
                        path: 'manager'
                    }
                })
                .lean()
            for(let i1=0; i1<res.bookings.length; i1++) {
                res.bookings[i1].manager = {
                    name: res.bookings[i1].nameManager,
                    _id: res.bookings[i1].manager
                }
                res.bookings[i1].client = {
                    name: res.bookings[i1].nameClient,
                    _id: res.bookings[i1].client
                }
            }
            return res
        }
        return {_id: 'ERROR'}
    },
    setWayItem: async(parent, {_id, bookings, amount, arrivalDate, status}, {user}) => {
        if(['admin', 'менеджер/завсклад', 'завсклад'].includes(user.role)) {
            let object = await WayItem.findOne({
                _id,
            })
            if(object&&object.status!=='прибыл'&&object.status!=='отмена') {
                let history = new History({
                    who: user._id,
                    where: object._id,
                    what: ''
                });
                if (bookings&&JSON.stringify(object.bookings)!==JSON.stringify(bookings)) {
                    history.what = `Бронь:${JSON.stringify(object.bookings)}→${JSON.stringify(bookings)};\n`
                    object.bookings = bookings
                }
                if (amount!=undefined&&object.amount!==amount) {
                    history.what = `${history.what}Количество:${object.amount}→${amount};\n`
                    object.amount = amount
                }
                if (arrivalDate&&pdDDMMYYYY(object.arrivalDate)!==pdDDMMYYYY(arrivalDate)) {
                    history.what = `${history.what}Прибытие:${pdDDMMYYYY(object.arrivalDate)}→${pdDDMMYYYY(arrivalDate)};\n`
                    if(arrivalDate) {
                        arrivalDate = new Date(arrivalDate)
                        arrivalDate.setHours(0, 0, 0, 0)
                    }
                    object.arrivalDate = arrivalDate
                }
                if (status&&object.status!==status) {
                    history.what = `${history.what}Статус:${object.status}→${status};`
                    object.status = status
                    if(status==='прибыл') {
                        let item = await Item.findById(object.item).select('name').lean()
                        let users = []
                        for(let i=0; i<object.bookings.length; i++) {
                            users.push(object.bookings[i].manager)
                        }
                        await sendWebPush({title: `Прибыл ${item.name}`, message: `Прибыл ${item.name}`, users})
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