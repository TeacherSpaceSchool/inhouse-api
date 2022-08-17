const WayItem = require('../models/wayItem');
const Item = require('../models/item');
const Store = require('../models/store');
const User = require('../models/user');
const History = require('../models/history');
const { sendWebPush } = require('../module/webPush');
const { checkFloat, pdDDMMYYYY, saveFile, deleteFile, urlMain, checkDate } = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const randomstring = require('randomstring');

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
    unloadWayItems(item: ID, store: ID, date: Date, status: String, soon: Boolean, late: Boolean, today: Boolean): String
    wayItem(_id: ID!): WayItem
    wayItems(skip: Int, item: ID, store: ID, date: Date, status: String, soon: Boolean, late: Boolean, today: Boolean): [WayItem]
    wayItemsCount(item: ID, store: ID, date: Date, status: String, soon: Boolean, late: Boolean, today: Boolean): Int
`;

const mutation = `
    uploadWayItem(document: Upload!): String
    addWayItem(item: ID!, store: ID!, order: ID, bookings: [WayItemBookingInput]!, amount: Float!, arrivalDate: Date): WayItem
    setWayItem(_id: ID!, bookings: [WayItemBookingInput], amount: Float, arrivalDate: Date, status: String): String
`;

const resolvers = {
    unloadWayItems: async(parent, {item, store, date, status, late, today, soon}, {user}) => {
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
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Выгрузка');
            worksheet.getRow(1).getCell(1).font = {bold: true};
            worksheet.getRow(1).getCell(1).value = '_id'
            worksheet.getRow(1).getCell(2).font = {bold: true};
            worksheet.getRow(1).getCell(2).value = 'Статус'
            worksheet.getColumn(3).width = 40
            worksheet.getRow(1).getCell(3).font = {bold: true};
            worksheet.getRow(1).getCell(3).value = 'Модель'
            worksheet.getColumn(4).width = 40
            worksheet.getRow(1).getCell(4).font = {bold: true};
            worksheet.getRow(1).getCell(4).value = 'Магазин'
            worksheet.getRow(1).getCell(5).font = {bold: true};
            worksheet.getRow(1).getCell(5).value = 'Количество'
            worksheet.getColumn(6).width = 15
            worksheet.getRow(1).getCell(6).font = {bold: true};
            worksheet.getRow(1).getCell(6).value = 'Прибытие'
            worksheet.getColumn(7).width = 40
            worksheet.getRow(1).getCell(7).font = {bold: true};
            worksheet.getRow(1).getCell(7).value = 'Бронь'
            for(let i = 0; i < res.length; i++) {
                let bookings = ''
                for(let i1 = 0; i1 < res[i].bookings.length; i1++)
                    bookings = `${bookings?`${bookings}\n`:''}${res[i].bookings[i1].nameManager}|${res[i].bookings[i1].manager}: ${res[i].bookings[i1].amount}`
                worksheet.getRow(i+2).getCell(1).value = res[i]._id.toString()
                worksheet.getRow(i+2).getCell(2).value = res[i].status
                worksheet.getRow(i+2).getCell(3).alignment = {wrapText: true}
                worksheet.getRow(i+2).getCell(3).value = `${res[i].item.name}\n${res[i].item._id.toString()}`
                worksheet.getRow(i+2).getCell(4).alignment = {wrapText: true}
                worksheet.getRow(i+2).getCell(4).value = `${res[i].store.name}\n${res[i].store._id.toString()}`
                worksheet.getRow(i+2).getCell(5).value = res[i].amount
                worksheet.getRow(i+2).getCell(6).value = pdDDMMYYYY(res[i].arrivalDate)
                worksheet.getRow(i+2).getCell(7).alignment = {wrapText: true}
                worksheet.getRow(i+2).getCell(7).value = bookings
            }
            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
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
    uploadWayItem: async(parent, { document }, {user}) => {
        if (user.role === 'admin') {
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
                if(row.getCell(2).value&&(await Item.findById(row.getCell(2).value).select('_id').lean())&&row.getCell(3).value&&(await Store.findById(row.getCell(3).value).select('_id').lean())) {
                    _id = row.getCell(1).value
                    if(row.getCell(5).value) {
                        row.getCell(5).value = row.getCell(5).value.split('.')
                        row.getCell(5).value = new Date(`${row.getCell(5).value[1]}.${row.getCell(5).value[0]}.${row.getCell(5).value[2]}`)
                        row.getCell(5).value.setHours(0, 0, 0, 0)
                    }
                    let bookings = []
                    let amountBookings = 0
                    if(row.getCell(6).value) {
                        row.getCell(6).value = row.getCell(6).value.split(', ')
                        for (let i = 0; i < row.getCell(6).value.length; i++) {
                            row.getCell(6).value[i] = row.getCell(6).value[i].split(': ')
                            if (row.getCell(6).value[i][0].split('|')[1])
                                row.getCell(6).value[i][0] = row.getCell(6).value[i][0].split('|')[1]
                            row.getCell(6).value[i][0] = await User.findById(row.getCell(6).value[i][0]).select('_id name').lean()
                            if (!row.getCell(6).value[i][0])
                                return 'ERROR'
                            row.getCell(6).value[i][1] = checkFloat(row.getCell(6).value[i][1])
                            bookings.push({
                                manager: row.getCell(6).value[i][0]._id,
                                nameManager: row.getCell(6).value[i][0].name,
                                amount: row.getCell(6).value[i][1]
                            })
                            amountBookings += row.getCell(6).value[i][1]
                        }
                    }
                    if(_id) {
                        object = await WayItem.findById(_id)
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
                            if(row.getCell(4).value) {
                                row.getCell(4).value = checkFloat(row.getCell(4).value)
                                if (object.amount!==row.getCell(4).value) {
                                    history.what = `${history.what}Количество:${object.amount}→${row.getCell(4).value};\n`
                                    object.amount = row.getCell(4).value
                                }
                            }
                            if (row.getCell(5).value&&pdDDMMYYYY(object.arrivalDate)!==pdDDMMYYYY(row.getCell(5).value)) {
                                history.what = `${history.what}Прибытие:${pdDDMMYYYY(object.arrivalDate)}→${pdDDMMYYYY(row.getCell(5).value)};\n`
                                object.arrivalDate = row.getCell(5).value
                            }
                            if(amountBookings>checkFloat(object.amount))
                                return 'ERROR'
                            await object.save();
                            await History.create(history)
                        }
                    }
                    else if(row.getCell(4)){
                        let object = new WayItem({
                            item: row.getCell(2).value,
                            store: row.getCell(3).value,
                            bookings,
                            amount: checkFloat(row.getCell(4).value),
                            status: 'в пути',
                            arrivalDate: row.getCell(5).value,
                        });
                        if(amountBookings>checkFloat(object.amount))
                            return 'ERROR'
                        object = await WayItem.create(object)
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