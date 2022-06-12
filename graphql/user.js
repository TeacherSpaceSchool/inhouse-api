const User = require('../models/user');
const District = require('../models/district');
const randomstring = require('randomstring');
const IntegrationObject = require('../models/integrationObject');
const History = require('../models/history');
const WorkShift = require('../models/workshift');
const jwtsecret = process.env.jwtsecret.trim();
const jwt = require('jsonwebtoken');

const type = `
  type User {
    _id: ID
    createdAt: Date
    updatedAt: Date
    lastActive: Date
    enteredDate: Date
    login: String
    role: String
    status: String
    statistic: Boolean
    name: String
    phone: [String]
    legalObject: LegalObject
    branch: Branch
    del: Boolean
    credit: Boolean
    payment: Boolean
    add: Boolean
    device: String
    IP: String
    email: [String]
    notification: Boolean
 }
`;

const query = `
    checkLogin(login: String!): String
    users(skip: Int, search: String, legalObject: ID, branch: ID, role: String): [User]
    usersCount(search: String, legalObject: ID, branch: ID, role: String): Int
    usersTrash(skip: Int, search: String): [User]
    user(_id: ID!): User
`;

const mutation = `
    addUser(login: String!, statistic: Boolean!, add: Boolean!, credit: Boolean!, payment: Boolean!, email: [String]!, password: String!, role: String!, name: String!, phone: [String]!, legalObject: ID, branch: ID): String
    setUser(_id: ID!, login: String, statistic: Boolean, email: [String], add: Boolean, credit: Boolean, payment: Boolean, password: String, name: String, phone: [String], branch: ID): String
    setDevice(device: String!): String
    onoffUser(_id: ID!): String
    deleteUser(_id: ID!): String
    restoreUser(_id: ID!): String
`;

const resolvers = {
    users: async(parent, {skip, search, legalObject, branch, role}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'супервайзер'].includes(user.role)||search&&search.length>2&&user.role==='оператор') {
            if(user.legalObject) legalObject = user.legalObject
            let districts = []
            if(user.role==='супервайзер'){
                districts = await District.find({
                    supervisors: user._id,
                })
                    .distinct('cashiers')
                    .lean()
            }
            if(legalObject||['admin', 'superadmin'].includes(user.role)) {
                let res = await User.find({
                    ...user.role==='супервайзер'?
                        {role: 'кассир', _id: {$in: districts}}
                        :
                        role&&role.length?
                            {$and: [{role: {$ne: 'superadmin'}}, {role: role}, ...'superadmin'!==user.role?[{role: {$ne: 'admin'}}]:[]]}
                            :
                            {$and: [{role: {$ne: 'superadmin'}}, ...'superadmin'!==user.role?[{role: {$ne: 'admin'}}]:[]]},
                    ...search&&search.length?{name: {'$regex': search, '$options': 'i'}}:{},
                    legalObject,
                    ...branch ? {branch} : {},
                    del: {$ne: true},
                })
                    .skip(skip != undefined ? skip : 0)
                    .limit(skip != undefined ? 15 : 10000000000)
                    .sort('name')
                    .populate({
                        path: 'legalObject',
                        select: 'name _id'
                    })
                    .populate({
                        path: 'branch',
                        select: 'name _id'
                    })
                    .lean()
                return res
            }
        }
        return []
    },
    usersCount: async(parent, {search, legalObject, branch, role}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'супервайзер'].includes(user.role)||search&&search.length>2&&user.role==='оператор') {
            if(user.legalObject) legalObject = user.legalObject
            if(legalObject||['admin', 'superadmin'].includes(user.role)) {
                let districts = []
                if(user.role==='супервайзер'){
                    districts = await District.find({
                        supervisors: user._id,
                    })
                        .distinct('cashiers')
                        .lean()
                }
                return await User.countDocuments({
                    ...user.role==='супервайзер'?
                        {role: 'кассир', _id: {$in: districts}}
                        :
                        role&&role.length?
                            {$and: [{role: {$ne: 'superadmin'}}, {role: role}, ...'superadmin'!==user.role?[{role: {$ne: 'admin'}}]:[]]}
                            :
                            {$and: [{role: {$ne: 'superadmin'}}, ...'superadmin'!==user.role?[{role: {$ne: 'admin'}}]:[]]},
                    ...search&&search.length? {name: {'$regex': search, '$options': 'i'}} : {},
                    legalObject,
                    ...branch?{branch}:{},
                    del: {$ne: true},
                })
                    .lean()
            }
        }
        return 0
    },
    usersTrash: async(parent, {skip, search}, {user}) => {
        if('superadmin'===user.role) {
            return await User.find({
                role: {$ne: 'superadmin'},
                ...search&&search.length?{name: {'$regex': search, '$options': 'i'}}:{},
                del: true
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .sort('name')
                .lean()
        }
    },
    user: async(parent, {_id}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'кассир', 'супервайзер', 'оператор'].includes(user.role)) {
            let districts = []
            if(user.role==='супервайзер'){
                districts = await District.find({
                    supervisors: user._id,
                })
                    .distinct('cashiers')
                    .lean()
            }
            let res = await User.findOne({
                role: {$ne: 'superadmin'},
                ...user.role==='admin'? _id.toString()!==user._id.toString()?{role: {$ne: 'admin'}, _id}:{_id}
                   :
                   user.role==='оператор'? {role: {$ne: 'admin'}, del: {$ne: true}, _id}
                   :
                   user.role==='управляющий'? {role: {$ne: 'admin'}, del: {$ne: true}, _id}
                   :
                   user.role==='кассир'?{_id: user._id, del: {$ne: true}}
                   :
                   user.role==='супервайзер'?_id.toString()!==user._id.toString()?{$and: [{_id: {$in: districts}}, {_id}], del: {$ne: true}}:{_id, del: {$ne: true}}
                   :
                   {_id},
                ...user.legalObject?{legalObject: user.legalObject}:{}
            })
                .populate({
                    path: 'legalObject',
                    select: 'name _id'
                })
                .populate({
                    path: 'branch',
                    select: 'name _id'
                })
                .lean()
            return res
        }
    },
    checkLogin: async(parent, {login}, {user}) => {
        if(['admin', 'оператор', 'superadmin'].includes(user.role)&&user.add) {
            if(!(await User.findOne({login}).select('_id').lean()))
                return 'OK'
        }
        return 'ERROR'
    },
};

