const Sale = require('../models/sale');
const ItemSale = require('../models/itemSale');
const History = require('../models/history');
const Reservation = require('../models/reservation');
const Salary = require('../models/salary');
const BonusManager = require('../models/bonusManager');
const BonusCpa = require('../models/bonusCpa');
const Installment = require('../models/installment');
const ItemReservation = require('../models/itemReservation');
const WayItem = require('../models/wayItem');
const Item = require('../models/item');
const StoreBalanceItem = require('../models/storeBalanceItem');
const BalanceClient = require('../models/balanceClient');
const {urlMain, checkFloat, pdDDMMYYYY, pdDDMMYYHHMM, checkDate, months} = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const Doc = require('../models/doc');
const randomstring = require('randomstring');

const type = `
  type Sale {
    _id: ID
    createdAt: Date
    divide: Boolean
    paymentConfirmation: Boolean
    number: String
    manager: User
    deliverymans: [User]
    client: Client
    promotion: Promotion
    itemsSale: [ItemFromList]
    geo: [Float]
    discount: Float
    selfDelivery: Boolean
    cpa: Cpa
    deliveryFact: Date
    percentCpa: Float
    bonusCpa: Float
    bonusManager: Float
    prepaid: Float
    amountStart: Float
    amountEnd: Float
    typePayment: String
    installment: Installment
    address: String
    addressInfo: String
    comment: String
    currency: String
    paid: Float
    delivery: Date
    status: String
    store: Store
    order: Boolean
    reservations: [Reservation]
    refunds: [Refund]
}
`;

const queryUnload = `
    unloadClientSales(manager: ID, promotion: ID, client: ID, cpa: ID, dateStart: Date, dateEnd: Date, status: String, store: ID): String
    unloadBonusManagerSales(manager: ID, promotion: ID, client: ID, cpa: ID, dateStart: Date, dateEnd: Date, status: String, store: ID): String
    unloadBonusCpaSales(manager: ID, promotion: ID, client: ID, cpa: ID, dateStart: Date, dateEnd: Date, status: String, store: ID): String
    unloadDeliveries(search: String, manager: ID, order: Boolean, promotion: ID, client: ID, cpa: ID, dateStart: Date, dateEnd: Date, delivery: Date, status: String, store: ID): String
    unloadSales(search: String, manager: ID, type: String, category: String, cost: Boolean, order: Boolean, promotion: ID, client: ID, cpa: ID, dateStart: Date, dateEnd: Date, delivery: Date, status: String, store: ID, _id: ID): String
    unloadFactorySales(manager: ID, type: String, category: String, promotion: ID, client: ID, cpa: ID, dateStart: Date, dateEnd: Date, status: String, store: ID): String
`;

