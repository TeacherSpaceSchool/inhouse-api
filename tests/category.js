const Category = require('../models/category');
const { resolvers, resolversMutation } = require('../graphql/category');

module.exports.categoryTest = () => describe('category gql', () => {

    beforeEach(async () => {
        await Category.deleteMany({})
    });

    let findedCategorys, findedCategory, res, editedCategory

    it('get categorys not authenticated', async () => {
        findedCategorys = await resolvers.categorys(null, {}, {user: {}})
        expect(findedCategorys).toBeFalsy()
        findedCategorys = await resolvers.categorysCount(null, {}, {user: {}})
        expect(findedCategorys).toBeFalsy()
    });

    it('edit category not admin', async () => {
        findedCategory = await resolversMutation.addCategory(null, {}, {user: {role: 'lol'}})
        expect(findedCategory).toBeFalsy()
        res = await resolversMutation.setCategory(null, {}, {user: {role: 'lol'}})
        expect(res).toEqual('ERROR')
        res = await resolversMutation.deleteCategory(null, {}, {user: {role: 'lol'}})
        expect(res).toEqual('ERROR')
    });

    it('edit category not add permission', async () => {
        findedCategory = await resolversMutation.addCategory(null, {}, {user: {role: 'admin'}})
        expect(findedCategory).toBeFalsy()
        res = await resolversMutation.setCategory(null, {}, {user: {role: 'admin'}})
        expect(res).toEqual('ERROR')
        res = await resolversMutation.deleteCategory(null, {}, {user: {role: 'admin'}})
        expect(res).toEqual('ERROR')
    });

    it('add category superadmin', async () => {
        editedCategory = {
            type: 'type',
            name: 'name'
        }

        findedCategory = await resolversMutation.addCategory(null, editedCategory, {user: {role: 'superadmin', add: true}})
        editedCategory._id = findedCategory._id
        findedCategory = findedCategory.toJSON()
        expect(findedCategory).toMatchObject(editedCategory)
        findedCategorys = await resolvers.categorys(null, {}, {user: {role: 'superadmin', add: true}})
        expect(findedCategorys).toContainEqual(findedCategory)
        findedCategorys = await resolvers.categorysCount(null, {}, {user: {role: 'superadmin', add: true}})
        expect(findedCategorys).toEqual(1)

        editedCategory.name = 'name 1'
        res = await resolversMutation.setCategory(null, editedCategory, {user: {role: 'superadmin', add: true}})
        expect(res).toEqual('OK')
        findedCategorys = await resolvers.categorys(null, {}, {user: {role: 'superadmin', add: true}})
        expect(findedCategorys[0]).toMatchObject(editedCategory)

        res = await resolversMutation.deleteCategory(null, {_id: editedCategory._id}, {user: {role: 'superadmin', add: true}})
        expect(res).toEqual('OK')
        findedCategorys = await resolvers.categorys(null, {}, {user: {role: 'superadmin', add: true}})
        expect(findedCategorys).toHaveLength(0);
    });

    it('add category admin', async () => {
        editedCategory = {
            type: 'type',
            name: 'name'
        }

        findedCategory = await resolversMutation.addCategory(null, editedCategory, {user: {role: 'admin', add: true}})
        editedCategory._id = findedCategory._id
        findedCategory = findedCategory.toJSON()
        expect(findedCategory).toMatchObject(editedCategory)
        findedCategorys = await resolvers.categorys(null, {}, {user: {role: 'admin', add: true}})
        expect(findedCategorys).toContainEqual(findedCategory)
        findedCategorys = await resolvers.categorysCount(null, {}, {user: {role: 'admin', add: true}})
        expect(findedCategorys).toEqual(1)

        editedCategory.name = 'name 1'
        res = await resolversMutation.setCategory(null, editedCategory, {user: {role: 'admin', add: true}})
        expect(res).toEqual('OK')
        findedCategorys = await resolvers.categorys(null, {}, {user: {role: 'admin', add: true}})
        expect(findedCategorys[0]).toMatchObject(editedCategory)

        res = await resolversMutation.deleteCategory(null, {_id: editedCategory._id}, {user: {role: 'admin', add: true}})
        expect(res).toEqual('OK')
        findedCategorys = await resolvers.categorys(null, {}, {user: {role: 'admin', add: true}})
        expect(findedCategorys).toHaveLength(0);
    });

    it('get category by role управляющий кассир супервайзер', async () => {
        findedCategory = (await resolversMutation.addCategory(null, {
            type: 'type',
            name: 'name'
        }, {user: {role: 'admin', add: true}})).toJSON()

        findedCategorys = await resolvers.categorys(null, {search: findedCategory.name}, {user: {role: 'управляющий', add: true}})
        expect(findedCategorys).toContainEqual(findedCategory)
        findedCategorys = await resolvers.categorys(null, {search: findedCategory.name}, {user: {role: 'кассир', add: true}})
        expect(findedCategorys).toContainEqual(findedCategory)
        findedCategorys = await resolvers.categorys(null, {search: findedCategory.name}, {user: {role: 'супервайзер', add: true}})
        expect(findedCategorys).toContainEqual(findedCategory)
    });

    it('search category', async () => {
        findedCategory = (await resolversMutation.addCategory(null, {
            type: 'type',
            name: 'name'
        }, {user: {role: 'admin', add: true}})).toJSON()
        findedCategorys = await resolvers.categorys(null, {search: findedCategory.name}, {user: {role: 'admin', add: true}})
        expect(findedCategorys[0]).toMatchObject(findedCategory)
        findedCategorys = await resolvers.categorysCount(null, {search: findedCategory.name}, {user: {role: 'admin', add: true}})
        expect(findedCategorys).toEqual(1)
        findedCategorys = await resolvers.categorys(null, {search: 'undefined'}, {user: {role: 'admin', add: true}})
        expect(findedCategorys).toHaveLength(0)
        findedCategorys = await resolvers.categorysCount(null, {search: 'undefined'}, {user: {role: 'admin', add: true}})
        expect(findedCategorys).toEqual(0)
    });

    it('pagination category', async () => {
        let addedPagination = [], getedPagination = []
        for (let i = 0; i < 40; i++) {
            findedCategory = (await resolversMutation.addCategory(null, {
                name: `name ${i}`,
                type: `type ${i}`
            }, {user: {role: 'admin', add: true}})).toJSON()
            addedPagination = [findedCategory, ...addedPagination]
        }

        addedPagination = addedPagination.sort(function(a, b) {
            if (a.name<b.name)
                return -1
            else if (a.name>b.name)
                return 1
            else
                return 0
        });

        for (let i = 0; i < 3; i++) {
            findedCategorys = await resolvers.categorys(null, {skip: i*15}, {user: {role: 'admin', add: true}})
            expect(findedCategorys.length).toBeLessThanOrEqual(15);
            getedPagination = [...getedPagination, ...findedCategorys]
            findedCategorys = await resolvers.categorysCount(null, {}, {user: {role: 'admin', add: true}})
            expect(findedCategorys).toEqual(40)
        }
        expect(addedPagination).toEqual(getedPagination)

        findedCategorys = await resolvers.categorys(null, {}, {user: {role: 'admin', add: true}})
        expect(findedCategorys).toHaveLength(40);
        expect(addedPagination).toEqual(findedCategorys)
    });

    it('get category by type', async () => {
        let type1 = (await resolversMutation.addCategory(null, {
            type: 'type1',
            name: 'name',
        }, {user: {role: 'admin', add: true}})).toJSON()
        let type2 = (await resolversMutation.addCategory(null, {
            type: 'type2',
            name: 'name',
        }, {user: {role: 'admin', add: true}})).toJSON()

        findedCategorys = await resolvers.categorys(null, {}, {user: {role: 'admin', add: true}})
        expect(findedCategorys).toHaveLength(2);

        findedCategorys = await resolvers.categorys(null, {type: 'type1'}, {user: {role: 'admin', add: true}})
        expect(findedCategorys).toHaveLength(1);
        expect(findedCategorys).toContainEqual(type1)
        findedCategorys = await resolvers.categorysCount(null, {type: 'type1'}, {user: {role: 'admin', add: true}})
        expect(findedCategorys).toEqual(1)

        findedCategorys = await resolvers.categorys(null, {type: 'type2'}, {user: {role: 'admin', add: true}})
        expect(findedCategorys).toHaveLength(1);
        expect(findedCategorys).toContainEqual(type2)
        findedCategorys = await resolvers.categorysCount(null, {type: 'type2'}, {user: {role: 'admin', add: true}})
        expect(findedCategorys).toEqual(1)
    });

    it('get category by category', async () => {
        let category1 = (await resolversMutation.addCategory(null, {
            type: 'type1',
            name: 'name',
        }, {user: {role: 'admin', add: true}})).toJSON()
        let category2 = (await resolversMutation.addCategory(null, {
            type: 'type2',
            name: 'name',
            category: category1._id
        }, {user: {role: 'admin', add: true}})).toJSON()

        findedCategorys = await resolvers.categorys(null, {category: category1._id}, {user: {role: 'admin', add: true}})
        expect(findedCategorys).toHaveLength(1);
        expect(findedCategorys).toContainEqual(category2)
        findedCategorys = await resolvers.categorysCount(null, {category: category1._id}, {user: {role: 'admin', add: true}})
        expect(findedCategorys).toEqual(1)
    });
});