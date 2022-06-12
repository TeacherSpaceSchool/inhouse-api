const Item = require('../models/item');
const IntegrationObject = require('../models/integrationObject');
const ItemBarCode = require('../models/itemBarCode');
const CategoryLegalObject = require('../models/categoryLegalObject');
const Category = require('../models/category');

module.exports.getIntegrationItems = async ({skip, legalObject}) => {
    let resIntegrationObject = {}, res = []
    let _res = await Item.find({
        legalObject,
        del: {$ne: true},
    })
        .skip(skip != undefined ? skip : 0)
        .limit(100)
        .sort('name')
        .select('name _id')
        .lean()
    let _resIntegrationObject = await IntegrationObject.find({
        legalObject,
        item: {$ne: null}
    })
        .select('item UUID')
        .lean()
    for(let i=0; i<_resIntegrationObject.length; i++)
        if(_resIntegrationObject[i].item)
            resIntegrationObject[_resIntegrationObject[i].item] = _resIntegrationObject[i].UUID
    for(let i=0; i<_res.length; i++) {
        res[i] = {
            UUID: resIntegrationObject[_res[i]._id]?resIntegrationObject[_res[i]._id]:_res[i]._id,
            name: _res[i].name
        }
    }
    return {status: 'успех', res}
}

module.exports.getIntegrationItem = async ({UUID, legalObject}) => {
    let res = await IntegrationObject.findOne({
        UUID,
        legalObject,
        item: {$ne: null}
    })
        .select('item')
        .lean();
    if(res)
        UUID = res.item;
    res = await Item.findOne({
        legalObject,
        _id: UUID,
        del: {$ne: true},
    })
        .select('price unit barCode name type code tnved mark')
        .lean()
    if(res)
        delete res._id
    return {status: 'успех', res}
}

module.exports.putIntegrationItem = async ({legalObject, UUID, newUUID, price, unit, barCode, name, type, code, tnved, mark, del}) => {
    let item = await IntegrationObject.findOne({
        UUID,
        legalObject,
        item: {$ne: null}
    })
        .select('item')
        .lean();
    if(item)
        UUID = item.item;
    item = await Item.findOne({
        legalObject,
        _id: UUID,
        del: {$ne: true},
    })
    if(item&&(del===true||del==='true')) {
        if(item.category) {
            let categoryLegalObject = await CategoryLegalObject.findOne({legalObject})
            let deleteCategorys = [item.category], findCategory = item.category
            while (findCategory) {
                findCategory = (await Category.findOne({_id: findCategory}).select('category').lean()).category
                if (findCategory)
                    deleteCategorys = [...deleteCategorys, findCategory]
            }
            for (let i = 0; i < deleteCategorys.length; i++)
                categoryLegalObject.categorys.splice(categoryLegalObject.categorys.indexOf(deleteCategorys[i]), 1)
            await categoryLegalObject.save()
        }
        item.del = true
        item.category = undefined
        await item.save()
        await IntegrationObject.deleteOne({item: item._id})
        return {
            status: 'успех'
        }
    }
    else if(del!==true&&del!=='true') {
        if (item) {
            if (name) item.name = name
            if (unit) item.unit = unit
            if (barCode) item.barCode = barCode
            if (type) item.type = type
            if (tnved) item.tnved = tnved
            if (mark != undefined) item.mark = mark
            if (price != undefined) item.price = price
            await item.save();
            if (newUUID && !(await IntegrationObject.findOne({legalObject, UUID: newUUID}).select('_id').lean())) {
                let _UUID = await IntegrationObject.findOne({
                    legalObject,
                    item: UUID
                })
                if (_UUID) {
                    _UUID.UUID = newUUID
                    await _UUID.save()
                }
                else {
                    let _object = new IntegrationObject({
                        legalObject,
                        UUID: newUUID,
                        item: item._id
                    });
                    await IntegrationObject.create(_object)
                }
            }
            let _UUID = await IntegrationObject.findOne({
                legalObject,
                item: UUID
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
            let object = new Item({
                legalObject,
                name,
                category: undefined,
                price: price ? price : 0,
                unit: unit ? unit : 'шт',
                barCode: barCode ? barCode : '',
                type: type ? type : 'товары',
                editedPrice: !price,
                tnved: tnved ? tnved : '',
                mark: mark
            });
            if (barCode && barCode.length && !(await ItemBarCode.findOne({barCode}).select('_id').lean())) {
                let newItemBarCode = new ItemBarCode({barCode, name, check: false})
                await ItemBarCode.create(newItemBarCode)
            }
            await Item.create(object)
            if (UUID) {
                let _object = new IntegrationObject({
                    legalObject, UUID, item: object._id
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