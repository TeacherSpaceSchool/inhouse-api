const Sale = require('../models/sale');
const ItemSale = require('../models/itemSale');
const History = require('../models/history');
const Reservation = require('../models/reservation');
const Salary = require('../models/salary');
const BonusManager = require('../models/bonusManager');
const Order = require('../models/order');
const Installment = require('../models/installment');
const ItemReservation = require('../models/itemReservation');
const ItemOrder = require('../models/itemOrder');
const Item = require('../models/item');
const StoreBalanceItem = require('../models/storeBalanceItem');
const BalanceClient = require('../models/balanceClient');
const {urlMain, checkFloat, pdDDMMYYYY} = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const Doc = require('../models/doc');

const type = `
  type Sale {
    _id: ID
    createdAt: Date
    paymentConfirmation: Boolean
    number: String
    manager: User
    client: Client
    itemsSale: [ItemFromList]
    geo: [Float]
    discount: Float
    cpa: Cpa
    percentCpa: Float
    bonusManager: Float
    prepaid: Float
    bonusCpa: Float
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
    orders: [Order]
    reservations: [Reservation]
    refunds: [Refund]
}
`;

const query = `
    getAttachment(_id: ID!): String
    salesBonusManager: [Float]
    sales(skip: Int, items: Boolean, limit: Int, manager: ID, client: ID, cpa: ID, date: Date, delivery: Date, status: String, store: ID): [Sale]
    salesCount(manager: ID, client: ID, cpa: ID, date: Date, delivery: Date, status: String, store: ID): Int
    sale(_id: ID!): Sale
`;

const mutation = `
    addSale(client: ID!, prepaid: Float, geo: [Float], itemsSale: [ItemFromListInput]!, discount: Float!, cpa:  ID, percentCpa: Float, amountStart: Float!, amountEnd: Float!, typePayment: String!,  address: String!, addressInfo: String!, comment: String!, currency: String, paid: Float!, delivery: Date!, orders: [ID], reservations: [ID]!): String
    setSale(_id: ID!, itemsSale: [ItemFromListInput], geo: [Float], discount: Float, percentCpa: Float, amountStart: Float, amountEnd: Float, address: String, addressInfo: String, comment: String, paid: Float, delivery: Date, status: String): String
`;

