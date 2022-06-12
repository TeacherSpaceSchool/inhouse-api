const Sale = require('../models/sale');
const WorkShift = require('../models/workshift');
const Consignation = require('../models/consignation');
const Prepayment = require('../models/prepayment');
const Cashbox = require('../models/cashbox');
const District = require('../models/district');
const { pdQRKKM, checkFloat, cashierMaxDay } = require('../module/const');
const { check } = require('../module/kkm');
const QRCode = require('qrcode')

const type = `
  type Sale {
    _id: ID
    createdAt: Date
    number: String
    legalObject: LegalObject
    branch: Branch
    cashier: User
    cashbox: Cashbox
    workShift: WorkShift
    client: Client
    sale: Sale
    typePayment: String
    type: String
    returned: Boolean
    used: Boolean
    paid: Float
    usedPrepayment: Float
    change: Float
    extra: Float
    qr: String
    discount: Float
    amountEnd: Float
    ndsPrecent: Float
    nspPrecent: Float
    nds: Float
    sync: Boolean
    syncMsg: String
    nsp: Float
    items: [ItemSale]
    comment: String
 }
  type ItemSale {
        name: String
        unit: String
        count: Float
        price: Float
        discount: Float
        extra: Float
        amountStart: Float
        amountEnd: Float
        ndsType: String
        nds: Float
        nspType: String
        nsp: Float
    tnved: String
    mark: Boolean
  }
  type SalesCount {
        count: Float
        sale: Float
        returned: Float
        prepayment: Float
        consignation: Float
        paidConsignation: Float
        discount: Float
        extra: Float
  }
  input InputItemSale {
        name: String
        unit: String
        count: Float
        price: Float
        discount: Float
        extra: Float
        amountStart: Float
        amountEnd: Float
        ndsType: String
        nds: Float
        nspType: String
        nsp: Float
    tnved: String
    mark: Boolean
  }
`;

const query = `
    sales(skip: Int, limit: Int, date: String, legalObject: ID, branch: ID, cashbox: ID, client: ID, type: String, cashier: ID, workShift: ID): [Sale]
    salesCount(date: String, legalObject: ID, branch: ID, cashbox: ID, client: ID, type: String, cashier: ID, workShift: ID, newSale: Boolean): SalesCount
    sale(_id: ID!, rnmNumber: String, number: String, type: String): Sale
`;

const mutation = `
    addSale(ndsPrecent: Float!, nspPrecent: Float!, client: ID, sale: ID, comment: String, typePayment: String!, type: String!, paid: Float!, usedPrepayment: Float!, change: Float!, extra: Float!, discount: Float!, amountEnd: Float!, nds: Float!, nsp: Float!, items: [InputItemSale]!): ID
`;

