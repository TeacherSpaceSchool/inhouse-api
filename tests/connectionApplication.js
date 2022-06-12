const ApplicationToConnect = require('../models/applicationToConnect');
const { resolvers, resolversMutation } = require('../graphql/connectionApplication');
const { objects } = require('./lib');

module.exports.applicationToConnectTest = () => describe('applicationToConnect gql', () => {

    let findedApplicationToConnects, findedApplicationToConnect, res, editedApplicationToConnect

    beforeEach(async () => {
        await ApplicationToConnect.deleteMany({})
    });

    it('get applicationToConnects not authenticated', async () => {
        findedApplicationToConnects = await resolvers.applicationToConnects(null, {}, {user: {}})
        expect(findedApplicationToConnects).toHaveLength(0)
        findedApplicationToConnects = await resolvers.applicationToConnectsCount(null, {}, {user: {}})
        expect(findedApplicationToConnects).toBeFalsy()
    });

    it('edit applicationToConnect not admin', async () => {
        findedApplicationToConnect = await resolversMutation.addApplicationToConnect(null, {}, {user: {role: 'lol'}})
        expect(findedApplicationToConnect).toBeFalsy()
        res = await resolversMutation.setApplicationToConnect(null, {}, {user: {role: 'lol'}})
        expect(res).toEqual('ERROR')
        res = await resolversMutation.deleteApplicationToConnect(null, {}, {user: {role: 'lol'}})
        expect(res).toEqual('ERROR')
        res = await resolversMutation.acceptApplicationToConnect(null, {}, {user: {role: 'lol'}})
        expect(res).toEqual('ERROR')
    });

    it('edit applicationToConnect not add permission', async () => {
        findedApplicationToConnect = await resolversMutation.addApplicationToConnect(null, {}, {user: {role: 'admin'}})
        expect(findedApplicationToConnect).toBeFalsy()
        res = await resolversMutation.setApplicationToConnect(null, {}, {user: {role: 'admin'}})
        expect(res).toEqual('ERROR')
        res = await resolversMutation.deleteApplicationToConnect(null, {}, {user: {role: 'admin'}})
        expect(res).toEqual('ERROR')
        res = await resolversMutation.acceptApplicationToConnect(null, {}, {user: {role: 'admin'}})
        expect(res).toEqual('ERROR')
    });

    it('add applicationToConnect authenticated', async () => {
        editedApplicationToConnect = {
            name: 'name',
            phone: 'phone',
            address: 'address',
            whereKnow: 'whereKnow'
        }

        findedApplicationToConnect = await resolversMutation.addApplicationToConnect(null, editedApplicationToConnect, {user: {role: 'superadmin', add: true}})
        expect(findedApplicationToConnect).toBeFalsy()

    });

    it('add applicationToConnect not authenticated', async () => {
        editedApplicationToConnect = {
            name: 'name',
            phone: 'phone',
            address: 'address',
            whereKnow: 'whereKnow'
        }

        findedApplicationToConnect = await resolversMutation.addApplicationToConnect(null, editedApplicationToConnect, {user: {}})
        editedApplicationToConnect._id = findedApplicationToConnect._id
        findedApplicationToConnect = findedApplicationToConnect.toJSON()
        expect(findedApplicationToConnect).toMatchObject(editedApplicationToConnect)
        findedApplicationToConnects = await resolvers.applicationToConnectsCount(null, {}, {user: {role: 'admin', add: true}})
        expect(findedApplicationToConnects).toEqual(1)

    });

    it('set applicationToConnect superadmin', async () => {
        editedApplicationToConnect = {
            name: 'name',
            phone: 'phone',
            address: 'address',
            whereKnow: 'whereKnow'
        }

        findedApplicationToConnect = await resolversMutation.addApplicationToConnect(null, editedApplicationToConnect, {user: {}})
        editedApplicationToConnect._id = findedApplicationToConnect._id
        editedApplicationToConnect.comment = 'comment'
        res = await resolversMutation.setApplicationToConnect(null, {_id: editedApplicationToConnect._id, comment: editedApplicationToConnect.comment}, {user: {role: 'superadmin', add: true}})
        expect(res).toEqual('OK')
        findedApplicationToConnects = await resolvers.applicationToConnects(null, {}, {user: {role: 'superadmin', add: true}})
        expect(findedApplicationToConnects[0]).toMatchObject(editedApplicationToConnect)

        res = await resolversMutation.deleteApplicationToConnect(null, {_id: editedApplicationToConnect._id}, {user: {role: 'superadmin', add: true}})
        expect(res).toEqual('OK')
        findedApplicationToConnects = await resolvers.applicationToConnects(null, {}, {user: {role: 'superadmin', add: true}})
        expect(findedApplicationToConnects).toHaveLength(0);

        editedApplicationToConnect = {
            name: 'name',
            phone: 'phone',
            address: 'address',
            whereKnow: 'whereKnow'
        }
        findedApplicationToConnect = await resolversMutation.addApplicationToConnect(null, editedApplicationToConnect, {user: {}})
        editedApplicationToConnect.taken = true
        editedApplicationToConnect._id = findedApplicationToConnect._id
        res = await resolversMutation.acceptApplicationToConnect(null, {_id: editedApplicationToConnect._id}, {user: {role: 'superadmin', add: true}})
        expect(res).toEqual('OK')
        findedApplicationToConnects = await resolvers.applicationToConnects(null, {}, {user: {role: 'superadmin', add: true}})
        expect(findedApplicationToConnects[0]).toMatchObject(editedApplicationToConnect)
    });

    it('set applicationToConnect admin', async () => {
        editedApplicationToConnect = {
            name: 'name',
            phone: 'phone',
            address: 'address',
            whereKnow: 'whereKnow'
        }

        findedApplicationToConnect = await resolversMutation.addApplicationToConnect(null, editedApplicationToConnect, {user: {}})
        editedApplicationToConnect._id = findedApplicationToConnect._id

        editedApplicationToConnect.comment = 'comment'
        res = await resolversMutation.setApplicationToConnect(null, {_id: editedApplicationToConnect._id, comment: editedApplicationToConnect.comment}, {user: {role: 'admin', add: true}})
        expect(res).toEqual('OK')
        findedApplicationToConnects = await resolvers.applicationToConnects(null, {}, {user: {role: 'admin', add: true}})
        expect(findedApplicationToConnects[0]).toMatchObject(editedApplicationToConnect)

        res = await resolversMutation.deleteApplicationToConnect(null, {_id: editedApplicationToConnect._id}, {user: {role: 'admin', add: true}})
        expect(res).toEqual('ERROR')

        editedApplicationToConnect.taken = true
        res = await resolversMutation.acceptApplicationToConnect(null, {_id: editedApplicationToConnect._id}, {user: {role: 'admin', add: true}})
        expect(res).toEqual('OK')
        findedApplicationToConnects = await resolvers.applicationToConnects(null, {}, {user: {role: 'superadmin', add: true}})
        expect(findedApplicationToConnects[0]).toMatchObject(editedApplicationToConnect)

    });

    it('set applicationToConnect оператор', async () => {
        editedApplicationToConnect = {
            name: 'name',
            phone: 'phone',
            address: 'address',
            whereKnow: 'whereKnow'
        }

        findedApplicationToConnect = await resolversMutation.addApplicationToConnect(null, editedApplicationToConnect, {user: {}})
        editedApplicationToConnect._id = findedApplicationToConnect._id

        editedApplicationToConnect.comment = 'comment'
        res = await resolversMutation.setApplicationToConnect(null, {_id: editedApplicationToConnect._id, comment: editedApplicationToConnect.comment}, {user: {role: 'оператор', add: true}})
        expect(res).toEqual('OK')
        findedApplicationToConnects = await resolvers.applicationToConnects(null, {}, {user: {role: 'оператор', add: true}})
        expect(findedApplicationToConnects[0]).toMatchObject(editedApplicationToConnect)

        res = await resolversMutation.deleteApplicationToConnect(null, {_id: editedApplicationToConnect._id}, {user: {role: 'оператор', add: true}})
        expect(res).toEqual('ERROR')

        res = await resolversMutation.acceptApplicationToConnect(null, {_id: editedApplicationToConnect._id}, {user: {role: 'оператор', add: true}})
        expect(res).toEqual('OK')
        findedApplicationToConnects = await resolvers.applicationToConnects(null, {}, {user: {role: 'оператор', add: true}})
        expect(findedApplicationToConnects).toHaveLength(0);
    });

    it('pagination applicationToConnect', async () => {
        let addedPagination = [], getedPagination = []
        for (let i = 0; i < 40; i++) {
            findedApplicationToConnect = (await resolversMutation.addApplicationToConnect(null, {
                name: `name ${i}`,
                phone: `phone ${i}`,
                address: `address ${i}`,
                whereKnow: `whereKnow ${i}`
            }, {user: {}})).toJSON()
            addedPagination = [findedApplicationToConnect, ...addedPagination]
        }

        for (let i = 0; i < 3; i++) {
            findedApplicationToConnects = await resolvers.applicationToConnects(null, {skip: i*15}, {user: {role: 'admin', add: true}})
            expect(findedApplicationToConnects.length).toBeLessThanOrEqual(15);
            getedPagination = [...getedPagination, ...findedApplicationToConnects]
            findedApplicationToConnects = await resolvers.applicationToConnectsCount(null, {}, {user: {role: 'admin', add: true}})
            expect(findedApplicationToConnects).toEqual(40)
        }
        expect(addedPagination).toEqual(getedPagination)

        findedApplicationToConnects = await resolvers.applicationToConnects(null, {}, {user: {role: 'admin', add: true}})
        expect(findedApplicationToConnects).toHaveLength(40);
        expect(addedPagination).toEqual(findedApplicationToConnects)
    });

    it('get applicationToConnect by filter', async () => {
        await resolversMutation.addApplicationToConnect(null, {
            name: 'name 1',
            phone: 'phone 1',
            address: 'address 1',
            whereKnow: 'whereKnow 1'
        }, {user: {}})
        let filter2 = (await resolversMutation.addApplicationToConnect(null, {
            name: 'name 2',
            phone: 'phone 2',
            address: 'address 2',
            whereKnow: 'whereKnow 2'
        }, {user: {}})).toJSON()

        findedApplicationToConnects = await resolvers.applicationToConnects(null, {}, {user: {role: 'admin', add: true}})
        expect(findedApplicationToConnects).toHaveLength(2);
        findedApplicationToConnects = await resolvers.applicationToConnects(null, {filter: 'обработка'}, {user: {role: 'admin', add: true}})
        expect(findedApplicationToConnects).toHaveLength(2);

        res = await resolversMutation.acceptApplicationToConnect(null, {_id: filter2._id}, {user: objects['superadmin']})
        expect(res).toEqual('OK')

        findedApplicationToConnects = await resolvers.applicationToConnects(null, {}, {user: {role: 'admin', add: true}})
        expect(findedApplicationToConnects).toHaveLength(2);

        expect(objects['superadmin']).toMatchObject(findedApplicationToConnects[0].who)

        findedApplicationToConnects = await resolvers.applicationToConnects(null, {filter: 'обработка'}, {user: {role: 'admin', add: true}})
        expect(findedApplicationToConnects).toHaveLength(1);


    });

});