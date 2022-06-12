const Cashbox = require('../models/cashbox');
const IntegrationObject = require('../models/integrationObject');

module.exports.getIntegrationCashboxes = async ({skip, legalObject, branch, active, rnmNumber}) => {
    let resIntegrationObject = {}, res = []
    if(branch){
        let _branch = await IntegrationObject.findOne({
            UUID: branch,
            legalObject,
            branch: {$ne: null}
        })
            .select('branch')
            .lean();
        if(_branch)
            branch = _branch.branch
    }
    let _res = await Cashbox.find({
        legalObject,
        ...branch?{branch}:{},
        ...rnmNumber?{rnmNumber}:{},
        ...active===true||active==='true'?{presentCashier: {$ne: null}}:{},
        del: {$ne: true},
    })
        .skip(skip != undefined ? skip : 0)
        .limit(skip != undefined ? 100 : 10000000000)
        .sort('name')
        .select('_id name branch rnmNumber')
        .lean()
    let _resIntegrationObject = await IntegrationObject.find({
        legalObject,
        $or: [
            {branch: {$ne: null}},
            {cashbox: {$ne: null}}
        ]
    })
        .select('branch cashbox UUID')
        .lean()
    for(let i=0; i<_resIntegrationObject.length; i++){
        if(_resIntegrationObject[i].branch)
            resIntegrationObject[_resIntegrationObject[i].branch] = _resIntegrationObject[i].UUID
        else if(_resIntegrationObject[i].cashbox)
            resIntegrationObject[_resIntegrationObject[i].cashbox] = _resIntegrationObject[i].UUID
    }
    for(let i=0; i<_res.length; i++) {
        res[i] = {
            UUID: resIntegrationObject[_res[i]._id]?resIntegrationObject[_res[i]._id]:_res[i]._id,
            name: _res[i].name,
            rnmNumber: _res[i].rnmNumber,
            branch: resIntegrationObject[_res[i].branch]?resIntegrationObject[_res[i].branch]:_res[i].branch
        }
    }
    return {status: 'успех', res}
}

module.exports.getIntegrationCashbox = async ({UUID, legalObject}) => {
    let res = await IntegrationObject.findOne({
        UUID,
        legalObject,
        cashbox: {$ne: null}
    })
        .select('cashbox')
        .lean();
    if(res)
        UUID = res.cashbox;
    res = await Cashbox.findOne({
        legalObject,
        _id: UUID,
        del: {$ne: true},
    })
        .select('name branch presentCashier cash rnmNumber')
        .lean()
    if(res) {
        delete res._id
        if (res.branch) {
            let branch = await IntegrationObject.findOne({
                branch: res.branch,
                legalObject
            })
                .select('UUID')
                .lean();
            if (branch)
                res.branch = branch.UUID
        }
        if (res.presentCashier) {
            res.status = 'active'
            let presentCashier = await IntegrationObject.findOne({
                user: res.presentCashier,
                legalObject
            })
                .select('UUID')
                .lean();
            if (presentCashier)
                res.presentCashier = presentCashier.UUID
        }
        else {
            res.status = 'inactive'
        }
    }
    return {status: 'успех', res}
}

module.exports.putIntegrationCashbox = async ({legalObject, UUID, newUUID}) => {
    if(UUID&&newUUID&&!(await IntegrationObject.findOne({legalObject, UUID: newUUID}).select('_id').lean())){
        let _UUID = await IntegrationObject.findOne({
            legalObject,
            $or: [{cashbox: UUID}, {UUID: UUID}]
        })
        if(_UUID){
            _UUID.UUID = newUUID
            await _UUID.save()
        }
        else {
            let cashbox = await Cashbox.findOne({
                legalObject,
                _id: UUID
            }).select('_id').lean()
            if(cashbox) {
                _UUID = new IntegrationObject({
                    legalObject, UUID: newUUID, cashbox: cashbox._id
                });
                await IntegrationObject.create(_UUID)
            }
            else
                return {
                    status: 'ошибка'
                }
        }
    }
    else
        return {
            status: 'ошибка'
        }
}