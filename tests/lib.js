const fs = require('fs');
const User = require('../models/user');
const LegalObject = require('../models/legalObject');
const CategoryLegalObject = require('../models/categoryLegalObject');
const Branch = require('../models/branch');
const Cashbox = require('../models/cashbox');
const dontDeleteID = []
const objects = {}

module.exports.getTestPdf = () => new Promise(resolve => resolve({
    createReadStream: () => fs.createReadStream('./tests/file/TEST_PDF.pdf'),
    filename: 'TEST_PDF.pdf'
}))

module.exports.generateUsers = async () => {
    //superadmin
    let object = new User({
        login: 'superadmin',
        role: 'superadmin',
        status: 'active',
        statistic: true,
        add: true,
        payment: true,
        password: '12345678',
        name: 'superadmin'
    });
    object = await User.create(object);
    dontDeleteID.push(object._id)
    objects['superadmin'] = object.toJSON()
    //admin
    object = new User({
        login: 'admin',
        role: 'admin',
        status: 'active',
        statistic: true,
        add: true,
        payment: true,
        password: '12345678',
        name: 'admin'
    });
    object = await User.create(object);
    dontDeleteID.push(object._id)
    objects['admin'] = object.toJSON()
    //оператор
    object = new User({
        login: 'оператор',
        role: 'оператор',
        status: 'active',
        statistic: true,
        add: true,
        payment: true,
        password: '12345678',
        name: 'оператор'
    });
    object = await User.create(object);
    dontDeleteID.push(object._id)
    objects['оператор'] = object.toJSON()
    //налогоплательщик
    object = new LegalObject({
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
        sync: true
    });
    object = await LegalObject.create(object)
    dontDeleteID.push(object._id)
    objects['налогоплательщик'] = object.toJSON()
    //категории налогоплательщика
    object = new CategoryLegalObject({
        categorys: [],
        legalObject: objects['налогоплательщик']._id
    });
    object = await CategoryLegalObject.create(object)
    dontDeleteID.push(object._id)
    objects['категории налогоплательщика'] = object.toJSON()
    //объект1 налогоплательщика
    object = new Branch({
        legalObject: objects['налогоплательщик']._id,
        bType: 'Автомобильная заправочная станция (АЗС)',
        pType: 'Розничная торговля широким ассортиментом товаров, в т.ч. продовольственными товарами',
        ugns: '001',
        name: 'объект1',
        address: 'адрес объект1',
        geo: [0.1, 0.2]
    });
    object = await Branch.create(object)
    dontDeleteID.push(object._id)
    objects['объект1'] = object.toJSON()
    //объект2 налогоплательщика
    object = new Branch({
        legalObject: objects['налогоплательщик']._id,
        bType: 'Автомобильная заправочная станция (АЗС)',
        pType: 'Розничная торговля широким ассортиментом товаров, в т.ч. продовольственными товарами',
        ugns: '001',
        name: 'объект2',
        address: 'адрес объект2',
        geo: [0.1, 0.2]
    });
    object = await Branch.create(object)
    dontDeleteID.push(object._id)
    objects['объект2'] = object.toJSON()
    //касса1
    object = new Cashbox({
        name: 'касса1',
        legalObject: objects['налогоплательщик']._id,
        branch: objects['объект1']._id,
        cash: 0
    });
    object = await Cashbox.create(object)
    dontDeleteID.push(object._id)
    objects['касса1'] = object.toJSON()
    //касса2
    object = new Cashbox({
        name: 'касса2',
        legalObject: objects['налогоплательщик']._id,
        branch: objects['объект1']._id,
        cash: 0
    });
    object = await Cashbox.create(object)
    dontDeleteID.push(object._id)
    objects['касса2'] = object.toJSON()
    //касса3
    object = new Cashbox({
        name: 'касса3',
        legalObject: objects['налогоплательщик']._id,
        branch: objects['объект2']._id,
        cash: 0
    });
    object = await Cashbox.create(object)
    dontDeleteID.push(object._id)
    objects['касса3'] = object.toJSON()
    //касса4
    object = new Cashbox({
        name: 'касса4',
        legalObject: objects['налогоплательщик']._id,
        branch: objects['объект2']._id,
        cash: 0
    });
    object = await Cashbox.create(object)
    dontDeleteID.push(object._id)
    objects['касса4'] = object.toJSON()
    //управляющий
    object = new User({
        login: 'управляющий',
        role: 'управляющий',
        status: 'active',
        password: '12345678',
        name: 'управляющий',
        phone: '+996123456789',
        legalObject: objects['налогоплательщик']._id,
        add: true,
        statistic: true,
        credit: true,
        payment: true,
        email: 'email@email.com'
    });
    object = await User.create(object)
    dontDeleteID.push(object._id)
    objects['управляющий'] = object.toJSON()
    //кассир1
    object = new User({
        login: 'кассир1',
        role: 'кассир1',
        status: 'active',
        password: '12345678',
        name: 'кассир1',
        phone: '+996123456789',
        legalObject: objects['налогоплательщик']._id,
        branch: objects['объект1']._id,
        add: true,
        statistic: true,
        credit: true,
        payment: true,
        email: 'email@email.com'
    });
    object = await User.create(object)
    dontDeleteID.push(object._id)
    objects['кассир1'] = object.toJSON()
    //кассир2
    object = new User({
        login: 'кассир2',
        role: 'кассир2',
        status: 'active',
        password: '12345678',
        name: 'кассир2',
        phone: '+996123456789',
        legalObject: objects['налогоплательщик']._id,
        branch: objects['объект1']._id,
        add: true,
        statistic: true,
        credit: true,
        payment: true,
        email: 'email@email.com'
    });
    object = await User.create(object)
    dontDeleteID.push(object._id)
    objects['кассир2'] = object.toJSON()
    //кассир3
    object = new User({
        login: 'кассир3',
        role: 'кассир3',
        status: 'active',
        password: '12345678',
        name: 'кассир3',
        phone: '+996123456789',
        legalObject: objects['налогоплательщик']._id,
        branch: objects['объект2']._id,
        add: true,
        statistic: true,
        credit: true,
        payment: true,
        email: 'email@email.com'
    });
    object = await User.create(object)
    dontDeleteID.push(object._id)
    objects['кассир3'] = object.toJSON()
    //кассир4
    object = new User({
        login: 'кассир4',
        role: 'кассир4',
        status: 'active',
        password: '12345678',
        name: 'кассир4',
        phone: '+996123456789',
        legalObject: objects['налогоплательщик']._id,
        branch: objects['объект2']._id,
        add: true,
        statistic: true,
        credit: true,
        payment: true,
        email: 'email@email.com'
    });
    object = await User.create(object)
    dontDeleteID.push(object._id)
    objects['кассир4'] = object.toJSON()
    //агент1
    object = new User({
        login: 'агент1',
        role: 'агент1',
        status: 'active',
        password: '12345678',
        name: 'агент1',
        phone: '+996123456789',
        legalObject: objects['налогоплательщик']._id,
        email: 'email@email.com'
    });
    object = await User.create(object)
    dontDeleteID.push(object._id)
    objects['агент1'] = object.toJSON()
    //агент2
    object = new User({
        login: 'агент2',
        role: 'агент2',
        status: 'active',
        password: '12345678',
        name: 'агент2',
        phone: '+996123456789',
        legalObject: objects['налогоплательщик']._id,
        email: 'email@email.com'
    });
    object = await User.create(object)
    dontDeleteID.push(object._id)
    objects['агент2'] = object.toJSON()
}

module.exports.dontDeleteID = dontDeleteID
module.exports.objects = objects
