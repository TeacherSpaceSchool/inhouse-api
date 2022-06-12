const Error = require('../models/error');
const { resolvers, resolversMutation } = require('../graphql/error');
const { objects } = require('./lib');

module.exports.errorTest = () => describe('error gql', () => {

    beforeEach(async () => {
        await Error.deleteMany({})
    });

    let findedErrors, res, editedError

    it('get errors not authenticated', async () => {
        findedErrors = await resolvers.errors(null, {}, {user: {}})
        expect(findedErrors).toBeFalsy()
        findedErrors = await resolvers.errorsCount(null, {}, {user: {}})
        expect(findedErrors).toBeFalsy()
    });

    it('edit category not superadmin', async () => {
        res = await resolversMutation.clearAllErrors(null, {}, {user: {}})
        expect(res).toEqual('ERROR')
    });

    it('get error superadmin', async () => {
        editedError = {
            err: 'err',
            path: 'path'
        }
        editedError = new Error(editedError);
        editedError = (await Error.create(editedError)).toJSON()
        findedErrors = await resolvers.errors(null, {}, {user: {role: 'superadmin', add: true}})
        expect(findedErrors).toContainEqual(editedError)
        findedErrors = await resolvers.errorsCount(null, {}, {user: {role: 'superadmin', add: true}})
        expect(findedErrors).toEqual(1)

        res = await resolversMutation.clearAllErrors(null, {}, {user: {role: 'superadmin', add: true}})
        expect(res).toEqual('OK')
        findedErrors = await resolvers.errors(null, {}, {user: {role: 'superadmin', add: true}})
        expect(findedErrors).toHaveLength(0);
        findedErrors = await resolvers.errorsCount(null, {}, {user: {role: 'superadmin', add: true}})
        expect(findedErrors).toEqual(0)
    });

    it('get error admin', async () => {
        editedError = {
            err: 'err',
            path: 'path'
        }
        editedError = new Error(editedError);
        editedError = (await Error.create(editedError)).toJSON()
        findedErrors = await resolvers.errors(null, {}, {user: {role: 'admin', add: true}})
        expect(findedErrors).toContainEqual(editedError)
        findedErrors = await resolvers.errorsCount(null, {}, {user: {role: 'admin', add: true}})
        expect(findedErrors).toEqual(1)

        res = await resolversMutation.clearAllErrors(null, {}, {user: {role: 'admin', add: true}})
        expect(res).toEqual('ERROR')
        findedErrors = await resolvers.errors(null, {}, {user: {role: 'admin', add: true}})
        expect(findedErrors).toHaveLength(1);
        findedErrors = await resolvers.errorsCount(null, {}, {user: {role: 'admin', add: true}})
        expect(findedErrors).toEqual(1)
    });
});