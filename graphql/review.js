const Review = require('../models/review');

const type = `
  type Review {
    _id: ID
    createdAt: Date
    taken: Boolean
    type: String
    text: String
    legalObject: LegalObject
     who: User
 }
`;

const query = `
    reviews(skip: Int, filter: String): [Review]
    reviewsCount(filter: String): Int
`;

const mutation = `
    addReview(text: String!, type: String): Review
    acceptReview(_id: ID!): String
    deleteReview(_id: ID!): String
`;

const resolvers = {
    reviews: async(parent, {skip, filter}, {user}) => {
        if(['управляющий', 'кассир', 'admin', 'superadmin', 'супервайзер'].includes(user.role)) {
            return await Review.find({
                ...filter === 'обработка' ? {taken: false} : {},
                ...user.legalObject? {legalObject: user.legalObject} : {}
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .sort('-createdAt')
                .populate({
                    path: 'legalObject',
                    select: 'name _id'
                })
                .populate({
                    path: 'who',
                    select: 'name _id role'
                })
                .lean()
        }
    },
    reviewsCount: async(parent, {filter}, {user}) => {
        if(['управляющий', 'кассир', 'admin', 'superadmin', 'супервайзер'].includes(user.role)) {
            return await Review.countDocuments({
                ...filter === 'обработка' ? {taken: false} : {},
                ...user.legalObject? {legalObject: user.legalObject} : {}
            })
                .lean()
        }
    },
};

const resolversMutation = {
    addReview: async(parent, {text, type}, {user}) => {
        if(['управляющий', 'кассир', 'супервайзер'].includes(user.role)) {
            let _object = new Review({
                legalObject: user.legalObject,
                taken: false,
                type,
                text
            });
            _object = await Review.create(_object)
            return _object
        }
    },
    acceptReview: async(parent, {_id}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let object = await Review.findById(_id)
            object.taken = true
            object.who = user._id
            await object.save();
            return 'OK'
        }
        return 'ERROR'
    },
    deleteReview: async(parent, { _id }, {user}) => {
        if(user.role==='superadmin') {
            await Review.deleteOne({_id})
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