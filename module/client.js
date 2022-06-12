const Client = require('../models/client');
const IntegrationObject = require('../models/integrationObject');
const Consignation = require('../models/consignation');
const Prepayment = require('../models/prepayment');

module.exports.getIntegrationClients = async ({skip, legalObject}) => {
    let resIntegrationObject = {}, res = []
    let _res = await Client.find({
        legalObject,
        del: {$ne: true},
    })
        .skip(skip!=undefined?skip:0)
        .limit(100)
        .sort('name')
        .select('_id name inn')
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
            UUID: resIntegrationObject[_res[i]._id]?resIntegrationObject[_res[i]._id]:_res[i]._id,
            name: _res[i].name,
            inn: _res[i].inn
        }
    }
    return {status: 'успех', res}
}

module.exports.getIntegrationClient = async ({UUID, legalObject}) => {
    let res = await IntegrationObject.findOne({
        UUID,
        legalObject,
        client: {$ne: null}
    })
        .select('client')
        .lean();
    if(res)
        UUID = res.client;
    res = await Client.findOne({
        legalObject,
        _id: UUID,
        del: {$ne: true},
    })
        .select('name phone address email info inn')
        .lean()
    if(res)
        delete res._id
    return {status: 'успех', res}
}

module.exports.putIntegrationClient = async ({UUID, newUUID, name, phone, address, email, info, inn, legalObject, del}) => {
    let client = await IntegrationObject.findOne({
        UUID,
        legalObject,
        client: {$ne: null}
    })
        .select('client')
        .lean();
    if(client) {
        UUID = client.client;
    }
    client = await Client.findOne({
        legalObject,
        _id: UUID,
        del: {$ne: true},
    })
    if(client&&(del===true||del==='true')) {
        client.del = true
        await client.save()
        await IntegrationObject.deleteOne({client: client._id})
        return {
            status: 'успех'
        }
    }
    else if(del!==true&&del!=='true') {
        if (client) {
            if (name) client.name = name
            if (phone) client.phone = phone
            if (address) client.address = address
            if (email) client.email = email
            if (info) client.info = info
            if (inn) client.inn = inn
            await client.save();
            if (newUUID && !(await IntegrationObject.findOne({legalObject, UUID: newUUID}).select('_id').lean())) {
                let _UUID = await IntegrationObject.findOne({
                    legalObject,
                    client: UUID
                })
                if (_UUID) {
                    _UUID.UUID = newUUID
                    await _UUID.save()
                }
                else {
                    let _object = new IntegrationObject({
                        legalObject,
                        UUID: newUUID,
                        client: client._id
                    });
                    await IntegrationObject.create(_object)
                }
            }
            let _UUID = await IntegrationObject.findOne({
                legalObject,
                client: UUID
            })
                .select('UUID')
                .lean();
            if (_UUID)
                UUID = _UUID.UUID
            return {
                status: 'успех',
                res: UUID
            }
        }
        else if (name) {
            client = new Client({
                name,
                legalObject,
                phone: phone ? phone : [],
                address: address ? address : '',
                info: info ? info : '',
                email: email ? email : [],
                inn: inn ? inn : '',
                files: [],

            });
            client = await Client.create(client)
            let consignation = new Consignation({
                legalObject,
                client: client._id,
                consignation: 0,
                paid: 0,
                debt: 0
            });
            await Consignation.create(consignation)
            let prepayment = new Prepayment({
                legalObject,
                client: client._id,
                prepayment: 0,
                used: 0,
                balance: 0
            });
            await Prepayment.create(prepayment)
            if (UUID) {
                let _object = new IntegrationObject({
                    legalObject, UUID, client: client._id
                });
                await IntegrationObject.create(_object)
            }
            return {
                status: 'успех',
                res: UUID ? UUID : client._id
            }
        }
    }
    else
        return {
            status: 'ошибка'
        }
}