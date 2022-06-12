const Contact = require('../models/contact');
const { resolvers, resolversMutation } = require('../graphql/contact');
const casual = require('casual');

module.exports.contactTest = () => describe('contact gql', () => {
    let findedContact, res
    let editedContact = {
        name: '',
        addresses: [],
        whatsapp: [],
        email: [],
        phone: [],
        info: '',
        social: ['', '', '', '']
    }
    it('get contact first', async () => {
        findedContact = await resolvers.contact()
        expect(findedContact).toEqual(editedContact)
    });
    it('edit contact not admin', async () => {
        let res = await resolversMutation.setContact(null, editedContact, {user: {role: 'lol'}})
        expect(res).toEqual('ERROR')
    });
    it('edit contact not add permission', async () => {
        let res = await resolversMutation.setContact(null, editedContact, {user: {role: 'admin'}})
        expect(res).toEqual('ERROR')
    });
    it('add contact admin', async () => {
        editedContact.name = casual.title
        editedContact.addresses = [{
            address: casual.address,
            geo: [casual.latitude, casual.longitude]
        }]
        editedContact.whatsapp = [true]
        editedContact.email = [casual.email]
        editedContact.phone = [casual.phone]
        editedContact.social = [casual.string]
        editedContact.info = casual.text
        res = await resolversMutation.setContact(null, editedContact, {user: {role: 'admin', add: true}})
        expect(res).toEqual('OK')
    });
    it('get contact after add admin', async () => {
        findedContact = await resolvers.contact()
        expect(findedContact).toMatchObject(editedContact)
    });
    it('set contact admin', async () => {
        editedContact.name = casual.title
        editedContact.addresses = [{
            address: casual.address,
            geo: [casual.latitude, casual.longitude]
        }]
        editedContact.whatsapp = [true]
        editedContact.email = [casual.email]
        editedContact.phone = [casual.phone]
        editedContact.social = [casual.string]
        editedContact.info = casual.text
        res = await resolversMutation.setContact(null, editedContact, {user: {role: 'admin', add: true}})
        expect(res).toEqual('OK')
    });
    it('get contact after set admin', async () => {
        findedContact = await resolvers.contact()
        expect(findedContact).toMatchObject(editedContact)
    });
    it('add contact superadmin', async () => {
        await Contact.deleteMany({})
        editedContact.name = casual.title
        editedContact.addresses = [{
            address: casual.address,
            geo: [casual.latitude, casual.longitude]
        }]
        editedContact.whatsapp = [true]
        editedContact.email = [casual.email]
        editedContact.phone = [casual.phone]
        editedContact.social = [casual.string]
        editedContact.info = casual.text
        res = await resolversMutation.setContact(null, editedContact, {user: {role: 'superadmin', add: true}})
        expect(res).toEqual('OK')
    });
    it('get contact after add superadmin', async () => {
        findedContact = await resolvers.contact()
        expect(findedContact).toMatchObject(editedContact)
    });
    it('set contact superadmin', async () => {
        editedContact.name = casual.title
        editedContact.addresses = [{
            address: casual.address,
            geo: [casual.latitude, casual.longitude]
        }]
        editedContact.whatsapp = [true]
        editedContact.email = [casual.email]
        editedContact.phone = [casual.phone]
        editedContact.social = [casual.string]
        editedContact.info = casual.text
        res = await resolversMutation.setContact(null, editedContact, {user: {role: 'superadmin', add: true}})
        expect(res).toEqual('OK')
    });
    it('get contact after set superadmin', async () => {
        findedContact = await resolvers.contact()
        expect(findedContact).toMatchObject(editedContact)
    });
});