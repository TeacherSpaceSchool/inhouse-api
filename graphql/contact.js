const Contact = require('../models/contact');
const History = require('../models/history');

const type = `
  type Contact {
    _id: ID
    name: String
    addresses: [Address]
    email: [String]
    phone: [String]
    info: String
    social: [String]
    whatsapp: [Boolean]
 }
  type Address {
    address: String
    geo: [Float]
  }
  input AddressInput {
    address: String
    geo: [Float]
  }
`;

const query = `
    contact: Contact
`;

const mutation = `
    setContact(name: String!, whatsapp: [Boolean]!, addresses: [AddressInput]!, email: [String]!, info: String!, phone: [String]!, social: [String]!): String
`;

const resolvers = {
    contact: async() => {
        let contact = await Contact.findOne().lean()
        return !contact ? {
            name: '',
            addresses: [],
            whatsapp: [],
            email: [],
            phone: [],
            info: '',
            social: ['', '', '', '']
        } : contact
    }
};

const resolversMutation = {
    setContact: async(parent, {name, addresses, whatsapp, email, phone, social, info}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let object = await Contact.findOne()
            if(!object){
                object = new Contact({
                    name,
                    info,
                    phone,
                    whatsapp,
                    email,
                    addresses,
                    social
                });
                object = await Contact.create(object)
                let history = new History({
                    who: user._id,
                    where: object._id,
                    what: 'Создание'
                });
                await History.create(history)
            }
            else {
                object.whatsapp = whatsapp
                object.name = name
                object.info = info
                object.phone = phone
                object.email = email
                object.addresses = addresses
                object.social = social
                await object.save();
                let history = new History({
                    who: user._id,
                    where: object._id,
                    what: 'Изменение'
                });
                await History.create(history)
            }
            return 'OK'
        }
        return 'ERROR'
    },
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;