const User = require('../models/user');
const randomstring = require('randomstring');
const History = require('../models/history');
const jwtsecret = process.env.jwtsecret.trim();
const jwt = require('jsonwebtoken');

const type = `
  type User {
    _id: ID
    createdAt: Date
    updatedAt: Date
    lastActive: Date
    login: String
    role: String
    status: String
    IP: String
    name: String
    phones: [String]
    device: String
    notification: Boolean
    store: Store
    department: String
    position: String
    startWork: Date
    add: Boolean
    edit: Boolean
    deleted: Boolean
 }
`;

const query = `
    checkLogin(login: String!): String
    departments(search: String): [User]
    positions(search: String): [User]
    users(skip: Int, search: String, store: ID, role: String, limit: Int, department: String, position: String): [User]
    usersCount(search: String, store: ID, role: String, department: String, position: String): Int
    user(_id: ID!): User
`;

const mutation = `
    addUser(login: String!, add: Boolean!, edit: Boolean!, deleted: Boolean!, role: String!, password: String!, name: String!, phones: [String]!, store: ID, department: String!, position: String!, startWork: Date): String
    setUser(_id: ID!, login: String, add: Boolean, edit: Boolean, deleted: Boolean, status: String, password: String, name: String, phones: [String], store: ID, department: String, position: String, startWork: Date): String
    setDevice(device: String!): String
    deleteUser(_id: ID!): String
`;

const resolvers = {
    positions: async(parent, {search}, {user}) => {
        if(['admin'].includes(user.role)) {
            let res = await User.find({
                ...search?{position: {'$regex': search, '$options': 'i'}}:{},
            })
                .distinct('position')
                .lean()
            let departments = []
            for(let i=0; i<res.length; i++) {
                departments = [...departments, {name: res[i]}]
            }
            return departments
        }
        return []
    },
    departments: async(parent, {search}, {user}) => {
        if(['admin'].includes(user.role)) {
            let res = await User.find({
                ...search?{department: {'$regex': search, '$options': 'i'}}:{},
            })
                .distinct('department')
                .lean()
            let departments = []
            for(let i=0; i<res.length; i++) {
                departments = [...departments, {name: res[i]}]
            }
            return departments
        }
        return []
    },
    users: async(parent, {skip, search, store, role, limit, department, position}, {user}) => {
        if(['admin'].includes(user.role)) {
            if(user.store) store = user.store
            let res = await User.find({
                ...role?{role}:{role: {$ne: 'admin'}},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
                ...store ? {store} : {},
                ...department ? {department} : {},
                ...position ? {position} : {},
                del: {$ne: true}
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? limit ? limit : 30 : 10000000000)
                .sort('name')
                .select('_id role name')
                .lean()
            return res
        }
        return []
    },
    usersCount: async(parent, {search, store, role, department, position}, {user}) => {
        if(['admin'].includes(user.role)) {
            if(user.store) store = user.store
            return await User.countDocuments({
                ...role?{role}:{role: {$ne: 'admin'}},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
                ...store ? {store} : {},
                ...department ? {department} : {},
                ...position ? {position} : {},
                del: {$ne: true}
            })
                .lean()
        }
        return 0
    },
    user: async(parent, {_id}, {user}) => {
        if(['admin'].includes(user.role)) {
            let res = await User.findOne({
                role: {$ne: 'admin'},
                _id
            })
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .lean()
            return res
        }
    },
    checkLogin: async(parent, {login}, {user}) => {
        if(['admin'].includes(user.role)) {
            if(!(await User.countDocuments({login}).lean()))
                return 'OK'
        }
        return 'ERROR'
    },
};

const resolversMutation = {
    addUser: async(parent, {login, role, password, add, edit, deleted, name, phones, store, department, startWork, position}, {user}) => {
        if(['admin'].includes(user.role)&&name!=='admin') {
            let object = new User({
                login,
                role,
                status: 'active',
                password,
                name,
                phones,
                store,
                department,
                position,
                startWork,
                add,
                edit,
                deleted
            });
            object = await User.create(object)
            let history = new History({
                who: user._id,
                where: object._id,
                what: 'Создание'
            });
            await History.create(history)
            return object._id
        }
        return 'ERROR'
    },
    setUser: async(parent, {_id, add, edit, deleted, login, status, password, name, phones, store, department, position, startWork}, {user, res}) => {
        if(['admin'].includes(user.role)) {
            let object = await User.findOne({
                _id
            })
            if (object) {
                let history = new History({
                    who: user._id,
                    where: object._id,
                    what: ''
                });
                if (['admin'].includes(user.role)) {
                    if (login) {
                        history.what = `Логин:${object.login}→${login};\n`
                        object.login = login
                        if(_id.toString()===user._id.toString()) {
                            const payload = {
                                id: object._id,
                                login: object.login,
                                role: object.role
                            };
                            const token = await jwt.sign(payload, jwtsecret);
                            await res.clearCookie('jwt');
                            await res.cookie('jwt', token, {maxAge: 10*365*24*60*60*1000});
                        }
                    }
                    if (password) {
                        history.what = `${history.what}Пароль;\n`
                        object.password = password
                    }
                    if(add!=undefined) {
                        history.what = `${history.what}Добавлять:${object.add}→${add};\n`
                        object.add = add
                    }
                    if(edit!=undefined) {
                        history.what = `${history.what}Изменять:${object.edit}→${edit};\n`
                        object.edit = edit
                    }
                    if(deleted!=undefined) {
                        history.what = `${history.what}Удалять:${object.deleted}→${deleted};\n`
                        object.deleted = deleted
                    }
                }
                if (name&&name!=='admin') {
                    history.what = `${history.what}ФИО:${object.name}→${name};\n`
                    object.name = name
                }
                if (department) {
                    history.what = `${history.what}Отдел:${object.department}→${department};\n`
                    object.department = department
                }
                if (position) {
                    history.what = `${history.what}Должность:${object.position}→${position};\n`
                    object.position = position
                }
                if (startWork) {
                    history.what = `${history.what}Начало работы:${object.startWork}→${startWork};\n`
                    object.startWork = startWork
                }
                if (phones) {
                    history.what = `${history.what}Телефоны:${object.phones}→${phones};\n`
                    object.phones = phones
                }
                if (status) {
                    history.what = `${history.what}Статус:${object.status}→${status};`
                    object.status = status
                }
                history.what = `${history.what}Магазин:${object.store}→${store};\n`
                object.store = store
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
    deleteUser: async(parent, { _id }, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await User.findOne({_id: _id})
            if(object) {
                object.del = true
                object.login = randomstring.generate({length: 10, charset: 'numeric'});
                object.save()
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
    }
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;