const Branch = require('../models/branch');
const IntegrationObject = require('../models/integrationObject');
const District = require('../models/district');
const WorkShift = require('../models/workshift');
const { resolvers, resolversMutation } = require('../graphql/branch');
const { dontDeleteID, objects } = require('./lib');

module.exports.branchTest = () => describe('branch gql', () => {

    beforeEach(async () => {
        await Branch.deleteMany({_id: {$nin: dontDeleteID}})
        await IntegrationObject.deleteMany({})
        await District.deleteMany({})
    });

    let findedBranchs, findedBranch, res, editedBranch, auxiliaryObject

    it('get branchs not authenticated', async () => {
        findedBranchs = await resolvers.branchs(null, {}, {user: {}})
        expect(findedBranchs).toHaveLength(0)
        findedBranchs = await resolvers.branchsCount(null, {}, {user: {}})
        expect(findedBranchs).toBeFalsy()
        findedBranchs = await resolvers.branch(null, {}, {user: {}})
        expect(findedBranchs).toBeFalsy()
        findedBranchs = await resolvers.branchsTrash(null, {}, {user: {}})
        expect(findedBranchs).toBeFalsy()
    });

    it('edit branch not add permission', async () => {
        findedBranch = await resolversMutation.addBranch(null, {}, {user: {role: 'admin'}})
        expect(findedBranch).toEqual('ERROR')
        res = await resolversMutation.setBranch(null, {}, {user: {role: 'admin'}})
        expect(res).toEqual('ERROR')
        res = await resolversMutation.deleteBranch(null, {}, {user: {role: 'admin'}})
        expect(res).toEqual('ERROR')
        res = await resolversMutation.restoreBranch(null, {}, {user: {role: 'admin'}})
        expect(res).toEqual('ERROR')
    });

    it('add branch superadmin', async () => {

        res = await resolversMutation.addBranch(null, {}, {user: {role: 'superadmin', add: true}})
        findedBranch = await resolvers.branch(null, {_id: res}, {user: {role: 'superadmin', add: true}})
        expect(findedBranch.syncMsg).toEqual('Нет ИНН')
        expect(findedBranch.sync).toBeFalsy()
        await Branch.deleteMany({_id: res})

        editedBranch = {
            legalObject: objects['налогоплательщик']._id,
            bType: 'bType',
            pType: 'pType',
            ugns: 'ugns',
            name: 'name',
            address: 'address',
            geo: [0.1, 0.1]
        }

        res = await resolversMutation.addBranch(null, editedBranch, {user: {role: 'superadmin', add: true}})
        findedBranch = await resolvers.branch(null, {_id: res}, {user: {role: 'superadmin', add: true}})
        expect(findedBranch.syncMsg).toEqual('OK')
        expect(findedBranch.sync).toBeTruthy()
        editedBranch._id = findedBranch._id
        editedBranch.createdAt = findedBranch.createdAt
        editedBranch.sync = findedBranch.sync
        editedBranch.legalObject = findedBranch.legalObject
        expect(findedBranch).toMatchObject(editedBranch)
        findedBranchs = await resolvers.branchs(null, {}, {user: {role: 'superadmin', add: true}})
        expect(findedBranch).toMatchObject(findedBranchs[0])
        findedBranchs = await resolvers.branchsCount(null, {}, {user: {role: 'superadmin', add: true}})
        expect(findedBranchs).toEqual(3)

        let workShift = new WorkShift({legalObject: objects['налогоплательщик']._id, branch: editedBranch._id});
        await WorkShift.create(workShift)
        res = await resolversMutation.setBranch(null, editedBranch, {user: {role: 'superadmin', add: true}})
        expect(res).toEqual('ERROR')
        await WorkShift.updateOne({_id: workShift._id}, {end: new Date()})

        editedBranch.bType = 'bType 1'
        editedBranch.pType = 'pType 1'
        editedBranch.ugns = 'ugns 1'
        editedBranch.name = 'name 1'
        editedBranch.address = 'address 1'
        editedBranch.geo = [0.2, 0.2]
        res = await resolversMutation.setBranch(null, editedBranch, {user: {role: 'superadmin', add: true}})
        expect(res).toEqual('OK')
        findedBranch = await resolvers.branch(null, {_id: editedBranch._id}, {user: {role: 'superadmin', add: true}})
        expect(findedBranch).toMatchObject(editedBranch)

        await WorkShift.updateOne({_id: workShift._id}, {end: null})
        res = await resolversMutation.deleteBranch(null, {_id: editedBranch._id}, {user: {role: 'superadmin', add: true}})
        expect(res).toEqual('ERROR')
        await WorkShift.updateOne({_id: workShift._id}, {end: new Date()})

        auxiliaryObject = new District({legalObject: objects['налогоплательщик']._id, branchs: [editedBranch._id]});
        auxiliaryObject = await District.create(auxiliaryObject)
        auxiliaryObject = new IntegrationObject({legalObject: objects['налогоплательщик']._id, branch: editedBranch._id});
        auxiliaryObject = await IntegrationObject.create(auxiliaryObject)
        res = await resolversMutation.deleteBranch(null, {_id: editedBranch._id}, {user: {role: 'superadmin', add: true}})
        expect(res).toEqual('OK')
        expect(await District.find({branchs: editedBranch._id}).lean()).toHaveLength(0);
        expect(await IntegrationObject.find({branch: editedBranch._id}).lean()).toHaveLength(0);
        findedBranchs = await resolvers.branchs(null, {}, {user: {role: 'superadmin', add: true}})
        expect(findedBranchs).toHaveLength(2);
        editedBranch.del = true
        findedBranchs = await resolvers.branchsTrash(null, {}, {user: {role: 'admin', add: true}})
        expect(findedBranchs[0]).toMatchObject(editedBranch)


        res = await resolversMutation.restoreBranch(null, {_id: editedBranch._id}, {user: {role: 'superadmin', add: true}})
        expect(res).toEqual('OK')
        editedBranch.del = false
        findedBranchs = await resolvers.branchs(null, {}, {user: {role: 'superadmin', add: true}})
        expect(findedBranchs[0]).toMatchObject(editedBranch)
        findedBranchs = await resolvers.branchsCount(null, {}, {user: {role: 'superadmin', add: true}})
        expect(findedBranchs).toEqual(3)
        findedBranchs = await resolvers.branchsTrash(null, {}, {user: {role: 'superadmin', add: true}})
        expect(findedBranchs).toHaveLength(0);
    });

    it('add branch admin', async () => {

        res = await resolversMutation.addBranch(null, {}, {user: {role: 'admin', add: true}})
        findedBranch = await resolvers.branch(null, {_id: res}, {user: {role: 'admin', add: true}})
        expect(findedBranch.syncMsg).toEqual('Нет ИНН')
        expect(findedBranch.sync).toBeFalsy()
        await Branch.deleteMany({_id: res})

        editedBranch = {
            legalObject: objects['налогоплательщик']._id,
            bType: 'bType',
            pType: 'pType',
            ugns: 'ugns',
            name: 'name',
            address: 'address',
            geo: [0.1, 0.1]
        }

        res = await resolversMutation.addBranch(null, editedBranch, {user: {role: 'admin', add: true}})
        findedBranch = await resolvers.branch(null, {_id: res}, {user: {role: 'admin', add: true}})
        expect(findedBranch.syncMsg).toEqual('OK')
        expect(findedBranch.sync).toBeTruthy()
        editedBranch._id = findedBranch._id
        editedBranch.createdAt = findedBranch.createdAt
        editedBranch.sync = findedBranch.sync
        editedBranch.legalObject = findedBranch.legalObject
        expect(findedBranch).toMatchObject(editedBranch)
        findedBranchs = await resolvers.branchs(null, {}, {user: {role: 'admin', add: true}})
        expect(findedBranch).toMatchObject(findedBranchs[0])
        findedBranchs = await resolvers.branchsCount(null, {}, {user: {role: 'admin', add: true}})
        expect(findedBranchs).toEqual(3)

        let workShift = new WorkShift({legalObject: objects['налогоплательщик']._id, branch: editedBranch._id});
        await WorkShift.create(workShift)
        res = await resolversMutation.setBranch(null, editedBranch, {user: {role: 'admin', add: true}})
        expect(res).toEqual('ERROR')
        await WorkShift.updateOne({_id: workShift._id}, {end: new Date()})

        editedBranch.bType = 'bType 1'
        editedBranch.pType = 'pType 1'
        editedBranch.ugns = 'ugns 1'
        editedBranch.name = 'name 1'
        editedBranch.address = 'address 1'
        editedBranch.geo = [0.2, 0.2]
        res = await resolversMutation.setBranch(null, editedBranch, {user: {role: 'admin', add: true}})
        expect(res).toEqual('OK')
        findedBranch = await resolvers.branch(null, {_id: editedBranch._id}, {user: {role: 'admin', add: true}})
        expect(findedBranch).toMatchObject(editedBranch)

        await WorkShift.updateOne({_id: workShift._id}, {end: null})
        res = await resolversMutation.deleteBranch(null, {_id: editedBranch._id}, {user: {role: 'admin', add: true}})
        expect(res).toEqual('ERROR')
        await WorkShift.updateOne({_id: workShift._id}, {end: new Date()})

        auxiliaryObject = new District({legalObject: objects['налогоплательщик']._id, branchs: [editedBranch._id]});
        auxiliaryObject = await District.create(auxiliaryObject)
        auxiliaryObject = new IntegrationObject({legalObject: objects['налогоплательщик']._id, branch: editedBranch._id});
        auxiliaryObject = await IntegrationObject.create(auxiliaryObject)
        res = await resolversMutation.deleteBranch(null, {_id: editedBranch._id}, {user: {role: 'admin', add: true}})
        expect(res).toEqual('OK')
        expect(await District.find({branchs: editedBranch._id}).lean()).toHaveLength(0);
        expect(await IntegrationObject.find({branch: editedBranch._id}).lean()).toHaveLength(0);
        findedBranchs = await resolvers.branchs(null, {}, {user: {role: 'admin', add: true}})
        expect(findedBranchs).toHaveLength(2);
        editedBranch.del = true
        findedBranchs = await resolvers.branchsTrash(null, {}, {user: {role: 'admin', add: true}})
        expect(findedBranchs[0]).toMatchObject(editedBranch)


        res = await resolversMutation.restoreBranch(null, {_id: editedBranch._id}, {user: {role: 'admin', add: true}})
        expect(res).toEqual('OK')
        editedBranch.del = false
        findedBranchs = await resolvers.branchs(null, {}, {user: {role: 'admin', add: true}})
        expect(findedBranchs[0]).toMatchObject(editedBranch)
        findedBranchs = await resolvers.branchsCount(null, {}, {user: {role: 'admin', add: true}})
        expect(findedBranchs).toEqual(3)
        findedBranchs = await resolvers.branchsTrash(null, {}, {user: {role: 'admin', add: true}})
        expect(findedBranchs).toHaveLength(0);

    });

        it('add branch оператор', async () => {

            res = await resolversMutation.addBranch(null, {}, {user: {role: 'оператор', add: true}})
            findedBranch = await resolvers.branch(null, {_id: res}, {user: {role: 'оператор', add: true}})
            expect(findedBranch.syncMsg).toEqual('Нет ИНН')
            expect(findedBranch.sync).toBeFalsy()
            await Branch.deleteMany({_id: res})

            editedBranch = {
                legalObject: objects['налогоплательщик']._id,
                bType: 'bType',
                pType: 'pType',
                ugns: 'ugns',
                name: 'name',
                address: 'address',
                geo: [0.1, 0.1]
            }

            res = await resolversMutation.addBranch(null, editedBranch, {user: {role: 'оператор', add: true}})
            findedBranch = await resolvers.branch(null, {_id: res}, {user: {role: 'оператор', add: true}})
            expect(findedBranch.syncMsg).toEqual('OK')
            expect(findedBranch.sync).toBeTruthy()
            editedBranch._id = findedBranch._id
            editedBranch.createdAt = findedBranch.createdAt
            editedBranch.sync = findedBranch.sync
            editedBranch.legalObject = findedBranch.legalObject
            expect(findedBranch).toMatchObject(editedBranch)
            findedBranchs = await resolvers.branchs(null, {}, {user: {role: 'оператор', add: true}})
            expect(findedBranchs).toHaveLength(0)
            findedBranchs = await resolvers.branchsCount(null, {}, {user: {role: 'оператор', add: true}})
            expect(findedBranchs).toEqual(0)
            findedBranchs = await resolvers.branchs(null, {search: editedBranch.name}, {user: {role: 'оператор', add: true}})
            expect(findedBranch).toMatchObject(findedBranchs[0])
            findedBranchs = await resolvers.branchsCount(null, {search: editedBranch.name}, {user: {role: 'оператор', add: true}})
            expect(findedBranchs).toEqual(1)

            let workShift = new WorkShift({legalObject: objects['налогоплательщик']._id, branch: editedBranch._id});
            await WorkShift.create(workShift)
            res = await resolversMutation.setBranch(null, editedBranch, {user: {role: 'оператор', add: true}})
            expect(res).toEqual('ERROR')
            await WorkShift.updateOne({_id: workShift._id}, {end: new Date()})

            editedBranch.bType = 'bType 1'
            editedBranch.pType = 'pType 1'
            editedBranch.ugns = 'ugns 1'
            editedBranch.name = 'name 1'
            editedBranch.address = 'address 1'
            editedBranch.geo = [0.2, 0.2]
            res = await resolversMutation.setBranch(null, editedBranch, {user: {role: 'оператор', add: true}})
            expect(res).toEqual('OK')
            findedBranch = await resolvers.branch(null, {_id: editedBranch._id}, {user: {role: 'оператор', add: true}})
            expect(findedBranch).toMatchObject(editedBranch)

            res = await resolversMutation.deleteBranch(null, {_id: editedBranch._id}, {user: {role: 'оператор', add: true}})
            expect(res).toEqual('ERROR')

            res = await resolversMutation.restoreBranch(null, {_id: editedBranch._id}, {user: {role: 'оператор', add: true}})
            expect(res).toEqual('ERROR')

        });
    /*

        it('get branch by role управляющий кассир', async () => {
            findedBranch = await resolvers.branch(null, {search: findedBranch.name}, {user: objects['управляющий']})
            expect(findedBranch).toMatchObject(objects['налогоплательщик'])
            findedBranchs = await resolvers.branch(null, {search: findedBranch.name}, {user: objects['кассир1']})
            expect(findedBranch).toMatchObject(objects['налогоплательщик'])
        });

        it('search branch', async () => {
            findedBranchs = await resolvers.branchs(null, {search: objects['налогоплательщик'].name}, {user: {role: 'admin', add: true}})
            expect(objects['налогоплательщик']).toMatchObject(findedBranchs[0])
            findedBranchs = await resolvers.branchsCount(null, {search: objects['налогоплательщик'].name}, {user: {role: 'admin', add: true}})
            expect(findedBranchs).toEqual(1)
            findedBranchs = await resolvers.branchs(null, {search: objects['налогоплательщик'].inn}, {user: {role: 'admin', add: true}})
            expect(objects['налогоплательщик']).toMatchObject(findedBranchs[0])
            findedBranchs = await resolvers.branchsCount(null, {search: objects['налогоплательщик'].inn}, {user: {role: 'admin', add: true}})
            expect(findedBranchs).toEqual(1)
            findedBranchs = await resolvers.branchs(null, {search: 'undefined'}, {user: {role: 'admin', add: true}})
            expect(findedBranchs).toHaveLength(0)
            findedBranchs = await resolvers.branchsCount(null, {search: 'undefined'}, {user: {role: 'admin', add: true}})
            expect(findedBranchs).toEqual(0)
        });
    */
});