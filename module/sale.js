const Sale = require('../models/sale');
const WorkShift = require('../models/workshift');
const Cashbox = require('../models/cashbox');
const LegalObject = require('../models/legalObject');
const IntegrationObject = require('../models/integrationObject');
const {psDDMMYYYYHHMM, pdDDMMYYYYHHMM, pdQRKKM} = require('./const');
const { checkFloat } = require('../module/const');
const { ndsTypes, nspTypes } = require('../module/const');
const Consignation = require('../models/consignation');
const Prepayment = require('../models/prepayment');
const mongoose = require('mongoose');
const { check } = require('../module/kkm');
const QRCode = require('qrcode')

module.exports.getIntegrationSales = async ({legalObject, skip, date, type, branch, cashbox, client, cashier, workShift}) => {
    if(branch){
        let resIntegrationObject = await IntegrationObject.findOne({
            UUID: branch,
            legalObject,
            branch: {$ne: null}
        })
            .select('branch')
            .lean();
        if(resIntegrationObject)
            branch = resIntegrationObject.branch;
    }
    if(cashbox){
        let resIntegrationObject = await IntegrationObject.findOne({
            UUID: cashbox,
            legalObject,
            cashbox: {$ne: null}
        })
            .select('cashbox')
            .lean();
        if(resIntegrationObject)
            cashbox = resIntegrationObject.cashbox;
    }
    if(client){
        let resIntegrationObject = await IntegrationObject.findOne({
            UUID: client,
            legalObject,
            client: {$ne: null}
        })
            .select('client')
            .lean();
        if(resIntegrationObject)
            client = resIntegrationObject.client;
    }
    if(cashier){
        let resIntegrationObject = await IntegrationObject.findOne({
            UUID: cashier,
            legalObject,
            user: {$ne: null}
        })
            .select('user')
            .lean();
        if(resIntegrationObject)
            cashier = resIntegrationObject.user;
    }
    let dateStart, dateEnd;
    if (date&&date.length) {
        dateStart = psDDMMYYYYHHMM(date)
        dateStart.setHours(0, 0, 0, 0)
        dateEnd = new Date(dateStart)
        dateEnd.setDate(dateEnd.getDate() + 1)
    }
    let resIntegrationObject = {}, res = []
    let _res = await Sale.find({
        legalObject,
        ...branch?{branch}:{},
        ...cashbox?{cashbox}:{},
        ...cashier?{cashier}:{},
        ...type?{type}:{},
        ...client?{client}:{},
        ...workShift?{workShift}:{},
        ...dateStart?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{}
    })
        .skip(skip != undefined ? skip : 0)
        .limit(skip != undefined ? 100 : 10000000000)
        .sort('-createdAt')
        .select('_id number createdAt type branch cashbox client cashier workShift amountEnd')
        .lean()
    let _resIntegrationObject = await IntegrationObject.find({
        legalObject
    })
        .select('branch user cashbox client UUID')
        .lean()
    for(let i=0; i<_resIntegrationObject.length; i++){
        if(_resIntegrationObject[i].branch)
            resIntegrationObject[_resIntegrationObject[i].branch] = _resIntegrationObject[i].UUID
        if(_resIntegrationObject[i].user)
            resIntegrationObject[_resIntegrationObject[i].user] = _resIntegrationObject[i].UUID
        if(_resIntegrationObject[i].cashbox)
            resIntegrationObject[_resIntegrationObject[i].cashbox] = _resIntegrationObject[i].UUID
        if(_resIntegrationObject[i].client)
            resIntegrationObject[_resIntegrationObject[i].client] = _resIntegrationObject[i].UUID
    }
    for(let i=0; i<_res.length; i++) {
        res[i] = {
            UUID: _res[i]._id,
            number: _res[i].number,
            amount: _res[i].amountEnd,
            date: pdDDMMYYYYHHMM(_res[i].createdAt),
            type: _res[i].type,
            branch: resIntegrationObject[_res[i].branch]?resIntegrationObject[_res[i].branch]:_res[i].branch,
            cashier: resIntegrationObject[_res[i].cashier]?resIntegrationObject[_res[i].cashier]:_res[i].cashier,
            cashbox: resIntegrationObject[_res[i].cashbox]?resIntegrationObject[_res[i].cashbox]:_res[i].cashbox,
            client: resIntegrationObject[_res[i].client]?resIntegrationObject[_res[i].client]:_res[i].client,
            workShift: _res[i].workShift
        }
    }
    return {status: 'успех', res}
}