const resolvers = {
    sales: async(parent, {skip, limit, legalObject, branch, cashier, cashbox, client, type, date, workShift}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'кассир', 'супервайзер'].includes(user.role)) {
            if(user.legalObject) legalObject = user.legalObject
            let dateStart, dateEnd, districts = [], workShiftsCashier = []
            if(user.role==='супервайзер'){
                districts = await District.find({
                    supervisors: user._id,
                })
                    .distinct('branchs')
                    .lean()
            }
            else if(user.role==='кассир'){
                let dateStartCashier = new Date()
                dateStartCashier.setDate(dateStartCashier.getDate() - cashierMaxDay)
                workShiftsCashier = await WorkShift
                    .findOne({
                        legalObject: user.legalObject,
                        branch: user.branch,
                        cashier: user._id,
                        createdAt: {$gte: dateStartCashier}
                    })
                    .distinct('_id')
                    .lean()
            }
            if (date&&date.length) {
                dateStart = new Date(date)
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            return await Sale.find({
                ...dateStart||'супервайзер'===user.role||branch?{
                    $and: [
                        ...dateStart?[{createdAt: {$gte: dateStart}},{createdAt: {$lt: dateEnd}}]:[],
                        ...user.role==='супервайзер'?[{branch: {$in: districts}}]:[],
                        ...branch?[{branch}]:[]
                    ]
                }:{},
                 ...legalObject ? {legalObject} : {},
                ...client ? {client} : {},
                ...cashbox ? {cashbox} : {},
                ...workShift||user.role==='кассир'?user.role==='кассир'?{workShift: {$in: workShiftsCashier}}:{workShift}:{},
                ...type&&type.length ? {type: type==='Возврат продажи'?{$in: ['Продажа', 'Кредит']}:type} : {},
                ...cashier?{cashier}:{},
            })
                .skip(skip != undefined ? skip : 0)
                .limit(limit? limit : skip != undefined ? 15 : 10000000000)
                .sort('-createdAt')
                .populate({
                    path: 'client',
                    select: 'name _id'
                })
                .populate({
                    path: 'cashier',
                    select: 'name _id role'
                })
                .populate({
                    path: 'cashbox',
                    select: 'name _id'
                })
                .populate({
                    path: 'legalObject',
                    select: 'name _id'
                })
                .populate({
                    path: 'branch',
                    select: 'name _id'
                })
                .populate({
                    path: 'sale',
                    select: 'number _id'
                })
                .populate({
                    path: 'workShift',
                    select: 'number _id'
                })
                .lean()
        }
    },
    salesCount: async(parent, {legalObject, branch, cashier, cashbox, client, type, date, workShift}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'кассир', 'супервайзер'].includes(user.role)) {
            if(user.legalObject) legalObject = user.legalObject
            let dateStart, dateEnd, districts = [], activeWorkshifts = [], workShiftsCashier = []
            if(user.role==='супервайзер'){
                districts = await District.find({
                    supervisors: user._id,
                })
                    .distinct('branchs')
                    .lean()
            }
            else if(user.role==='кассир'){
                let dateStartCashier = new Date()
                dateStartCashier.setDate(dateStartCashier.getDate() - cashierMaxDay)
                workShiftsCashier = await WorkShift
                    .findOne({
                        legalObject: user.legalObject,
                        branch: user.branch,
                        cashier: user._id,
                        createdAt: {$gte: dateStartCashier}
                    })
                    .distinct('_id')
                    .lean()
            }
            if (date&&date.length) {
                dateStart = new Date(date)
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            else {
                activeWorkshifts = await WorkShift.find({
                    end: null,
                    ...legalObject ? {legalObject} : {},
                })
                    .distinct('_id')
                    .lean()
            }
            let sales = await Sale.find({
                $and: [
                    ...dateStart?[{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]:[],
                    ...!dateStart&&!workShift?[{workShift: {$in: activeWorkshifts}}]:[],
                    ...user.role==='супервайзер'?[{branch: {$in: districts}}]:[],
                    ...branch?[{branch}]:[],
                    ...workShift||user.role==='кассир'?user.role==='кассир'?[{workShift: {$in: workShiftsCashier}}]:[{workShift}]:[],
                ],
                ...legalObject ? {legalObject} : {},
                ...client ? {client} : {},
                ...cashbox ? {cashbox} : {},
                ...type&&type.length ? {type} : {},
                ...cashier ? {cashier} : {},
            })
                .select('type extra discount amountEnd paid')
                .lean()
            let res = {
                sale: 0,
                returned: 0,
                prepayment: 0,
                consignation: 0,
                paidConsignation: 0,
                discount: 0,
                extra: 0,
                count: sales.length
            }
            for(let i=0; i<sales.length; i++) {
                if('Продажа'===sales[i].type) res.sale = checkFloat(res.sale+sales[i].amountEnd)
                if(sales[i].type==='Кредит') {
                    res.sale = checkFloat(res.sale+sales[i].paid)
                    res.consignation = checkFloat(res.consignation+sales[i].amountEnd-sales[i].paid)
                }
                if(sales[i].type.includes('Возврат')&&sales[i].type!=='Возврат покупки') res.returned = checkFloat(res.returned+sales[i].amountEnd)
                if(sales[i].type.includes('Аванс')) res.prepayment = checkFloat(res.prepayment+sales[i].amountEnd)
                if(sales[i].type.includes('Погашение кредита')) res.paidConsignation = checkFloat(res.paidConsignation+sales[i].amountEnd)
                if('Продажа'===sales[i].type){
                    res.discount = checkFloat(res.discount+sales[i].discount)
                    res.extra = checkFloat(res.extra+sales[i].extra)
                }
            }
            return res
        }
    },
    sale: async(parent, {_id, rnmNumber, number, type}, {user}) => {
        if(/*['admin', 'superadmin', 'управляющий', 'кассир', 'супервайзер'].includes(user.role)*/true) {
            /*let districts = []
            if (user.role === 'супервайзер') {
                districts = await District.find({
                    supervisors: user._id,
                })
                    .distinct('branchs')
                    .lean()
            }*/
            if(rnmNumber) {
                rnmNumber = await Cashbox.findOne({
                    rnmNumber, ...user.legalObject ? {
                        legalObject: user.legalObject,
                        del: {$ne: true}
                    } : {}
                }).select('_id').lean()
            }
            return await Sale.findOne({
                ...rnmNumber&&number&&type?{number, cashbox: rnmNumber._id, type: type==='Возврат продажи'?{$in: ['Продажа', 'Кредит']}:type}:{_id},
                ...user.legalObject ? {legalObject: user.legalObject} : {},
               // ...'супервайзер' === user.role ? {branch: {$in: districts}} : {},
            })
                .populate({
                    path: 'cashier',
                    select: 'name _id role'
                })
                .populate({
                    path: 'cashbox',
                    select: 'name _id rnmNumber'
                })
                .populate({
                    path: 'client',
                    select: 'name _id'
                })
                .populate({
                    path: 'legalObject',
                    select: 'name _id inn rateTaxe'
                })
                .populate({
                    path: 'branch',
                    select: 'name address _id'
                })
                .populate({
                    path: 'sale',
                    select: 'number _id'
                })
                .populate({
                    path: 'workShift',
                    select: 'number _id'
                })
                .lean()
        }
    }
};

