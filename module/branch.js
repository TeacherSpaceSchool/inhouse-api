const Branch = require('../models/branch');
const IntegrationObject = require('../models/integrationObject');

module.exports.getIntegrationBranchs = async ({skip, legalObject}) => {
    let resIntegrationObject = {}, res = []
    let _res = await Branch.find({
        legalObject,
        del: {$ne: true},
    })
        .skip(skip != undefined ? skip : 0)
        .limit(skip != undefined ? 100 : 10000000000)
        .sort('name')
        .select('name _id')
        .lean()
    let _resIntegrationObject = await IntegrationObject.find({
        legalObject,
        branch: {$ne: null}
    })
        .select('branch UUID')
        .lean()
    for(let i=0; i<_resIntegrationObject.length; i++)
        if(_resIntegrationObject[i].branch)
            resIntegrationObject[_resIntegrationObject[i].branch] = _resIntegrationObject[i].UUID
    for(let i=0; i<_res.length; i++) {
        res[i] = {
            UUID: resIntegrationObject[_res[i]._id]?resIntegrationObject[_res[i]._id]:_res[i]._id,
            name: _res[i].name
        }
    }
    return {status: 'успех', res}
}

module.exports.getIntegrationBranch = async ({UUID, legalObject}) => {
    let res = await IntegrationObject.findOne({
        UUID,
        legalObject,
        branch: {$ne: null}
    })
        .select('branch')
        .lean();
    if(res)
        UUID = res.branch;
    res = await Branch.findOne({
        legalObject,
        _id: UUID,
        del: {$ne: true},
    })
        .select('inn bType pType ugns name address')
        .lean()
    if(res)
        delete res._id
    return {status: 'успех', res}
}

module.exports.putIntegrationBranch = async ({legalObject, UUID, newUUID}) => {
    if(UUID&&newUUID&&!(await IntegrationObject.findOne({legalObject, UUID: newUUID}).select('_id').lean())){
        let _UUID = await IntegrationObject.findOne({
            legalObject,
            $or: [{branch: UUID}, {UUID: UUID}]
        })
        if(_UUID){
            _UUID.UUID = newUUID
            await _UUID.save()
        }
        else {
            let branch = await Branch.findOne({
                legalObject,
                _id: UUID
            }).select('_id').lean()
            if(branch) {
                _UUID = new IntegrationObject({
                    legalObject, UUID: newUUID, branch: branch._id
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