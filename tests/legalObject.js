const LegalObject = require('../models/legalObject');
const CategoryLegalObject = require('../models/categoryLegalObject');
const IntegrationObject = require('../models/integrationObject');
const Integration = require('../models/integration');
const District = require('../models/district');
const WorkShift = require('../models/workshift');
const User = require('../models/user');
const { resolvers, resolversMutation } = require('../graphql/legalObject');
const { dontDeleteID, objects } = require('./lib');

module.exports.legalObjectTest = () => describe('legalObject gql', () => {

    beforeEach(async () => {
        await LegalObject.deleteMany({_id: {$nin: dontDeleteID}})
        await User.deleteMany({_id: {$nin: dontDeleteID}})
        await WorkShift.deleteMany({})
        await IntegrationObject.deleteMany({})
        await Integration.deleteMany({})
        await District.deleteMany({})
        await CategoryLegalObject.deleteMany({_id: {$nin: dontDeleteID}})
    });

    let findedLegalObjects, findedLegalObject, res, editedLegalObject, auxiliaryObject

    it('get legalObjects not authenticated', async () => {
        findedLegalObjects = await resolvers.legalObjects(null, {}, {user: {}})
        expect(findedLegalObjects).toHaveLength(0)
        findedLegalObjects = await resolvers.legalObjectsCount(null, {}, {user: {}})
        expect(findedLegalObjects).toBeFalsy()
        findedLegalObjects = await resolvers.legalObject(null, {}, {user: {}})
        expect(findedLegalObjects).toBeFalsy()
        findedLegalObjects = await resolvers.legalObjectsTrash(null, {}, {user: {}})
        expect(findedLegalObjects).toBeFalsy()
        findedLegalObjects = await resolvers.tpDataByINNforBusinessActivity(null, {}, {user: {}})
        expect(findedLegalObjects).toBeFalsy()
    });

    it('edit legalObject not add permission', async () => {
        findedLegalObject = await resolversMutation.addLegalObject(null, {}, {user: {role: 'admin'}})
        expect(findedLegalObject).toEqual('ERROR')
        res = await resolversMutation.setLegalObject(null, {}, {user: {role: 'admin'}})
        expect(res).toEqual('ERROR')
        res = await resolversMutation.deleteLegalObject(null, {}, {user: {role: 'admin'}})
        expect(res).toEqual('ERROR')
        res = await resolversMutation.onoffLegalObject(null, {}, {user: {role: 'admin'}})
        expect(res).toEqual('ERROR')
        res = await resolversMutation.restoreLegalObject(null, {}, {user: {role: 'admin'}})
        expect(res).toEqual('ERROR')
    });

    it('add legalObject superadmin', async () => {
        editedLegalObject = {
            name: 'name',
            inn: 'inn',
            address: 'address',
            phone: ['phone'],
            status: 'active',
            taxpayerType: '1',
            ugns: '1',
            email: ['email'],
            responsiblePerson: 'responsiblePerson',
            ofd: false,
            rateTaxe: 'rateTaxe',
            ndsType: 'ndsType',
            nspType: 'nspType',
            agent: objects['агент1']._id
        }

        res = await resolvers.tpDataByINNforBusinessActivity(null, {}, {user: {role: 'superadmin', add: true}})
        expect(res).toBeDefined()

        res = await resolversMutation.addLegalObject(null, {name: 'Налогоплательщик'}, {user: {role: 'superadmin', add: true}})
        expect(res).toEqual('ERROR')

        res = await resolversMutation.addLegalObject(null, editedLegalObject, {user: {role: 'superadmin', add: true}})
        findedLegalObject = await resolvers.legalObject(null, {_id: res}, {user: {role: 'superadmin', add: true}})
        expect(findedLegalObject.syncMsg).toEqual('OK')
        expect(findedLegalObject.sync).toBeTruthy()
        expect(objects['агент1']).toMatchObject(findedLegalObject.agent)
        editedLegalObject._id = findedLegalObject._id
        editedLegalObject.createdAt = findedLegalObject.createdAt
        editedLegalObject.agent = findedLegalObject.agent
        editedLegalObject.sync = findedLegalObject.sync
        expect(findedLegalObject).toMatchObject(editedLegalObject)
        findedLegalObjects = await resolvers.legalObjects(null, {}, {user: {role: 'superadmin', add: true}})
        expect(findedLegalObject).toMatchObject(findedLegalObjects[0])
        findedLegalObjects = await resolvers.legalObjectsCount(null, {}, {user: {role: 'superadmin', add: true}})
        expect(findedLegalObjects).toEqual(2)

        expect(await CategoryLegalObject.findOne({legalObject: editedLegalObject._id})).toBeDefined()

        let workShift = new WorkShift({legalObject: editedLegalObject._id,});
        await WorkShift.create(workShift)
        res = await resolversMutation.setLegalObject(null, editedLegalObject, {user: {role: 'superadmin', add: true}})
        expect(res).toEqual('ERROR')
        await WorkShift.updateOne({_id: workShift._id}, {end: new Date()})

        editedLegalObject.name = 'name 1'
        editedLegalObject.agent =  objects['агент2']._id
        editedLegalObject.rateTaxe = 'rateTaxe 1'
        editedLegalObject.ndsType = 'ndsType 1'
        editedLegalObject.nspType = 'nspType 1'
        editedLegalObject.address = 'address 1'
        editedLegalObject.phone = ['phone 1']
        editedLegalObject.email = ['email 1']
        editedLegalObject.taxpayerType = '2'
        editedLegalObject.ugns = '2'
        editedLegalObject.ofd = true
        editedLegalObject.responsiblePerson = 'responsiblePerson 1'
        res = await resolversMutation.setLegalObject(null, editedLegalObject, {user: {role: 'superadmin', add: true}})
        expect(res).toEqual('OK')
        findedLegalObject = await resolvers.legalObject(null, {_id: editedLegalObject._id}, {user: {role: 'superadmin', add: true}})
        expect(objects['агент2']).toMatchObject(findedLegalObject.agent)
        editedLegalObject.agent = findedLegalObject.agent
        expect(findedLegalObject).toMatchObject(editedLegalObject)

        await WorkShift.updateOne({_id: workShift._id}, {end: null})
        res = await resolversMutation.onoffLegalObject(null, editedLegalObject, {user: {role: 'superadmin', add: true}})
        expect(res).toEqual('ERROR')
        await WorkShift.updateOne({_id: workShift._id}, {end: new Date()})

        auxiliaryObject = new User({login: 'login', status: 'active', password: '12345678', legalObject: editedLegalObject._id});
        auxiliaryObject = await User.create(auxiliaryObject)
        res = await resolversMutation.onoffLegalObject(null, editedLegalObject, {user: {role: 'superadmin', add: true}})
        expect(res).toEqual('OK')
        findedLegalObject = await resolvers.legalObject(null, {_id: editedLegalObject._id}, {user: {role: 'superadmin', add: true}})
        expect(findedLegalObject.status).toEqual('deactive')
        expect((await User.findOne({legalObject: editedLegalObject._id}).lean()).status).toEqual('deactive')
        res = await resolversMutation.onoffLegalObject(null, editedLegalObject, {user: {role: 'superadmin', add: true}})
        expect(res).toEqual('OK')
        findedLegalObject = await resolvers.legalObject(null, {_id: editedLegalObject._id}, {user: {role: 'superadmin', add: true}})
        expect(findedLegalObject.status).toEqual('active')

        await WorkShift.updateOne({_id: workShift._id}, {end: null})
        res = await resolversMutation.deleteLegalObject(null, editedLegalObject, {user: {role: 'superadmin', add: true}})
        expect(res).toEqual('ERROR')
        await WorkShift.updateOne({_id: workShift._id}, {end: new Date()})

        auxiliaryObject = new District({legalObject: editedLegalObject._id});
        auxiliaryObject = await District.create(auxiliaryObject)
        auxiliaryObject = new Integration({legalObject: editedLegalObject._id});
        auxiliaryObject = await Integration.create(auxiliaryObject)
        auxiliaryObject = new IntegrationObject({legalObject: editedLegalObject._id});
        auxiliaryObject = await IntegrationObject.create(auxiliaryObject)
        await User.updateOne({legalObject: editedLegalObject._id}, {'status': 'active'})
        res = await resolversMutation.deleteLegalObject(null, {_id: editedLegalObject._id}, {user: {role: 'superadmin', add: true}})
        expect(res).toEqual('OK')
        expect(await District.find({legalObject: editedLegalObject._id}).lean()).toHaveLength(0);
        expect(await Integration.find({legalObject: editedLegalObject._id}).lean()).toHaveLength(0);
        expect(await IntegrationObject.find({legalObject: editedLegalObject._id}).lean()).toHaveLength(0);
        expect((await User.findOne({legalObject: editedLegalObject._id}).lean()).status).toEqual('deactive');
        findedLegalObjects = await resolvers.legalObjects(null, {}, {user: {role: 'superadmin', add: true}})
        expect(findedLegalObjects).toHaveLength(1);
        editedLegalObject.del = true
        findedLegalObjects = await resolvers.legalObjectsTrash(null, {}, {user: {role: 'admin', add: true}})
        expect(editedLegalObject).toMatchObject(findedLegalObjects[0])


        res = await resolversMutation.restoreLegalObject(null, {_id: editedLegalObject._id}, {user: {role: 'superadmin', add: true}})
        expect(res).toEqual('OK')
        editedLegalObject.del = false
        findedLegalObjects = await resolvers.legalObjects(null, {}, {user: {role: 'superadmin', add: true}})
        expect(editedLegalObject).toMatchObject(findedLegalObjects[0])
        findedLegalObjects = await resolvers.legalObjectsCount(null, {}, {user: {role: 'superadmin', add: true}})
        expect(findedLegalObjects).toEqual(2)
        findedLegalObjects = await resolvers.legalObjectsTrash(null, {}, {user: {role: 'superadmin', add: true}})
        expect(findedLegalObjects).toHaveLength(0);

        editedLegalObject = {_id: editedLegalObject._id, name: 'Налогоплательщик'}
        res = await resolversMutation.setLegalObject(null, editedLegalObject, {user: {role: 'superadmin', add: true}})
        expect(res).toEqual('OK')
        findedLegalObject = await resolvers.legalObject(null, {_id: editedLegalObject._id}, {user: {role: 'superadmin', add: true}})
        expect(findedLegalObject.name).not.toEqual(editedLegalObject.name)
        expect(findedLegalObject.agent).toBeFalsy()

    });

    it('add legalObject admin', async () => {
        editedLegalObject = {
            name: 'name',
            inn: 'inn',
            address: 'address',
            phone: ['phone'],
            status: 'active',
            taxpayerType: '1',
            ugns: '1',
            email: ['email'],
            responsiblePerson: 'responsiblePerson',
            ofd: false,
            rateTaxe: 'rateTaxe',
            ndsType: 'ndsType',
            nspType: 'nspType',
            agent: objects['агент1']._id
        }

        res = await resolvers.tpDataByINNforBusinessActivity(null, {}, {user: {role: 'admin', add: true}})
        expect(res).toBeDefined()

        res = await resolversMutation.addLegalObject(null, {name: 'Налогоплательщик'}, {user: {role: 'admin', add: true}})
        expect(res).toEqual('ERROR')

        res = await resolversMutation.addLegalObject(null, editedLegalObject, {user: {role: 'admin', add: true}})
        findedLegalObject = await resolvers.legalObject(null, {_id: res}, {user: {role: 'admin', add: true}})
        expect(findedLegalObject.syncMsg).toEqual('OK')
        expect(findedLegalObject.sync).toBeTruthy()
        expect(objects['агент1']).toMatchObject(findedLegalObject.agent)
        editedLegalObject._id = findedLegalObject._id
        editedLegalObject.createdAt = findedLegalObject.createdAt
        editedLegalObject.agent = findedLegalObject.agent
        editedLegalObject.sync = findedLegalObject.sync
        expect(findedLegalObject).toMatchObject(editedLegalObject)
        findedLegalObjects = await resolvers.legalObjects(null, {}, {user: {role: 'admin', add: true}})
        expect(findedLegalObject).toMatchObject(findedLegalObjects[0])
        findedLegalObjects = await resolvers.legalObjectsCount(null, {}, {user: {role: 'admin', add: true}})
        expect(findedLegalObjects).toEqual(2)

        expect(await CategoryLegalObject.findOne({legalObject: editedLegalObject._id})).toBeDefined()

        let workShift = new WorkShift({legalObject: editedLegalObject._id,});
        await WorkShift.create(workShift)
        res = await resolversMutation.setLegalObject(null, editedLegalObject, {user: {role: 'admin', add: true}})
        expect(res).toEqual('ERROR')
        await WorkShift.updateOne({_id: workShift._id}, {end: new Date()})

        editedLegalObject.name = 'name 1'
        editedLegalObject.agent =  objects['агент2']._id
        editedLegalObject.rateTaxe = 'rateTaxe 1'
        editedLegalObject.ndsType = 'ndsType 1'
        editedLegalObject.nspType = 'nspType 1'
        editedLegalObject.address = 'address 1'
        editedLegalObject.phone = ['phone 1']
        editedLegalObject.email = ['email 1']
        editedLegalObject.taxpayerType = '2'
        editedLegalObject.ugns = '2'
        editedLegalObject.ofd = true
        editedLegalObject.responsiblePerson = 'responsiblePerson 1'
        res = await resolversMutation.setLegalObject(null, editedLegalObject, {user: {role: 'admin', add: true}})
        expect(res).toEqual('OK')
        findedLegalObject = await resolvers.legalObject(null, {_id: editedLegalObject._id}, {user: {role: 'admin', add: true}})
        expect(objects['агент2']).toMatchObject(findedLegalObject.agent)
        editedLegalObject.agent = findedLegalObject.agent
        expect(findedLegalObject).toMatchObject(editedLegalObject)

        await WorkShift.updateOne({_id: workShift._id}, {end: null})
        res = await resolversMutation.onoffLegalObject(null, editedLegalObject, {user: {role: 'admin', add: true}})
        expect(res).toEqual('ERROR')
        await WorkShift.updateOne({_id: workShift._id}, {end: new Date()})

        auxiliaryObject = new User({login: 'login', status: 'active', password: '12345678', legalObject: editedLegalObject._id});
        auxiliaryObject = await User.create(auxiliaryObject)
        res = await resolversMutation.onoffLegalObject(null, editedLegalObject, {user: {role: 'admin', add: true}})
        expect(res).toEqual('OK')
        findedLegalObject = await resolvers.legalObject(null, {_id: editedLegalObject._id}, {user: {role: 'admin', add: true}})
        expect(findedLegalObject.status).toEqual('deactive')
        expect((await User.findOne({legalObject: editedLegalObject._id}).lean()).status).toEqual('deactive')
        res = await resolversMutation.onoffLegalObject(null, editedLegalObject, {user: {role: 'admin', add: true}})
        expect(res).toEqual('OK')
        findedLegalObject = await resolvers.legalObject(null, {_id: editedLegalObject._id}, {user: {role: 'admin', add: true}})
        expect(findedLegalObject.status).toEqual('active')

        await WorkShift.updateOne({_id: workShift._id}, {end: null})
        res = await resolversMutation.deleteLegalObject(null, editedLegalObject, {user: {role: 'admin', add: true}})
        expect(res).toEqual('ERROR')
        await WorkShift.updateOne({_id: workShift._id}, {end: new Date()})

        auxiliaryObject = new District({legalObject: editedLegalObject._id});
        auxiliaryObject = await District.create(auxiliaryObject)
        auxiliaryObject = new Integration({legalObject: editedLegalObject._id});
        auxiliaryObject = await Integration.create(auxiliaryObject)
        auxiliaryObject = new IntegrationObject({legalObject: editedLegalObject._id});
        auxiliaryObject = await IntegrationObject.create(auxiliaryObject)
        await User.updateOne({legalObject: editedLegalObject._id}, {'status': 'active'})
        res = await resolversMutation.deleteLegalObject(null, {_id: editedLegalObject._id}, {user: {role: 'admin', add: true}})
        expect(res).toEqual('OK')
        expect(await District.find({legalObject: editedLegalObject._id}).lean()).toHaveLength(0);
        expect(await Integration.find({legalObject: editedLegalObject._id}).lean()).toHaveLength(0);
        expect(await IntegrationObject.find({legalObject: editedLegalObject._id}).lean()).toHaveLength(0);
        expect((await User.findOne({legalObject: editedLegalObject._id}).lean()).status).toEqual('deactive');
        findedLegalObjects = await resolvers.legalObjects(null, {}, {user: {role: 'admin', add: true}})
        expect(findedLegalObjects).toHaveLength(1);
        editedLegalObject.del = true
        findedLegalObjects = await resolvers.legalObjectsTrash(null, {}, {user: {role: 'admin', add: true}})
        expect(editedLegalObject).toMatchObject(findedLegalObjects[0])


        res = await resolversMutation.restoreLegalObject(null, {_id: editedLegalObject._id}, {user: {role: 'admin', add: true}})
        expect(res).toEqual('OK')
        editedLegalObject.del = false
        findedLegalObjects = await resolvers.legalObjects(null, {}, {user: {role: 'admin', add: true}})
        expect(editedLegalObject).toMatchObject(findedLegalObjects[0])
        findedLegalObjects = await resolvers.legalObjectsCount(null, {}, {user: {role: 'admin', add: true}})
        expect(findedLegalObjects).toEqual(2)
        findedLegalObjects = await resolvers.legalObjectsTrash(null, {}, {user: {role: 'admin', add: true}})
        expect(findedLegalObjects).toHaveLength(0);

        editedLegalObject = {_id: editedLegalObject._id, name: 'Налогоплательщик'}
        res = await resolversMutation.setLegalObject(null, editedLegalObject, {user: {role: 'admin', add: true}})
        expect(res).toEqual('OK')
        findedLegalObject = await resolvers.legalObject(null, {_id: editedLegalObject._id}, {user: {role: 'admin', add: true}})
        expect(findedLegalObject.name).not.toEqual(editedLegalObject.name)
        expect(findedLegalObject.agent).toBeFalsy()

    });

    it('add legalObject оператор', async () => {
        editedLegalObject = {
            name: 'name',
            inn: 'inn',
            address: 'address',
            phone: ['phone'],
            status: 'active',
            taxpayerType: '1',
            ugns: '1',
            email: ['email'],
            responsiblePerson: 'responsiblePerson',
            ofd: false,
            rateTaxe: 'rateTaxe',
            ndsType: 'ndsType',
            nspType: 'nspType',
            agent: objects['агент1']._id
        }

        res = await resolvers.tpDataByINNforBusinessActivity(null, {}, {user: {role: 'оператор', add: true}})
        expect(res).toBeDefined()

        res = await resolversMutation.addLegalObject(null, {name: 'Налогоплательщик'}, {user: {role: 'оператор', add: true}})
        expect(res).toEqual('ERROR')

        res = await resolversMutation.addLegalObject(null, editedLegalObject, {user: {role: 'оператор', add: true}})
        findedLegalObject = await resolvers.legalObject(null, {_id: res}, {user: {role: 'оператор', add: true}})
        expect(findedLegalObject.syncMsg).toEqual('OK')
        expect(findedLegalObject.sync).toBeTruthy()
        expect(findedLegalObject.ofd).toBeTruthy()
        expect(objects['агент1']).toMatchObject(findedLegalObject.agent)
        editedLegalObject._id = findedLegalObject._id
        editedLegalObject.createdAt = findedLegalObject.createdAt
        editedLegalObject.ofd = true
        editedLegalObject.agent = findedLegalObject.agent
        editedLegalObject.sync = findedLegalObject.sync
        expect(findedLegalObject).toMatchObject(editedLegalObject)
        findedLegalObjects = await resolvers.legalObjects(null, {}, {user: {role: 'оператор', add: true}})
        expect(findedLegalObjects).toHaveLength(0)
        findedLegalObjects = await resolvers.legalObjectsCount(null, {}, {user: {role: 'оператор', add: true}})
        expect(findedLegalObjects).toEqual(0)
        findedLegalObjects = await resolvers.legalObjects(null, {search: editedLegalObject.name}, {user: {role: 'оператор', add: true}})
        expect(findedLegalObject).toMatchObject(findedLegalObjects[0])
        findedLegalObjects = await resolvers.legalObjectsCount(null, {search: editedLegalObject.name}, {user: {role: 'оператор', add: true}})
        expect(findedLegalObjects).toEqual(1)

        expect(await CategoryLegalObject.findOne({legalObject: editedLegalObject._id})).toBeDefined()

        let workShift = new WorkShift({legalObject: editedLegalObject._id,});
        await WorkShift.create(workShift)
        res = await resolversMutation.setLegalObject(null, editedLegalObject, {user: {role: 'оператор', add: true}})
        expect(res).toEqual('ERROR')
        await WorkShift.updateOne({_id: workShift._id}, {end: new Date()})

        editedLegalObject.name = 'name 1'
        editedLegalObject.agent =  objects['агент2']._id
        editedLegalObject.rateTaxe = 'rateTaxe 1'
        editedLegalObject.ndsType = 'ndsType 1'
        editedLegalObject.nspType = 'nspType 1'
        editedLegalObject.address = 'address 1'
        editedLegalObject.phone = ['phone 1']
        editedLegalObject.email = ['email 1']
        editedLegalObject.taxpayerType = '2'
        editedLegalObject.ugns = '2'
        editedLegalObject.ofd = false
        editedLegalObject.responsiblePerson = 'responsiblePerson 1'
        res = await resolversMutation.setLegalObject(null, editedLegalObject, {user: {role: 'оператор', add: true}})
        expect(res).toEqual('OK')
        findedLegalObject = await resolvers.legalObject(null, {_id: editedLegalObject._id}, {user: {role: 'оператор', add: true}})
        expect(objects['агент2']).toMatchObject(findedLegalObject.agent)
        editedLegalObject.agent = findedLegalObject.agent
        expect(findedLegalObject.ofd).toBeTruthy()
        editedLegalObject.ofd = true
        expect(findedLegalObject).toMatchObject(editedLegalObject)

        res = await resolversMutation.deleteLegalObject(null, {_id: editedLegalObject._id}, {user: {role: 'оператор', add: true}})
        expect(res).toEqual('ERROR')

        res = await resolversMutation.restoreLegalObject(null, {_id: editedLegalObject._id}, {user: {role: 'оператор', add: true}})
        expect(res).toEqual('ERROR')

        res = await resolversMutation.onoffLegalObject(null, {_id: editedLegalObject._id}, {user: {role: 'оператор', add: true}})
        expect(res).toEqual('ERROR')

        editedLegalObject = {_id: editedLegalObject._id, name: 'Налогоплательщик'}
        res = await resolversMutation.setLegalObject(null, editedLegalObject, {user: {role: 'оператор', add: true}})
        expect(res).toEqual('OK')
        findedLegalObject = await resolvers.legalObject(null, {_id: editedLegalObject._id}, {user: {role: 'оператор', add: true}})
        expect(findedLegalObject.name).not.toEqual(editedLegalObject.name)

    });

    it('get legalObject by role управляющий кассир', async () => {
        findedLegalObject = await resolvers.legalObject(null, {search: findedLegalObject.name}, {user: objects['управляющий']})
        expect(findedLegalObject).toMatchObject(objects['налогоплательщик'])
        findedLegalObjects = await resolvers.legalObject(null, {search: findedLegalObject.name}, {user: objects['кассир1']})
        expect(findedLegalObject).toMatchObject(objects['налогоплательщик'])
    });

    it('search legalObject', async () => {
        findedLegalObjects = await resolvers.legalObjects(null, {search: objects['налогоплательщик'].name}, {user: {role: 'admin', add: true}})
        expect(objects['налогоплательщик']).toMatchObject(findedLegalObjects[0])
        findedLegalObjects = await resolvers.legalObjectsCount(null, {search: objects['налогоплательщик'].name}, {user: {role: 'admin', add: true}})
        expect(findedLegalObjects).toEqual(1)
        findedLegalObjects = await resolvers.legalObjects(null, {search: objects['налогоплательщик'].inn}, {user: {role: 'admin', add: true}})
        expect(objects['налогоплательщик']).toMatchObject(findedLegalObjects[0])
        findedLegalObjects = await resolvers.legalObjectsCount(null, {search: objects['налогоплательщик'].inn}, {user: {role: 'admin', add: true}})
        expect(findedLegalObjects).toEqual(1)
        findedLegalObjects = await resolvers.legalObjects(null, {search: 'undefined'}, {user: {role: 'admin', add: true}})
        expect(findedLegalObjects).toHaveLength(0)
        findedLegalObjects = await resolvers.legalObjectsCount(null, {search: 'undefined'}, {user: {role: 'admin', add: true}})
        expect(findedLegalObjects).toEqual(0)
    });

});