const resolversMutation = {
    addUser: async(parent, {login, password, role, name, credit, payment, phone, legalObject, branch, statistic, add, email}, {user}) => {
        if(
            ('admin'===user.role&&role!=='admin'||'оператор'===user.role&&role!=='admin'||'superadmin'===user.role)&&user.add
        ) {
            if(user.legalObject) legalObject = user.legalObject
            let _object = new User({
                login,
                role,
                status: 'active',
                password,
                name,
                phone,
                legalObject,
                branch,
                statistic,
                add,
                credit,
                payment,
                email
            });
            _object = await User.create(_object)
            let history = new History({
                who: user._id,
                where: _object._id,
                what: 'Создание'
            });
            await History.create(history)
            return _object._id
        }
        return 'ERROR'
    },
    setUser: async(parent, {_id, login, password, name, phone, branch, statistic, credit, payment, add, email}, {user, res}) => {
        if(user.role&&(_id.toString()===user._id.toString()||user.add)) {
            let districts = []
            if(user.role==='супервайзер'){
                districts = await District.find({
                    supervisors: user._id,
                })
                    .distinct('cashiers')
                    .lean()
            }
            let object = await User.findOne({
                ...user.role==='admin'?{role: {$ne: 'admin'}, _id}
                :
                user.role==='оператор'? {$and: [{role: {$ne: 'admin'}}, {role: {$ne: 'оператор'}}], del: {$ne: true}, _id}
                :
                user.role==='управляющий'? {role: {$ne: 'admin'}, del: {$ne: true}, _id}
                :
                user.role==='супервайзер'?{$and: [{_id: {$in: districts}}, {_id}], del: {$ne: true}}
                :
                user.role==='superadmin'?{_id}
                :
                {_id: null},
                ...user.legalObject ? {legalObject: user.legalObject} : {},
            })
            if (object) {
                let history = new History({
                    who: user._id,
                    where: object._id,
                    what: ''
                });
                if (['admin', 'оператор', 'superadmin'].includes(user.role)&&login) {
                    history.what = `login:${object.login}→${login};`
                    object.login = login
                    object.enteredDate = null
                    if(_id.toString()===user._id.toString()) {
                        const payload = {
                            id: object._id,
                            login: object.login,
                            role: object.role
                        };
                        const token = await jwt.sign(payload, jwtsecret);
                        await res.clearCookie('jwt');
                        await res.cookie('jwt', token, {maxAge: user.role==='кассир'?24*60*60*1000:10*365*24*60*60*1000 });
                    }
                }
                if (['admin', 'оператор', 'superadmin'].includes(user.role)&&password) {
                    history.what = `${history.what} password;`
                    object.password = password
                }
                if (name) {
                    history.what = `${history.what} name:${object.name}→${name};`
                    object.name = name
                }
                if (phone) {
                    history.what = `${history.what} phone:${object.phone}→${phone};`
                    object.phone = phone
                }
                if (JSON.stringify(object.branch)!==JSON.stringify(branch)&&!(await WorkShift.findOne({cashier: _id, end: null}).select('_id').lean())) {
                    history.what = `${history.what} branch:${object.branch}→${branch};`
                    object.branch = branch
                }
                if (email) {
                    history.what = `${history.what} email:${object.email}→${email};`
                    object.email = email
                }
                if (statistic!=undefined&&user.add&&(user.role==='superadmin'||object.role!=='admin')) {
                    history.what = `${history.what} statistic:${object.statistic}→${statistic};`
                    object.statistic = statistic
                }
                if (add!=undefined&&user.add&&(user.role==='superadmin'||object.role!=='admin')) {
                    history.what = `${history.what} add:${object.add}→${add};`
                    object.add = add
                }
                if (credit!=undefined&&user.add&&(user.role==='superadmin'||object.role!=='admin')) {
                    history.what = `${history.what} credit:${object.credit}→${credit};`
                    object.credit = credit
                }
                if (payment!=undefined&&user.add&&(user.role==='superadmin'||object.role!=='admin'||object.role!=='управляющий')) {
                    history.what = `${history.what} payment:${object.payment}→${payment};`
                    object.payment = payment
                }
                await object.save();
                await History.create(history)
                return 'OK'
            }
        }
        return 'ERROR'
    },
    setDevice: async(parent, {device}, {req, user}) => {
        if(user.role) {
            let object = await User.findOne({
                _id: user._id,
            })
            if (object) {
                object.lastActive = new Date()
                object.device = device
                object.IP = req.ip
                await object.save();
                return 'OK'
            }
        }
        return 'ERROR'
    },
    onoffUser: async(parent, { _id }, {user}) => {
        if(['admin', 'superadmin', 'управляющий'].includes(user.role)&&user.add) {
            let object = await User.findOne({
                _id,
                ...user.legalObject?{legalObject: user.legalObject}:{}
            })
            if(object&&(object.role!=='admin'||user.role==='superadmin')) {
                object.status = object.status==='active'?'deactive':'active'
                object.save()
                let history = new History({
                    who: user._id,
                    where: object._id,
                    what: object.status==='active'?'Включение':'Отключение'
                });
                await History.create(history)
                return 'OK'
            }
        }
        return 'ERROR'
    },
    deleteUser: async(parent, { _id }, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let object = await User.findOne({_id: _id})
            if(object&&(object.role!=='admin'||user.role==='superadmin')) {
                object.del = true
                object.login = randomstring.generate({length: 10, charset: 'numeric'});
                object.save()
                await IntegrationObject.deleteOne({user: _id})
                let history = new History({
                    who: user._id,
                    where: object._id,
                    what: 'Удаление'
                });
                await History.create(history)
                return 'OK'
            }
        }
        return 'ERROR'
    },
    restoreUser: async(parent, { _id }, {user}) => {
        if('superadmin'===user.role) {
            await User.updateOne({_id}, {del: false})
            let history = new History({
                who: user._id,
                where: _id,
                what: 'Восстановление'
            });
            await History.create(history)
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