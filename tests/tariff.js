const Tariff = require('../models/tariff');
const { resolvers, resolversMutation } = require('../graphql/tariff');
const { objects } = require('./lib');

module.exports.tariffTest = () => describe('tariff gql', () => {

    beforeEach(async () => {
        await Tariff.deleteMany({})
    });

    let findedTariffs, findedTariff, res, editedTariff

    it('edit tariff not admin', async () => {
        findedTariff = await resolversMutation.addTariff(null, {}, {user: {role: 'lol'}})
        expect(findedTariff).toBeFalsy()
    });

    it('edit tariff not add permission', async () => {
        findedTariff = await resolversMutation.addTariff(null, {}, {user: {role: 'admin'}})
        expect(findedTariff).toBeFalsy()
    });

    it('add tariff superadmin', async () => {
        editedTariff = {
            pkkm: 1,
            ofd: 1
        }

        findedTariff = await resolversMutation.addTariff(null, editedTariff, {user: {role: 'superadmin', add: true}})
        editedTariff._id = findedTariff._id
        findedTariff = findedTariff.toJSON()
        expect(findedTariff).toMatchObject(editedTariff)
        findedTariffs = await resolvers.tariffs(null, {}, {user: {role: 'superadmin', add: true}})
        expect(findedTariffs).toContainEqual(findedTariff)


        editedTariff.pkkm = 2
        editedTariff.ofd = 2
        findedTariff = await resolversMutation.addTariff(null, editedTariff, {user: {role: 'superadmin', add: true}})
        editedTariff._id = findedTariff._id
        findedTariff = findedTariff.toJSON()
        expect(findedTariff).toMatchObject(editedTariff)
        findedTariffs = await resolvers.tariffs(null, {last: true}, {user: {role: 'superadmin', add: true}})
        expect(findedTariffs).toContainEqual(findedTariff)
    });

    it('add tariff admin', async () => {
        editedTariff = {
            pkkm: 1,
            ofd: 1
        }

        findedTariff = await resolversMutation.addTariff(null, editedTariff, {user: {role: 'admin', add: true}})
        editedTariff._id = findedTariff._id
        findedTariff = findedTariff.toJSON()
        expect(findedTariff).toMatchObject(editedTariff)
        findedTariffs = await resolvers.tariffs(null, {}, {user: {role: 'admin', add: true}})
        expect(findedTariffs).toContainEqual(findedTariff)


        editedTariff.pkkm = 2
        editedTariff.ofd = 2
        findedTariff = await resolversMutation.addTariff(null, editedTariff, {user: {role: 'admin', add: true}})
        editedTariff._id = findedTariff._id
        findedTariff = findedTariff.toJSON()
        expect(findedTariff).toMatchObject(editedTariff)
        findedTariffs = await resolvers.tariffs(null, {last: true}, {user: {role: 'admin', add: true}})
        expect(findedTariffs).toContainEqual(findedTariff)
    });

    it('get tariff other', async () => {
        await resolversMutation.addTariff(null, {
            pkkm: 1,
            ofd: 1
        }, {user: {role: 'admin', add: true}})
        findedTariff = (await resolversMutation.addTariff(null, {
            pkkm: 2,
            ofd: 2
        }, {user: {role: 'admin', add: true}})).toJSON()

        findedTariffs = await resolvers.tariffs(null, {}, {user: {}})
        expect(findedTariffs).toContainEqual(findedTariff)
        expect(findedTariffs).toHaveLength(1);
    });

    it('pagination tariff', async () => {
        let addedPagination = [], getedPagination = []
        for (let i = 0; i < 40; i++) {
            findedTariff = (await resolversMutation.addTariff(null, {
                pkkm: i,
                ofd: i
            }, {user: {role: 'admin', add: true}})).toJSON()
            addedPagination = [findedTariff, ...addedPagination]
        }

        for (let i = 0; i < 3; i++) {
            findedTariffs = await resolvers.tariffs(null, {skip: i*15}, {user: {role: 'admin', add: true}})
            expect(findedTariffs.length).toBeLessThanOrEqual(15);
            getedPagination = [...getedPagination, ...findedTariffs]
        }
        expect(addedPagination).toEqual(getedPagination)

        findedTariffs = await resolvers.tariffs(null, {}, {user: {role: 'admin', add: true}})
        expect(findedTariffs).toHaveLength(40);
        expect(addedPagination).toEqual(findedTariffs)
    });

    it('get tariff check who', async () => {
        findedTariff = (await resolversMutation.addTariff(null, {
            type: 'type1',
            name: 'name',
        }, {user: objects['superadmin']})).toJSON()
        expect(objects['superadmin']).toMatchObject(findedTariff.user)

        findedTariffs = await resolvers.tariffs(null, {}, {user: objects['superadmin']})
        expect(objects['superadmin']).toMatchObject(findedTariffs[0].user)
    });
});