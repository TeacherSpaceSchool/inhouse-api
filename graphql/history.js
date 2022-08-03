const History = require('../models/history');

const type = `
  type History {
    _id: ID
    who: User
    where: String
    what: String
    createdAt: Date
  }
`;

const query = `
    history(where: String!): [History]
`;

const resolvers = {
    history: async(parent, {where}, {user}) => {
        if(['admin'].includes(user.role)) {
            return await History.find({
                where
            })
                .sort('-createdAt')
                .populate({
                    path: 'who',
                    select: 'name _id role'
                })
                .lean()
        }
    }
};

module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;