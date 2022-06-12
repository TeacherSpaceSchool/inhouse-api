const Consignation = require('../models/consignation');
const IntegrationObject = require('../models/integrationObject');

module.exports.getIntegrationConsignations = async ({skip, legalObject}) => {
    let resIntegrationObject = {}, res = []
    let _res = await Consignation.find({
        consignation: {$gt: 0},
        legalObject,
    })
        .skip(skip != undefined ? skip : 0)
        .limit(100)
        .sort('-debt')
        .select('_id client consignation paid debt')
        .lean()
    let _resIntegrationObject = await IntegrationObject.find({
        legalObject
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
            consignation: _res[i].consignation,
            paid: _res[i].paid,
            debt: _res[i].debt
        }
    }
    return {status: 'успех', res}
}

module.exports.getIntegrationConsignation = async ({UUID, client, legalObject}) => {
    let res
    if(client){
        res = await IntegrationObject.findOne({
            UUID: client,
            legalObject,
            client: {$ne: null}
        })
            .select('client')
            .lean();
        if(res)
            client = res.client;
    }
    res = await Consignation.findOne({
        legalObject,
        ...client?{client}:{_id: UUID},
        del: {$ne: true},
    })
        .select('client consignation paid debt')
        .lean()
    if(res) {
        let resIntegrationObject = await IntegrationObject.findOne({
            legalObject,
            client: res.client
        })
            .select('UUID')
            .lean();
        if (resIntegrationObject)
            res.client = resIntegrationObject.UUID;
        delete res._id
    }
    return {status: 'успех', res}
}