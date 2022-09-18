const BonusManager = require('../models/bonusManager');
const History = require('../models/history');
const Store = require('../models/store');
const { saveFile, deleteFile, urlMain, checkFloat } = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const randomstring = require('randomstring');

const type = `
  type BonusManager {
    _id: ID
    createdAt: Date
    store: Store
    sale: [[Float]]
    saleInstallment: [[Float]]
    order: [[Float]]
    orderInstallment: [[Float]]
    promotion: [[Float]]
  }
`;

const query = `
    storeForBonusManagers(search: String, store: ID): [User]
    unloadBonusManagers(store: ID): String
    bonusManagers(skip: Int, store: ID): [BonusManager]
    bonusManagersCount(store: ID): Int
`;

const mutation = `
    addBonusManager(store: ID!, sale: [[Float]]!, saleInstallment: [[Float]]!, order: [[Float]]!, orderInstallment: [[Float]]!, promotion: [[Float]]!): BonusManager
    setBonusManager(_id: ID!, sale: [[Float]], saleInstallment: [[Float]], order: [[Float]], orderInstallment: [[Float]], promotion: [[Float]]): String
    deleteBonusManager(_id: ID!): String
`;

const resolvers = {
    unloadBonusManagers: async(parent, {store}, {user}) => {
        if(user.role==='admin') {
            if(user.store) store = user.store
            let res = await BonusManager.find({
                ...store?{store}:{}
            })
                .sort('-createdAt')
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .lean()
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Выгрузка');
            worksheet.getColumn(1).width = 30
            worksheet.getRow(1).getCell(1).font = {bold: true};
            worksheet.getRow(1).getCell(1).value = 'Магазин'
            worksheet.getColumn(2).width = 30
            worksheet.getRow(1).getCell(2).font = {bold: true};
            worksheet.getRow(1).getCell(2).value = 'Продажа'
            worksheet.getColumn(3).width = 30
            worksheet.getRow(1).getCell(3).font = {bold: true};
            worksheet.getRow(1).getCell(3).value = 'Рассрочка'
            worksheet.getColumn(4).width = 30
            worksheet.getRow(1).getCell(4).font = {bold: true};
            worksheet.getRow(1).getCell(4).value = 'На заказ'
            worksheet.getColumn(5).width = 30
            worksheet.getRow(1).getCell(5).font = {bold: true};
            worksheet.getRow(1).getCell(5).value = 'На заказ рассрочка'
            worksheet.getColumn(6).width = 30
            worksheet.getRow(1).getCell(6).font = {bold: true};
            worksheet.getRow(1).getCell(6).value = 'Акция'
            for(let i = 0; i < res.length; i++) {
                let sale = ''
                for(let i1 = 0; i1 < res[i].sale.length; i1++) {
                    sale = `${sale?`${sale}\n`:''}${res[i].sale[i1][0]}%: ${res[i].sale[i1][1]}%`
                }
                let saleInstallment = ''
                for(let i1 = 0; i1 < res[i].saleInstallment.length; i1++) {
                    saleInstallment = `${saleInstallment?`${saleInstallment}\n`:''}${res[i].saleInstallment[i1][0]}%: ${res[i].saleInstallment[i1][1]}%`
                }
                let order = ''
                for(let i1 = 0; i1 < res[i].order.length; i1++) {
                    order = `${order?`${order}\n`:''}${res[i].order[i1][0]}%: ${res[i].order[i1][1]}%`
                }
                let orderInstallment = ''
                for(let i1 = 0; i1 < res[i].orderInstallment.length; i1++) {
                    orderInstallment = `${orderInstallment?`${orderInstallment}\n`:''}${res[i].orderInstallment[i1][0]}%: ${res[i].orderInstallment[i1][1]}%`
                }
                let promotion = ''
                for(let i1 = 0; i1 < res[i].promotion.length; i1++) {
                    promotion = `${promotion?`${promotion}\n`:''}${res[i].promotion[i1][0]}%: ${res[i].promotion[i1][1]}%`
                }
                worksheet.getRow(i+2).getCell(1).alignment = {wrapText: true}
                worksheet.getRow(i+2).getCell(1).value = res[i].store.name
                worksheet.getRow(i+2).getCell(2).alignment = {wrapText: true}
                worksheet.getRow(i+2).getCell(2).value = sale
                worksheet.getRow(i+2).getCell(3).alignment = {wrapText: true}
                worksheet.getRow(i+2).getCell(3).value = saleInstallment
                worksheet.getRow(i+2).getCell(4).alignment = {wrapText: true}
                worksheet.getRow(i+2).getCell(4).value = order
                worksheet.getRow(i+2).getCell(5).alignment = {wrapText: true}
                worksheet.getRow(i+2).getCell(5).value = orderInstallment
                worksheet.getRow(i+2).getCell(6).alignment = {wrapText: true}
                worksheet.getRow(i+2).getCell(6).value = promotion
            }
            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
    storeForBonusManagers: async(parent, {search}, {user}) => {
        if(['admin'].includes(user.role)) {
            let usedStores = await BonusManager.find().distinct('store').lean()
            return await Store.find({
                del: {$ne: true},
                _id: {$nin: usedStores},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
            })
                .select('_id name')
                .sort('name')
                .lean()
        }
    },
    bonusManagers: async(parent, {skip, store}, {user}) => {
        if(['admin',  'управляющий'].includes(user.role)) {
            if(user.store) store = user.store
            let res = await BonusManager.find({
                ...store?{store}:{},
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort('-createdAt')
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .lean()
            return res
        }
    },
    bonusManagersCount: async(parent, {store}, {user}) => {
        if(['admin',  'управляющий'].includes(user.role)) {
            if(user.store) store = user.store
            return await BonusManager.countDocuments({
                ...store?{store}:{},
            })
                .lean()
        }
        return 0
    },
};

const resolversMutation = {
    addBonusManager: async(parent, {store, sale, saleInstallment, order, orderInstallment, promotion}, {user}) => {
        if(['admin'].includes(user.role)&&!(await BonusManager.countDocuments({store}).lean())) {
            let object = new BonusManager({
                store,
                sale,
                saleInstallment,
                order,
                orderInstallment,
                promotion
            });
            object = await BonusManager.create(object)
            let history = new History({
                who: user._id,
                where: object._id,
                what: 'Создание'
            });
            await History.create(history)
            return await BonusManager.findById(object._id)
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .lean()
        }
        return {_id: 'ERROR'}
    },
    setBonusManager: async(parent, {_id, sale, saleInstallment, order, orderInstallment, promotion}, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await BonusManager.findOne({
                _id,
            })
            if (object) {
                let history = new History({
                    who: user._id,
                    where: object._id,
                    what: ''
                });
                if(sale&&JSON.stringify(object.sale)!==JSON.stringify(sale)) {
                    history.what = `${history.what}Продажа:${object.sale}→${sale};\n`
                    object.sale = sale
                }
                if(saleInstallment&&JSON.stringify(object.saleInstallment)!==JSON.stringify(saleInstallment)) {
                    history.what = `${history.what}Рассрочка:${object.saleInstallment}→${saleInstallment};\n`
                    object.saleInstallment = saleInstallment
                }
                if(order&&JSON.stringify(object.order)!==JSON.stringify(order)) {
                    history.what = `${history.what}На заказ:${object.order}→${order};\n`
                    object.order = order
                }
                if(orderInstallment&&JSON.stringify(object.orderInstallment)!==JSON.stringify(orderInstallment)) {
                    history.what = `${history.what}На заказ рассрочка:${object.orderInstallment}→${orderInstallment};\n`
                    object.orderInstallment = orderInstallment
                }
                if(promotion&&JSON.stringify(object.promotion)!==JSON.stringify(promotion)) {
                    history.what = `${history.what}Акция:${object.promotion}→${promotion};\n`
                    object.promotion = promotion
                }
                await object.save();
                await History.create(history)
                return 'OK'
            }
        }
        return 'ERROR'
    },
    deleteBonusManager: async(parent, { _id }, {user}) => {
        if(['admin'].includes(user.role)) {
            await BonusManager.deleteOne({_id})
            return 'OK'
        }
        return 'ERROR'
    }
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;