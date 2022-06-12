const ItemBarCode = require('../models/itemBarCode');
const { resolvers, resolversMutation } = require('../graphql/itemBarCode');

module.exports.itemBarCodeTest = () => describe('itemBarCode gql', () => {

    beforeEach(async () => {
        await ItemBarCode.deleteMany({})
    });

    let findedItemBarCodes, findedItemBarCode, res, editedItemBarCode

    it('get itemBarCodes not authenticated', async () => {
        findedItemBarCodes = await resolvers.itemBarCodes(null, {}, {user: {}})
        expect(findedItemBarCodes).toBeFalsy()
        findedItemBarCodes = await resolvers.itemBarCodesCount(null, {}, {user: {}})
        expect(findedItemBarCodes).toBeFalsy()
        findedItemBarCode = await resolvers.itemBarCode(null, {}, {user: {}})
        expect(findedItemBarCodes).toBeFalsy()
    });

    it('edit itemBarCode not admin', async () => {
        findedItemBarCode = await resolversMutation.addItemBarCode(null, {}, {user: {role: 'lol'}})
        expect(findedItemBarCode).toBeFalsy()
        res = await resolversMutation.setItemBarCode(null, {}, {user: {role: 'lol'}})
        expect(res).toEqual('ERROR')
        res = await resolversMutation.deleteItemBarCode(null, {}, {user: {role: 'lol'}})
        expect(res).toEqual('ERROR')
    });

    it('edit itemBarCode not add permission', async () => {
        findedItemBarCode = await resolversMutation.addItemBarCode(null, {}, {user: {role: 'admin'}})
        expect(findedItemBarCode).toBeDefined()
        res = await resolversMutation.setItemBarCode(null, {}, {user: {role: 'admin'}})
        expect(res).toEqual('ERROR')
        res = await resolversMutation.deleteItemBarCode(null, {}, {user: {role: 'admin'}})
        expect(res).toEqual('OK')
    });

    it('add itemBarCode superadmin', async () => {
        editedItemBarCode = {
            barCode: 'barCode',
            name: 'name'
        }

        findedItemBarCode = await resolversMutation.addItemBarCode(null, editedItemBarCode, {user: {role: 'superadmin', add: true}})
        editedItemBarCode._id = findedItemBarCode._id
        findedItemBarCode = findedItemBarCode.toJSON()
        expect(findedItemBarCode).toMatchObject(editedItemBarCode)
        findedItemBarCodes = await resolvers.itemBarCodes(null, {}, {user: {role: 'superadmin', add: true}})
        expect(findedItemBarCodes).toContainEqual(findedItemBarCode)
        findedItemBarCodes = await resolvers.itemBarCodesCount(null, {}, {user: {role: 'superadmin', add: true}})
        expect(findedItemBarCodes).toEqual(1)
        findedItemBarCode = await resolvers.itemBarCode(null, {barCode: findedItemBarCode.barCode}, {user: {role: 'superadmin', add: true}})
        expect(findedItemBarCode).toMatchObject(editedItemBarCode)

        findedItemBarCode = await resolversMutation.addItemBarCode(null, editedItemBarCode, {user: {role: 'superadmin', add: true}})
        expect(findedItemBarCode).toBeFalsy()

        editedItemBarCode.name = 'name 1'
        editedItemBarCode.check = false
        res = await resolversMutation.setItemBarCode(null, editedItemBarCode, {user: {role: 'superadmin', add: true}})
        expect(res).toEqual('OK')
        findedItemBarCode = await resolvers.itemBarCode(null, {barCode: editedItemBarCode.barCode}, {user: {role: 'superadmin', add: true}})
        expect(findedItemBarCode).toMatchObject(editedItemBarCode)
        editedItemBarCode.check = true
        res = await resolversMutation.setItemBarCode(null, editedItemBarCode, {user: {role: 'superadmin', add: true}})
        expect(res).toEqual('OK')
        findedItemBarCode = await resolvers.itemBarCode(null, {barCode: editedItemBarCode.barCode}, {user: {role: 'superadmin', add: true}})
        expect(findedItemBarCode).toMatchObject(editedItemBarCode)

        res = await resolversMutation.deleteItemBarCode(null, {_id: editedItemBarCode._id}, {user: {role: 'superadmin', add: true}})
        expect(res).toEqual('OK')
        findedItemBarCodes = await resolvers.itemBarCodes(null, {}, {user: {role: 'superadmin', add: true}})
        expect(findedItemBarCodes).toHaveLength(0);
    });

    it('add itemBarCode admin', async () => {
        editedItemBarCode = {
            barCode: 'barCode',
            name: 'name'
        }

        findedItemBarCode = await resolversMutation.addItemBarCode(null, editedItemBarCode, {user: {role: 'admin', add: true}})
        editedItemBarCode._id = findedItemBarCode._id
        findedItemBarCode = findedItemBarCode.toJSON()
        expect(findedItemBarCode).toMatchObject(editedItemBarCode)
        findedItemBarCodes = await resolvers.itemBarCodes(null, {}, {user: {role: 'admin', add: true}})
        expect(findedItemBarCodes).toContainEqual(findedItemBarCode)
        findedItemBarCodes = await resolvers.itemBarCodesCount(null, {}, {user: {role: 'admin', add: true}})
        expect(findedItemBarCodes).toEqual(1)
        findedItemBarCode = await resolvers.itemBarCode(null, {barCode: findedItemBarCode.barCode}, {user: {role: 'admin', add: true}})
        expect(findedItemBarCode).toMatchObject(editedItemBarCode)

        findedItemBarCode = await resolversMutation.addItemBarCode(null, editedItemBarCode, {user: {role: 'admin', add: true}})
        expect(findedItemBarCode).toBeFalsy()

        editedItemBarCode.name = 'name 1'
        editedItemBarCode.check = false
        res = await resolversMutation.setItemBarCode(null, editedItemBarCode, {user: {role: 'admin', add: true}})
        expect(res).toEqual('OK')
        findedItemBarCode = await resolvers.itemBarCode(null, {barCode: editedItemBarCode.barCode}, {user: {role: 'admin', add: true}})
        expect(findedItemBarCode).toMatchObject(editedItemBarCode)
        editedItemBarCode.check = true
        res = await resolversMutation.setItemBarCode(null, editedItemBarCode, {user: {role: 'admin', add: true}})
        expect(res).toEqual('OK')
        findedItemBarCode = await resolvers.itemBarCode(null, {barCode: editedItemBarCode.barCode}, {user: {role: 'admin', add: true}})
        expect(findedItemBarCode).toMatchObject(editedItemBarCode)

        res = await resolversMutation.deleteItemBarCode(null, {_id: editedItemBarCode._id}, {user: {role: 'admin', add: true}})
        expect(res).toEqual('OK')
        findedItemBarCodes = await resolvers.itemBarCodes(null, {}, {user: {role: 'admin', add: true}})
        expect(findedItemBarCodes).toHaveLength(0);
    });

    it('get itemBarCode by role управляющий кассир супервайзер', async () => {
        editedItemBarCode = {
            barCode: 'barCode',
            name: 'name'
        }
        findedItemBarCode = (await resolversMutation.addItemBarCode(null, editedItemBarCode, {user: {role: 'admin', add: true}})).toJSON()

        findedItemBarCodes = await resolvers.itemBarCodes(null, {}, {user: {role: 'управляющий', add: true}})
        expect(findedItemBarCodes).toContainEqual(findedItemBarCode)
        findedItemBarCodes = await resolvers.itemBarCodesCount(null, {}, {user: {role: 'управляющий', add: true}})
        expect(findedItemBarCodes).toEqual(1)
        findedItemBarCode = await resolvers.itemBarCode(null, {barCode: editedItemBarCode.barCode}, {user: {role: 'управляющий', add: true}})
        expect(findedItemBarCode).toMatchObject(editedItemBarCode)

        findedItemBarCodes = await resolvers.itemBarCodes(null, {}, {user: {role: 'кассир', add: true}})
        expect(findedItemBarCodes).toContainEqual(findedItemBarCode)
        findedItemBarCodes = await resolvers.itemBarCodesCount(null, {}, {user: {role: 'кассир', add: true}})
        expect(findedItemBarCodes).toEqual(1)
        findedItemBarCode = await resolvers.itemBarCode(null, {barCode: editedItemBarCode.barCode}, {user: {role: 'кассир', add: true}})
        expect(findedItemBarCode).toMatchObject(editedItemBarCode)

        findedItemBarCodes = await resolvers.itemBarCodes(null, {}, {user: {role: 'супервайзер', add: true}})
        expect(findedItemBarCodes).toContainEqual(findedItemBarCode)
        findedItemBarCodes = await resolvers.itemBarCodesCount(null, {}, {user: {role: 'супервайзер', add: true}})
        expect(findedItemBarCodes).toEqual(1)
        findedItemBarCode = await resolvers.itemBarCode(null, {barCode: editedItemBarCode.barCode}, {user: {role: 'супервайзер', add: true}})
        expect(findedItemBarCode).toMatchObject(editedItemBarCode)
    });

    it('search itemBarCode', async () => {
        editedItemBarCode = {
            barCode: 'barCode',
            name: 'name'
        }
        findedItemBarCode = (await resolversMutation.addItemBarCode(null, editedItemBarCode, {user: {role: 'admin', add: true}})).toJSON()

        findedItemBarCodes = await resolvers.itemBarCodes(null, {search: editedItemBarCode.barCode}, {user: {role: 'admin', add: true}})
        expect(findedItemBarCodes[0]).toMatchObject(editedItemBarCode)
        findedItemBarCodes = await resolvers.itemBarCodesCount(null, {search: editedItemBarCode.barCode}, {user: {role: 'admin', add: true}})
        expect(findedItemBarCodes).toEqual(1)
        findedItemBarCodes = await resolvers.itemBarCodes(null, {search: editedItemBarCode.name}, {user: {role: 'admin', add: true}})
        expect(findedItemBarCodes[0]).toMatchObject(editedItemBarCode)
        findedItemBarCodes = await resolvers.itemBarCodesCount(null, {search: editedItemBarCode.name}, {user: {role: 'admin', add: true}})
        expect(findedItemBarCodes).toEqual(1)
        findedItemBarCodes = await resolvers.itemBarCodes(null, {search: 'undefined'}, {user: {role: 'admin', add: true}})
        expect(findedItemBarCodes).toHaveLength(0)
        findedItemBarCodes = await resolvers.itemBarCodesCount(null, {search: 'undefined'}, {user: {role: 'admin', add: true}})
        expect(findedItemBarCodes).toEqual(0)
    });

    it('pagination itemBarCode', async () => {
        let addedPagination = [], getedPagination = []
        for (let i = 0; i < 40; i++) {
            findedItemBarCode = (await resolversMutation.addItemBarCode(null, {
                name: `name ${i}`,
                barCode: `barCode ${i}`
            }, {user: {role: 'admin', add: true}})).toJSON()
            addedPagination = [findedItemBarCode, ...addedPagination]
        }

        for (let i = 0; i < 3; i++) {
            findedItemBarCodes = await resolvers.itemBarCodes(null, {skip: i*15}, {user: {role: 'admin', add: true}})
            expect(findedItemBarCodes.length).toBeLessThanOrEqual(15);
            getedPagination = [...getedPagination, ...findedItemBarCodes]
        }
        expect(addedPagination).toEqual(getedPagination)

        findedItemBarCodes = await resolvers.itemBarCodesCount(null, {}, {user: {role: 'admin', add: true}})
        expect(findedItemBarCodes).toEqual(40)
        findedItemBarCodes = await resolvers.itemBarCodes(null, {}, {user: {role: 'admin', add: true}})
        expect(findedItemBarCodes).toHaveLength(40);
        expect(addedPagination).toEqual(findedItemBarCodes)
    });


    it('get itemBarCode by filter', async () => {
        (await resolversMutation.addItemBarCode(null, {
            barCode: 'barCode 1',
            name: 'name 1'
        }, {user: {role: 'admin', add: true}})).toJSON()
        let filter2 = (await resolversMutation.addItemBarCode(null, {
            barCode: 'barCode 2',
            name: 'name 2'
        }, {user: {role: 'admin', add: true}})).toJSON()

        findedItemBarCodes = await resolvers.itemBarCodes(null, {}, {user: {role: 'admin', add: true}})
        expect(findedItemBarCodes).toHaveLength(2);
        findedItemBarCodes = await resolvers.itemBarCodes(null, {filter: 'обработка'}, {user: {role: 'admin', add: true}})
        expect(findedItemBarCodes).toHaveLength(0);

        res = await resolversMutation.setItemBarCode(null, {_id: filter2._id, check: false}, {user: {role: 'admin', add: true}})
        expect(res).toEqual('OK')

        findedItemBarCodes = await resolvers.itemBarCodes(null, {}, {user: {role: 'admin', add: true}})
        expect(findedItemBarCodes).toHaveLength(2);

        findedItemBarCodes = await resolvers.itemBarCodes(null, {filter: 'обработка'}, {user: {role: 'admin', add: true}})
        expect(findedItemBarCodes).toHaveLength(1);


    });

});