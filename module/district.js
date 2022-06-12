const District = require('../models/district');
const IntegrationObject = require('../models/integrationObject');
const mongoose = require('mongoose');

module.exports.getIntegrationDistricts = async ({skip, legalObject}) => {
    let resIntegrationObject = {}, res = []
    let _res = await District.find({
        legalObject
    })
        .skip(skip != undefined ? skip : 0)
        .limit(skip != undefined ? 100 : 10000000000)
        .sort('name')
        .select('name _id')
        .lean()
    let _resIntegrationObject = await IntegrationObject.find({
        legalObject,
        district: {$ne: null}
    })
        .select('district UUID')
        .lean()
    for(let i=0; i<_resIntegrationObject.length; i++)
        if(_resIntegrationObject[i].district)
            resIntegrationObject[_resIntegrationObject[i].district] = _resIntegrationObject[i].UUID
    for(let i=0; i<_res.length; i++) {
        res[i] = {
            UUID: resIntegrationObject[_res[i]._id]?resIntegrationObject[_res[i]._id]:_res[i]._id,
            name: _res[i].name
        }
    }
    return {status: 'успех', res}
}

module.exports.getIntegrationDistrict = async ({UUID, legalObject}) => {
    let res = await IntegrationObject.findOne({
        UUID,
        legalObject,
        district: {$ne: null}
    })
        .select('district')
        .lean();
    if(res)
        UUID = res.district;
    let resIntegrationObject = {}
    res = await District.findOne({
        legalObject,
        _id: UUID,
    })
        .select('name branchs cashiers supervisors')
        .lean()
    if(res) {
        delete res._id
        let _resIntegrationObject = await IntegrationObject.find({
            legalObject,
            $or: [
                {branch: {$ne: null}},
                {user: {$ne: null}}
            ]
        })
            .select('branch user UUID')
            .lean()
        for (let i = 0; i < _resIntegrationObject.length; i++) {
            if (_resIntegrationObject[i].branch)
                resIntegrationObject[_resIntegrationObject[i].branch] = _resIntegrationObject[i].UUID
            if (_resIntegrationObject[i].user)
                resIntegrationObject[_resIntegrationObject[i].user] = _resIntegrationObject[i].UUID
        }
        for (let i = 0; i < res.branchs.length; i++) {
            if (resIntegrationObject[res.branchs[i]])
                res.branchs[i] = resIntegrationObject[res.branchs[i]]
        }
        for (let i = 0; i < res.cashiers.length; i++) {
            if (resIntegrationObject[res.cashiers[i]])
                res.cashiers[i] = resIntegrationObject[res.cashiers[i]]
        }
        for (let i = 0; i < res.supervisors.length; i++) {
            if (resIntegrationObject[res.supervisors[i]])
                res.supervisors[i] = resIntegrationObject[res.supervisors[i]]
        }
    }
    return {status: 'успех', res}
}

module.exports.putIntegrationDistrict = async ({legalObject, newUUID, UUID, name, branchs, cashiers, supervisors, del}) => {
    let _resIntegrationObject = await IntegrationObject.find({
        legalObject,
        $or: [
            {branch: {$ne: null}},
            {user: {$ne: null}}
        ]
    })
        .select('branch user UUID')
        .lean()
    let resIntegrationObject = []
    for (let i = 0; i < _resIntegrationObject.length; i++) {
        if (_resIntegrationObject[i].branch)
            resIntegrationObject[_resIntegrationObject[i].UUID] = _resIntegrationObject[i].branch
        if (_resIntegrationObject[i].user)
            resIntegrationObject[_resIntegrationObject[i].UUID] = _resIntegrationObject[i].user
    }

    let district = await IntegrationObject.findOne({
        UUID,
        legalObject,
        district: {$ne: null}
    })
        .select('district')
        .lean();
    if(district)
        UUID = district.district;
    district = await District.findOne({
        legalObject,
        _id: UUID
    })
    if(district&&(del===true||del==='true')) {
        await District.deleteOne({_id: district._id})
        await IntegrationObject.deleteOne({district: district._id})
        return {
            status: 'успех'
        }
    }
    else if(del!==true&&del!=='true') {
        if (district) {
            if (name) district.name = name
            if (branchs) {
                for (let i = 0; i < branchs.length; i++) {
                    if (resIntegrationObject[branchs[i]])
                        branchs[i] = resIntegrationObject[branchs[i]]
                }
                district.branchs = branchs
            }
            if (cashiers) {
                for (let i = 0; i < cashiers.length; i++) {
                    if (resIntegrationObject[cashiers[i]])
                        cashiers[i] = resIntegrationObject[cashiers[i]]
                }
                district.cashiers = cashiers
            }
            if (supervisors) {
                for (let i = 0; i < supervisors.length; i++) {
                    if (resIntegrationObject[supervisors[i]])
                        supervisors[i] = resIntegrationObject[supervisors[i]]
                }
                district.supervisors = supervisors
            }
            await district.save();
            if (newUUID && !(await IntegrationObject.findOne({legalObject, UUID: newUUID}).select('_id').lean())) {
                let _UUID = await IntegrationObject.findOne({
                    legalObject,
                    district: UUID
                })
                if (_UUID) {
                    _UUID.UUID = newUUID
                    await _UUID.save()
                }
                else {
                    let _object = new IntegrationObject({
                        legalObject, UUID: newUUID, district: district._id
                    });
                    await IntegrationObject.create(_object)
                }
            }
            let _UUID = await IntegrationObject.findOne({
                legalObject,
                district: UUID
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
            if (branchs) {
                for (let i = 0; i < branchs.length; i++)
                    if (resIntegrationObject[branchs[i]])
                        branchs[i] = resIntegrationObject[branchs[i]]
            }
            else
                branchs = []
            if (cashiers) {
                for (let i = 0; i < cashiers.length; i++)
                    if (resIntegrationObject[cashiers[i]])
                        cashiers[i] = resIntegrationObject[cashiers[i]]
            }
            else
                cashiers = []
            if (supervisors) {
                for (let i = 0; i < supervisors.length; i++)
                    if (resIntegrationObject[supervisors[i]])
                        supervisors[i] = resIntegrationObject[supervisors[i]]
            }
            else
                supervisors = []
            let object = new District({
                legalObject,
                branchs,
                cashiers,
                supervisors,
                name
            });
            await District.create(object)
            if (UUID) {
                let _object = new IntegrationObject({
                    legalObject, UUID, district: object._id
                });
                await IntegrationObject.create(_object)
            }
            return {
                status: 'успех',
                res: UUID ? UUID : object._id
            }
        }
    }
    else
        return {
            status: 'ошибка'
        }
}