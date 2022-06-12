const WorkShift = require('../models/workshift');
const Cashbox = require('../models/cashbox');
const LegalObject = require('../models/legalObject');
const IntegrationObject = require('../models/integrationObject');
const User = require('../models/user');
const {psDDMMYYYYHHMM, pdDDMMYYYYHHMM} = require('./const');
const {pdKKM} = require('../module/const');
const {openShift} = require('../module/kkm');

module.exports.getIntegrationWorkShifts = async ({skip, legalObject, branch, cashier, cashbox, active, date}) => {
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
    let _res = await WorkShift.find({
        legalObject,
        ...branch?{branch}:{},
        ...cashbox?{cashbox}:{},
        ...cashier?{cashier}:{},
        ...dateStart?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{},
        ...active===true||active==='true'?{end: null}:{},
    })
        .skip(skip != undefined ? skip : 0)
        .limit(100)
        .sort('-createdAt')
        .sort('-end')
        .select('_id number branch cashier cashbox start end')
        .lean()
    let _resIntegrationObject = await IntegrationObject.find({
        legalObject,
        $or: [
            {branch: {$ne: null}},
            {user: {$ne: null}},
            {cashbox: {$ne: null}}
        ]
    })
        .select('branch user cashbox UUID')
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
            start: pdDDMMYYYYHHMM(_res[i].start),
            branch: resIntegrationObject[_res[i].branch]?resIntegrationObject[_res[i].branch]:_res[i].branch,
            cashier: resIntegrationObject[_res[i].cashier]?resIntegrationObject[_res[i].cashier]:_res[i].cashier,
            cashbox: resIntegrationObject[_res[i].cashbox]?resIntegrationObject[_res[i].cashbox]:_res[i].cashbox,
            status: _res[i].end?'inactive':'active'
        }
        if(_res[i].end)
            res[i].end = pdDDMMYYYYHHMM(_res[i].end)
        else
            res[i].expired = ((new Date()-_res[i].start)/1000/60/60)>=24
    }
    return {status: 'успех', res}
}

module.exports.getIntegrationWorkShift = async ({UUID, legalObject}) => {
    let integrationObject
    let res = await WorkShift.findOne({
        legalObject,
        _id: UUID
    })
        .select('number branch cashier cashbox sale consignation paidConsignation prepayment returned cashless cash cashStart cashEnd deposit withdraw ' +
            'discount extra start end consignationCount saleCount paidConsignationCount prepaymentCount returnedCount buy buyCount returnedBuy returnedBuyCount')
        .lean()
    if(res) {
        delete res._id
        if(res.end)
            res.end = pdDDMMYYYYHHMM(res.end)
        else
            res.expired = ((new Date()-res.start)/1000/60/60)>=24
        res.start = pdDDMMYYYYHHMM(res.start)
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
    }
    return {status: 'успех', res}
}

module.exports.putIntegrationOpenWorkshift  = async ({legalObject, cashier, cashbox}) => {
    let _UUID = await IntegrationObject.findOne({
        legalObject,
        user: {$ne: null},
        UUID: cashier
    }).select('user').lean()
    if (_UUID)
        cashier = _UUID.user
    cashier = await User.findOne({
        legalObject,
        _id: cashier
    }).select('_id').lean()
    if(cashier)
        cashier = cashier._id;
    else
        return {
            status: 'ошибка'
        }

    _UUID = await IntegrationObject.findOne({
        UUID: cashbox,
        legalObject,
        cashbox: {$ne: null}
    })
        .select('cashbox')
        .lean();
    if(_UUID)
        cashbox = _UUID.cashbox;
    cashbox = await Cashbox.findOne({_id: cashbox, legalObject, presentCashier: null, endPayment: {$gte: new Date()}})

    let workShift = await WorkShift.findOne({legalObject, branch: cashbox.branch, cashier, end: null}).select('_id').lean()
    if(cashbox&&!workShift){
        cashbox.presentCashier = cashier
        await cashbox.save()
        let number = (await WorkShift.countDocuments({cashbox: cashbox._id}).lean())+1;
        let start = new Date()
        workShift = new WorkShift({
            number,
            legalObject,
            branch: cashbox.branch,
            cashier,
            cashbox: cashbox._id,
            consignation: 0,
            paidConsignation: 0,
            prepayment: 0,
            returned: 0,
            cash: 0,
            cashless: 0,
            sale: 0,
            cashStart: cashbox.cash,
            cashEnd: cashbox.cash,
            deposit: 0,
            extra: 0,
            withdraw: 0,
            discount: 0,
            consignationCount: 0,
            saleCount: 0,
            paidConsignationCount: 0,
            prepaymentCount: 0,
            returnedCount: 0,
            buy: 0,
            buyCount: 0,
            returnedBuy: 0,
            returnedBuyCount: 0,
            start
        });


        if((await LegalObject.findOne({ofd: true, _id: legalObject}).select('ofd').lean())){
            if(!cashbox.rnmNumber) {
                workShift.sync = false
                workShift.syncMsg = 'Нет rnmNumber'
            }
        }
        else {
            workShift.sync = true
            workShift.syncMsg = 'Фискальный режим отключен'
        }

        workShift = await WorkShift.create(workShift)

        if(!['Нет rnmNumber', 'Фискальный режим отключен'].includes(workShift.syncMsg)) {
            openShift({
                workShift: workShift._id,
                rnmNumber: cashbox.rnmNumber,
                number,
                date: pdKKM(start)
            })
        }

        return {status: 'успех', res: workShift._id}
    }
    else
        return {
            status: 'ошибка'
        }
}