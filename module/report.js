const Report = require('../models/report');
const WorkShift = require('../models/workshift');
const Cashbox = require('../models/cashbox');
const LegalObject = require('../models/legalObject');
const IntegrationObject = require('../models/integrationObject');
const {psDDMMYYYYHHMM, pdDDMMYYYYHHMM} = require('./const');
const {zReport} = require('../module/kkm');

module.exports.getIntegrationReports = async ({legalObject, skip, date, type, cashbox, branch, workShift}) => {
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
    let dateStart, dateEnd;
    if (date&&date.length) {
        dateStart = psDDMMYYYYHHMM(date)
        dateStart.setHours(0, 0, 0, 0)
        dateEnd = new Date(dateStart)
        dateEnd.setDate(dateEnd.getDate() + 1)
    }
    let resIntegrationObject = {}, res = []
    let _res = await Report.find({
        legalObject,
        ...cashbox?{cashbox}:{},
        ...branch?{branch}:{},
        type,
        ...workShift?{workShift}:{},
        ...dateStart?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{}
    })
        .skip(skip != undefined ? skip : 0)
        .limit(100)
        .sort('-createdAt')
        .select('_id start end cashbox workShift branch number')
        .lean()
    let _resIntegrationObject = await IntegrationObject.find({
        legalObject,
        $or: [
            {branch: {$ne: null}},
            {cashbox: {$ne: null}}
        ]
    })
        .select('cashbox branch UUID')
        .lean()
    for(let i=0; i<_resIntegrationObject.length; i++) {
        if (_resIntegrationObject[i].cashbox)
            resIntegrationObject[_resIntegrationObject[i].cashbox] = _resIntegrationObject[i].UUID
        if (_resIntegrationObject[i].branch)
            resIntegrationObject[_resIntegrationObject[i].branch] = _resIntegrationObject[i].UUID
    }
    for(let i=0; i<_res.length; i++) {
        res[i] = {
            UUID: _res[i]._id,
            number: _res[i].number,
            workShift: _res[i].workShift,
            cashbox: resIntegrationObject[_res[i].cashbox]?resIntegrationObject[_res[i].cashbox]:_res[i].cashbox,
            branch: resIntegrationObject[_res[i].branch]?resIntegrationObject[_res[i].branch]:_res[i].branch
        }
        if(type==='X'){
            res[i].date = pdDDMMYYYYHHMM(_res[i].start)
        }
        else {
            res[i].start = pdDDMMYYYYHHMM(_res[i].start)
            res[i].end = pdDDMMYYYYHHMM(_res[i].end)
        }
    }
    return {status: 'успех', res}
}

module.exports.getIntegrationReport = async ({UUID, legalObject, type}) => {
    let res = await Report.findOne({
        legalObject,
        _id: UUID
    })
        .select('cashbox branch workShift number start end cashStart cashEnd deposit withdraw discount extra cash cashless sale saleCount consignation consignationCount paidConsignation ' +
            'paidConsignationCount prepayment prepaymentCount returned returnedCount buy buyCount returnedBuy returnedBuyCount')
        .lean()
    if(res) {
        delete res._id
        let integrationObject = await IntegrationObject.findOne({
            cashbox: res.cashbox,
            legalObject
        })
            .select('UUID')
            .lean();
        if (integrationObject)
            res.cashbox = integrationObject.UUID
        integrationObject = await IntegrationObject.findOne({
            branch: res.branch,
            legalObject
        })
            .select('UUID')
            .lean();
        if (integrationObject)
            res.branch = integrationObject.UUID
        if (type === 'X') {
            res.date = pdDDMMYYYYHHMM(res.start)
            delete res.end
            delete res.start
        }
        else {
            res.start = pdDDMMYYYYHHMM(res.start)
            res.end = pdDDMMYYYYHHMM(res.end)
        }
    }
    return {status: 'успех', res}
}

