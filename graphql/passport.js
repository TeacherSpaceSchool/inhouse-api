const { signinuserGQL } = require('../module/passport');
const Cashbox = require('../models/cashbox');

const type = `
  type Status {
    _id: ID
    role: String
    status: String
    login: String
    error: String
    store: ID
    cashbox: Cashbox
    add: Boolean
    edit: Boolean
    deleted: Boolean
  }
`;

const query = `
    getStatus: Status
`;

const mutation = `
    signinuser(login: String!, password: String!): Status
`;

const resolvers = {
    getStatus: async(parent, args, {user}) => {
        return {
            role: user.role,
            status: user.status,
            login: user.login,
            _id: user._id,
            store: user.store,
            cashbox: await Cashbox.findOne({_id: user.cashbox}).select('_id name').lean(),
            add: user.add,
            edit: user.edit,
            deleted: user.deleted
        }
    }
};

const resolversMutation = {
    signinuser: async(parent, { login, password}, {req, res}) => {
        return await signinuserGQL({ ...req, query: {login: login, password: password}}, res);
    }
};

module.exports.resolvers = resolvers;
module.exports.query = query;
module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;