module.exports.getIntegrationSale = async ({UUID, legalObject}) => {
    let integrationObject
    let res = await Sale.findOne({
        legalObject,
        _id: UUID
    })
        .select('createdAt number branch cashier cashbox workShift client sale typePayment type returned paid usedPrepayment change extra discount amountEnd ' +
            'nds nsp items ndsPrecent nspPrecent')
        .lean()
    if(res) {
        delete res._id
        res.date = pdDDMMYYYYHHMM(res.createdAt)
        delete res.createdAt
        res.amount = res.amountEnd
        delete res.amountEnd
        integrationObject = await IntegrationObject.findOne({
            branch: res.branch,
            legalObject
        })
            .select('UUID')
            .lean();
        if (integrationObject)
            res.branch = integrationObject.UUID
        integrationObject = await IntegrationObject.findOne({
            user: res.cashier,
            legalObject
        })
            .select('UUID')
            .lean();
        if (integrationObject)
            res.cashier = integrationObject.UUID
        integrationObject = await IntegrationObject.findOne({
            cashbox: res.cashbox,
            legalObject
        })
            .select('UUID')
            .lean();
        if (integrationObject)
            res.cashbox = integrationObject.UUID
        if(res.client) {
            integrationObject = await IntegrationObject.findOne({
                client: res.client,
                legalObject
            })
                .select('UUID')
                .lean();
            if (integrationObject)
                res.client = integrationObject.UUID
        }
        for(let i=0; i<res.items.length; i++) {
            res.items[i] = {
                name: res.items[i].name,
                unit: res.items[i].unit,
                count: res.items[i].count,
                price: res.items[i].price,
                discount: res.items[i].discount,
                extra: res.items[i].extra,
                amount: res.items[i].amountEnd,
                nds: res.items[i].nds,
                nsp: res.items[i].nsp,
                tnved: res.items[i].tnved,
                mark: res.items[i].mark
            }
        }
    }
    return {status: 'успех', res}
}

