const BonusCpa = require('../models/bonusCpa');
const History = require('../models/history');
const Store = require('../models/store');
const { saveFile, deleteFile, urlMain, checkFloat } = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const randomstring = require('randomstring');

const type = `
  type BonusCpa {
    _id: ID
    createdAt: Date
    store: Store
    sale: [[Float]]
    order: [[Float]]
    installment: [[Float]]
  }
`;

const query = `
    storeForBonusCpas(search: String, store: ID): [User]
    unloadBonusCpas(store: ID): String
    bonusCpas(skip: Int, store: ID): [BonusCpa]
    bonusCpasCount(store: ID): Int
`;

const mutation = `
    addBonusCpa(store: ID!, sale: [[Float]]!, order: [[Float]]!, installment: [[Float]]!): BonusCpa
    setBonusCpa(_id: ID!, sale: [[Float]], order: [[Float]], installment: [[Float]]): String
    deleteBonusCpa(_id: ID!): String
`;

const resolvers = {
    unloadBonusCpas: async(parent, {store}, {user}) => {
        if(user.role==='admin') {
            if(user.store) store = user.store
            let res = await BonusCpa.find({
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
            worksheet.getRow(1).getCell(3).value = 'На заказ'
            worksheet.getColumn(4).width = 30
            worksheet.getRow(1).getCell(4).font = {bold: true};
            worksheet.getRow(1).getCell(4).value = 'Рассрочка'
            for(let i = 0; i < res.length; i++) {
                let sale = ''
                for(let i1 = 0; i1 < res[i].sale.length; i1++) {
                    sale = `${sale?`${sale}\n`:''}${res[i].sale[i1][0]}%: ${res[i].sale[i1][1]}%`
                }
                let order = ''
                for(let i1 = 0; i1 < res[i].order.length; i1++) {
                    order = `${order?`${order}\n`:''}${res[i].order[i1][0]}%: ${res[i].order[i1][1]}%`
                }
                let installment = ''
                for(let i1 = 0; i1 < res[i].installment.length; i1++) {
                    installment = `${installment?`${installment}\n`:''}${res[i].installment[i1][0]}%: ${res[i].installment[i1][1]}%`
                }
                worksheet.getRow(i+2).getCell(1).alignment = {wrapText: true}
                worksheet.getRow(i+2).getCell(1).value = res[i].store.name
                worksheet.getRow(i+2).getCell(2).alignment = {wrapText: true}
                worksheet.getRow(i+2).getCell(2).value = sale
                worksheet.getRow(i+2).getCell(3).alignment = {wrapText: true}
                worksheet.getRow(i+2).getCell(3).value = order
                worksheet.getRow(i+2).getCell(4).alignment = {wrapText: true}
                worksheet.getRow(i+2).getCell(4).value = installment
            }
            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
    storeForBonusCpas: async(parent, {search}, {user}) => {
        if(['admin'].includes(user.role)) {
            let usedStores = await BonusCpa.find().distinct('store').lean()
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
    bonusCpas: async(parent, {skip, store}, {user}) => {
        if(['admin',  'управляющий'].includes(user.role)) {
            if(user.store) store = user.store
            let res = await BonusCpa.find({
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
    bonusCpasCount: async(parent, {store}, {user}) => {
        if(['admin',  'управляющий'].includes(user.role)) {
            if(user.store) store = user.store
            return await BonusCpa.countDocuments({
                ...store?{store}:{},
            })
                .lean()
        }
        return 0
    },
};

const resolversMutation = {
    addBonusCpa: async(parent, {store, sale, installment, order}, {user}) => {
        if(['admin'].includes(user.role)&&!(await BonusCpa.countDocuments({store}).lean())) {
            let object = new BonusCpa({
                store,
                sale,
                installment,
                order,
            });
            object = await BonusCpa.create(object)
            let history = new History({
                who: user._id,
                where: object._id,
                what: 'Создание'
            });
            await History.create(history)
            return await BonusCpa.findById(object._id)
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .lean()
        }
        return {_id: 'ERROR'}
    },
    setBonusCpa: async(parent, {_id, sale, installment, order}, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await BonusCpa.findOne({
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
                if(order&&JSON.stringify(object.order)!==JSON.stringify(order)) {
                    history.what = `${history.what}На заказ:${object.order}→${order};\n`
                    object.order = order
                }
                if(installment&&JSON.stringify(object.installment)!==JSON.stringify(installment)) {
                    history.what = `${history.what}Рассрочка:${object.installment}→${installment};\n`
                    object.installment = installment
                }
                await object.save();
                await History.create(history)
                return 'OK'
            }
        }
        return 'ERROR'
    },
    deleteBonusCpa: async(parent, { _id }, {user}) => {
        if(['admin'].includes(user.role)) {
            await BonusCpa.deleteOne({_id})
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