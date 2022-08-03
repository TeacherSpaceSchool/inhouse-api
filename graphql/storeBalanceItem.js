const StoreBalanceItem = require('../models/storeBalanceItem');

const type = `
  type StoreBalanceItem {
    _id: ID
    createdAt: Date
    item: Item
    store: Store
    amount: Float
    reservation: Float
    sale: Float
    free: Float
  }
`;

const query = `
    storeBalanceItems(item: ID, skip: Int, sort: String, store: ID): [StoreBalanceItem]
    storeBalanceItemsCount(item: ID, store: ID): Int
`;

const resolvers = {
    storeBalanceItems: async(parent, {item, skip, sort, store}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)) {
            if(user.store) store = user.store
            return await StoreBalanceItem.find({
                ...item?{item: item}:{},
                ...store?{store}:{},
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort(sort? sort : 'amount')
                .populate({
                    path: 'item',
                    select: 'name _id unit'
                })
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .lean()
        }
    },
    storeBalanceItemsCount: async(parent, {item, store}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)) {
            if(user.store) store = user.store
            return await StoreBalanceItem.countDocuments({
                ...item?{item}:{},
                ...store?{store}:{},
            })
                .lean()
        }
        return 0
    },
};

module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;