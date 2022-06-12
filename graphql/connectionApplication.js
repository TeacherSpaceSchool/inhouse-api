const ApplicationToConnect = require('../models/applicationToConnect');

const type = `
  type ApplicationToConnect {
    _id: ID
    createdAt: Date
    name: String
    phone: String
    address: String
    whereKnow: String
    taken: Boolean
    comment: String
     who: User
 }
`;

const query = `
    applicationToConnects(skip: Int, filter: String): [ApplicationToConnect]
    applicationToConnectsCount(filter: String): Int
`;

const mutation = `
    addApplicationToConnect(name: String!, phone: String!, address: String!, whereKnow: String!): ApplicationToConnect
    setApplicationToConnect(_id: ID!, comment: String!): String
    acceptApplicationToConnect(_id: ID!): String
    deleteApplicationToConnect(_id: ID!): String
`;

const resolvers = {
    applicationToConnects: async(parent, {skip, filter}, {user}) => {
        if(['admin', 'superadmin', 'оператор'].includes(user.role)) {
            return await ApplicationToConnect.find({
                ...filter==='обработка'||'оператор'===user.role ? {taken: false} : {}
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .sort('-createdAt')
                .populate({
                    path: 'who',
                    select: 'name _id role'
                })
                .lean()
        }
        else return []
    },
    applicationToConnectsCount: async(parent, {filter}, {user}) => {
        if(['admin', 'superadmin', 'оператор'].includes(user.role)) {
            return await ApplicationToConnect.countDocuments({
                ...filter==='обработка'||'оператор'===user.role ? {taken: false} : {}
            })
                .lean()
        }
    }
};

const resolversMutation = {
    addApplicationToConnect: async(parent, {name, phone, address, whereKnow}, {user}) => {
        if(!user.role){
            let _object = new ApplicationToConnect({
                name,
                phone,
                address,
                whereKnow,
                taken: false
            });
            _object = await ApplicationToConnect.create(_object)
            return _object
        }
        return null
    },
    setApplicationToConnect: async(parent, {_id, comment}, {user}) => {
        if(['admin', 'superadmin', 'оператор'].includes(user.role)&&user.add) {
            let object = await ApplicationToConnect.findOne({
                _id,
                taken: {$ne: true}
            })
            object.comment = comment
            await object.save();
            return 'OK'
        }
        return 'ERROR'
    },
    acceptApplicationToConnect: async(parent, {_id}, {user}) => {
        if(['admin', 'superadmin', 'оператор'].includes(user.role)&&user.add) {
            let object = await ApplicationToConnect.findOne({
                _id,
                taken: {$ne: true}
            })
            object.taken = true
            object.who = user._id
            await object.save();
            return 'OK'
        }
        return 'ERROR'
    },
    deleteApplicationToConnect: async(parent, { _id }, {user}) => {
        if(user.role==='superadmin') {
            await ApplicationToConnect.deleteOne({_id, taken: false})
            return 'OK'
        }
        return 'ERROR'
    }
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;