const Withdraw = require('../models/withdrawHistory');
const WorkShift = require('../models/workshift');
const Cashbox = require('../models/cashbox');
const IntegrationObject = require('../models/integrationObject');
const {psDDMMYYYYHHMM, pdDDMMYYYYHHMM, checkFloat} = require('./const');
const LegalObject = require('../models/legalObject');

module.exports.getIntegrationWithdraws = async ({legalObject, skip, date, branch, cashbox, cashier, workShift}) => {
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
    let _res = await Withdraw.find({
        legalObject,
        ...branch?{branch}:{},
        ...cashbox?{cashbox}:{},
        ...cashier?{cashier}:{},
        ...workShift?{workShift}:{},
        ...dateStart?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{}
    })
        .skip(skip != undefined ? skip : 0)
        .limit(100)
        .sort('-createdAt')
        .select('number _id createdAt comment amount branch cashbox cashier workShift')
        .lean()
    let _resIntegrationObject = await IntegrationObject.find({
        legalObject,
        $or: [
            {branch: {$ne: null}},
            {user: {$ne: null}},
            {cashbox: {$ne: null}}
        ]
    })
        .select('branch user cashbox  UUID')
        .lean()
    for(let i=0; i<_resIntegrationObject.length; i++){
        if(_resIntegrationObject[i].branch)
            resIntegrationObject[_resIntegrationObject[i].branch] = _resIntegrationObject[i].UUID
        if(_resIntegrationObject[i].user)
            resIntegrationObject[_resIntegrationObject[i].user] = _resIntegrationObject[i].UUID
        if(_resIntegrationObject[i].cashbox)
            resIntegrationObject[_resIntegrationObject[i].cashbox] = _resIntegrationObject[i].UUID
    }
    for(let i=0; i<_res.length; i++) {
        res[i] = {
            number: _res[i].number,
            UUID: _res[i]._id,
            date: pdDDMMYYYYHHMM(_res[i].createdAt),
            comment: _res[i].comment,
            amount: _res[i].amount,
            branch: resIntegrationObject[_res[i].branch]?resIntegrationObject[_res[i].branch]:_res[i].branch,
            cashier: resIntegrationObject[_res[i].cashier]?resIntegrationObject[_res[i].cashier]:_res[i].cashier,
            cashbox: resIntegrationObject[_res[i].cashbox]?resIntegrationObject[_res[i].cashbox]:_res[i].cashbox,
            workShift: _res[i].workShift
        }
    }
    return {status: 'успех', res}
}

module.exports.getIntegrationWithdraw = async ({UUID, legalObject}) => {
    let integrationObject
    let res = await Withdraw.findOne({
        legalObject,
        _id: UUID
    })
        .select('number createdAt comment amount branch cashbox cashier workShift')
        .lean()
    if(res) {
        delete res._id
        res.date = pdDDMMYYYYHHMM(res.createdAt)
        delete res.createdAt
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

module.exports.putIntegrationWithdraw = async ({legalObject, comment, amount, workShift}) => {
    workShift = await WorkShift.findOne({legalObject, _id: workShift, end: null})
    let cashbox = await Cashbox.findOne({_id: workShift.cashbox})
    if(workShift&&cashbox&&((new Date()-workShift.start)/1000/60/60)<24&&amount>0&&cashbox.cash>=amount) {
        let number = (await Withdraw.countDocuments({cashbox: cashbox._id}).lean())+1;
        let object = new Withdraw({
            number,
            syncMsg: !(await LegalObject.findOne({ofd: true, _id: cashbox.legalObject}).select('ofd').lean())?'Фискальный режим отключен':'',
            comment: comment?comment:'',
            amount,
            legalObject,
            branch: workShift.branch,
            cashier: workShift.cashier,
            workShift: workShift._id,
            cashbox: cashbox._id
        });
        await Withdraw.create(object)
        amount = checkFloat(amount)
        workShift.withdraw = checkFloat(workShift.withdraw + amount)
        workShift.cashEnd = checkFloat(workShift.cashEnd - amount)
        if(workShift.cashEnd<0)
            workShift.cashEnd = 0
        cashbox.cash = checkFloat(cashbox.cash - amount)
        if(cashbox.cash<0)
            cashbox.cash = 0
        await workShift.save()
        await cashbox.save()
        return {
            status: 'успех',
            res: object._id
        }
    }
    else
        return {
            status: 'ошибка'
        }
}