module.exports.putIntegrationSale = async ({workShift, sale, client, typePayment, comment, type, paid, usedPrepayment, extra, discount, items, legalObject}) => {
    legalObject = await LegalObject.findOne({_id: legalObject}).lean()
    workShift = await WorkShift.findOne({legalObject: legalObject._id, _id: workShift, end: null})
    let docType
    let cashbox = await Cashbox.findOne({_id: workShift.cashbox, legalObject: legalObject._id})
    if(client){
        let _client = await IntegrationObject.findOne({
            UUID: client,
            legalObject: legalObject._id,
            client: {$ne: null}
        })
            .select('client')
            .lean();
        if(_client)
            client = _client.client;
    }
    paid = checkFloat(paid)
    usedPrepayment = checkFloat(usedPrepayment)
    extra = checkFloat(extra)
    discount = checkFloat(discount)
    if(sale&&mongoose.Types.ObjectId.isValid(sale))
        sale = await Sale.findOne({_id: sale})
    if(
        client&&!mongoose.Types.ObjectId.isValid(client)||
        !['Наличными', 'Безналичный'].includes(typePayment)||
        !['Продажа', 'Возврат', 'Погашение кредита', 'Аванс', 'Возврат аванса', 'Покупка', 'Возврат покупки'].includes(type)||
        paid<0||
        usedPrepayment<0||
        extra<0||
        discount<0||
        !items||
        type.includes('Возврат')&&!sale||
        usedPrepayment&&!sale||
        !items.length
    )
        return {
            status: 'ошибка'
        }
    if(cashbox&&workShift&&((new Date()-workShift.start)/1000/60/60)<24) {
        let ndsType = legalObject.ndsType
        let nspType = legalObject.nspType
        let allPrecent = 100+ndsTypes[ndsType]+nspTypes[nspType]
        let amountEnd = 0, allNds = 0, allNsp = 0, discountAll = 0, extraAll = 0;
        if(extra) {
            extra = extra / items.length
        }
        if(discount) {
            discount = discount / items.length
        }
        for (let i = 0; i < items.length; i++) {
            items[i].count = checkFloat(items[i].count)
            items[i].price = checkFloat(items[i].price)
            items[i].discount = checkFloat(items[i].discount)
            items[i].extra = checkFloat(items[i].extra)

            if(
                items[i].count<1||
                !items[i].unit||
                !items[i].unit.length||
                items[i].price<0||
                items[i].discount<0||
                items[i].extra<0
            )
                return {
                    status: 'ошибка'
                }

            items[i].amountStart = checkFloat(items[i].count*items[i].price)
            items[i].amountEnd = checkFloat(items[i].amountStart + items[i].extra - items[i].discount)
            items[i].ndsType = ndsType
            items[i].nds = checkFloat(items[i].amountEnd/allPrecent*ndsTypes[items[i].ndsType])
            items[i].nspType = nspType
            items[i].nsp = checkFloat(items[i].amountEnd/allPrecent*nspTypes[items[i].nspType])
            if(typePayment==='Безналичный'&&type==='Продажа'&&nspTypes[items[i].nspType]){
                items[i].amountEnd = checkFloat(items[i].amountEnd - items[i].nsp)
                items[i].nsp = 0
            }
            items[i] = {
                name: items[i].name,
                unit: items[i].unit,
                count: items[i].count,
                price: items[i].price,
                discount: items[i].discount,
                extra: items[i].extra,
                amountStart: items[i].amountStart,
                amountEnd: items[i].amountEnd,
                ndsType: items[i].ndsType,
                nds: items[i].nds,
                nspType: items[i].nspType,
                nsp: items[i].nsp,
                tnved: items[i].tnved,
                mark: items[i].mark,
            }
            amountEnd += items[i].amountEnd
            discountAll = checkFloat(discountAll + items[i].discount)
            extraAll = checkFloat(extraAll + items[i].extra)
            allNds += items[i].nds
            allNsp += items[i].nsp
        }
        let change = checkFloat((paid+('Продажа'===type?usedPrepayment:0)) - amountEnd)
        let _sale = {
            ndsPrecent: ndsTypes[ndsType],
            nspPrecent: nspTypes[nspType],
            client: client?client._id:client,
            sale: sale?sale._id:sale,
            typePayment,
            type: change<0?'Кредит':type,
            paid: checkFloat(paid),
            change: change<0?0:change,
            extra: extraAll,
            discount: discountAll,
            items,
            amountEnd,
            usedPrepayment: 'Продажа'===type?usedPrepayment:0,
            comment,
            nds: checkFloat(allNds),
            nsp: typePayment === 'Безналичный' ? 0 : checkFloat(allNsp)
        }
        if(
            (typePayment==='Наличными'&&['Покупка', 'Возврат аванса', 'Возврат'].includes(type)&&paid>cashbox.cash)||
            change<0&&['Аванс', 'Погашение кредита', 'Покупка', 'Возврат', 'Возврат покупки', 'Возврат аванса'].includes(type)||
            amountEnd<0||
            paid<0
        )
            return {
                status: 'ошибка'
            }
        else {
            let number = (await Sale.countDocuments({cashbox: cashbox._id}).lean())+1;
            let newSale = new Sale({
                number,
                legalObject: legalObject._id,
                branch: workShift.branch,
                cashier: workShift.cashier,
                cashbox: cashbox._id,
                workShift: workShift._id,
                client: _sale.client,
                sale: _sale.sale,
                typePayment: _sale.typePayment,
                type: _sale.type,
                paid: _sale.paid,
                change: _sale.change,
                extra: _sale.extra,
                discount: _sale.discount,
                discountItems: _sale.discountItems,
                extraItems: _sale.extraItems,
                amountStart: _sale.amountStart,
                amountEnd: _sale.amountEnd,
                nds: _sale.nds,
                nsp: _sale.nsp,
                comment,
                usedPrepayment: _sale.usedPrepayment,
                items: _sale.items
            });
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
                        let consignation = await Consignation.findOne({client: client})
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

            return {
                status: 'успех',
                res: newSale._id
            }
        }
    }
}