const resolversUnload = {
    unloadClientSales: async(parent, {manager, promotion, client, cpa, dateStart, dateEnd, status, store}, {user}) => {
        if(['admin', 'управляющий'].includes(user.role)) {
            if(user.store) store = user.store
            dateStart = checkDate(dateStart)
            dateStart.setHours(0, 0, 0, 0)
            if (dateEnd)
                dateEnd = new Date(dateEnd)
            else {
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            dateEnd.setHours(0, 0, 0, 0)
            let res = await Sale.find(
                {
                    ...manager?{manager}:{},
                    ...client?{client}:{},
                    ...store?{store}:{},
                    ...promotion?{promotion}:{},
                    ...cpa?{cpa}:{},
                    $and: [
                        ...dateStart?[{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]:[],
                    ],
                    ...status?{status}:{}
                }
            )
                .sort('-createdAt')
                .populate({
                    path: 'manager',
                    select: '_id name'
                })
                .populate({
                    path: 'client',
                    select: '_id name phones'
                })
                .populate({
                    path: 'store',
                    select: '_id name'
                })
                .populate({
                    path: 'cpa',
                    select: '_id name'
                })
                .populate({
                    path: 'installment',
                    select: '_id status number'
                })
                .populate({
                    path: 'reservations',
                    select: '_id number'
                })
                .populate({
                    path: 'refunds',
                    select: '_id number'
                })
                .populate({
                    path: 'promotion',
                    select: '_id name'
                })
                .populate({
                    path: 'itemsSale'
                })
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
            worksheet.getRow(1).getCell(cell).value = 'Тип продажи'
            cell += 1
            worksheet.getColumn(cell).width = 17
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Сумма без скидки'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Скидка'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Скидка %'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Итоговая сумма'
            cell += 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Клиент'
            cell += 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Менеджер'
            if(['admin', 'управляющий'].includes(user.role)) {
                cell += 1
                worksheet.getColumn(cell).width = 17
                worksheet.getRow(1).getCell(cell).font = {bold: true};
                worksheet.getRow(1).getCell(cell).value = 'Бонус менеджера'
            }
            cell += 1
            worksheet.getColumn(cell).width = 30
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Дата доставки'
            cell += 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Дизайнер'
            if(['admin', 'управляющий'].includes(user.role)) {
                cell += 1
                worksheet.getColumn(cell).width = 17
                worksheet.getRow(1).getCell(cell).font = {bold: true};
                worksheet.getRow(1).getCell(cell).value = 'Бонус дизайнера'
            }
            cell += 1
            worksheet.getColumn(cell).width = 10
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Бронь'
            cell += 1
            worksheet.getColumn(cell).width = 10
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Возврат'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Акция'
            cell += 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Комментарий'
            let row = 1, discountPrecent
            for(let i = 0; i < res.length; i++) {
                discountPrecent = checkFloat(res[i].discount*100/res[i].amountStart)
                cell = 1
                worksheet.getRow(row+1).getCell(cell).value = res[i].number;
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = res[i].status;
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = res[i].store.name;
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = pdDDMMYYHHMM(res[i].createdAt);
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = res[i].paid<res[i].amountEnd?'Рассрочка':res[i].promotion?'Акция':res[i].order?'Заказ':'Наличка'
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = res[i].amountStart;
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = res[i].discount;
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = `${discountPrecent}%`;
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = res[i].amountEnd;
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = res[i].client.name;
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = res[i].manager.name;
                if(['admin', 'управляющий'].includes(user.role)) {
                    cell += 1
                    worksheet.getRow(row + 1).getCell(cell).value = res[i].bonusManager;
                }
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = res[i].selfDelivery?'Самовывоз ':'';
                worksheet.getRow(row+1).getCell(cell).value += res[i].delivery?pdDDMMYYHHMM(res[i].delivery):'---';
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = res[i].cpa?res[i].cpa.name:'нет';
                if(['admin', 'управляющий'].includes(user.role)) {
                    cell += 1
                    worksheet.getRow(row + 1).getCell(cell).value = res[i].bonusCpa ? res[i].bonusCpa : 0;
                }
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = res[i].reservations&&res[i].reservations.length?'да':'нет';
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = res[i].refunds&&res[i].refunds.length?'да':'нет';
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = res[i].promotion?res[i].promotion.name:'нет';
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = res[i].comment;
                row += 1
            }
            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
    unloadBonusManagerSales: async(parent, {manager, promotion, client, cpa, dateStart, dateEnd, status, store}, {user}) => {
        if(['admin', 'управляющий'].includes(user.role)) {
            if(user.store) store = user.store
            dateStart = checkDate(dateStart)
            dateStart.setHours(0, 0, 0, 0)
            if (dateEnd)
                dateEnd = new Date(dateEnd)
            else {
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            dateEnd.setHours(0, 0, 0, 0)
            let res = await Sale.find(
                {
                    ...manager?{manager}:{},
                    ...client?{client}:{},
                    ...store?{store}:{},
                    ...promotion?{promotion}:{},
                    ...cpa?{cpa}:{},
                    $and: [
                        {createdAt: {$gte: dateStart}},
                        {createdAt: {$lt: dateEnd}}
                    ],
                    ...status?{status}:{}
                }
            )
                .sort('-createdAt')
                .populate({
                    path: 'manager',
                    select: '_id name'
                })
                .populate({
                    path: 'promotion',
                    select: '_id name'
                })
                .lean()
            let bonusManagers = {}, promotions = [], discountPrecent, bonusAll = {}
            for(let i = 0; i < res.length; i++) {
                discountPrecent = checkFloat(res[i].discount*100/res[i].amountStart)
                if(!bonusManagers[res[i].manager._id])
                    bonusManagers[res[i].manager._id] = {
                        name: res[i].manager.name
                    }
                bonusManagers[res[i].manager._id]['Всего продаж'] = checkFloat(checkFloat(bonusManagers[res[i].manager._id]['Всего продаж']) + checkFloat(res[i].amountEnd))
                bonusAll['Всего продаж'] = checkFloat(checkFloat(bonusAll['Всего продаж']) + checkFloat(res[i].amountEnd))
                bonusManagers[res[i].manager._id]['Бонус'] = checkFloat(checkFloat(bonusManagers[res[i].manager._id]['Бонус']) + checkFloat(res[i].bonusManager))
                bonusAll['Бонус'] = checkFloat(checkFloat(bonusAll['Бонус']) + checkFloat(res[i].bonusManager))
                if(res[i].promotion) {
                    if(!promotions.includes(res[i].promotion.name))
                        promotions.push(res[i].promotion.name)
                    bonusManagers[res[i].manager._id][res[i].promotion.name] = checkFloat(checkFloat(bonusManagers[res[i].manager._id][res[i].promotion.name]) + checkFloat(res[i].bonusManager))
                    bonusAll[res[i].promotion.name] = checkFloat(checkFloat(bonusAll[res[i].promotion.name]) + checkFloat(res[i].bonusManager))
                }
                else if(res[i].paid<res[i].amountEnd&&res[i].order) {
                    bonusManagers[res[i].manager._id]['Заказ Рассрочка'] = checkFloat(checkFloat(bonusManagers[res[i].manager._id]['Заказ Рассрочка']) + checkFloat(res[i].bonusManager))
                    bonusAll['Заказ Рассрочка'] = checkFloat(checkFloat(bonusAll['Заказ Рассрочка']) + checkFloat(res[i].bonusManager))
                }
                else if(res[i].paid<res[i].amountEnd) {
                    bonusManagers[res[i].manager._id]['Рассрочка'] = checkFloat(checkFloat(bonusManagers[res[i].manager._id]['Рассрочка']) + checkFloat(res[i].bonusManager))
                    bonusAll['Рассрочка'] = checkFloat(checkFloat(bonusAll['Рассрочка']) + checkFloat(res[i].bonusManager))
                }
                else if(res[i].order) {
                    bonusManagers[res[i].manager._id]['Заказ'] = checkFloat(checkFloat(bonusManagers[res[i].manager._id]['Заказ']) + checkFloat(res[i].bonusManager))
                    bonusAll['Заказ'] = checkFloat(checkFloat(bonusAll['Заказ']) + checkFloat(res[i].bonusManager))
                }
                else if(!discountPrecent) {
                    bonusManagers[res[i].manager._id]['Без скидки'] = checkFloat(checkFloat(bonusManagers[res[i].manager._id]['Без скидки']) + checkFloat(res[i].bonusManager))
                    bonusAll['Без скидки'] = checkFloat(checkFloat(bonusAll['Без скидки']) + checkFloat(res[i].bonusManager))
                }
                else if(discountPrecent>0&&discountPrecent<=5) {
                    bonusManagers[res[i].manager._id]['Скидка 0-5%'] = checkFloat(checkFloat(bonusManagers[res[i].manager._id]['Скидка 0-5%']) + checkFloat(res[i].bonusManager))
                    bonusAll['Скидка 0-5%'] = checkFloat(checkFloat(bonusAll['Скидка 0-5%']) + checkFloat(res[i].bonusManager))
                }
                else if(discountPrecent>5&&discountPrecent<=16) {
                    bonusManagers[res[i].manager._id]['Скидка 5-16%'] = checkFloat(checkFloat(bonusManagers[res[i].manager._id]['Скидка 5-16%']) + checkFloat(res[i].bonusManager))
                    bonusAll['Скидка 5-16%'] = checkFloat(checkFloat(bonusAll['Скидка 5-16%']) + checkFloat(res[i].bonusManager))
                }
                else if(discountPrecent>16&&discountPrecent<=20) {
                    bonusManagers[res[i].manager._id]['Скидка 16-20%'] = checkFloat(checkFloat(bonusManagers[res[i].manager._id]['Скидка 16-20%']) + checkFloat(res[i].bonusManager))
                    bonusAll['Скидка 16-20%'] = checkFloat(checkFloat(bonusAll['Скидка 16-20%']) + checkFloat(res[i].bonusManager))
                }
                else if(discountPrecent>20) {
                    bonusManagers[res[i].manager._id]['Свыше 20%'] = checkFloat(checkFloat(bonusManagers[res[i].manager._id]['Свыше 20%']) + checkFloat(res[i].bonusManager))
                    bonusAll['Свыше 20%'] = checkFloat(checkFloat(bonusAll['Свыше 20%']) + checkFloat(res[i].bonusManager))
                }
            }
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Выгрузка');
            let cell = 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Менеджер'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Бонус'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Без скидки'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Скидка 0-5%'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Скидка 5-16%'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Скидка 16-20%'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Свыше 20%'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Заказ'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Рассрочка'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Заказ Рассрочка'
            for(let i = 0; i < promotions.length; i++) {
                cell += 1
                worksheet.getColumn(cell).width = 15
                worksheet.getRow(1).getCell(cell).font = {bold: true};
                worksheet.getRow(1).getCell(cell).value = promotions[i]
            }
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Всего продаж'
            let row = 1
            res = Object.values(bonusManagers)
            for(let i = 0; i < res.length; i++) {
                cell = 1
                worksheet.getRow(row+1).getCell(cell).value = res[i].name;
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = checkFloat(res[i]['Бонус']);
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = checkFloat(res[i]['Без скидки']);
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = checkFloat(res[i]['Скидка 0-5%']);
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = checkFloat(res[i]['Скидка 5-16%']);
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = checkFloat(res[i]['Скидка 16-20%']);
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = checkFloat(res[i]['Свыше 20%']);
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = checkFloat(res[i]['Заказ']);
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = checkFloat(res[i]['Рассрочка']);
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = checkFloat(res[i]['Заказ Рассрочка']);
                for(let i1 = 0; i1 < promotions.length; i1++) {
                    cell += 1
                    worksheet.getRow(row+1).getCell(cell).value = checkFloat(res[i][promotions[i1]]);
                }
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = checkFloat(res[i]['Всего продаж']);
            }
            row += 1
            cell = 1
            worksheet.getRow(row+1).getCell(cell).value = 'Итого';
            cell += 1
            worksheet.getRow(row+1).getCell(cell).value = checkFloat(bonusAll['Бонус']);
            cell += 1
            worksheet.getRow(row+1).getCell(cell).value = checkFloat(bonusAll['Без скидки']);
            cell += 1
            worksheet.getRow(row+1).getCell(cell).value = checkFloat(bonusAll['Скидка 0-5%']);
            cell += 1
            worksheet.getRow(row+1).getCell(cell).value = checkFloat(bonusAll['Скидка 5-16%']);
            cell += 1
            worksheet.getRow(row+1).getCell(cell).value = checkFloat(bonusAll['Скидка 16-20%']);
            cell += 1
            worksheet.getRow(row+1).getCell(cell).value = checkFloat(bonusAll['Свыше 20%']);
            cell += 1
            worksheet.getRow(row+1).getCell(cell).value = checkFloat(bonusAll['Заказ']);
            cell += 1
            worksheet.getRow(row+1).getCell(cell).value = checkFloat(bonusAll['Рассрочка']);
            cell += 1
            worksheet.getRow(row+1).getCell(cell).value = checkFloat(bonusAll['Заказ Рассрочка']);
            for(let i = 0; i < promotions.length; i++) {
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = checkFloat(bonusAll[promotions[i]]);
            }
            cell += 1
            worksheet.getRow(row+1).getCell(cell).value = checkFloat(bonusAll['Всего продаж']);
            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
    unloadFactorySales: async(parent, {manager, promotion, type, category, client, cpa, dateStart, dateEnd, status, store}, {user}) => {
        if(['admin', 'управляющий'].includes(user.role)) {
            if(user.store) store = user.store
            dateStart = checkDate(dateStart)
            dateStart.setHours(0, 0, 0, 0)
            if (dateEnd)
                dateEnd = new Date(dateEnd)
            else {
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            dateEnd.setHours(0, 0, 0, 0)
            let res = await Sale.find(
                {
                    ...manager?{manager}:{},
                    ...client?{client}:{},
                    ...store?{store}:{},
                    ...promotion?{promotion}:{},
                    ...cpa?{cpa}:{},
                    $and: [
                        {createdAt: {$gte: dateStart}},
                        {createdAt: {$lt: dateEnd}}
                    ],
                    ...status?{status}:{}
                }
            )
                .sort('-createdAt')
                .populate({
                    path: 'promotion',
                    select: '_id name'
                })
                .populate({
                    path: 'itemsSale'
                })
                .lean()
            let bonusFactorys = {'ИТОГО': {name: 'ИТОГО'}}, factorys = [], promotions = [], factory, discountPrecent, discountItem
            for(let i = 0; i < res.length; i++) {
                discountPrecent = checkFloat(res[i].discount*100/res[i].amountStart)
                for (let i1 = 0; i1 < res[i].itemsSale.length; i1++) {
                    if ((!category || res[i].itemsSale[i1].category === category) && (!type || res[i].itemsSale[i1].type === type)) {
                        factory = res[i].itemsSale[i1].factory
                        if (!factorys.includes(factory))
                            factorys.push(factory)
                        if(!bonusFactorys[factory])
                            bonusFactorys[factory] = {
                                name: factory
                            }
                        bonusFactorys[factory]['Итого до скидки'] = checkFloat(checkFloat(bonusFactorys[factory]['Итого до скидки']) + res[i].itemsSale[i1].amount)
                        bonusFactorys['ИТОГО']['Итого до скидки'] = checkFloat(checkFloat(bonusFactorys['ИТОГО']['Итого до скидки']) + res[i].itemsSale[i1].amount)
                        discountItem = checkFloat(res[i].itemsSale[i1].amount/100*discountPrecent)
                        bonusFactorys[factory]['Общая скидка'] = checkFloat(checkFloat(bonusFactorys[factory]['Общая скидка']) + discountItem)
                        bonusFactorys['ИТОГО']['Общая скидка'] = checkFloat(checkFloat(bonusFactorys['ИТОГО']['Общая скидка']) + discountItem)
                        bonusFactorys[factory]['После скидки'] = checkFloat(checkFloat(bonusFactorys[factory]['После скидки']) + (res[i].itemsSale[i1].amount - discountItem))
                        bonusFactorys['ИТОГО']['После скидки'] = checkFloat(checkFloat(bonusFactorys['ИТОГО']['После скидки']) + (res[i].itemsSale[i1].amount - discountItem))
                        if (res[i].promotion) {
                            if (!promotions.includes(res[i].promotion.name))
                                promotions.push(res[i].promotion.name)
                            bonusFactorys[factory][res[i].promotion.name] = checkFloat(checkFloat(bonusFactorys[factory][res[i].promotion.name]) + checkFloat(res[i].itemsSale[i1].amount))
                            bonusFactorys['ИТОГО'][res[i].promotion.name] = checkFloat(checkFloat(bonusFactorys['ИТОГО'][res[i].promotion.name]) + checkFloat(res[i].itemsSale[i1].amount))
                            bonusFactorys[factory][`Скидка ${res[i].promotion.name}`] = checkFloat(checkFloat(bonusFactorys[factory][`Скидка ${res[i].promotion.name}`]) + discountItem)
                            bonusFactorys['ИТОГО'][`Скидка ${res[i].promotion.name}`] = checkFloat(checkFloat(bonusFactorys['ИТОГО'][`Скидка ${res[i].promotion.name}`]) + discountItem)
                            bonusFactorys[factory][`Скидка ${res[i].promotion.name} %%`] = checkFloat( bonusFactorys[factory][`Скидка ${res[i].promotion.name}`]*100/bonusFactorys[factory][res[i].promotion.name])
                            bonusFactorys['ИТОГО'][`Скидка ${res[i].promotion.name} %%`] = checkFloat( bonusFactorys['ИТОГО'][`Скидка ${res[i].promotion.name}`]*100/bonusFactorys['ИТОГО'][res[i].promotion.name])
                        }
                        else if ((res[i].paid < res[i].amountEnd) && res[i].order) {
                            bonusFactorys[factory]['Заказ Рассрочка'] = checkFloat(checkFloat(bonusFactorys[factory]['Заказ Рассрочка']) + checkFloat(res[i].itemsSale[i1].amount))
                            bonusFactorys['ИТОГО']['Заказ Рассрочка'] = checkFloat(checkFloat(bonusFactorys['ИТОГО']['Заказ Рассрочка']) + checkFloat(res[i].itemsSale[i1].amount))
                            bonusFactorys[factory]['Скидка Заказ Рассрочка'] = checkFloat(checkFloat(bonusFactorys[factory]['Скидка Заказ Рассрочка']) + discountItem)
                            bonusFactorys['ИТОГО']['Скидка Заказ Рассрочка'] = checkFloat(checkFloat(bonusFactorys['ИТОГО']['Скидка Заказ Рассрочка']) + discountItem)
                            bonusFactorys[factory]['Скидка Заказ Рассрочка %%'] = checkFloat( bonusFactorys[factory]['Скидка Заказ Рассрочка']*100/bonusFactorys[factory]['Заказ Рассрочка'])
                            bonusFactorys['ИТОГО']['Скидка Заказ Рассрочка %%'] = checkFloat( bonusFactorys['ИТОГО']['Скидка Заказ Рассрочка']*100/bonusFactorys['ИТОГО']['Заказ Рассрочка'])
                        }
                        else if (res[i].paid < res[i].amountEnd) {
                            bonusFactorys[factory]['Рассрочка'] = checkFloat(checkFloat(bonusFactorys[factory]['Рассрочка']) + checkFloat(res[i].itemsSale[i1].amount))
                            bonusFactorys['ИТОГО']['Рассрочка'] = checkFloat(checkFloat(bonusFactorys['ИТОГО']['Рассрочка']) + checkFloat(res[i].itemsSale[i1].amount))
                            bonusFactorys[factory]['Скидка Рассрочка'] = checkFloat(checkFloat(bonusFactorys[factory]['Скидка Рассрочка']) + discountItem)
                            bonusFactorys['ИТОГО']['Скидка Рассрочка'] = checkFloat(checkFloat(bonusFactorys['ИТОГО']['Скидка Рассрочка']) + discountItem)
                            bonusFactorys[factory]['Скидка Рассрочка %%'] = checkFloat( bonusFactorys[factory]['Скидка Рассрочка']*100/bonusFactorys[factory]['Рассрочка'])
                            bonusFactorys['ИТОГО']['Скидка Рассрочка %%'] = checkFloat( bonusFactorys['ИТОГО']['Скидка Рассрочка']*100/bonusFactorys['ИТОГО']['Рассрочка'])
                        }
                        else if (res[i].order) {
                            bonusFactorys[factory]['Заказ'] = checkFloat(checkFloat(bonusFactorys[factory]['Заказ']) + checkFloat(res[i].itemsSale[i1].amount))
                            bonusFactorys['ИТОГО']['Заказ'] = checkFloat(checkFloat(bonusFactorys['ИТОГО']['Заказ']) + checkFloat(res[i].itemsSale[i1].amount))
                            bonusFactorys[factory]['Скидка Заказ'] = checkFloat(checkFloat(bonusFactorys[factory]['Скидка Заказ']) + discountItem)
                            bonusFactorys['ИТОГО']['Скидка Заказ'] = checkFloat(checkFloat(bonusFactorys['ИТОГО']['Скидка Заказ']) + discountItem)
                            bonusFactorys[factory]['Скидка Заказ %%'] = checkFloat( bonusFactorys[factory]['Скидка Заказ']*100/bonusFactorys[factory]['Заказ'])
                            bonusFactorys['ИТОГО']['Скидка Заказ %%'] = checkFloat( bonusFactorys['ИТОГО']['Скидка Заказ']*100/bonusFactorys['ИТОГО']['Заказ'])
                        }
                        else {
                            bonusFactorys[factory]['Наличка'] = checkFloat(checkFloat(bonusFactorys[factory]['Наличка']) + checkFloat(res[i].itemsSale[i1].amount))
                            bonusFactorys['ИТОГО']['Наличка'] = checkFloat(checkFloat(bonusFactorys['ИТОГО']['Наличка']) + checkFloat(res[i].itemsSale[i1].amount))
                            bonusFactorys[factory]['Скидка Наличка'] = checkFloat(checkFloat(bonusFactorys[factory]['Скидка Наличка']) + discountItem)
                            bonusFactorys['ИТОГО']['Скидка Наличка'] = checkFloat(checkFloat(bonusFactorys['ИТОГО']['Скидка Наличка']) + discountItem)
                            bonusFactorys[factory]['Скидка Наличка %%'] = checkFloat( bonusFactorys[factory]['Скидка Наличка']*100/bonusFactorys[factory]['Наличка'])
                            bonusFactorys['ИТОГО']['Скидка Наличка %%'] = checkFloat( bonusFactorys['ИТОГО']['Скидка Наличка']*100/bonusFactorys['ИТОГО']['Наличка'])
                        }
                    }
                }
            }
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Выгрузка');
            let cell = 1, row = 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(row).getCell(cell).font = {bold: true};
            worksheet.getRow(row).getCell(cell).value = ''
            for(let i = 0; i < factorys.length; i++) {
                cell += 1
                worksheet.getColumn(cell).width = 15
                worksheet.getRow(row).getCell(cell).font = {bold: true};
                worksheet.getRow(row).getCell(cell).value = factorys[i]
            }
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(row).getCell(cell).font = {bold: true};
            worksheet.getRow(row).getCell(cell).value = 'ИТОГО'

            row += 1
            cell = 1
            worksheet.getRow(row).getCell(cell).value = 'Заказ Рассрочка';
            for(let i = 0; i < factorys.length; i++) {
                cell += 1
                worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys[factorys[i]]['Заказ Рассрочка']);
            }
            cell += 1
            worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys['ИТОГО']['Заказ Рассрочка']);

            row += 1
            cell = 1
            worksheet.getRow(row).getCell(cell).value = 'Рассрочка';
            for(let i = 0; i < factorys.length; i++) {
                cell += 1
                worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys[factorys[i]]['Рассрочка']);
            }
            cell += 1
            worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys['ИТОГО']['Рассрочка']);

            row += 1
            cell = 1
            worksheet.getRow(row).getCell(cell).value = 'Заказ';
            for(let i = 0; i < factorys.length; i++) {
                cell += 1
                worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys[factorys[i]]['Заказ']);
            }
            cell += 1
            worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys['ИТОГО']['Заказ']);

            row += 1
            cell = 1
            worksheet.getRow(row).getCell(cell).value = 'Наличка';
            for(let i = 0; i < factorys.length; i++) {
                cell += 1
                worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys[factorys[i]]['Наличка']);
            }
            cell += 1
            worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys['ИТОГО']['Наличка']);

            for(let i = 0; i < promotions.length; i++) {
                row += 1
                cell = 1
                worksheet.getRow(row).getCell(cell).value = promotions[i];
                for(let i1 = 0; i1 < factorys.length; i1++) {
                    cell += 1
                    worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys[factorys[i1]][promotions[i]]);
                }
                cell += 1
                worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys['ИТОГО'][promotions[i]]);
            }

            row += 1
            cell = 1
            worksheet.getRow(row).getCell(cell).value = 'Итого до скидки';
            for(let i = 0; i < factorys.length; i++) {
                cell += 1
                worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys[factorys[i]]['Итого до скидки']);
            }
            cell += 1
            worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys['ИТОГО']['Итого до скидки']);

            row += 2
            cell = 1
            worksheet.getRow(row).getCell(cell).value = '%% скидки';
            for(let i = 0; i < factorys.length; i++) {
                cell += 1
                worksheet.getRow(row).getCell(cell).value = checkFloat(checkFloat(bonusFactorys[factorys[i]]['Общая скидка'])*100/checkFloat(bonusFactorys[factorys[i]]['Итого до скидки']))
            }
            cell += 1
            worksheet.getRow(row).getCell(cell).value = checkFloat(checkFloat(bonusFactorys['ИТОГО']['Общая скидка'])*100/checkFloat(bonusFactorys['ИТОГО']['Итого до скидки']))

            row += 2
            cell = 1
            worksheet.getRow(row).getCell(cell).value = 'Общая скидка';
            for(let i = 0; i < factorys.length; i++) {
                cell += 1
                worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys[factorys[i]]['Общая скидка']);
            }
            cell += 1
            worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys['ИТОГО']['Общая скидка']);

            row += 2
            cell = 1
            worksheet.getRow(row).getCell(cell).value = 'Скидка Заказ Рассрочка';
            for(let i = 0; i < factorys.length; i++) {
                cell += 1
                worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys[factorys[i]]['Скидка Заказ Рассрочка']);
            }
            cell += 1
            worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys['ИТОГО']['Скидка Заказ Рассрочка']);

            row += 1
            cell = 1
            worksheet.getRow(row).getCell(cell).value = '%%';
            for(let i = 0; i < factorys.length; i++) {
                cell += 1
                worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys[factorys[i]]['Скидка Заказ Рассрочка %%']);
            }
            cell += 1
            worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys['ИТОГО']['Скидка Заказ Рассрочка %%']);

            row += 1
            cell = 1
            worksheet.getRow(row).getCell(cell).value = 'Скидка Рассрочка';
            for(let i = 0; i < factorys.length; i++) {
                cell += 1
                worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys[factorys[i]]['Скидка Рассрочка']);
            }
            cell += 1
            worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys['ИТОГО']['Скидка Рассрочка']);

            row += 1
            cell = 1
            worksheet.getRow(row).getCell(cell).value = '%%';
            for(let i = 0; i < factorys.length; i++) {
                cell += 1
                worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys[factorys[i]]['Скидка Рассрочка %%']);
            }
            cell += 1
            worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys['ИТОГО']['Скидка Рассрочка %%']);

            row += 1
            cell = 1
            worksheet.getRow(row).getCell(cell).value = 'Скидка Заказ';
            for(let i = 0; i < factorys.length; i++) {
                cell += 1
                worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys[factorys[i]]['Скидка Заказ']);
            }
            cell += 1
            worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys['ИТОГО']['Скидка Заказ']);

            row += 1
            cell = 1
            worksheet.getRow(row).getCell(cell).value = '%%';
            for(let i = 0; i < factorys.length; i++) {
                cell += 1
                worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys[factorys[i]]['Скидка Заказ %%']);
            }
            cell += 1
            worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys['ИТОГО']['Скидка Заказ %%']);

            row += 1
            cell = 1
            worksheet.getRow(row).getCell(cell).value = 'Скидка Наличка';
            for(let i = 0; i < factorys.length; i++) {
                cell += 1
                worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys[factorys[i]]['Скидка Наличка']);
            }
            cell += 1
            worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys['ИТОГО']['Скидка Наличка']);

            row += 1
            cell = 1
            worksheet.getRow(row).getCell(cell).value = '%%';
            for(let i = 0; i < factorys.length; i++) {
                cell += 1
                worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys[factorys[i]]['Скидка Наличка %%']);
            }
            cell += 1
            worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys['ИТОГО']['Скидка Наличка %%']);

            for(let i = 0; i < promotions.length; i++) {
                row += 1
                cell = 1
                worksheet.getRow(row).getCell(cell).value = `Скидка ${promotions[i]}`;
                for(let i1 = 0; i1 < factorys.length; i1++) {
                    cell += 1
                    worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys[factorys[i1]][`Скидка ${promotions[i]}`]);
                }
                cell += 1
                worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys['ИТОГО'][`Скидка ${promotions[i]}`]);
                row += 1
                cell = 1
                worksheet.getRow(row).getCell(cell).value = '%%';
                for(let i1 = 0; i1 < factorys.length; i1++) {
                    cell += 1
                    worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys[factorys[i1]][`Скидка ${promotions[i]} %%`]);
                }
                cell += 1
                worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys['ИТОГО'][`Скидка ${promotions[i]} %%`]);
            }

            row += 2
            cell = 1
            worksheet.getRow(row).getCell(cell).value = 'После скидки';
            for(let i = 0; i < factorys.length; i++) {
                cell += 1
                worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys[factorys[i]]['После скидки']);
            }
            cell += 1
            worksheet.getRow(row).getCell(cell).value = checkFloat(bonusFactorys['ИТОГО']['После скидки']);

            row += 2
            cell = 1
            worksheet.getRow(row).getCell(cell).value = 'Доля %%';
            for(let i = 0; i < factorys.length; i++) {
                cell += 1
                worksheet.getRow(row).getCell(cell).value = checkFloat(checkFloat(bonusFactorys[factorys[i]]['После скидки'])*100/checkFloat(bonusFactorys['ИТОГО']['После скидки']));
            }

            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
    unloadBonusCpaSales: async(parent, {cpa, promotion, client, dateStart, dateEnd, status, store}, {user}) => {
        if(['admin', 'управляющий'].includes(user.role)) {
            if(user.store) store = user.store
            dateStart = checkDate(dateStart)
            dateStart.setHours(0, 0, 0, 0)
            if (dateEnd)
                dateEnd = new Date(dateEnd)
            else {
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            dateEnd.setHours(0, 0, 0, 0)
            let res = await Sale.find(
                {
                    ...cpa?{cpa}:{},
                    ...client?{client}:{},
                    ...store?{store}:{},
                    ...promotion?{promotion}:{},
                    ...cpa?{cpa}:{},
                    $and: [
                        {createdAt: {$gte: dateStart}},
                        {createdAt: {$lt: dateEnd}}
                    ],
                    ...status?{status}:{}
                }
            )
                .sort('-createdAt')
                .populate({
                    path: 'cpa',
                    select: '_id name'
                })
                .lean()
            let bonusCpas = {}, discountPrecent, bonusAll = {}
            for(let i = 0; i < res.length; i++) {
                if(res[i].cpa) {
                    discountPrecent = checkFloat(res[i].discount * 100 / res[i].amountStart)
                    if (!bonusCpas[res[i].cpa._id])
                        bonusCpas[res[i].cpa._id] = {
                            name: res[i].cpa.name
                        }
                    bonusCpas[res[i].cpa._id]['Всего продаж'] = checkFloat(checkFloat(bonusCpas[res[i].cpa._id]['Всего продаж']) + checkFloat(res[i].amountEnd))
                    bonusAll['Всего продаж'] = checkFloat(checkFloat(bonusAll['Всего продаж']) + checkFloat(res[i].amountEnd))
                    bonusCpas[res[i].cpa._id]['Бонус'] = checkFloat(checkFloat(bonusCpas[res[i].cpa._id]['Бонус']) + checkFloat(res[i].bonusCpa))
                    bonusAll['Бонус'] = checkFloat(checkFloat(bonusAll['Бонус']) + checkFloat(res[i].bonusCpa))
                    if (res[i].paid < res[i].amountEnd) {
                        bonusCpas[res[i].cpa._id]['Рассрочка'] = checkFloat(checkFloat(bonusCpas[res[i].cpa._id]['Рассрочка']) + checkFloat(res[i].bonusCpa))
                        bonusAll['Рассрочка'] = checkFloat(checkFloat(bonusAll['Рассрочка']) + checkFloat(res[i].bonusCpa))
                    }
                    else if (res[i].order) {
                        bonusCpas[res[i].cpa._id]['Заказ'] = checkFloat(checkFloat(bonusCpas[res[i].cpa._id]['Заказ']) + checkFloat(res[i].bonusCpa))
                        bonusAll['Заказ'] = checkFloat(checkFloat(bonusAll['Заказ']) + checkFloat(res[i].bonusCpa))
                    }
                    else {
                        bonusCpas[res[i].cpa._id]['Наличка'] = checkFloat(checkFloat(bonusCpas[res[i].cpa._id]['Наличка']) + checkFloat(res[i].bonusCpa))
                        bonusAll['Наличка'] = checkFloat(checkFloat(bonusAll['Наличка']) + checkFloat(res[i].bonusCpa))
                    }
                }
            }
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Выгрузка');
            let cell = 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Дизайнер'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Бонус'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Наличка'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Заказ'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Рассрочка'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Всего продаж'
            let row = 1
            res = Object.values(bonusCpas)
            for(let i = 0; i < res.length; i++) {
                cell = 1
                worksheet.getRow(row+1).getCell(cell).value = res[i].name;
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = checkFloat(res[i]['Бонус']);
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = checkFloat(res[i]['Наличка']);
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = checkFloat(res[i]['Заказ']);
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = checkFloat(res[i]['Рассрочка']);
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = checkFloat(res[i]['Всего продаж']);
            }
            row += 1
            cell = 1
            worksheet.getRow(row+1).getCell(cell).value = 'Итого';
            cell += 1
            worksheet.getRow(row+1).getCell(cell).value = checkFloat(bonusAll['Бонус']);
            cell += 1
            worksheet.getRow(row+1).getCell(cell).value = checkFloat(bonusAll['Наличка']);
            cell += 1
            worksheet.getRow(row+1).getCell(cell).value = checkFloat(bonusAll['Заказ']);
            cell += 1
            worksheet.getRow(row+1).getCell(cell).value = checkFloat(bonusAll['Рассрочка']);
            cell += 1
            worksheet.getRow(row+1).getCell(cell).value = checkFloat(bonusAll['Всего продаж']);
            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
    unloadDeliveries: async(parent, {search, order, manager, promotion, client, cpa, dateStart, dateEnd, delivery, status, store, _id}, {user}) => {
        if(['admin', 'управляющий',  'кассир', 'менеджер', 'менеджер/завсклад', 'доставщик', 'завсклад'].includes(user.role)) {
            if(user.store) store = user.store
            let deliveryStart, deliveryEnd
            if(!delivery||dateStart) {
                dateStart = checkDate(dateStart)
                dateStart.setHours(0, 0, 0, 0)
                if (dateEnd)
                    dateEnd = new Date(dateEnd)
                else {
                    dateEnd = new Date(dateStart)
                    dateEnd.setDate(dateEnd.getDate() + 1)
                }
                dateEnd.setHours(0, 0, 0, 0)
            }
            if (delivery) {
                deliveryStart = new Date(delivery)
                deliveryStart.setHours(0, 0, 0, 0)
                deliveryEnd = new Date(deliveryStart)
                deliveryEnd.setDate(deliveryEnd.getDate() + 1)
            }
            let res = await Sale.find(
                _id?
                    {
                        _id
                    }
                    :
                    {
                        ...order!==false?{order}:{},
                        ...search?{number: search}:{},
                        ...user.role==='менеджер'?{manager: user._id}:manager?{manager}:{},
                        ...client?{client}:{},
                        ...store?{store}:{},
                        ...promotion?{promotion}:{},
                        ...cpa?{cpa}:{},
                        $and: [
                            ...dateStart?[{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]:[],
                            ...delivery?[{delivery: {$gte: deliveryStart}}, {delivery: {$lt: deliveryEnd}}]:[]
                        ],
                        ...user.role==='доставщик'?
                            {status: 'отгружен', deliverymans: user._id}
                            :
                            status?
                                status==='доставка'?
                                    {status: {$in: ['на доставку', 'отгружен', 'доставлен']}}
                                    :
                                    status==='оплата'?
                                        {status: {$ne: 'отмена'}}
                                        :
                                        {status}
                                :
                                {}
                    }
            )
                .sort(status==='доставка'?'-delivery':'-createdAt')
                .populate({
                    path: 'manager',
                    select: '_id name'
                })
                .populate({
                    path: 'client',
                    select: '_id name phones'
                })
                .populate({
                    path: 'deliverymans',
                    select: '_id name'
                })
                .populate({
                    path: 'store',
                    select: '_id name'
                })
                .populate('itemsSale')
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
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Тип продажи'
            cell += 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Клиент'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Сумма продажи'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Дата доставки'
            cell += 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Доставщики'
            cell += 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Товары'
            cell += 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Номера телефона'
            cell += 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Адрес'
            cell += 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Комментарии'
            let row = 1, length
            for(let i = 0; i < res.length; i++) {
                cell = 1
                worksheet.getRow(row+1).getCell(cell).value = res[i].number;
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = res[i].status;
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = res[i].store.name;
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = res[i].paid<res[i].amountEnd?'Рассрочка':res[i].promotion?'Акция':res[i].order?'Заказ':'Наличка'
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = res[i].client.name;
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = res[i].amountEnd;
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = res[i].selfDelivery?'Самовывоз ':'';
                worksheet.getRow(row+1).getCell(cell).value += res[i].delivery?pdDDMMYYHHMM(res[i].delivery):'---';
                cell += 1
                worksheet.getRow(row+1).getCell(cell).alignment = {wrapText: true}
                worksheet.getRow(row+1).getCell(cell).value = '';
                if(res[i].deliverymans) {
                    length = res[i].deliverymans.length-1
                    for (let i1 = 0; i1 < res[i].deliverymans.length; i1++) {
                        worksheet.getRow(row + 1).getCell(cell).value += `${res[i].deliverymans[i1].name}`
                        if(i1<length)
                            worksheet.getRow(row + 1).getCell(cell).value += '\n'
                    }
                }
                cell += 1
                worksheet.getRow(row+1).getCell(cell).alignment = {wrapText: true}
                worksheet.getRow(row+1).getCell(cell).value = '';
                length = res[i].itemsSale.length-1
                for(let i1 = 0; i1 < res[i].itemsSale.length; i1++) {
                    worksheet.getRow(row+1).getCell(cell).value += `${res[i].itemsSale[i1].name}: ${res[i].itemsSale[i1].count} ${res[i].itemsSale[i1].unit}`
                    if(i1<length)
                        worksheet.getRow(row + 1).getCell(cell).value += '\n'
                }
                cell += 1
                worksheet.getRow(row+1).getCell(cell).alignment = {wrapText: true}
                worksheet.getRow(row+1).getCell(cell).value = '';
                if(res[i].client.phones) {
                    length = res[i].client.phones.length-1
                    for (let i1 = 0; i1 < res[i].client.phones.length; i1++) {
                        worksheet.getRow(row + 1).getCell(cell).value += `+996${res[i].client.phones[i1]}`
                        if(i1<length)
                            worksheet.getRow(row + 1).getCell(cell).value += '\n'
                    }
                }
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = res[i].address;
                cell += 1
                worksheet.getRow(row+1).getCell(cell).value = res[i].comment;
                row += 1
            }
            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
    unloadSales: async(parent, {search, type, category, cost, order, manager, promotion, client, cpa, dateStart, dateEnd, delivery, status, store, _id}, {user}) => {
        if(['admin', 'управляющий',  'кассир', 'менеджер', 'менеджер/завсклад', 'доставщик', 'завсклад'].includes(user.role)) {
            if(user.store) store = user.store
            let deliveryStart, deliveryEnd
            if(!delivery||dateStart) {
                dateStart = checkDate(dateStart)
                dateStart.setHours(0, 0, 0, 0)
                if (dateEnd)
                    dateEnd = new Date(dateEnd)
                else {
                    dateEnd = new Date(dateStart)
                    dateEnd.setDate(dateEnd.getDate() + 1)
                }
                dateEnd.setHours(0, 0, 0, 0)
            }
            if (delivery) {
                deliveryStart = new Date(delivery)
                deliveryStart.setHours(0, 0, 0, 0)
                deliveryEnd = new Date(deliveryStart)
                deliveryEnd.setDate(deliveryEnd.getDate() + 1)
            }
            let res = await Sale.find(
                _id?
                    {
                        _id
                    }
                    :
                    {
                        ...order!==false?{order}:{},
                        ...search?{number: search}:{},
                        ...user.role==='менеджер'?{manager: user._id}:manager?{manager}:{},
                        ...client?{client}:{},
                        ...store?{store}:{},
                        ...promotion?{promotion}:{},
                        ...cpa?{cpa}:{},
                        $and: [
                            ...dateStart?[{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]:[],
                            ...delivery?[{delivery: {$gte: deliveryStart}}, {delivery: {$lt: deliveryEnd}}]:[]
                        ],
                        ...user.role==='доставщик'?
                            {status: 'отгружен', deliverymans: user._id}
                            :
                            status?
                                status==='доставка'?
                                    {status: {$in: ['на доставку', 'отгружен', 'доставлен']}}
                                    :
                                    status==='оплата'?
                                        {status: {$ne: 'отмена'}}
                                        :
                                        {status}
                                :
                                {}
                    }
            )
                .sort(status==='доставка'?'-delivery':'-createdAt')
                .populate({
                    path: 'manager',
                    select: '_id name'
                })
                .populate({
                    path: 'client',
                    select: '_id name phones'
                })
                .populate({
                    path: 'store',
                    select: '_id name'
                })
                .populate({
                    path: 'cpa',
                    select: '_id name'
                })
                .populate({
                    path: 'installment',
                    select: '_id status number'
                })
                .populate({
                    path: 'reservations',
                    select: '_id number'
                })
                .populate({
                    path: 'refunds',
                    select: '_id number'
                })
                .populate({
                    path: 'promotion',
                    select: '_id name'
                })
                .populate({
                    path: 'itemsSale'
                })
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
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Тип продажи'
            cell += 1
            worksheet.getColumn(cell).width = 17
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Сумма без скидки'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Скидка'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Скидка %'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Итоговая сумма'
            if(['admin', 'управляющий'].includes(user.role)&&cost) {
                cell += 1
                worksheet.getColumn(cell).width = 15
                worksheet.getRow(1).getCell(cell).font = {bold: true};
                worksheet.getRow(1).getCell(cell).value = 'Себестоимость'
                cell += 1
                worksheet.getColumn(cell).width = 15
                worksheet.getRow(1).getCell(cell).font = {bold: true};
                worksheet.getRow(1).getCell(cell).value = 'Доход'
            }
            cell += 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Клиент'
            cell += 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Менеджер'
            if(['admin', 'управляющий'].includes(user.role)) {
                cell += 1
                worksheet.getColumn(cell).width = 17
                worksheet.getRow(1).getCell(cell).font = {bold: true};
                worksheet.getRow(1).getCell(cell).value = 'Бонус менеджера'
            }
            cell += 1
            worksheet.getColumn(cell).width = 30
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Дата доставки'
            cell += 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Дизайнер'
            if(['admin', 'управляющий'].includes(user.role)) {
                cell += 1
                worksheet.getColumn(cell).width = 17
                worksheet.getRow(1).getCell(cell).font = {bold: true};
                worksheet.getRow(1).getCell(cell).value = 'Бонус дизайнера'
            }
            cell += 1
            worksheet.getColumn(cell).width = 10
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Бронь'
            cell += 1
            worksheet.getColumn(cell).width = 10
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Возврат'
            cell += 1
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Акция'
            cell += 1
            worksheet.getColumn(cell).width = 20
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Комментарий'
            let row = 1, discountPrecent, discountItem, costItem
            for(let i = 0; i < res.length; i++) {
                discountPrecent = checkFloat(res[i].discount*100/res[i].amountStart)
                for(let i1 = 0; i1 < res[i].itemsSale.length; i1++) {
                    if ((!category || res[i].itemsSale[i1].category === category) && (!type || res[i].itemsSale[i1].type === type)) {
                        cell = 1
                        worksheet.getRow(row + 1).getCell(cell).value = res[i].number;
                        cell += 1
                        worksheet.getRow(row + 1).getCell(cell).value = res[i].status;
                        cell += 1
                        worksheet.getRow(row + 1).getCell(cell).value = res[i].store.name;
                        cell += 1
                        worksheet.getRow(row + 1).getCell(cell).value = pdDDMMYYHHMM(res[i].createdAt);
                        cell += 1
                        worksheet.getRow(row + 1).getCell(cell).value = res[i].itemsSale[i1].type;
                        cell += 1
                        worksheet.getRow(row + 1).getCell(cell).value = res[i].itemsSale[i1].factory;
                        cell += 1
                        worksheet.getRow(row + 1).getCell(cell).value = res[i].itemsSale[i1].category;
                        cell += 1
                        worksheet.getRow(row + 1).getCell(cell).value = res[i].itemsSale[i1].name;
                        cell += 1
                        worksheet.getRow(row + 1).getCell(cell).value = res[i].itemsSale[i1].size;
                        cell += 1
                        worksheet.getRow(row + 1).getCell(cell).value = res[i].itemsSale[i1].count;
                        cell += 1
                        worksheet.getRow(row + 1).getCell(cell).value = res[i].paid < res[i].amountEnd ? 'Рассрочка' : res[i].promotion ? 'Акция' : res[i].order ? 'Заказ' : 'Наличка'
                        cell += 1
                        worksheet.getRow(row + 1).getCell(cell).value = checkFloat(res[i].itemsSale[i1].amount);
                        cell += 1
                        discountItem = checkFloat(res[i].itemsSale[i1].amount / 100 * discountPrecent)
                        worksheet.getRow(row + 1).getCell(cell).value = discountItem;
                        cell += 1
                        worksheet.getRow(row + 1).getCell(cell).value = `${discountPrecent}%`;
                        cell += 1
                        worksheet.getRow(row + 1).getCell(cell).value = checkFloat(res[i].itemsSale[i1].amount - discountItem);
                        if (['admin', 'управляющий'].includes(user.role) && cost) {
                            cell += 1
                            costItem = checkFloat(res[i].itemsSale[i1].cost * res[i].itemsSale[i1].count)
                            worksheet.getRow(row + 1).getCell(cell).value = costItem;
                            cell += 1
                            worksheet.getRow(row + 1).getCell(cell).value = checkFloat(res[i].itemsSale[i1].amount - discountItem - costItem);
                        }
                        cell += 1
                        worksheet.getRow(row + 1).getCell(cell).value = res[i].client.name;
                        cell += 1
                        worksheet.getRow(row + 1).getCell(cell).value = res[i].manager.name;
                        if (['admin', 'управляющий'].includes(user.role)) {
                            cell += 1
                            worksheet.getRow(row + 1).getCell(cell).value = res[i].bonusManager;
                        }
                        cell += 1
                        worksheet.getRow(row + 1).getCell(cell).value = res[i].selfDelivery ? 'Самовывоз ' : '';
                        worksheet.getRow(row + 1).getCell(cell).value += res[i].delivery ? pdDDMMYYHHMM(res[i].delivery) : '---';
                        cell += 1
                        worksheet.getRow(row + 1).getCell(cell).value = res[i].cpa ? res[i].cpa.name : 'нет';
                        if (['admin', 'управляющий'].includes(user.role)) {
                            cell += 1
                            worksheet.getRow(row + 1).getCell(cell).value = res[i].bonusCpa ? res[i].bonusCpa : 0;
                        }
                        cell += 1
                        worksheet.getRow(row + 1).getCell(cell).value = res[i].reservations && res[i].reservations.length ? 'да' : 'нет';
                        cell += 1
                        worksheet.getRow(row + 1).getCell(cell).value = res[i].refunds && res[i].refunds.length ? 'да' : 'нет';
                        cell += 1
                        worksheet.getRow(row + 1).getCell(cell).value = res[i].promotion ? res[i].promotion.name : 'нет';
                        cell += 1
                        worksheet.getRow(row + 1).getCell(cell).value = res[i].comment;
                        row += 1
                    }
                }
            }
            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
};

const query = `
    getAttachmentSale(_id: ID!): String
    salesBonusManager: [Float]
    sales(search: String, order: Boolean, skip: Int, items: Boolean, promotion: ID, limit: Int, manager: ID, client: ID, cpa: ID, dateStart: Date, dateEnd: Date, delivery: Date, status: String, store: ID): [Sale]
    salesCount(search: String, order: Boolean, manager: ID, promotion: ID, client: ID, cpa: ID, dateStart: Date, dateEnd: Date, delivery: Date, status: String, store: ID): Int
    sale(_id: ID!): Sale
    prepareAcceptOrder(_id: ID!): [ID]
`;

const mutation = `
    addSale(client: ID!, prepaid: Float, selfDelivery: Boolean, installment: Boolean, order: Boolean, promotion: ID, geo: [Float], itemsSale: [ItemFromListInput]!, discount: Float!, cpa:  ID, amountStart: Float!, amountEnd: Float!, typePayment: String!,  address: String!, addressInfo: String!, comment: String!, currency: String, paid: Float!, delivery: Date, reservations: [ID]!): String
    setSale(_id: ID!, deliverymans: [ID], percentManager: Float, selfDelivery: Boolean, itemsSale: [ItemFromListInput], geo: [Float], discount: Float, percentCpa: Float, amountStart: Float, amountEnd: Float, address: String, addressInfo: String, comment: String, paid: Float, delivery: Date, status: String): String
    divideSale(_id: ID!, newItems: [ItemFromListInput]!, currentItems: [ItemFromListInput]!): String
`;

const resolvers = {
    getAttachmentSale: async(parent, {_id}, {user}) => {
        if(['admin', 'управляющий',  'кассир', 'менеджер', 'менеджер/завсклад', 'доставщик', 'завсклад', 'юрист'].includes(user.role)) {
            let sale = await Sale.findOne({
                _id,
            })
                .populate({
                    path: 'manager',
                    select: '_id name'
                })
                .populate({
                    path: 'client',
                    select: '_id name phones'
                })
                .populate({
                    path: 'store',
                    select: '_id name'
                })
                .populate('itemsSale')
                .lean()
            let attachmentFile, workbook, worksheet
            let doc = await Doc.findOne({}).select('name director').lean()
            let discountPrecent = checkFloat(sale.discount*100/sale.amountStart)
            if(sale.installment) {
                attachmentFile = path.join(app.dirname, 'docs', sale.discount?'installment-discount.xlsx':'installment.xlsx');
                workbook = new ExcelJS.Workbook();
                workbook = await workbook.xlsx.readFile(attachmentFile);
                worksheet = workbook.worksheets[0];
                worksheet.getRow(2).getCell(2).value = `Накладная  от ${sale.createdAt.getDate()<10?'0':''}${sale.createdAt.getDate()} ${months[sale.createdAt.getMonth()]} ${sale.createdAt.getFullYear()} г`
                worksheet.getRow(4).getCell(4).value = doc.name
                worksheet.getRow(6).getCell(4).value = sale.client.name
                worksheet.getRow(8).getCell(4).value = sale.client.address
                worksheet.getRow(9).getCell(4).value = (sale.client.phones.map(phone=>`+996${phone}`)).toString()
                worksheet.getRow(14).getCell(7).value = sale.amountStart
                worksheet.getRow(19).getCell(4).value = sale.manager.name
                worksheet.getRow(23).getCell(4).value = sale.comment
                worksheet.getRow(33).getCell(4).value = sale.client.name
                if(sale.discount) {
                    worksheet.getRow(14).getCell(8).value = sale.discount
                    worksheet.getRow(14).getCell(9).value = sale.amountEnd
                    worksheet.getRow(16).getCell(9).value = sale.paid
                    worksheet.getRow(17).getCell(9).value = sale.amountEnd-sale.paid
                }
                else {
                    worksheet.getRow(14).getCell(8).value = sale.amountEnd
                    worksheet.getRow(16).getCell(8).value = sale.paid
                    worksheet.getRow(17).getCell(8).value = sale.amountEnd-sale.paid
                }
                worksheet.duplicateRow(13, sale.itemsSale.length-1, true)
                for(let i=0; i<sale.itemsSale.length; i++) {
                    let row = 13+i
                    worksheet.getRow(row).getCell(2).value = i+1
                    worksheet.getRow(row).getCell(3).value = sale.itemsSale[i].name
                    worksheet.getRow(row).getCell(4).value = sale.itemsSale[i].unit
                    worksheet.getRow(row).getCell(5).value = sale.itemsSale[i].count
                    worksheet.getRow(row).getCell(6).value = sale.itemsSale[i].price
                    worksheet.getRow(row).getCell(7).value = sale.itemsSale[i].amount
                    if(sale.discount) {
                        worksheet.getRow(row).getCell(8).value = checkFloat(sale.itemsSale[i].amount/100*discountPrecent)
                        worksheet.getRow(row).getCell(9).value = checkFloat(sale.itemsSale[i].amount-sale.itemsSale[i].amount/100*discountPrecent)
                    }
                    else
                        worksheet.getRow(row).getCell(8).value = sale.itemsSale[i].amount
                }
            }
            else {
                attachmentFile = path.join(app.dirname, 'docs', 'attachment-order.xlsx');
                workbook = new ExcelJS.Workbook();
                workbook = await workbook.xlsx.readFile(attachmentFile);
                worksheet = workbook.worksheets[0];
                worksheet.getRow(7).getCell(2).value = doc.name
                worksheet.getRow(11).getCell(3).value = sale.client.name
                worksheet.getRow(20).getCell(4).value = sale.client.name
                worksheet.getRow(22).getCell(4).value = doc.director
                worksheet.getRow(24).getCell(4).value = sale.manager.name
                worksheet.getRow(16).getCell(10).value = sale.amountStart
                if(sale.discount) {
                    worksheet.getRow(17).getCell(10).value = sale.discount
                    worksheet.getRow(18).getCell(10).value = sale.amountEnd
                }
                else {
                    worksheet.spliceRows(17, 2)
                }
                worksheet.duplicateRow(15, sale.itemsSale.length-1, true)
                for(let i=0; i<sale.itemsSale.length; i++) {
                    let row = 15+i
                    worksheet.getRow(row).getCell(3).value = sale.itemsSale[i].factory
                    worksheet.getRow(row).getCell(4).value = sale.itemsSale[i].name
                    worksheet.getRow(row).getCell(5).value = sale.itemsSale[i].count
                    worksheet.getRow(row).getCell(9).value = sale.itemsSale[i].price
                    worksheet.getRow(row).getCell(10).value = sale.itemsSale[i].amount
                }
            }
            let xlsxname = `Прилож к договору №${sale.number}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname

        }
    },
    salesBonusManager: async(parent, ctx, {user}) => {
        if(['менеджер', 'менеджер/завсклад'].includes(user.role)) {
            let dateStart = new Date()
            dateStart.setHours(0, 0, 0, 0)
            let dateEnd = new Date(dateStart)
            dateEnd.setDate(dateEnd.getDate() + 1)
            let sales = await Sale.find({
                $and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}],
                manager: user._id,
                status: {$ne: 'отмена'}
            })
                .select('bonusManager amountEnd')
                .lean()
            let bonusManager = 0, allSalesAmount = 0
            for (let i = 0; i < sales.length; i++) {
                bonusManager = checkFloat(bonusManager + sales[i].bonusManager)
                allSalesAmount = checkFloat(allSalesAmount + sales[i].amountEnd)
            }
            return [sales.length, allSalesAmount, bonusManager]
        }
    },
    sales: async(parent, {search, skip, limit, order, items, manager, client, cpa, dateStart, dateEnd, delivery, status, store, promotion}, {user}) => {
        if(['admin', 'управляющий', 'доставщик',  'кассир', 'менеджер', 'менеджер/завсклад', 'завсклад'].includes(user.role)) {
            if(user.store) store = user.store
            let deliveryStart, deliveryEnd
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
            if (delivery) {
                deliveryStart = new Date(delivery)
                deliveryStart.setHours(0, 0, 0, 0)
                deliveryEnd = new Date(deliveryStart)
                deliveryEnd.setDate(deliveryEnd.getDate() + 1)
            }
            let res = await Sale.find({
                ...order!==false?{order}:{},
                ...search?{number: search}:{},
                ...user.role==='менеджер'?{manager: user._id}:manager?{manager}:{},
                ...promotion?{promotion}:{},
                ...client?{client}:{},
                ...store?{store}:{},
                ...cpa?{cpa}:{},
                ...delivery||dateStart?{$and: [
                    ...delivery?[{delivery: {$gte: deliveryStart}}, {delivery: {$lt: deliveryEnd}}]:[],
                    ...dateStart?[{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]:[]
                ]}:{},
                ...user.role==='доставщик'?
                    {status: 'отгружен', deliverymans: user._id}
                    :
                    status?
                        status==='доставка'?
                            {status: {$in: ['на доставку', 'отгружен', 'доставлен']}}
                            :
                            status==='оплата'?
                                {status: {$ne: 'отмена'}}
                                :
                                {status}
                        :
                        {}
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? limit ? limit : 30 : 10000000000)
                .sort(status==='доставка'?'-delivery':'-createdAt')
                .populate({
                    path: 'manager',
                    select: '_id name'
                })
                .populate({
                    path: 'client',
                    select: '_id name phones'
                })
                .populate({
                    path: 'store',
                    select: '_id name'
                })
                .populate({
                    path: 'cpa',
                    select: '_id name'
                })
                .populate({
                    path: 'installment',
                    select: '_id status number'
                })
                .populate({
                    path: 'deliverymans',
                    select: '_id name'
                })
                .populate({
                    path: 'reservations',
                    select: '_id number'
                })
                .populate({
                    path: 'refunds',
                    select: '_id number'
                })
                .lean()
            if(items) {
                items = await Item.find({}).select('_id images').lean()
                let images = {}
                for (let i = 0; i < items.length; i++) {
                    images[items[i]._id] = items[i].images
                }
                for (let i = 0; i < res.length; i++) {
                    res[i].itemsSale = await ItemSale.find({_id: {$in: res[i].itemsSale}}).lean()
                    for (let i1 = 0; i1 < res[i].itemsSale.length; i1++) {
                        res[i].itemsSale[i1].images = images[res[i].itemsSale[i1].item]
                    }
                }
            }
            return res
        }
    },
    salesCount: async(parent, {order, search, promotion, manager, client, cpa, dateStart, dateEnd, delivery, status, store}, {user}) => {
        if(['admin', 'управляющий',  'кассир', 'доставщик', 'менеджер', 'менеджер/завсклад', 'завсклад'].includes(user.role)) {
            if(user.store) store = user.store
            let deliveryStart, deliveryEnd
            if(!delivery||dateStart) {
                dateStart = checkDate(dateStart)
                dateStart.setHours(0, 0, 0, 0)
                if (dateEnd)
                    dateEnd = new Date(dateEnd)
                else {
                    dateEnd = new Date(dateStart)
                    dateEnd.setDate(dateEnd.getDate() + 1)
                }
                dateEnd.setHours(0, 0, 0, 0)
            }
            if (delivery) {
                deliveryStart = new Date(delivery)
                deliveryStart.setHours(0, 0, 0, 0)
                deliveryEnd = new Date(deliveryStart)
                deliveryEnd.setDate(deliveryEnd.getDate() + 1)
            }
            return await Sale.countDocuments({
                ...order!==false?{order}:{},
                ...search?{number: search}:{},
                ...user.role==='менеджер'?{manager: user._id}:manager?{manager}:{},
                ...client?{client}:{},
                ...promotion?{promotion}:{},
                ...store?{store}:{},
                ...cpa?{cpa}:{},
                $and: [
                    ...dateStart?[{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]:[],
                    ...delivery?[{delivery: {$gte: deliveryStart}}, {delivery: {$lt: deliveryEnd}}]:[]
                ],
                ...user.role==='доставщик'?
                    {status: 'отгружен', deliverymans: user._id}
                    :
                    status?
                        status==='доставка'?
                            {status: {$in: ['на доставку', 'отгружен', 'доставлен']}}
                            :
                            status==='оплата'?
                                {status: {$ne: 'отмена'}}
                                :
                                {status}
                        :
                        {}
            })
                .lean()
        }
    },
    sale: async(parent, {_id}, {user}) => {
        if(['admin', 'управляющий',  'кассир', 'менеджер', 'менеджер/завсклад', 'доставщик', 'завсклад', 'юрист'].includes(user.role)) {
            let res = await Sale.findOne({
                _id,
            })
                .populate({
                    path: 'manager',
                    select: '_id name'
                })
                .populate({
                    path: 'client',
                    select: '_id name phones'
                })
                .populate({
                    path: 'store',
                    select: '_id name'
                })
                .populate({
                    path: 'cpa',
                    select: '_id name'
                })
                .populate({
                    path: 'deliverymans',
                    select: '_id name'
                })
                .populate({
                    path: 'installment',
                    select: '_id status number'
                })
                .populate({
                    path: 'reservations',
                    select: '_id number'
                })
                .populate({
                    path: 'refunds',
                    select: '_id number'
                })
                .populate({
                    path: 'promotion',
                    select: '_id name'
                })
                .populate('itemsSale')
                .lean()
            return res
        }
    },
    prepareAcceptOrder: async(parent, {_id}, {user}) => {
        if(['admin', 'завсклад', 'менеджер/завсклад'].includes(user.role)) {
            let res = []
            let order = await Sale.findOne({
                _id
            })
                .populate('itemsSale')
                .lean()
            let wayItems, usedAmount
            for(let i=0; i<order.itemsSale.length; i++) {
                res[i] = null
                wayItems = await WayItem.find({item: order.itemsSale[i].item, status: 'в пути', store: order.store}).lean()
                for(let i1=0; i1<wayItems.length; i1++) {
                    usedAmount = 0
                    for(let i2=0; i2<wayItems[i1].bookings.length; i2++) {
                        usedAmount += wayItems[i1].bookings[i2].amount
                    }
                    if((wayItems[i1].amount-usedAmount)>=order.itemsSale[i].count) {
                        res[i] = wayItems[i1]._id
                        break
                    }
                }
            }
            return res
        }
    },
};

const resolversMutation = {
    addSale: async(parent, {order, client, installment, prepaid, selfDelivery, promotion, itemsSale, geo, discount, cpa, amountStart, amountEnd, typePayment,  address, addressInfo, comment, currency, paid, delivery, reservations}, {user}) => {
        if(['менеджер', 'менеджер/завсклад'].includes(user.role)) {
            if (delivery&&delivery.toString()!=='Invalid Date')
                delivery = new Date(delivery)
            else
                delivery = null
            let object = new Sale({
                order,
                number: (await Sale.countDocuments({order}).lean())+1,
                manager: user._id,
                client,
                store: user.store,
                discount,
                amountStart,
                amountEnd,
                geo,
                status: 'обработка',
                cpa,
                promotion,
                prepaid,
                typePayment,
                address,
                addressInfo,
                delivery,
                comment,
                currency,
                paid,
                reservations,
                selfDelivery
            });
            //процент дизайнера
            if(cpa) {
                let bonusCpa = await BonusCpa.findOne({store: user.store}).lean()
                if(bonusCpa) {
                    if (paid < amountEnd) {
                        bonusCpa.bonus = bonusCpa.installment
                    }
                    else if (order) {
                        bonusCpa.bonus = bonusCpa.order
                    }
                    else {
                        bonusCpa.bonus = bonusCpa.sale
                    }
                    let discountPercent = discount*100/amountStart
                    bonusCpa.bonus = bonusCpa.bonus.sort((a, b)=>a[0] - b[0]);
                    for(let i = 0; i < bonusCpa.bonus.length; i++) {
                        if(discountPercent<=bonusCpa.bonus[i][0]) {
                            object.percentCpa = bonusCpa.bonus[i][1]
                            object.bonusCpa = checkFloat(amountEnd/100*bonusCpa.bonus[i][1])
                            break
                        }
                    }
                }
            }
            //Бронь
            if(!order) {
                let itemsReservation
                reservations = await Reservation.find({_id: {$in: reservations}})
                for (let i = 0; i < reservations.length; i++) {
                    reservations[i].sale = object._id
                    reservations[i].status = 'продан'
                    itemsReservation = await ItemReservation.find({_id: {$in: reservations[i].itemsReservation}}).lean()
                    for (let i1 = 0; i1 < itemsReservation.length; i1++) {
                        let storeBalanceItem = await StoreBalanceItem.findOne({
                            store: object.store,
                            item: itemsReservation[i1].item
                        })
                        storeBalanceItem.reservation = checkFloat(storeBalanceItem.reservation - itemsReservation[i1].count)
                        storeBalanceItem.free = checkFloat(storeBalanceItem.free + itemsReservation[i1].count)
                        await storeBalanceItem.save()
                    }
                    await ItemReservation.updateMany({_id: {$in: reservations[i].itemsReservation}}, {status: 'продан'})
                    await reservations[i].save()
                }
            }
            //Проданные товары
            for(let i=0; i<itemsSale.length; i++) {
                itemsSale[i] = new ItemSale(itemsSale[i]);
                if(!order) {
                    let storeBalanceItem = await StoreBalanceItem.findOne({store: user.store, item: itemsSale[i].item})
                    storeBalanceItem.sale = checkFloat(storeBalanceItem.sale + itemsSale[i].count)
                    storeBalanceItem.free = checkFloat(storeBalanceItem.free - itemsSale[i].count)
                    await storeBalanceItem.save()
                }
                itemsSale[i] = (await ItemSale.create(itemsSale[i]))._id
            }
            object.itemsSale = itemsSale
            //Баланс клиента
            if(!installment) {
                let balanceClient = await BalanceClient.findOne({client})
                balanceClient.balance = checkFloat(balanceClient.balance - paid)
                await balanceClient.save()
            }
            //Бонус менеджера
            let bonus = 0
            let bonusManager = await BonusManager.findOne({store: user.store}).lean()
            if(bonusManager) {
                if (promotion) {
                    bonusManager.bonus = bonusManager.promotion
                }
                else if (paid < amountEnd && order) {
                    bonusManager.bonus = bonusManager.orderInstallment
                }
                else if (order) {
                    bonusManager.bonus = bonusManager.order
                }
                else if (paid < amountEnd) {
                    bonusManager.bonus = bonusManager.saleInstallment
                }
                else {
                    bonusManager.bonus = bonusManager.sale
                }
                if(bonusManager.bonus.length) {
                    let discountPercent = discount*100/amountStart
                    bonusManager.bonus = bonusManager.bonus.sort((a, b)=>a[0] - b[0]);
                    for(let i = 0; i < bonusManager.bonus.length; i++) {
                        if(discountPercent<=bonusManager.bonus[i][0]) {
                            bonus = checkFloat(amountEnd/100*bonusManager.bonus[i][1])
                            break
                        }
                    }
                    if(bonus) {
                        let date = new Date()
                        date.setHours(0, 0, 0, 0)
                        date.setDate(1)
                        let salary = await Salary.findOne({employment: user._id, date})
                        if (salary) {
                            let history = new History({
                                who: user._id,
                                where: salary._id,
                                what: `Бонус:${salary.bonus}`
                            });
                            salary.bonus = checkFloat(salary.bonus + bonus)
                            salary.pay = checkFloat(salary.debtStart + salary.accrued + salary.bonus + salary.premium - salary.penaltie - salary.advance)
                            salary.debtEnd = checkFloat(salary.pay - salary.paid)
                            await salary.save()
                            history.what += `→${salary.bonus};`
                            await History.create(history)
                        }
                        else {
                            let debtStart = await Salary.findOne({employment: user._id, date: {$lt: date}}).select('debtEnd').sort('-date').lean()
                            if (debtStart)
                                debtStart = debtStart.debtEnd
                            else
                                debtStart = 0
                            salary = new Salary({
                                employment: user._id,
                                store: user.store,
                                date,
                                salary: 0,
                                bid: 0,
                                actualDays: 0,
                                workingDay: 0,
                                debtStart,
                                premium: 0,
                                bonus,
                                accrued: 0,
                                penaltie: 0,
                                advance: 0,
                                pay: bonus+debtStart,
                                paid: 0,
                                debtEnd: bonus+debtStart
                            });
                            salary = await Salary.create(salary)
                            let history = new History({
                                who: user._id,
                                where: salary._id,
                                what: 'Создание'
                            });
                            await History.create(history)
                        }

                        let lastSalary = salary
                        let lastDebtEnd = salary.debtEnd
                        while(lastSalary) {
                            salary = await Salary.findOne({date: {$gt: lastSalary.date}, employment: user._id, _id: {$ne: lastSalary._id}}).sort('date')
                            if(salary) {
                                salary.debtStart = lastDebtEnd
                                salary.pay = checkFloat(salary.debtStart+salary.accrued+salary.bonus+salary.premium-salary.penaltie-salary.advance)
                                salary.debtEnd = checkFloat(salary.pay-salary.paid)
                                lastDebtEnd = salary.debtEnd
                                await salary.save()
                            }
                            lastSalary = salary
                        }
                    }
                }
            }
            object.bonusManager = bonus

            object = await Sale.create(object)
            let history = new History({
                who: user._id,
                where: object._id,
                what: 'Создание'
            });
            await History.create(history)
            return object._id
        }
        return 'ERROR'
    },
    setSale: async(parent, {_id, deliverymans, percentManager, selfDelivery, itemsSale, geo, discount, percentCpa, amountStart, amountEnd, address, addressInfo, comment, paid, delivery, status}, {user}) => {
        if(['admin', 'менеджер', 'менеджер/завсклад', 'завсклад', 'доставщик'].includes(user.role)) {
            let object = await Sale.findById(_id)
            if(object) {
                let history = new History({
                    who: user._id,
                    where: object._id,
                    what: ''
                });
                if (itemsSale) {
                    history.what = 'Позиции;\n'
                    let storeBalanceItem, oldItemSale, newItemSale, newIdsItemSale = [], newItemsSale = []
                    for(let i=0; i<itemsSale.length; i++) {
                        if(itemsSale[i]._id)
                            newIdsItemSale.push(itemsSale[i]._id)
                    }
                    for(let i=0; i<object.itemsSale.length; i++) {
                        oldItemSale = await ItemSale.findOne({_id: object.itemsSale[i]}).lean()
                        if(!object.order) {
                            storeBalanceItem = await StoreBalanceItem.findOne({
                                store: object.store,
                                item: oldItemSale.item
                            })
                            storeBalanceItem.sale = checkFloat(storeBalanceItem.sale - oldItemSale.count)
                            storeBalanceItem.free = checkFloat(storeBalanceItem.free + oldItemSale.count)
                            await storeBalanceItem.save()
                        }
                        if(!newIdsItemSale.includes(object.itemsSale[i].toString()))
                            await ItemSale.deleteOne({_id: object.itemsSale[i]})
                        else
                            newItemsSale.push(object.itemsSale[i])
                    }
                    for(let i=0; i<itemsSale.length; i++) {
                        if(itemsSale[i]._id) {
                            await ItemSale.updateOne({_id: itemsSale[i]._id}, itemsSale[i])
                        }
                        else {
                            newItemSale = new ItemSale(itemsSale[i]);
                            newItemsSale.push((await ItemSale.create(newItemSale))._id)
                        }
                        if(!object.order) {
                            storeBalanceItem = await StoreBalanceItem.findOne({
                                store: object.store,
                                item: itemsSale[i].item
                            })
                            storeBalanceItem.sale = checkFloat(storeBalanceItem.sale + itemsSale[i].count)
                            storeBalanceItem.free = checkFloat(storeBalanceItem.free - itemsSale[i].count)
                            await storeBalanceItem.save()
                        }
                    }
                    await Sale.updateOne({_id}, {itemsSale: newItemsSale})
                }
                if (deliverymans) {
                    history.what = `${history.what}Доставщики;\n`
                    object.deliverymans = deliverymans
                }
                if (geo) {
                    history.what = `${history.what}Гео:${object.geo}→${geo};\n`
                    object.geo = geo
                }
                if (address) {
                    history.what = `${history.what}Адрес:${object.address}→${address};\n`
                    object.address = address
                }
                if (delivery) {
                    history.what = `${history.what}Доставка:${pdDDMMYYYY(object.delivery)}→${pdDDMMYYYY(delivery)};\n`
                    object.delivery = delivery
                }
                if (selfDelivery!=undefined) {
                    history.what = `${history.what}Самовывоз:${object.selfDelivery}→${selfDelivery};\n`
                    object.selfDelivery = selfDelivery
                }
                if (addressInfo) {
                    history.what = `${history.what}Адрес инфо:${object.addressInfo}→${addressInfo};\n`
                    object.addressInfo = addressInfo
                }
                if (paid!=undefined) {
                    history.what = `${history.what}Оплачено:${object.paid}→${paid};\n`
                    //Оплачено не меняет долг?
                    if(object.installment) {
                        let installment = await Installment.findOne({_id: object.installment, status: {$nin: ['перерасчет', 'отмена']}}).lean()
                        if(installment) {
                            let history = new History({
                                who: user._id,
                                where: object.installment,
                                what: 'Изменение оплаты продажи'
                            });
                            await History.create(history)
                            //installment.paid = installment.paid - object.paid + paid
                            let debt = installment.amount - installment.paid
                            let gridDebt = installment.amount - paid
                            let grid = [...installment.grid]
                            grid[0].amount = paid
                            //grid[0].paid = paid
                            let monthInstallment = grid.length - 1
                            let paidInstallment = checkFloat(gridDebt / monthInstallment)

                            let remainder = paidInstallment % (paidInstallment >= 100 ? 100 : 1)
                            remainder = Math.round(remainder * monthInstallment)
                            if (remainder)
                                paidInstallment = checkFloat((gridDebt - remainder) / monthInstallment)

                            for (let i = 0; i < monthInstallment; i++)
                                grid[i + 1].amount = paidInstallment

                            grid[grid.length-1].amount += remainder

                            await Installment.updateOne({_id: object.installment}, {/*paid: installment.paid, */debt, grid})
                        }
                    }

                    object.paid = paid
                }
                if (discount!=undefined) {
                    history.what = `${history.what}Скидка:${object.discount}→${discount};\n`
                    object.discount = discount
                }
                if (amountStart!=undefined) {
                    history.what = `${history.what}Сумма до скидки:${object.amountStart}→${amountStart};\n`
                    object.amountStart = amountStart
                }
                if (percentManager!=undefined) {
                    history.what = `${history.what}Процент менеджера;\n`
                    let bonus = checkFloat(object.amountEnd/100*percentManager)
                    let date = new Date(object.createdAt)
                    date.setHours(0, 0, 0, 0)
                    date.setDate(1)
                    let salary = await Salary.findOne({employment: object.manager, date})
                    if (salary) {
                        let history = new History({
                            who: user._id,
                            where: salary._id,
                            what: `Бонус:${salary.bonus}`
                        });
                        salary.bonus = checkFloat(salary.bonus - checkFloat(object.bonusManager) + bonus)
                        if(salary.bonus<0)
                            salary.bonus = 0
                        salary.pay = checkFloat(checkFloat(salary.debtStart) + checkFloat(salary.accrued) + checkFloat(salary.bonus) + checkFloat(salary.premium) - checkFloat(salary.penaltie) - checkFloat(salary.advance))
                        salary.debtEnd = checkFloat(checkFloat(salary.pay) - checkFloat(salary.paid))
                        await salary.save()
                        history.what += `→${salary.bonus};`
                        await History.create(history)
                    }
                    else {
                        let debtStart = await Salary.findOne({employment: object.manager, date: {$lt: date}}).select('debtEnd').sort('-date').lean()
                        if (debtStart)
                            debtStart = debtStart.debtEnd
                        else
                            debtStart = 0
                        salary = new Salary({
                            employment: object.manager,
                            store: object.store,
                            date,
                            salary: 0,
                            bid: 0,
                            actualDays: 0,
                            workingDay: 0,
                            debtStart,
                            premium: 0,
                            bonus,
                            accrued: 0,
                            penaltie: 0,
                            advance: 0,
                            pay: bonus+debtStart,
                            paid: 0,
                            debtEnd: bonus+debtStart
                        });
                        salary = await Salary.create(salary)
                        let history = new History({
                            who: user._id,
                            where: salary._id,
                            what: 'Создание'
                        });
                        await History.create(history)
                    }
                    let lastSalary = salary
                    let lastDebtEnd = salary.debtEnd
                    let _salary
                    while(lastSalary) {
                        _salary = await Salary.findOne({date: {$gt: lastSalary.date}, employment: object.manager, _id: {$ne: lastSalary._id}}).sort('date')
                        if(_salary) {
                            _salary.debtStart = lastDebtEnd
                            _salary.pay = checkFloat(_salary.debtStart+_salary.accrued+_salary.bonus+_salary.premium-_salary.penaltie-_salary.advance)
                            _salary.debtEnd = checkFloat(_salary.pay-_salary.paid)
                            lastDebtEnd = _salary.debtEnd
                            await _salary.save()
                        }
                        lastSalary = _salary
                    }
                    history.what = `${history.what}Бонус менеджера:${object.bonusManager}→${bonus};\n`
                    object.bonusManager = bonus
                }
                if (amountEnd!=undefined) {
                    history.what = `${history.what}Сумма после скидки:${object.amountEnd}→${amountEnd};\n`
                    let balanceClient = await BalanceClient.findOne({client: object.client})
                    balanceClient.balance = checkFloat(balanceClient.balance + object.amountEnd - amountEnd)
                    await balanceClient.save()
                    let bonus = checkFloat(object.bonusManager*amountEnd/object.amountEnd)
                    if(bonus) {
                        let date = new Date(object.createdAt)
                        date.setHours(0, 0, 0, 0)
                        date.setDate(1)
                        let salary = await Salary.findOne({employment: object.manager, date})
                        if (salary) {
                            let history = new History({
                                who: user._id,
                                where: salary._id,
                                what: `Бонус:${salary.bonus}`
                            });
                            salary.bonus = checkFloat(salary.bonus - checkFloat(object.bonusManager) + bonus)
                            if (salary.bonus < 0)
                                salary.bonus = 0
                            salary.pay = checkFloat(checkFloat(salary.debtStart) + checkFloat(salary.accrued) + checkFloat(salary.bonus) + checkFloat(salary.premium) - checkFloat(salary.penaltie) - checkFloat(salary.advance))
                            salary.debtEnd = checkFloat(checkFloat(salary.pay) - checkFloat(salary.paid))
                            await salary.save()
                            history.what += `→${salary.bonus};`
                            await History.create(history)
                        }
                        else {
                            let debtStart = await Salary.findOne({
                                employment: object.manager,
                                date: {$lt: date}
                            }).select('debtEnd').sort('-date').lean()
                            if (debtStart)
                                debtStart = debtStart.debtEnd
                            else
                                debtStart = 0
                            salary = new Salary({
                                employment: object.manager,
                                store: object.store,
                                date,
                                salary: 0,
                                bid: 0,
                                actualDays: 0,
                                workingDay: 0,
                                debtStart,
                                premium: 0,
                                bonus,
                                accrued: 0,
                                penaltie: 0,
                                advance: 0,
                                pay: bonus + debtStart,
                                paid: 0,
                                debtEnd: bonus + debtStart
                            });
                            salary = await Salary.create(salary)
                            let history = new History({
                                who: user._id,
                                where: salary._id,
                                what: 'Создание'
                            });
                            await History.create(history)
                        }
                        let lastSalary = salary
                        let lastDebtEnd = salary.debtEnd
                        let _salary
                        while (lastSalary) {
                            _salary = await Salary.findOne({
                                date: {$gt: lastSalary.date},
                                employment: object.manager,
                                _id: {$ne: object._id}
                            }).sort('date')
                            if (_salary) {
                                _salary.debtStart = lastDebtEnd
                                _salary.pay = checkFloat(_salary.debtStart + _salary.accrued + _salary.bonus + _salary.premium - _salary.penaltie - _salary.advance)
                                _salary.debtEnd = checkFloat(_salary.pay - _salary.paid)
                                lastDebtEnd = _salary.debtEnd
                                await _salary.save()
                            }
                            lastSalary = _salary
                        }
                    }
                    object.bonusManager = bonus
                    object.amountEnd = amountEnd
                    object.bonusCpa = checkFloat(object.amountEnd/100*object.percentCpa)
                    if(object.installment) {
                        let installment = await Installment.findOne({_id: object.installment, status: {$nin: ['перерасчет', 'отмена']}}).lean()
                        if(installment) {
                            let history = new History({
                                who: user._id,
                                where: object.installment,
                                what: 'Перерасчет продажи'
                            });
                            await History.create(history)

                            let amount = amountEnd - checkFloat(object.prepaid)
                            let debt = amount - installment.paid
                            let grid = [...installment.grid]
                            let gridDebt = amount - checkFloat(grid[0].amount)
                            let monthInstallment = grid.length - 1
                            let paidInstallment = checkFloat(gridDebt / monthInstallment)

                            let remainder = paidInstallment % (paidInstallment >= 100 ? 100 : 1)
                            remainder = Math.round(remainder * monthInstallment)
                            if (remainder)
                                paidInstallment = checkFloat((gridDebt - remainder) / monthInstallment)

                            for (let i = 0; i < monthInstallment; i++)
                                grid[i + 1].amount = paidInstallment

                            grid[grid.length-1].amount += remainder

                            await Installment.updateOne({_id: object.installment}, {amount, debt, grid})
                        }
                    }
                    history.what = `${history.what}Бонус менеджера:${object.bonusManager}→${bonus};\n`
                }
                if (percentCpa!=undefined) {
                    history.what = `${history.what}Процент дизайнера:${object.percentCpa}→${percentCpa};\n`
                    object.percentCpa = percentCpa
                    object.bonusCpa = checkFloat(object.amountEnd/100*object.percentCpa)
                }
                if (comment) {
                    history.what = `${history.what}Комментарий:${object.comment}→${comment};\n`
                    object.comment = comment
                }
                if (status) {
                    history.what = `${history.what}Статус:${object.status}→${status}`
                    object.status = status
                    await ItemSale.updateMany({_id: {$in: object.itemsSale}}, {status})
                    if(status==='отмена') {

                        let balanceClient = await BalanceClient.findOne({client: object.client})
                        let debtInstallment = 0
                        if(object.installment) {
                            let installment = await Installment.findOne({_id: object.installment, status: {$nin: ['перерасчет', 'отмена']}})
                            if(installment) {
                                let history = new History({
                                    who: user._id,
                                    where: object.installment,
                                    what: 'Отмена продажи'
                                });
                                await History.create(history)
                                installment.status = 'отмена'
                                debtInstallment = checkFloat(installment.amount - checkFloat(installment.grid[0].amount))
                                await installment.save()
                            }
                        }

                        if(object.reservations&&object.reservations.length) {
                            let reservations = await Reservation.find({_id: {$in: object.reservations}})
                            for(let i=0; i<reservations.length; i++) {
                                reservations[i].sale = null
                                reservations[i].status = 'отмена'
                                await ItemReservation.updateMany({_id: {$in: reservations[i].itemsReservation}}, {status: 'отмена'})
                                await reservations[i].save()
                            }
                        }

                        balanceClient.balance = checkFloat(balanceClient.balance + object.amountEnd)
                        await balanceClient.save()

                        if(!object.order) {
                            itemsSale = await ItemSale.find({_id: {$in: object.itemsSale}}).lean()
                            for (let i = 0; i < itemsSale.length; i++) {
                                let storeBalanceItem = await StoreBalanceItem.findOne({
                                    store: object.store,
                                    item: itemsSale[i].item
                                })
                                storeBalanceItem.sale = checkFloat(storeBalanceItem.sale - itemsSale[i].count)
                                storeBalanceItem.free = checkFloat(storeBalanceItem.free + itemsSale[i].count)
                                await storeBalanceItem.save()
                            }
                        }

                        if(object.bonusManager) {
                            let date = new Date(object.createdAt)
                            date.setHours(0, 0, 0, 0)
                            date.setDate(1)
                            let salary = await Salary.findOne({employment: object.manager, date})
                            if (salary) {
                                let history = new History({
                                    who: user._id,
                                    where: salary._id,
                                    what: `Бонус:${salary.bonus}`
                                });
                                salary.bonus = checkFloat(salary.bonus - object.bonusManager)
                                if(salary.bonus<0)
                                    salary.bonus = 0
                                salary.pay = checkFloat(checkFloat(salary.debtStart) + checkFloat(salary.accrued) + checkFloat(salary.bonus) + checkFloat(salary.premium) - checkFloat(salary.penaltie) - checkFloat(salary.advance))
                                salary.debtEnd = checkFloat(checkFloat(salary.pay) - checkFloat(salary.paid))
                                await salary.save()
                                history.what += `→${salary.bonus};`
                                await History.create(history)

                                let lastSalary = salary
                                let lastDebtEnd = salary.debtEnd
                                let _salary
                                while(lastSalary) {
                                    _salary = await Salary.findOne({date: {$gt: lastSalary.date}, employment: object.manager, _id: {$ne: lastSalary._id}}).sort('date')
                                    if(_salary) {
                                        _salary.debtStart = lastDebtEnd
                                        _salary.pay = checkFloat(_salary.debtStart+_salary.accrued+_salary.bonus+_salary.premium-_salary.penaltie-_salary.advance)
                                        _salary.debtEnd = checkFloat(_salary.pay-_salary.paid)
                                        lastDebtEnd = _salary.debtEnd
                                        await _salary.save()
                                    }
                                    lastSalary = _salary
                                }
                            }
                        }
                    }
                    else if(status==='отгружен') {

                        if(!object.order) {
                            itemsSale = await ItemSale.find({_id: {$in: object.itemsSale}}).lean()
                            for (let i = 0; i < itemsSale.length; i++) {
                                let storeBalanceItem = await StoreBalanceItem.findOne({
                                    store: object.store,
                                    item: itemsSale[i].item
                                })
                                storeBalanceItem.sale = checkFloat(storeBalanceItem.sale - itemsSale[i].count)
                                storeBalanceItem.free = checkFloat(storeBalanceItem.free + itemsSale[i].count)
                                await storeBalanceItem.save()
                            }
                        }

                        if(!object.delivery) {
                            history.what += '→доставлен;'
                            object.status = 'доставлен'
                        }
                        else
                            history.what += ';'

                    }
                    else if(status==='доставлен') {
                        object.deliveryFact = new Date()
                    }
                }
                await object.save();
                await History.create(history)
                return 'OK'
            }
        }
        return 'ERROR'
    },
    divideSale: async(parent, {_id, newItems, currentItems}, {user}) => {
        if(['admin', 'менеджер', 'менеджер/завсклад', 'завсклад'].includes(user.role)) {
            //поиск продажи
            let object = await Sale.findById(_id)
            if(object) {
                let history = new History({
                    who: user._id,
                    where: object._id,
                    what: 'Разделение операции\n'
                });
                object.divide = true
                let amountStart = 0
                //процент оплаты
                let paid, paidPrecent
                paidPrecent =  object.paid===object.amountEnd?100:object.paid*100/object.amountEnd
                //процент оплаты
                let prepaidPrecent = object.prepaid?object.prepaid*100/object.amountEnd:0
                //проверка рассрочки
                let installment = object.installment
                if(installment)
                    object.installment = null
                //процент бонуса менеджера
                let bonusManagerPrecent = checkFloat(object.bonusManager)*100/object.amountEnd
                //процент скидки
                let discountPrecent = 0
                if(object.discount) {
                    discountPrecent = object.discount*100/object.amountStart
                }
                //обновление позиций
                let newItemsSale = []
                for(let i=0; i<currentItems.length; i++) {
                    amountStart  = checkFloat(amountStart + currentItems[i].amount)
                    if(currentItems[i].count) {
                        newItemsSale.push(currentItems[i]._id)
                        await ItemSale.updateOne({_id: currentItems[i]._id}, currentItems[i])
                    }
                    else
                        await ItemSale.deleteOne({_id: currentItems[i]._id})
                }
                await Sale.updateOne({_id}, {itemsSale: newItemsSale})
                //сумма до скидки
                history.what = `${history.what}Сумма до скидки:${object.amountStart}→${amountStart};\n`
                object.amountStart = amountStart
                //скидка
                let discount = checkFloat(amountStart/100*discountPrecent)
                history.what = `${history.what}Скидка:${object.discount}→${discount};\n`
                object.discount = discount
                //сумма после скидки
                let amountEnd = checkFloat(amountStart - discount)
                history.what = `${history.what}Сумма после скидки:${object.amountEnd}→${amountEnd};\n`
                object.amountEnd = amountEnd
                //предоплачено
                if(prepaidPrecent) {
                    let prepaid = checkFloat(object.amountEnd/100*prepaidPrecent)
                    history.what = `${history.what}Предоплачено:${object.prepaid}→${prepaid};\n`
                    object.prepaid = prepaid
                }
                //оплачено
                paid = checkFloat(object.amountEnd/100*paidPrecent)
                history.what = `${history.what}Оплачено:${object.paid}→${paid};\n`
                object.paid = paid
                //бонус менеджера
                if(bonusManagerPrecent) {
                    let bonusManager = checkFloat(amountEnd/100*bonusManagerPrecent)
                    history.what = `${history.what}Бонус менеджера:${object.bonusManager}→${bonusManager};\n`
                    object.bonusManager = bonusManager
                }
                //процент СРА
                object.bonusCpa = checkFloat(object.amountEnd/100*object.percentCpa)

                await History.create(history)
                //новая продажа
                let newObject = new Sale({
                    order: object.order,
                    number: (await Sale.countDocuments({order: object.order}).lean())+1,
                    manager: object.manager,
                    client: object.client,
                    store: object.store,
                    geo: object.geo,
                    status: object.status,
                    cpa: object.cpa,
                    selfDelivery: object.selfDelivery,
                    promotion: object.promotion,
                    typePayment: object.typePayment,
                    address: object.address,
                    addressInfo: object.addressInfo,
                    delivery: object.delivery,
                    comment: object.comment,
                    currency: object.currency,
                    reservations: [],
                    itemsSale: [],
                    paymentConfirmation: object.paymentConfirmation,
                    percentCpa: object.percentCpa,
                    amountStart: 0,
                    divide: true
                });
                //обновление позиций
                for(let i=0; i<newItems.length; i++) {
                    if (newItems[i].count) {
                        newObject.amountStart = checkFloat(newObject.amountStart + newItems[i].amount)
                        newItems[i] = new ItemSale(newItems[i]);
                        newItems[i] = (await ItemSale.create(newItems[i]))._id
                    }
                }
                newObject.itemsSale = newItems
                //скидка
                newObject.discount = checkFloat(newObject.amountStart/100*discountPrecent)
                //сумма после скидки
                newObject.amountEnd = checkFloat(newObject.amountStart - newObject.discount)
                //предоплачено
                if(prepaidPrecent)
                    newObject.prepaid = checkFloat(newObject.amountEnd/100*prepaidPrecent)
                //оплачено
                newObject.paid = checkFloat(newObject.amountEnd/100*paidPrecent)
                //бонус менеджера
                newObject.bonusManager = checkFloat(newObject.amountEnd/100*bonusManagerPrecent)
                //процент СРА
                newObject.bonusCpa = checkFloat(newObject.amountEnd/100*newObject.percentCpa)

                newObject = await Sale.create(newObject)
                history = new History({
                    who: user._id,
                    where: newObject._id,
                    what: 'Создание разделением'
                });
                await History.create(history)

                await object.save();
                return newObject._id
            }
        }
        return 'ERROR'
    },
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query+queryUnload;
module.exports.resolvers = {...resolvers, ...resolversUnload};