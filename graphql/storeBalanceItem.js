const StoreBalanceItem = require('../models/storeBalanceItem');
const { urlMain } = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const randomstring = require('randomstring');

const type = `
  type StoreBalanceItem {
    _id: ID
    createdAt: Date
    item: Item
    store: Store
    amount: Float
    reservation: Float
    sale: Float
    free: Float
  }
`;

const query = `
    unloadStoreBalanceItems(item: ID, store: ID): String
    storeBalanceItems(item: ID, skip: Int, sort: String, store: ID): [StoreBalanceItem]
    storeBalanceItemsCount(item: ID, store: ID): Int
`;

const resolvers = {
    unloadStoreBalanceItems: async(parent, {item, store}, {user}) => {
        if(['admin', 'менеджер', 'менеджер/завсклад', 'управляющий', 'завсклад'].includes(user.role)) {
            if(user.store) store = user.store
            let res =  await StoreBalanceItem.find({
                ...item?{item: item}:{},
                ...store?{store}:{},
            })
                .sort('-amount')
                .populate({
                    path: 'item',
                    select: 'name _id unit'
                })
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .lean()
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Выгрузка');
            worksheet.getColumn(1).width = 40
            worksheet.getColumn(2).width = 40
            worksheet.getRow(1).getCell(1).font = {bold: true};
            worksheet.getRow(1).getCell(1).value = 'Модель'
            worksheet.getRow(1).getCell(2).font = {bold: true};
            worksheet.getRow(1).getCell(2).value = 'Магазин'
            worksheet.getRow(1).getCell(3).font = {bold: true};
            worksheet.getRow(1).getCell(3).value = 'Остаток'
            worksheet.getRow(1).getCell(4).font = {bold: true};
            worksheet.getRow(1).getCell(4).value = 'Доступно'
            worksheet.getRow(1).getCell(5).font = {bold: true};
            worksheet.getRow(1).getCell(5).value = 'Бронь'
            worksheet.getRow(1).getCell(6).font = {bold: true};
            worksheet.getRow(1).getCell(6).value = 'Продажа'
            for(let i = 0; i < res.length; i++) {
                worksheet.getRow(i+2).getCell(1).alignment = {wrapText: true}
                worksheet.getRow(i+2).getCell(1).value = `${res[i].item.name}\n${res[i].item._id.toString()}`
                worksheet.getRow(i+2).getCell(2).alignment = {wrapText: true}
                worksheet.getRow(i+2).getCell(2).value = `${res[i].store.name}\n${res[i].store._id.toString()}`
                worksheet.getRow(i+2).getCell(3).value = res[i].amount
                worksheet.getRow(i+2).getCell(4).value = res[i].free
                worksheet.getRow(i+2).getCell(5).value = res[i].reservation
                worksheet.getRow(i+2).getCell(6).value = res[i].sale
            }
            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
    storeBalanceItems: async(parent, {item, skip, sort, store}, {user}) => {
        if(['admin', 'менеджер', 'менеджер/завсклад', 'управляющий', 'завсклад'].includes(user.role)) {
            if(user.store) store = user.store
            return await StoreBalanceItem.find({
                ...item?{item: item}:{},
                ...store?{store}:{},
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort(sort? sort : '-amount')
                .populate({
                    path: 'item',
                    select: 'name _id unit'
                })
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .lean()
        }
    },
    storeBalanceItemsCount: async(parent, {item, store}, {user}) => {
        if(['admin', 'менеджер', 'менеджер/завсклад', 'управляющий', 'завсклад'].includes(user.role)) {
            if(user.store) store = user.store
            return await StoreBalanceItem.countDocuments({
                ...item?{item}:{},
                ...store?{store}:{},
            })
                .lean()
        }
        return 0
    },
};

module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;