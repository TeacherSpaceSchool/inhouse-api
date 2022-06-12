const LegalObject = require('../models/legalObject');
const CategoryLegalObject = require('../models/categoryLegalObject');

module.exports.createTestLegalObject = async () => {
    let testLegalObject = await LegalObject.findOne({name: 'Налогоплательщик'}).select('_id').lean()
    if(!testLegalObject){
        let _object = new LegalObject({
            name: 'Налогоплательщик',
            inn: '12345678',
            address: 'test',
            phone: [],
            status: 'active',
            taxpayerType: '1',
            ugns: '1',
            email: [],
            responsiblePerson: 'test',
            ofd: false,
            rateTaxe: 'Упрощенный налоговый режим',
            ndsType: 'Без НДС',
            nspType: 'Без НСП',
        });
        _object = await LegalObject.create(_object)
        let categoryLegalObject = new CategoryLegalObject({
            categorys: [],
            legalObject: _object._id
        });
        await CategoryLegalObject.create(categoryLegalObject)
    }
}