module.exports.putIntegrationReport = async ({cashbox, legalObject, type}) => {
    let resIntegrationObject = await IntegrationObject.findOne({
        UUID: cashbox,
        legalObject,
        cashbox: {$ne: null}
    })
        .select('cashbox')
        .lean();
    if(resIntegrationObject)
        cashbox = resIntegrationObject.cashbox;
    if (type === 'X') {
        cashbox = await Cashbox.findOne({
            _id: cashbox,
            legalObject,
            presentCashier: {$ne: null}
        })
            .lean()
        if(cashbox){
            let workShift = await WorkShift.findOne({
                end: null,
                legalObject: cashbox.legalObject,
                cashbox: cashbox._id
            })
                .lean()
            let number = (await Report.countDocuments({cashbox: cashbox._id, type: 'X'}).lean())+1;
            let report = new Report({
                number,
                branch: workShift.branch,
                legalObject: cashbox.legalObject,
                cashbox: cashbox._id,
                workShift: workShift._id,
                type: 'X',
                start: new Date(),
                cashEnd: cashbox.cash,
                deposit: workShift.deposit,
                withdraw: workShift.withdraw,
                discount: workShift.discount,
                extra: workShift.extra,
                cash: workShift.cash,
                cashless: workShift.cashless,
                saleAll: cashbox.sale,
                consignationAll: cashbox.consignation,
                paidConsignationAll: cashbox.paidConsignation,
                prepaymentAll: cashbox.prepayment,
                returnedAll: cashbox.returned,
                buyAll: cashbox.buy,
                returnedBuyAll: cashbox.returnedBuy,
                sale: workShift.sale,
                saleCount: workShift.saleCount,
                consignation: workShift.consignation,
                consignationCount: workShift.consignationCount,
                paidConsignation: workShift.paidConsignation,
                paidConsignationCount: workShift.paidConsignationCount,
                prepayment: workShift.prepayment,
                prepaymentCount: workShift.prepaymentCount,
                returned: workShift.returned,
                returnedCount: workShift.returnedCount,
                buy: workShift.buy,
                buyCount: workShift.buyCount,
                returnedBuy: workShift.returnedBuy,
                returnedBuyCount: workShift.returnedBuyCount
            });
            if(!(await LegalObject.findOne({ofd: true, _id: cashbox.legalObject}).select('ofd').lean())) {
                report.sync = true
                report.syncMsg = 'Фискальный режим отключен'
            }
            report = await Report.create(report)
            return {
                status: 'успех',
                res: report._id
            }
        }
        else
            return {
                status: 'ошибка'
            }
    }
    else {
        cashbox = await Cashbox.findOne({
            _id: cashbox,
            legalObject,
            presentCashier: {$ne: null}
        })
        if(cashbox) {
            let workShift = await WorkShift.findOne({
                cashier: cashbox.presentCashier
            })
            workShift.end = new Date()
            await workShift.save();
            cashbox.presentCashier = null
            await cashbox.save()
            let number = (await Report.countDocuments({cashbox: cashbox._id, type: 'Z'}).lean())+1;
            let report = new Report({
                number,
                legalObject: cashbox.legalObject,
                branch: workShift.branch,
                cashbox: cashbox._id,
                workShift: workShift._id,
                type: 'Z',
                cashEnd: cashbox.cash,
                deposit: workShift.deposit,
                withdraw: workShift.withdraw,
                discount: workShift.discount,
                extra: workShift.extra,
                cash: workShift.cash,
                cashless: workShift.cashless,
                saleAll: cashbox.sale,
                consignationAll: cashbox.consignation,
                paidConsignationAll: cashbox.paidConsignation,
                prepaymentAll: cashbox.prepayment,
                returnedAll: cashbox.returned,
                buyAll: cashbox.buy,
                returnedBuyAll: cashbox.returnedBuy,
                sale: workShift.sale,
                saleCount: workShift.saleCount,
                consignation: workShift.consignation,
                consignationCount: workShift.consignationCount,
                paidConsignation: workShift.paidConsignation,
                paidConsignationCount: workShift.paidConsignationCount,
                prepayment: workShift.prepayment,
                prepaymentCount: workShift.prepaymentCount,
                returned: workShift.returned,
                returnedCount: workShift.returnedCount,
                buy: workShift.buy,
                buyCount: workShift.buyCount,
                returnedBuy: workShift.returnedBuy,
                returnedBuyCount: workShift.returnedBuyCount,
                start: workShift.start,
                sync: workShift.sync
            });
            report.end = new Date()
            if(((report.end-report.start)/1000/60/60)>24){
                report.end = new Date(report.start)
                report.end.setHours(report.end.getHours()+24)
            }
            report = await Report.create(report)

            if((await LegalObject.findOne({ofd: true, _id: cashbox.legalObject}).select('ofd').lean())) {
                if (report.sync)
                    zReport(report._id)
                else
                    await Report.updateOne({_id: report._id}, {sync: false, syncMsg: 'Смена не синхронизирована'})
            } else
                await Report.updateOne({_id: report._id}, {sync: true, syncMsg: 'Фискальный режим отключен'})

            return {
                status: 'успех',
                res: report._id
            }
        }
        else
            return {
                status: 'ошибка'
            }
    }
}