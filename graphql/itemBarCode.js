const ItemBarCode = require('../models/itemBarCode');

const type = `
  type ItemBarCode {
    _id: ID
    createdAt: Date
    barCode: String
    name: String
    check: Boolean
  }
`;

const query = `
    itemBarCodes(skip: Int, search: String, filter: String): [ItemBarCode]
    itemBarCodesCount(search: String, filter: String): Int
    itemBarCode(barCode: String!): ItemBarCode
`;

const mutation = `
    addItemBarCode(barCode: String!, name: String!): ItemBarCode
    setItemBarCode(_id: ID!, name: String, check: Boolean): String
    deleteItemBarCode(_id: ID!): String
`;

const resolvers = {
    itemBarCodes: async(parent, {skip, search, filter}, {user}) => {
        if(['управляющий', 'кассир', 'admin', 'superadmin', 'супервайзер'].includes(user.role)) {
            return await ItemBarCode.find({
                ...search&&search.length?{$or: [{name: {'$regex': search, '$options': 'i'}}, {barCode: {'$regex': search, '$options': 'i'}}]}:{},
                ...filter==='обработка' ? {check: false} : {}
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .sort('-createdAt')
                .lean()
        }
    },
    itemBarCodesCount: async(parent, {search, filter}, {user}) => {
        if(['управляющий', 'кассир', 'admin', 'superadmin', 'супервайзер'].includes(user.role)) {
            return await ItemBarCode.countDocuments({
                ...search&&search.length?{$or: [{name: {'$regex': search, '$options': 'i'}}, {barCode: {'$regex': search, '$options': 'i'}}]}:{},
                ...filter==='обработка' ? {check: false} : {}
            })
                .lean()
        }
    },
    itemBarCode: async(parent, {barCode}, {user}) => {
        if(['управляющий', 'кассир', 'admin', 'superadmin', 'супервайзер'].includes(user.role)) {
            return await ItemBarCode.findOne({barCode}).lean()
        }
    }
};

const resolversMutation = {
    addItemBarCode: async(parent, {barCode, name}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&!(await ItemBarCode.findOne({barCode}).select('_id').lean())){
            let _object = new ItemBarCode({barCode, name, check: true})
            _object = await ItemBarCode.create(_object)
            return _object
        }
    },
    setItemBarCode: async(parent, {_id, name, check}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let object = await ItemBarCode.findById(_id)
            if(name) object.name = name
            if(check!=undefined) object.check = check
            await object.save();
            return 'OK'
        }
        return 'ERROR'
    },
    deleteItemBarCode: async(parent, { _id }, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)) {
            await ItemBarCode.deleteOne({_id})
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