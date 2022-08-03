const BalanceItem = require('../models/balanceItem');
const StoreBalanceItem = require('../models/storeBalanceItem');
const Item = require('../models/item');
const Warehouse = require('../models/warehouse');
const History = require('../models/history');
const {checkFloat} = require('../module/const');

const type = `
  type BalanceItem {
    _id: ID
    createdAt: Date
    item: Item
    warehouse: Warehouse
    amount: Float
    store: Store
  }
`;

const query = `
    itemsForBalanceItem(search: String, warehouse: ID!): [Item]
    balanceItems(item: ID, skip: Int, sort: String, warehouse: ID, store: ID): [BalanceItem]
    balanceItemsCount(item: ID, warehouse: ID, store: ID): Int
`;

const mutation = `
    addBalanceItem(item: ID!, warehouse: ID!, amount: Float!): BalanceItem
    setBalanceItem(item: ID!, warehouse: ID!, amount: Float!, type: String): String
`;

const resolvers = {
    itemsForBalanceItem: async(parent, {search, warehouse}, {user}) => {
        if(['admin'].includes(user.role)) {
            let usedItems = await BalanceItem.find({warehouse}).distinct('item').lean()
            let res = await Item.find({
                del: {$ne: true},
                _id: {$nin: usedItems},
                ...search?{$or: [{name: {'$regex': search, '$options': 'i'}}, {ID: {'$regex': search, '$options': 'i'}}]}:{},
            })
                .select('_id name')
                .sort('name')
                .lean()
            return res
        }
    },
    balanceItems: async(parent, {item, skip, sort, warehouse, store}, {user}) => {
        if(['admin'].includes(user.role)) {
            if(user.store) store = user.store
            let searchWarehouse = []
            if(store)
                searchWarehouse = await Warehouse.find({store}).distinct('_id').lean()
            let res =  await BalanceItem.find({
                ...item?{item}:{},
                ...warehouse||store?{
                    $and: [
                        ...warehouse?[{warehouse}]:[],
                        ...store?[{warehouse: {$in: searchWarehouse}}]:[],
                    ]
                }:{},
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort(sort? sort : 'amount')
                .populate({
                    path: 'item',
                    select: 'name _id unit'
                })
                .populate({
                    path: 'warehouse',
                    select: 'name _id'
                })
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .lean()
            return res
        }
    },
    balanceItemsCount: async(parent, {item, warehouse, store}, {user}) => {
        if(['admin'].includes(user.role)) {
            if(user.store) store = user.store
            let searchWarehouse = []
            if(store)
                searchWarehouse = await Warehouse.find({store}).distinct('_id').lean()
            return await BalanceItem.countDocuments({
                ...item?{item}:{},
                ...warehouse||store?{
                    $and: [
                        ...warehouse?[{warehouse}]:[],
                        ...store?[{warehouse: {$in: searchWarehouse}}]:[],
                    ]
                }:{},
            })
                .lean()
        }
        return 0
    },
};

const resolversMutation = {
    addBalanceItem: async (parent, {item, warehouse, amount}, {user}) => {
        if (['admin'].includes(user.role)&&!(await BalanceItem.countDocuments({warehouse, item}).lean())) {
            let store = (await Warehouse.findById(warehouse).lean()).store
            let object = new BalanceItem({
                warehouse,
                item,
                amount,
                store
            });
            object = await BalanceItem.create(object)
            let storeBalanceItem = await StoreBalanceItem.findOne({store, item})
            if(!storeBalanceItem) {
                storeBalanceItem = new StoreBalanceItem({
                    store,
                    item,
                    amount,
                    reservation: 0,
                    sale: 0,
                    free: amount
                });
                await StoreBalanceItem.create(storeBalanceItem)
            }
            else {
                storeBalanceItem.amount += amount
                storeBalanceItem.free += amount
                await storeBalanceItem.save()
            }
            let history = new History({
                who: user._id,
                where: object._id,
                what: 'Создание'
            });
            await History.create(history)
            return await BalanceItem.findById(object._id)
                .populate({
                    path: 'item',
                    select: 'name _id'
                })
                .populate({
                    path: 'warehouse',
                    select: 'name _id'
                })
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .lean()
        }
        return {_id: 'ERROR'}
    },
    setBalanceItem: async (parent, {item, warehouse, amount, type}, {user}) => {
        if (['admin'].includes(user.role)) {
            let object = await BalanceItem.findOne({item, warehouse});
            let store = (await Warehouse.findOne({_id: warehouse}).select('store').lean()).store
            let storeBalanceItem = await StoreBalanceItem.findOne({store, item})
            let check = true
            if(!storeBalanceItem) {
                if(type!=='-') {
                    storeBalanceItem = new StoreBalanceItem({
                        store,
                        item,
                        amount,
                        reservation: 0,
                        sale: 0,
                        free: amount
                    });
                    await StoreBalanceItem.create(storeBalanceItem)
                }
                else
                    return 'ERROR'
            }
            else {
                if(type==='+') {
                    storeBalanceItem.amount = checkFloat(storeBalanceItem.amount + amount)
                    storeBalanceItem.free = checkFloat(storeBalanceItem.free + amount)
                }
                else if(type==='-') {
                    if(object&&storeBalanceItem.free>=amount) {
                        storeBalanceItem.amount = checkFloat(storeBalanceItem.amount - amount)
                        if (storeBalanceItem.amount < 0)
                            storeBalanceItem.amount = 0
                        storeBalanceItem.free = checkFloat(storeBalanceItem.free - amount)
                        if (storeBalanceItem.free < 0)
                            storeBalanceItem.free = 0
                    }
                    else
                        check = false
                }
                else {
                    storeBalanceItem.amount = checkFloat(storeBalanceItem.amount - object.amount + amount)
                    if (storeBalanceItem.amount < 0)
                        storeBalanceItem.amount = 0
                    if(storeBalanceItem.amount<(storeBalanceItem.reservation+storeBalanceItem.sale))
                        check = false
                    else
                        storeBalanceItem.free = checkFloat(storeBalanceItem.amount - (storeBalanceItem.reservation+storeBalanceItem.sale))
                }
                if(check)
                    await storeBalanceItem.save()
                else
                    return 'ERROR'
            }

            if(!object){
                if(type!=='-') {
                    object = new BalanceItem({
                        warehouse,
                        item,
                        amount,
                        store
                    });
                    object = await BalanceItem.create(object)
                    let history = new History({
                        who: user._id,
                        where: object._id,
                        what: 'Создание'
                    });
                    await History.create(history)
                }
            }
            else {
                let history = new History({
                    who: user._id,
                    where: object._id,
                    what: `Остаток:${object.amount}→`
                });
                if(type==='+')
                    object.amount = checkFloat(object.amount + amount)
                else if(type==='-') {
                    object.amount = checkFloat(object.amount - amount)
                    if(object.amount<0)
                        object.amount = 0
                }
                else
                    object.amount = amount
                history.what += `${object.amount};`
                await object.save();
                await History.create(history)
            }
            return 'OK'
        }
        return 'ERROR'
    },
}

module.exports.mutation = mutation;
module.exports.resolversMutation = resolversMutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;