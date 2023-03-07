const StoreBalanceItem = require('../models/storeBalanceItem');
const { urlMain, checkFloat } = require('../module/const');
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

const mutation = `
    repairBalanceItems: String
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
                    path: 'store',
                    select: 'name _id'
                })
                .lean()
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Выгрузка');
            let cell = 1
            worksheet.getColumn(cell).width = 30
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Магазин'
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
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Остаток'
            cell++
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Доступно'
            cell++
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Бронь'
            cell++
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Продажа'
            for(let i = 0; i < res.length; i++) {
                cell = 1
                worksheet.getRow(i+2).getCell(cell).value = res[i].store.name
                cell++
                worksheet.getRow(i+2).getCell(cell).value = res[i].item.name
                cell++
                worksheet.getRow(i+2).getCell(cell).value = res[i].item.category.name
                cell++
                worksheet.getRow(i+2).getCell(cell).value = res[i].item.factory.name
                cell++
                worksheet.getRow(i+2).getCell(cell).value = res[i].amount
                cell++
                worksheet.getRow(i+2).getCell(cell).value = res[i].free
                cell++
                worksheet.getRow(i+2).getCell(cell).value = res[i].reservation
                cell++
                worksheet.getRow(i+2).getCell(cell).value = res[i].sale
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

const resolversMutation = {
    repairBalanceItems: async(parent, args, {user}) => {
        if(['admin', 'менеджер/завсклад', 'завсклад'].includes(user.role)) {
            let res =  await StoreBalanceItem.find({
                $or: [
                    {sale: {$lt: 0}},
                    {reservation: {$lt: 0}}
                ]
            })
            for(let i=0; i<res.length; i++) {
                let sale = res[i].sale, reservation = res[i].reservation, free = res[i].free
                if(sale<0) {
                    free += sale;
                    sale = 0;
                }
                if(reservation<0) {
                    free += reservation;
                    reservation = 0;
                }
                await StoreBalanceItem.updateMany({_id: res[i]._id}, {
                    sale,
                    free,
                    reservation,
                    amount: checkFloat(free+sale+reservation)
                })
            }
            return 'OK'
        }
        return 'ERROR'
    },
};

module.exports.type = type;
module.exports.mutation = mutation;
module.exports.resolversMutation = resolversMutation;
module.exports.query = query;
module.exports.resolvers = resolvers;