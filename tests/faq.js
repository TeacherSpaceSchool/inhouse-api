const Faq = require('../models/faq');
const {getTestPdf} = require('./lib');
const { resolvers, resolversMutation } = require('../graphql/faq');

module.exports.faqTest = () => describe('faq gql', () => {

    beforeEach(async () => {
        await Faq.deleteMany({})
    });

    let findedFaqs, findedFaq, res, editedFaq
    it('get faqs not authenticated', async () => {
        findedFaqs = await resolvers.faqs(null, {}, {user: {}})
        expect(findedFaqs).toBeFalsy()
    });
    it('edit faq not admin', async () => {
        findedFaq = await resolversMutation.addFaq(null, {}, {user: {role: 'lol'}})
        expect(findedFaq).toBeFalsy()
        res = await resolversMutation.setFaq(null, {}, {user: {role: 'lol'}})
        expect(res).toEqual('ERROR')
        res = await resolversMutation.deleteFaq(null, {}, {user: {role: 'lol'}})
        expect(res).toEqual('ERROR')
    });
    it('edit faq not add permission', async () => {
        findedFaq = await resolversMutation.addFaq(null, {}, {user: {role: 'admin'}})
        expect(findedFaq).toBeFalsy()
        res = await resolversMutation.setFaq(null, {}, {user: {role: 'admin'}})
        expect(res).toEqual('ERROR')
        res = await resolversMutation.deleteFaq(null, {}, {user: {role: 'admin'}})
        expect(res).toEqual('ERROR')
    });
    it('add faq superadmin', async () => {
        editedFaq = {
            name: 'name',
            video: 'video',
            roles: ['role']
        }

        findedFaq = await resolversMutation.addFaq(null, {...editedFaq, file: getTestPdf()}, {user: {role: 'superadmin', add: true}})
        editedFaq.url = findedFaq.url
        editedFaq._id = findedFaq._id
        findedFaq = findedFaq.toJSON()
        expect(findedFaq).toMatchObject(editedFaq)
        findedFaqs = await resolvers.faqs(null, {}, {user: {role: 'superadmin', add: true}})
        expect(findedFaqs).toContainEqual(findedFaq)

        editedFaq.name = 'name 1'
        editedFaq.video = 'video 1'
        editedFaq.roles = ['role 1']
        res = await resolversMutation.setFaq(null, editedFaq, {user: {role: 'superadmin', add: true}})
        expect(res).toEqual('OK')
        findedFaqs = await resolvers.faqs(null, {}, {user: {role: 'superadmin', add: true}})
        expect(findedFaqs[0]).toMatchObject(editedFaq)

        res = await resolversMutation.deleteFaq(null, {_id: editedFaq._id}, {user: {role: 'superadmin', add: true}})
        expect(res).toEqual('OK')
        findedFaqs = await resolvers.faqs(null, {}, {user: {role: 'superadmin', add: true}})
        expect(findedFaqs).toHaveLength(0);
    });
    it('add faq admin', async () => {
        editedFaq = {
            name: 'name',
            video: 'video',
            roles: ['role']
        }

        findedFaq = await resolversMutation.addFaq(null, {...editedFaq, file: getTestPdf()}, {user: {role: 'admin', add: true}})
        editedFaq.url = findedFaq.url
        editedFaq._id = findedFaq._id
        findedFaq = findedFaq.toJSON()
        expect(findedFaq).toMatchObject(editedFaq)
        findedFaqs = await resolvers.faqs(null, {}, {user: {role: 'admin', add: true}})
        expect(findedFaqs).toContainEqual(findedFaq)

        editedFaq.name = 'name 1'
        editedFaq.video = 'video 1'
        editedFaq.roles = ['role 1']
        res = await resolversMutation.setFaq(null, editedFaq, {user: {role: 'admin', add: true}})
        expect(res).toEqual('OK')
        findedFaqs = await resolvers.faqs(null, {}, {user: {role: 'admin', add: true}})
        expect(findedFaqs[0]).toMatchObject(editedFaq)

        res = await resolversMutation.deleteFaq(null, {_id: editedFaq._id}, {user: {role: 'admin', add: true}})
        expect(res).toEqual('OK')
        findedFaqs = await resolvers.faqs(null, {}, {user: {role: 'admin', add: true}})
        expect(findedFaqs).toHaveLength(0);
    });
    it('search faq', async () => {
        findedFaq = (await resolversMutation.addFaq(null, {
            name: 'name',
            video: 'video',
            roles: ['roles']
        }, {user: {role: 'admin', add: true}})).toJSON()
        findedFaqs = await resolvers.faqs(null, {search: findedFaq.name}, {user: {role: 'admin', add: true}})
        expect(findedFaqs).toContainEqual(findedFaq)
        findedFaqs = await resolvers.faqs(null, {search: 'undefined'}, {user: {role: 'admin', add: true}})
        expect(findedFaqs).toHaveLength(0)
    });
    it('pagination faq', async () => {
        let addedPagination = [], getedPagination = []
        for (let i = 0; i < 40; i++) {
            findedFaq = (await resolversMutation.addFaq(null, {
                name: `name ${i}`,
                video: `video ${i}`,
                roles: [`roles ${i}`]
            }, {user: {role: 'admin', add: true}})).toJSON()
            addedPagination = [findedFaq, ...addedPagination]
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
            findedFaqs = await resolvers.faqs(null, {skip: i*15}, {user: {role: 'admin', add: true}})
            expect(findedFaqs.length).toBeLessThanOrEqual(15);
            getedPagination = [...getedPagination, ...findedFaqs]
        }
        expect(addedPagination).toEqual(getedPagination)

        findedFaqs = await resolvers.faqs(null, {}, {user: {role: 'admin', add: true}})
        expect(findedFaqs).toHaveLength(40);
        expect(addedPagination).toEqual(findedFaqs)
    });
    it('get faq by role', async () => {
        findedFaq = (await resolversMutation.addFaq(null, {
            name: 'name',
            video: 'video',
            roles: ['role 1', 'role 2']
        }, {user: {role: 'admin', add: true}})).toJSON()
        findedFaqs = await resolvers.faqs(null, {}, {user: {role: 'role 2'}})
        expect(findedFaqs).toHaveLength(1);
        expect(findedFaqs).toContainEqual(findedFaq)
    });
});