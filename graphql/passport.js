const { signupuserGQL, signinuserGQL } = require('../module/passport');
const User = require('../models/user');

const type = `
  type Status {
    _id: ID
    role: String
    status: String
    login: String
    error: String
    legalObject: ID
    branch: ID
    statistic: Boolean
    add: Boolean
    credit: Boolean
    payment: Boolean
  }
`;

const query = `
       getStatus: Status
`;

const mutation = `
    signupuser(login: String, password: String): Status
    signinuser(login: String!, password: String!): Status
    logoutuser: String
`;

const resolvers = {
    getStatus: async(parent, args, {user}) => {
        return {
            role: user.role,
            status: user.status,
            login: user.login,
            _id: user._id,
            legalObject: user.legalObject,
            branch: user.branch,
            statistic: user.statistic,
            add: user.add,
            credit: user.credit,
            payment: user.payment,
        }
    }
};

const resolversMutation = {
    logoutuser: async(parent, ctx, {user}) => {
        await User.updateOne({_id: user._id}, {enteredDate: null})
        return 'OK';
    },
    signupuser: async(parent, { login, password}, {res}) => {
        return await signupuserGQL({ login: login, password: password }, res);
    },
    signinuser: async(parent, { login, password}, {req, res}) => {
        return await signinuserGQL({ ...req, query: {login: login, password: password}}, res);
    },
};

module.exports.resolvers = resolvers;
module.exports.query = query;
module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;