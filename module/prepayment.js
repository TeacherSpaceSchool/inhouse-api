const Prepayment = require('../models/prepayment');
const IntegrationObject = require('../models/integrationObject');

module.exports.getIntegrationPrepayments = async ({skip, legalObject}) => {
    let resIntegrationObject = {}, res = []
    let _res = await Prepayment.find({
        prepayment: {$gt: 0},
        legalObject,
    })
        .skip(skip != undefined ? skip : 0)
        .limit(100)
        .sort('-balance')
        .select('_id client prepayment used balance')
        .lean()
    let _resIntegrationObject = await IntegrationObject.find({
        legalObject,
        client: {$ne: null}
    })
        .select('client UUID')
        .lean()
    for(let i=0; i<_resIntegrationObject.length; i++)
        if(_resIntegrationObject[i].client)
            resIntegrationObject[_resIntegrationObject[i].client] = _resIntegrationObject[i].UUID
    for(let i=0; i<_res.length; i++) {
        res[i] = {
            UUID: _res[i]._id,
            client: resIntegrationObject[_res[i].client]?resIntegrationObject[_res[i].client]:_res[i].client,
            prepayment: _res[i].prepayment,
            used: _res[i].used,
            balance: _res[i].balance
        }
    }
    return {status: 'успех', res}
}

module.exports.getIntegrationPrepayment = async ({UUID, client, legalObject}) => {
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
    let res = await Prepayment.findOne({
        legalObject,
        ...client?{client}:{_id: UUID},
        del: {$ne: true},
    })
        .select('client prepayment used balance')
        .lean()
    if(res) {
        delete res._id
        let resIntegrationObject = await IntegrationObject.findOne({
            legalObject,
            client: res.client
        })
            .select('UUID')
            .lean();
        if (resIntegrationObject)
            res.client = resIntegrationObject.UUID;
    }
    return {status: 'успех', res}
}