const Tariff = require('../models/tariff');

const type = `
  type Tariff {
    _id: ID
    createdAt: Date
    user: User
    pkkm: Int
    ofd: Int
  }
`;

const query = `
    tariffs(skip: Int, last: Boolean): [Tariff]
`;

const mutation = `
    addTariff(pkkm: Int!, ofd: Int!): Tariff
`;

const resolvers = {
    tariffs: async(parent, {skip, last}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&!last) {
            let res =  await Tariff.find()
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .sort('-createdAt')
                .populate({
                    path: 'user',
                    select: 'name _id role'
                })
                .lean()
            return res
        }
        else {
            return await Tariff.find()
                .limit(1)
                .sort('-createdAt')
                .lean()
        }
    }
};

const resolversMutation = {
    addTariff: async(parent, {pkkm, ofd}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let _object = new Tariff({
                pkkm,
                ofd,
                user: user._id,
            });
            _object = await Tariff.create(_object)
            await _object.populate({
                path: 'user',
                select: 'name _id role'
            })
            return _object
        }
    }
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;