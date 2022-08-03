const Consultation = require('../models/consultation');

const type = `
  type Consultation {
      _id: ID
      createdAt: Date
      manager: User
      store: Store
      end: Date
  }
`;

const query = `
    consultations(skip: Int, manager: ID, store: ID, date: Date, active: Boolean): [Consultation]
    consultationsCount(manager: ID, date: Date, store: ID): Int
`;

const mutation = `
    startConsultation: Consultation
    endConsultation(_id: ID): String
`;

const resolvers = {
    consultations: async(parent, {skip, manager, date, store, active}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)) {
            if(user.store) store = user.store
            if(user.role==='менеджер') manager = user._id
            let dateStart, dateEnd
            if (!active&&date) {
                dateStart = new Date(date)
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            return await Consultation.find({
                del: {$ne: true},
                ...manager?{manager}:{},
                ...store?{store}:{},
                ...active?{end: null}:date?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{},
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort('-createdAt')
                .populate({
                    path: 'manager',
                    select: 'name _id'
                })
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .lean()
        }
    },
    consultationsCount: async(parent, {manager, date, store, active}, {user}) => {
        if(['admin'].includes(user.role)) {
            if(user.store) store = user.store
            if(user.role==='менеджер') manager = user._id
            let dateStart, dateEnd
            if (!active&&date) {
                dateStart = new Date(date)
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            return await Consultation.countDocuments({
                del: {$ne: true},
                ...store?{store}:{},
                ...manager?{manager}:{},
                ...active?{end: null}:date?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{},
            })
                .lean()
        }
    },
};

const resolversMutation = {
    startConsultation: async(parent, ctx, {user}) => {
        if(['менеджер'].includes(user.role)&&!(await Consultation.countDocuments({manager: user._id, end: null}).lean())) {
            let object = new Consultation({
                manager: user._id,
                store: user.store,
                end: null
            });
            object = await Consultation.create(object)
            return object
        }
        return {_id: 'ERROR'}
    },
    endConsultation: async(parent, {_id}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)) {
            let object = await Consultation.findOne({
                ...user.role==='менеджер'?{manager: user._id}:{_id},
                end: null
            })
            if(object) {
                object.end = new Date()
                await object.save()
                return 'OK'
            }
        }
        return 'ERROR'
    },
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;