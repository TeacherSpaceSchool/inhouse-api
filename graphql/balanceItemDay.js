const BalanceItemDay = require('../models/balanceItemDay');
const { urlMain, checkDate, pdDDMMYYYY } = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const randomstring = require('randomstring');

const type = `
  type BalanceItemDay {
    _id: ID
    createdAt: Date
    store: Store
    warehouse: Warehouse
    item: Item
    startAmount: Float
    endAmount: Float
    plus: Float
    minus: Float
    date: Date
  }
`;

const query = `
    unloadBalanceItemDays(item: ID, warehouse: ID, store: ID, dateStart: Date, dateEnd: Date): String
    balanceItemDays(item: ID, skip: Int, sort: String, warehouse: ID, store: ID, dateStart: Date, dateEnd: Date): [BalanceItemDay]
    balanceItemDaysCount(item: ID, warehouse: ID, store: ID, dateStart: Date, dateEnd: Date): Int
`;

const resolvers = {
    unloadBalanceItemDays: async(parent, {item, warehouse, store, dateStart, dateEnd}, {user}) => {
        if(['admin', 'менеджер/завсклад', 'управляющий', 'завсклад'].includes(user.role)) {
            if(user.store) store = user.store
            dateStart = checkDate(dateStart)
            dateStart.setHours(0, 0, 0, 0)
            if(dateEnd)
                dateEnd = new Date(dateEnd)
            else {
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            dateEnd.setHours(0, 0, 0, 0)
            let res =  await BalanceItemDay.find({
                ...item?{item}:{},
                ...warehouse?{warehouse}:{},
                ...store?{store}:{},
                $and: [{date: {$gte: dateStart}}, {date: {$lt: dateEnd}}]
            })
                .sort('-date')
                .populate({
                    path: 'item',
                    select: 'name _id unit factory category',
                    populate: [
                        {
                            path: 'factory',
                            select: 'name'
                        },
                        {
                            path: 'category',
                            select: 'name'
                        }
                    ]
                })
                .populate({
                    path: 'warehouse',
                    select: 'name _id'
                })
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .lean()
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Выгрузка');
            let cell = 1
            worksheet.getColumn(cell).width = 13
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Дата'
            cell++
            worksheet.getColumn(cell).width = 30
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Магазин'
            cell++
            worksheet.getColumn(cell).width = 30
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Склад'
            cell++
            worksheet.getColumn(cell).width = 30
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Модель'
            cell++
            worksheet.getColumn(cell).width = 30
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Категория'
            cell++
            worksheet.getColumn(cell).width = 30
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Фабрика'
            cell++
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'На начало'
            cell++
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'На конец'
            cell++
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Поступило'
            cell++
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Ушло'
            for(let i = 0; i < res.length; i++) {
                cell = 1
                worksheet.getRow(i+2).getCell(cell).value = pdDDMMYYYY(res[i].date)
                cell++
                worksheet.getRow(i+2).getCell(cell).value = res[i].store.name
                cell++
                worksheet.getRow(i+2).getCell(cell).value = res[i].warehouse.name
                cell++
                worksheet.getRow(i+2).getCell(cell).value = res[i].item.name
                cell++
                worksheet.getRow(i+2).getCell(cell).value = res[i].item.category.name
                cell++
                worksheet.getRow(i+2).getCell(cell).value = res[i].item.factory.name
                cell++
                worksheet.getRow(i+2).getCell(cell).value = res[i].startAmount
                cell++
                worksheet.getRow(i+2).getCell(cell).value = res[i].endAmount
                cell++
                worksheet.getRow(i+2).getCell(cell).value = res[i].plus
                cell++
                worksheet.getRow(i+2).getCell(cell).value = res[i].minus
            }
            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
    balanceItemDays: async(parent, {item, skip, sort, warehouse, store, dateStart, dateEnd}, {user}) => {
        if(['admin', 'менеджер/завсклад', 'управляющий', 'завсклад'].includes(user.role)) {
            if(user.store) store = user.store
            if (dateStart) {
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
            let res =  await BalanceItemDay.find({
                ...dateStart?{$and: [{date: {$gte: dateStart}}, {date: {$lt: dateEnd}}]}:{},
                ...item?{item}:{},
                ...warehouse?{warehouse}:{},
                ...store?{store}:{}
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort('-date')
                .populate({
                    path: 'item',
                    select: 'name _id unit factory category',
                    populate: [
                        {
                            path: 'factory',
                            select: 'name'
                        },
                        {
                            path: 'category',
                            select: 'name'
                        }
                    ]
                })
                .populate({
                    path: 'warehouse',
                    select: 'name _id'
                })
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .lean()
            return res
        }
    },
    balanceItemDaysCount: async(parent, {item, warehouse, store, dateStart, dateEnd}, {user}) => {
        if(['admin', 'менеджер/завсклад', 'управляющий', 'завсклад'].includes(user.role)) {
            if(user.store) store = user.store
            dateStart = checkDate(dateStart)
            dateStart.setHours(0, 0, 0, 0)
            if(dateEnd)
                dateEnd = new Date(dateEnd)
            else {
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            dateEnd.setHours(0, 0, 0, 0)
            return await BalanceItemDay.countDocuments({
                $and: [{date: {$gte: dateStart}}, {date: {$lt: dateEnd}}],
                ...item?{item}:{},
                ...warehouse?{warehouse}:{},
                ...store?{store}:{}
            })
                .lean()
        }
        return 0
    },
};

module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;