const Error = require('../models/error');
const { clearDB } = require('../module/const');

const type = `
  type Error {
    _id: ID
    createdAt: Date
    err: String
    path: String
  }
`;

const query = `
    errors(skip: Int): [Error]
    errorsCount: Int
`;

const mutation = `
    clearAllErrors: String
    clearDB(password: String): String
`;

const resolvers = {
    errors: async(parent,  {skip}, {user}) => {
        if(['admin'].includes(user.role)) {
            return await Error.find({})
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort('-createdAt')
                .lean()
        }
    },
    errorsCount: async(parent,  ctx, {user}) => {
        if(['admin'].includes(user.role)) {
            return await Error.countDocuments()
                .lean()
        }
    },
};

const resolversMutation = {
    clearAllErrors: async(parent, ctx, {user}) => {
        if(user.role==='admin') {
            await Error.deleteMany()
            return 'OK'
        }
        return 'ERROR'
    },
    clearDB: async(parent, {password}, {user}) => {
        console.log(user.role==='admin', password===process.env.passwordClearDB.trim())
        if(user.role==='admin'&&password===process.env.passwordClearDB.trim()) {
            await clearDB()
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