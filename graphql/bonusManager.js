const BonusManager = require('../models/bonusManager');
const User = require('../models/user');
const History = require('../models/history');

const type = `
  type BonusManager {
    _id: ID
    createdAt: Date
    manager: User
    bonus: [[Float]]
  }
`;

const query = `
    managerForBonusManagers(search: String): [User]
    bonusManagers(search: String, skip: Int): [BonusManager]
    bonusManagersCount(search: String): Int
`;

const mutation = `
    addBonusManager(manager: ID!, bonus: [[Float]]!): BonusManager
    setBonusManager(_id: ID!, bonus: [[Float]]!): String
    deleteBonusManager(_id: ID!): String
`;

const resolvers = {
    managerForBonusManagers: async(parent, {search}, {user}) => {
        if(['admin'].includes(user.role)) {
            let usedUsers = await BonusManager.find().distinct('manager').lean()
            return await User.find({
                del: {$ne: true},
                _id: {$nin: usedUsers},
                role: 'менеджер',
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
            })
                .select('_id name')
                .sort('name')
                .lean()
        }
    },
    bonusManagers: async(parent, {search, skip}, {user}) => {
        if(['admin'].includes(user.role)) {
            let searchUsers = []
            if(search)
                searchUsers = await User.find({name: {'$regex': search, '$options': 'i'}}).distinct('_id').lean()
            return await BonusManager.find({
                 ...search?{manager: {$in: searchUsers}}:{},
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort('-createdAt')
                .populate({
                    path: 'manager',
                    select: 'name _id'
                })
                .lean()
        }
    },
    bonusManagersCount: async(parent, {search}, {user}) => {
        if(['admin'].includes(user.role)) {
            let searchUsers = []
            if(search)
                searchUsers = await User.find({name: {'$regex': search, '$options': 'i'}}).distinct('_id').lean()
            return await BonusManager.countDocuments({
                ...search?{manager: {$in: searchUsers}}:{},
            })
                .lean()
        }
        return 0
    },
};

const resolversMutation = {
    addBonusManager: async(parent, {manager, bonus}, {user}) => {
        if(['admin'].includes(user.role)&&!(await BonusManager.countDocuments({manager}).lean())) {
            let object = new BonusManager({
                manager,
                bonus
            });
            object = await BonusManager.create(object)
            let history = new History({
                who: user._id,
                where: object._id,
                what: 'Создание'
            });
            await History.create(history)
            return await BonusManager.findById(object._id)
                .populate({
                    path: 'manager',
                    select: 'name _id'
                })
                .lean()
        }
        return {_id: 'ERROR'}
    },
    setBonusManager: async(parent, {_id, bonus}, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await BonusManager.findOne({
                _id,
            })
            if (object) {
                let history = new History({
                    who: user._id,
                    where: object._id,
                    what: `Бонус:${JSON.stringify(object.bonus)}→${JSON.stringify(bonus)};`
                });
                object.bonus = bonus
                await object.save();
                await History.create(history)
                return 'OK'
            }
        }
        return 'ERROR'
    },
    deleteBonusManager: async(parent, { _id }, {user}) => {
        if(['admin'].includes(user.role)) {
            await BonusManager.deleteOne({_id})
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