const resolversMutation = {
    addSale: async(parent, {ndsPrecent, nspPrecent, sale, client, typePayment, type, paid, comment, change, extra, discount, items, usedPrepayment, amountEnd, nds, nsp}, {user}) => {
        if('кассир'===user.role&&(!type.includes('Возврат')||sale)&&(!usedPrepayment||sale)) {
            let workShift = await WorkShift.findOne({legalObject: user.legalObject, branch: user.branch, cashier: user._id, end: null})
            let cashbox = await Cashbox.findOne({_id: workShift.cashbox, legalObject: user.legalObject, branch: user.branch})
            if(cashbox&&workShift&&((new Date()-workShift.start)/1000/60/60)<24) {
                let docType
                let number = (await Sale.countDocuments({cashbox: cashbox._id}).lean())+1;
                let newSale = new Sale({
                    number,
                    legalObject: user.legalObject,
                    branch: user.branch,
                    cashier: user._id,
                    cashbox: cashbox._id,
                    workShift: workShift._id,
                    ndsPrecent,
                    nspPrecent,
                    client,
                    sale,
                    typePayment,
                    type,
                    paid,
                    change,
                    extra,
                    discount,
                    amountEnd,
                    nds,
                    nsp,
                    usedPrepayment,
                    items,
                    comment
                });
                if(sale)
                    sale = await Sale.findOne({_id: sale})
                if(['Продажа', 'Кредит', 'Аванс', 'Погашение кредита'].includes(type)){
                    if(typePayment==='Наличными') {
                        workShift.cash = checkFloat(workShift.cash + (type==='Кредит'?paid:amountEnd))
                        cashbox.cash = checkFloat(cashbox.cash + (type==='Кредит'?paid:amountEnd))
                        workShift.cashEnd = checkFloat(workShift.cashEnd + (type==='Кредит'?paid:amountEnd))
                    }
                    else
                        workShift.cashless = checkFloat(workShift.cashless + (type==='Кредит'?paid:amountEnd))
                    workShift.discount = checkFloat(workShift.discount + discount)
                    workShift.extra = checkFloat(workShift.extra + extra)
                    if(type==='Кредит') {
                        docType = '8'
                        workShift.consignationCount = checkFloat(workShift.consignationCount + 1)
                        cashbox.consignation = checkFloat(cashbox.consignation + amountEnd - paid)
                        workShift.consignation = checkFloat(workShift.consignation + amountEnd - paid)
                        if(paid) {
                            workShift.saleCount = checkFloat(workShift.saleCount + 1)
                            workShift.sale = checkFloat(workShift.sale + paid)
                            cashbox.sale = checkFloat(cashbox.sale + paid)
                        }
                        if(client) {
                            let consignation = await Consignation.findOne({client})
                            consignation.consignation = checkFloat(consignation.consignation + amountEnd - paid)
                            consignation.debt = checkFloat(consignation.debt + amountEnd - paid)
                            await consignation.save()
                        }
                    }
                    else if(type==='Погашение кредита') {
                        docType = '9'
                        workShift.paidConsignationCount = checkFloat(workShift.paidConsignationCount + 1)
                        workShift.paidConsignation = checkFloat(workShift.paidConsignation + amountEnd)
                        cashbox.paidConsignation = checkFloat(cashbox.paidConsignation + amountEnd)
                        if(client) {
                            let consignation = await Consignation.findOne({client})
                            consignation.paid = checkFloat(consignation.paid + amountEnd)
                            consignation.debt = checkFloat(consignation.debt - amountEnd)
                            if (consignation.debt < 0)
                                consignation.debt = 0
                            await consignation.save()
                        }
                    }
                    else if(type==='Аванс') {
                        docType = '5'
                        workShift.prepaymentCount = checkFloat(workShift.prepaymentCount + 1)
                        workShift.prepayment = checkFloat(workShift.prepayment + amountEnd)
                        cashbox.prepayment = checkFloat(cashbox.prepayment + amountEnd)
                        if(client) {
                            let prepayment = await Prepayment.findOne({client})
                            prepayment.balance = checkFloat(prepayment.balance + amountEnd)
                            prepayment.prepayment = checkFloat(prepayment.prepayment + amountEnd)
                            await prepayment.save()
                        }
                    }
                    else if(type==='Продажа') {
                        docType = '1'
                        workShift.saleCount = checkFloat(workShift.saleCount + 1)
                        workShift.sale = checkFloat(workShift.sale + amountEnd)
                        cashbox.sale = checkFloat(cashbox.sale + amountEnd)
                    }
                    if(usedPrepayment) {
                        if(type==='Продажа')
                            docType = '6'
                        if(client) {
                            let prepayment = await Prepayment.findOne({client})
                            prepayment.balance = checkFloat(prepayment.balance - usedPrepayment)
                            if (prepayment.balance < 0)
                                prepayment.balance = 0
                            prepayment.used = checkFloat(prepayment.used + usedPrepayment)
                            await prepayment.save()
                        }
                        sale.used = true
                        await sale.save()
                    }
                }
                else if(type==='Возврат аванса'){
                    docType = '7'
                    if(typePayment==='Наличными') {
                        cashbox.cash = checkFloat(cashbox.cash - amountEnd)
                        if(cashbox.cash<0)
                            cashbox.cash = 0
                        workShift.cashEnd = checkFloat(workShift.cashEnd - amountEnd)
                        if(workShift.cashEnd<0)
                            workShift.cashEnd = 0
                    }
                    workShift.returnedCount = checkFloat(workShift.returnedCount + 1)
                    workShift.returned = checkFloat(workShift.returned + amountEnd)
                    cashbox.returned = checkFloat(cashbox.returned + amountEnd)
                    if(client) {
                        let prepayment = await Prepayment.findOne({client})
                        prepayment.prepayment = checkFloat(prepayment.prepayment - amountEnd)
                        if (prepayment.prepayment < 0)
                            prepayment.prepayment = 0
                        prepayment.balance = checkFloat(prepayment.balance - amountEnd)
                        if (prepayment.balance < 0)
                            prepayment.balance = 0
                        await prepayment.save()
                    }
                }
                else if(type==='Возврат'){
                    docType = '3'
                    workShift.returnedCount = checkFloat(workShift.returnedCount + 1)
                    workShift.returned = checkFloat(workShift.returned + amountEnd)
                    cashbox.returned = checkFloat(cashbox.returned + amountEnd)
                    if(typePayment==='Наличными') {
                        cashbox.cash = checkFloat(cashbox.cash - amountEnd)
                        if(cashbox.cash<0)
                            cashbox.cash = 0
                        workShift.cashEnd = checkFloat(workShift.cashEnd - amountEnd)
                        if(workShift.cashEnd<0)
                            workShift.cashEnd = 0
                    }
                    if(sale.type==='Кредит'&&amountEnd!==paid){
                        docType = '10'
                        if(client) {
                            let consignation = await Consignation.findOne({client})
                            consignation.consignation = checkFloat(consignation.consignation - (sale.amountEnd - sale.paid))
                            if (consignation.consignation < 0)
                                consignation.consignation = 0
                            consignation.debt = checkFloat(consignation.debt - (sale.amountEnd - sale.paid))
                            if (consignation.debt < 0)
                                consignation.debt = 0
                            await consignation.save()
                        }
                    }
                    sale.returned = true
                    await sale.save()
                }
                else if(type==='Покупка'){
                    docType = '2'
                    workShift.buyCount = checkFloat(workShift.buyCount + 1)
                    if(typePayment==='Наличными') {
                        workShift.cashEnd = checkFloat(workShift.cashEnd - amountEnd)
                        if(workShift.cashEnd<0)
                            workShift.cashEnd = 0
                        cashbox.cash = checkFloat(cashbox.cash - amountEnd)
                        if(cashbox.cash<0)
                            cashbox.cash = 0
                    }
                    workShift.buy = checkFloat(workShift.buy + amountEnd)
                    cashbox.buy = checkFloat(cashbox.buy + amountEnd)
                }
                else if(type==='Возврат покупки'){
                    docType = '4'
                    workShift.returnedBuyCount = checkFloat(workShift.returnedBuyCount + 1)
                    if(typePayment==='Наличными') {
                        workShift.cashEnd = checkFloat(workShift.cashEnd + amountEnd)
                        cashbox.cash = checkFloat(cashbox.cash + amountEnd)
                    }
                    workShift.returnedBuy = checkFloat(workShift.returnedBuy + amountEnd)
                    cashbox.returnedBuy = checkFloat(cashbox.returnedBuy + amountEnd)
                    sale.returned = true
                    await sale.save()
                }
                newSale.docType = docType
                newSale = await Sale.create(newSale)
                await cashbox.save()
                await workShift.save()

                if(/*(await LegalObject.findOne({ofd: true, _id: user.legalObject}).select('ofd').lean())&&*/workShift.syncMsg!=='Фискальный режим отключен'){

                    if(cashbox.rnmNumber) {
                        let qr = await QRCode.toDataURL(
                            `https://kkm.salyk.kg/kkm/check?rnmNumber=${cashbox.rnmNumber}&checkNumber=${number}&amount=${amountEnd}&date=${pdQRKKM(newSale.createdAt)}`
                        )
                        await Sale.updateOne({_id: newSale._id}, {qr})
                        check(newSale._id)
                    } else
                        await Sale.updateOne({_id: newSale._id}, {sync: false, syncMsg: 'Нет rnmNumber'})

                } else
                    await Sale.updateOne({_id: newSale._id}, {sync: true, syncMsg: 'Фискальный режим отключен'})

                return newSale._id
            }
        }
    }
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;