const resolvers = {
    getAttachment: async(parent, {_id}, {user}) => {
        if(['admin'].includes(user.role)) {
            let sale = await Sale.findOne({
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
                .populate('itemsSale')
                .lean()
            let attachmentFile = path.join(app.dirname, 'docs', 'attachment.xlsx');
            let workbook = new ExcelJS.Workbook();
            workbook = await workbook.xlsx.readFile(attachmentFile);
            let worksheet = workbook.getWorksheet('TDSheet');
            let doc = await Doc.findOne({}).select('name director').lean()
            worksheet.getRow(1).getCell(4).value = doc.name
            worksheet.getRow(7).getCell(8).value = sale.amountStart
            worksheet.getRow(10).getCell(4).value = sale.client.name
            worksheet.getRow(12).getCell(4).value = doc.director
            worksheet.getRow(14).getCell(4).value = sale.manager.name
            if(!sale.discount)
                worksheet.spliceRows(8, 1)
            else {
                worksheet.getRow(8).getCell(3).value = `Итого сумма со скидкой ${checkFloat(sale.discount*100/sale.amountStart)}%`
                worksheet.getRow(8).getCell(8).value = sale.amountEnd
            }

            worksheet.duplicateRow(6, sale.itemsSale.length-1, true)
            for(let i=0; i<sale.itemsSale.length; i++) {
                let row = 6+i
                let art = await Item.findById(sale.itemsSale[i].item).select('art').lean()
                if(art)
                    worksheet.getRow(row).getCell(3).value = art.art
                worksheet.getRow(row).getCell(4).value = sale.itemsSale[i].name
                worksheet.getRow(row).getCell(5).value = ''
                if(sale.itemsSale[i].characteristics.length) {
                    if(sale.itemsSale[i].characteristics.length>2)
                        worksheet.getRow(row).height = 15*sale.itemsSale[i].characteristics.length
                    for(let i1=0; i1<sale.itemsSale[i].characteristics.length; i1++) {
                        worksheet.getRow(row).getCell(5).value += `${sale.itemsSale[i].characteristics[i1][0]}: ${sale.itemsSale[i].characteristics[i1][1]};`
                        if(i1+1!==sale.itemsSale[i].characteristics.length)
                            worksheet.getRow(row).getCell(5).value += '\n'
                    }
                }
                worksheet.getRow(row).getCell(6).value = sale.itemsSale[i].count
                worksheet.getRow(row).getCell(7).value = sale.itemsSale[i].price
                worksheet.getRow(row).getCell(8).value = sale.itemsSale[i].amount
            }

            let xlsxname = `Прилож к договору купли-продажи №${sale.number}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname

        }
    },
    salesBonusManager: async(parent, ctx, {user}) => {
        if('менеджер'===user.role) {
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
    sales: async(parent, {skip, limit, items, manager, client, cpa, date, delivery, status, store}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)) {
            if(user.store) store = user.store
            let dateStart, dateEnd, deliveryStart, deliveryEnd
            if (date) {
                dateStart = new Date(date)
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            if (delivery) {
                deliveryStart = new Date(delivery)
                deliveryStart.setHours(0, 0, 0, 0)
                deliveryEnd = new Date(deliveryStart)
                deliveryEnd.setDate(deliveryEnd.getDate() + 1)
            }
            let res = await Sale.find({
                ...manager?{manager}:{},
                ...client?{client}:{},
                ...store?{store}:{},
                ...cpa?{cpa}:{},
                ...delivery?{$and: [{delivery: {$gte: deliveryStart}}, {delivery: {$lt: deliveryEnd}}]}:{},
                ...date?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{},
                ...delivery?{delivery}:{},
                ...status?{status}:{},
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
                    path: 'cpa',
                    select: '_id name'
                })
                .populate({
                    path: 'installment',
                    select: '_id status'
                })
                .populate({
                    path: 'orders',
                    select: '_id number'
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
    salesCount: async(parent, {manager, client, cpa, date, delivery, status, store}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)) {
            if(user.store) store = user.store
            let dateStart, dateEnd, deliveryStart, deliveryEnd
            if (date) {
                dateStart = new Date(date)
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            if (delivery) {
                deliveryStart = new Date(delivery)
                deliveryStart.setHours(0, 0, 0, 0)
                deliveryEnd = new Date(deliveryStart)
                deliveryEnd.setDate(deliveryEnd.getDate() + 1)
            }
            return await Sale.countDocuments({
                ...manager?{manager}:{},
                ...client?{client}:{},
                ...store?{store}:{},
                ...cpa?{cpa}:{},
                ...delivery?{$and: [{delivery: {$gte: deliveryStart}}, {delivery: {$lt: deliveryEnd}}]}:{},
                ...date?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{},
                ...delivery?{delivery}:{},
                ...status?{status}:{},
            })
                .lean()
        }
    },
    sale: async(parent, {_id}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)) {
            let res = await Sale.findOne({
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
                    path: 'cpa',
                    select: '_id name'
                })
                .populate({
                    path: 'installment',
                    select: '_id status'
                })
                .populate({
                    path: 'orders',
                    select: '_id number'
                })
                .populate({
                    path: 'reservations',
                    select: '_id number'
                })
                .populate({
                    path: 'refunds',
                    select: '_id number'
                })
                .populate('itemsSale')
                .lean()
            return res
        }
    },
};

const resolversMutation = {
    addSale: async(parent, {client, prepaid, itemsSale, geo, discount, cpa, percentCpa, amountStart, amountEnd, typePayment,  address, addressInfo, comment, currency, paid, delivery, orders, reservations}, {user}) => {
        if('менеджер'===user.role) {
            delivery = new Date(delivery)
            delivery.setHours(0, 0, 0, 0)
            let object = new Sale({
                number: (await Sale.countDocuments({}).lean())+1,
                manager: user._id,
                client,
                store: user.store,
                discount,
                amountStart,
                amountEnd,
                geo,
                status: 'обработка',
                cpa,
                prepaid,
                percentCpa,
                typePayment,
                address,
                addressInfo,
                delivery,
                comment,
                currency,
                paid,
                orders,
                reservations,
                bonusCpa: percentCpa?amountEnd/100*percentCpa:0
            });
            //На заказ
            orders = await Order.find({_id: {$in: orders}})
            for(let i=0; i<orders.length; i++) {
                orders[i].sale = object._id
                orders[i].status = 'продан'
                await ItemOrder.updateMany({_id: {$in: orders[i].itemsOrder}}, {status: 'продан'})
                await orders[i].save()
            }
            //Бронь
            let itemsReservation
            reservations = await Reservation.find({_id: {$in: reservations}})
            for(let i=0; i<reservations.length; i++) {
                reservations[i].sale = object._id
                reservations[i].status = 'продан'
                itemsReservation = await ItemReservation.find({_id: {$in: reservations[i].itemsReservation}}).lean()
                for(let i1=0; i1<itemsReservation.length; i1++) {
                    let storeBalanceItem = await StoreBalanceItem.findOne({store: object.store, item: itemsReservation[i1].item})
                    storeBalanceItem.reservation = checkFloat(storeBalanceItem.reservation - itemsReservation[i1].count)
                    storeBalanceItem.free = checkFloat(storeBalanceItem.free + itemsReservation[i1].count)
                    await storeBalanceItem.save()
                }
                await ItemReservation.updateMany({_id: {$in: reservations[i].itemsReservation}}, {status: 'продан'})
                await reservations[i].save()
            }
            //Проданные товары
            for(let i=0; i<itemsSale.length; i++) {
                itemsSale[i] = new ItemSale(itemsSale[i]);
                let storeBalanceItem = await StoreBalanceItem.findOne({store: user.store, item: itemsSale[i].item})
                storeBalanceItem.sale = checkFloat(storeBalanceItem.sale + itemsSale[i].count)
                storeBalanceItem.free = checkFloat(storeBalanceItem.free - itemsSale[i].count)
                await storeBalanceItem.save()
                itemsSale[i] = (await ItemSale.create(itemsSale[i]))._id
            }
            object.itemsSale = itemsSale
            //Баланс клиента
            if(paid) {
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
                            amount: -paid
                        },
                        ...balanceClient.balance
                    ]
                else
                    balanceClient.balance[index].amount = checkFloat(balanceClient.balance[index].amount - paid)
                await BalanceClient.updateOne({_id: balanceClient._id}, {balance: balanceClient.balance})
            }
            //Бонус менеджера
            let bonusManager = await BonusManager.findOne({manager: user._id}).lean()
            let bonus = 0
            if(bonusManager&&bonusManager.bonus.length) {
                let discountPercent = discount*100/amountStart
                for(let i=bonusManager.bonus.length-1; i>=0; i--) {
                    if(bonusManager.bonus[i][0]>=discountPercent) {
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
                        let prevDate = new Date(date)
                        prevDate.setMonth(prevDate.getMonth() - 1)
                        let debtStart = await Salary.findOne({employment: user._id, date: prevDate}).select('debtEnd').lean()
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
                            pay: bonus,
                            paid: 0,
                            debtEnd: bonus
                        });
                        salary = await Salary.create(salary)
                        let history = new History({
                            who: user._id,
                            where: salary._id,
                            what: 'Создание'
                        });
                        await History.create(history)
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
    setSale: async(parent, {_id, itemsSale, geo, discount, percentCpa, amountStart, amountEnd, address, addressInfo, comment, paid, delivery, status}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)) {
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
                        storeBalanceItem = await StoreBalanceItem.findOne({store: object.store, item: oldItemSale.item})
                        storeBalanceItem.sale = checkFloat(storeBalanceItem.sale - oldItemSale.count)
                        storeBalanceItem.free = checkFloat(storeBalanceItem.free + oldItemSale.count)
                        await storeBalanceItem.save()
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
                        storeBalanceItem = await StoreBalanceItem.findOne({store: object.store, item: itemsSale[i].item})
                        storeBalanceItem.sale = checkFloat(storeBalanceItem.sale + itemsSale[i].count)
                        storeBalanceItem.free = checkFloat(storeBalanceItem.free - itemsSale[i].count)
                        await storeBalanceItem.save()
                    }
                    await Sale.updateOne({_id}, {itemsSale: newItemsSale})
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
                if (addressInfo) {
                    history.what = `${history.what}Адрес инфо:${object.addressInfo}→${addressInfo};\n`
                    object.addressInfo = addressInfo
                }
                if (paid!=undefined) {
                    history.what = `${history.what}paid:${object.paid}→${paid};\n`

                    let balanceClient = await BalanceClient.findOne({client: object.client}).lean(), index
                    for(let i=0; i<balanceClient.balance.length; i++) {
                        if (balanceClient.balance[i].currency === object.currency) {
                            index = i
                            break
                        }
                    }
                    balanceClient.balance[index].amount = checkFloat(balanceClient.balance[index].amount + object.paid - paid)
                    await BalanceClient.updateOne({_id: balanceClient._id}, {balance: balanceClient.balance})
                    if(object.installment) {
                        let history = new History({
                            who: user._id,
                            where: object.installment,
                            what: 'Изменение оплаты продажи'
                        });
                        await History.create(history)
                        let installment = await Installment.findOne({_id: object.installment}).lean()
                        installment.paid = installment.paid - object.paid + paid
                        let debt = installment.amount - installment.paid
                        let grid = [...installment.grid]
                        grid[0].amount = paid
                        grid[0].paid = paid
                        let monthInstallment = grid.length-1
                        let paidInstallment = checkFloat(debt/monthInstallment)
                        for(let i = 0; i < monthInstallment; i++)
                            grid[i+1].amount = paidInstallment
                        await Installment.updateOne({_id: object.installment}, {paid: installment.paid, debt, grid})
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
                if (amountEnd!=undefined) {
                    history.what = `${history.what}Сумма после скидки:${object.amountEnd}→${amountEnd};\n`
                    object.amountEnd = amountEnd

                    let bonusManager = await BonusManager.findOne({manager: object.manager}).lean()
                    let bonus = 0
                    if(bonusManager&&bonusManager.bonus.length) {
                        let discountPercent = object.discount*100/object.amountStart
                        for(let i=bonusManager.bonus.length-1; i>=0; i--) {
                            if(bonusManager.bonus[i][0]>=discountPercent) {
                                bonus = checkFloat(object.amountEnd/100*bonusManager.bonus[i][1])
                                break
                            }
                        }
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
                                salary.bonus = checkFloat(salary.bonus - object.bonusManager + bonus)
                                if(salary.bonus<0)
                                    salary.bonus = 0
                                salary.pay = checkFloat(checkFloat(salary.debtStart) + checkFloat(salary.accrued) + checkFloat(salary.bonus) + checkFloat(salary.premium) - checkFloat(salary.penaltie) - checkFloat(salary.advance))
                                salary.debtEnd = checkFloat(checkFloat(salary.pay) - checkFloat(salary.paid))
                                await salary.save()
                                history.what += `→${salary.bonus};`
                                await History.create(history)
                            }
                            else {
                                let prevDate = new Date(date)
                                prevDate.setMonth(prevDate.getMonth() - 1)
                                let debtStart = await Salary.findOne({
                                    employment: object.manager,
                                    date: prevDate
                                }).select('debtEnd').lean()
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
                                    pay: bonus,
                                    paid: 0,
                                    debtEnd: bonus
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
                                _salary = await Salary.findOne({date: {$gt: lastSalary.date}, employment: object.manager, _id: {$ne: object._id}})
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
                    object.bonusManager = bonus
                    object.bonusCpa = object.percentCpa?object.amountEnd/100*object.percentCpa:0
                    if(object.installment) {
                        let history = new History({
                            who: user._id,
                            where: object.installment,
                            what: 'Перерасчет продажи'
                        });
                        await History.create(history)
                        let installment = await Installment.findOne({_id: object.installment}).lean()

                        let amount = amountEnd
                        let debt = amount - installment.paid
                        let grid = [...installment.grid]
                        let monthInstallment = grid.length-1
                        let paidInstallment = checkFloat(debt/monthInstallment)
                        for(let i = 0; i < monthInstallment; i++)
                            grid[i+1].amount = paidInstallment

                        await Installment.updateOne({_id: object.installment}, {amount, debt, grid})
                    }
                    history.what = `${history.what}Бонус менеджера:${object.bonusManager}→${bonus};\n`
                }
                if (percentCpa!=undefined) {
                    history.what = `${history.what}Процент партнера:${object.percentCpa}→${percentCpa};\n`
                    object.percentCpa = percentCpa
                    object.bonusCpa = object.percentCpa?object.amountEnd/100*object.percentCpa:0
                }
                if (comment) {
                    history.what = `${history.what}Информация:${object.comment}→${comment};\n`
                    object.comment = comment
                }
                if (status) {
                    history.what = `${history.what}Статус:${object.status}→${status};`
                    object.status = status
                    await ItemSale.updateMany({_id: {$in: object.itemsSale}}, {status})
                    if(status==='отмена') {

                        let balanceClient = await BalanceClient.findOne({client: object.client}).lean(), index
                        for(let i=0; i<balanceClient.balance.length; i++) {
                            if (balanceClient.balance[i].currency === object.currency) {
                                index = i
                                break
                            }
                        }
                        let debt = 0
                        if(object.installment) {
                            let history = new History({
                                who: user._id,
                                where: object.installment,
                                what: 'Отмена продажи'
                            });
                            await History.create(history)
                            let installment = await Installment.findOne({_id: object.installment})
                            installment.status = 'отмена'
                            debt = installment.debt
                            await installment.save()
                        }

                        balanceClient.balance[index].amount = checkFloat(balanceClient.balance[index].amount + object.paid + debt)
                        await BalanceClient.updateOne({_id: balanceClient._id}, {balance: balanceClient.balance})

                        itemsSale = await ItemSale.find({_id: {$in: object.itemsSale}}).lean()
                        for(let i=0; i<itemsSale.length; i++) {
                            let storeBalanceItem = await StoreBalanceItem.findOne({store: object.store, item: itemsSale[i].item})
                            storeBalanceItem.sale = checkFloat(storeBalanceItem.sale - itemsSale[i].count)
                            storeBalanceItem.free = checkFloat(storeBalanceItem.free + itemsSale[i].count)
                            await storeBalanceItem.save()
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
                                    _salary = await Salary.findOne({date: {$gt: lastSalary.date}, employment: object.manager, _id: {$ne: object._id}})
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

                        itemsSale = await ItemSale.find({_id: {$in: object.itemsSale}}).lean()
                        for(let i=0; i<itemsSale.length; i++) {
                            let storeBalanceItem = await StoreBalanceItem.findOne({store: object.store, item: itemsSale[i].item})
                            storeBalanceItem.sale = checkFloat(storeBalanceItem.sale - itemsSale[i].count)
                            storeBalanceItem.free = checkFloat(storeBalanceItem.free + itemsSale[i].count)
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