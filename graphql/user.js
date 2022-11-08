const User = require('../models/user');
const History = require('../models/history');
const jwtsecret = process.env.jwtsecret;
const jwt = require('jsonwebtoken');
const { saveFile, deleteFile, urlMain, pdDDMMYYYY } = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const randomstring = require('randomstring');
const Store = require('../models/store');
const { checkUniqueName } = require('../module/const');
const mongoose = require('mongoose');

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
    cashbox: Cashbox
 }
`;

const query = `
    unloadUsers(search: String, store: ID, role: String, department: String, position: String): String
    checkLogin(login: String!): String
    departments(search: String): [User]
    positions(search: String): [User]
    users(skip: Int, search: String, store: ID, role: String, limit: Int, department: String, position: String): [User]
    usersCount(search: String, store: ID, role: String, department: String, position: String): Int
    user(_id: ID!): User
`;

const mutation = `
    uploadUser(document: Upload!): String
    addUser(login: String!, add: Boolean!, cashbox: ID, edit: Boolean!, deleted: Boolean!, role: String!, password: String!, name: String!, phones: [String]!, store: ID, department: String!, position: String!, startWork: Date): String
    setUser(_id: ID!, login: String, add: Boolean, cashbox: ID, edit: Boolean, deleted: Boolean, status: String, password: String, name: String, phones: [String], store: ID, department: String, position: String, startWork: Date): String
    setDevice(device: String!): String
    deleteUser(_id: ID!): String
`;

const resolvers = {
    unloadUsers: async(parent, {search, store, role, department, position}, {user}) => {
        if(['admin',  'управляющий'].includes(user.role)) {
            if(user.store) store = user.store
            let res =  await User.find({
                ...role?{role: {'$regex': role, '$options': 'i'}}:{role: {$ne: 'admin'}},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
                ...store ? {store} : {},
                ...department ? {department} : {},
                ...position ? {position} : {},
                del: {$ne: true}
            })
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .sort('name')
                .lean()
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Выгрузка');
            worksheet.getRow(1).getCell(1).font = {bold: true};
            worksheet.getRow(1).getCell(1).value = '_id'
            worksheet.getColumn(2).width = 20
            worksheet.getRow(1).getCell(2).font = {bold: true};
            worksheet.getRow(1).getCell(2).value = 'Логин'
            worksheet.getColumn(3).width = 40
            worksheet.getRow(1).getCell(3).font = {bold: true};
            worksheet.getRow(1).getCell(3).value = 'ФИО'
            worksheet.getColumn(4).width = 20
            worksheet.getRow(1).getCell(4).font = {bold: true};
            worksheet.getRow(1).getCell(4).value = 'Роль'
            worksheet.getColumn(5).width = 20
            worksheet.getRow(1).getCell(5).font = {bold: true};
            worksheet.getRow(1).getCell(5).value = 'Отдел'
            worksheet.getColumn(6).width = 20
            worksheet.getRow(1).getCell(6).font = {bold: true};
            worksheet.getRow(1).getCell(6).value = 'Должность'
            worksheet.getColumn(7).width = 15
            worksheet.getRow(1).getCell(7).font = {bold: true};
            worksheet.getRow(1).getCell(7).value = 'Начало работы'
            worksheet.getColumn(8).width = 40
            worksheet.getRow(1).getCell(8).font = {bold: true};
            worksheet.getRow(1).getCell(8).value = 'Телефоны'
            worksheet.getColumn(9).width = 40
            worksheet.getRow(1).getCell(9).font = {bold: true};
            worksheet.getRow(1).getCell(9).value = 'Магазин'
            for(let i = 0; i < res.length; i++) {
                let phones = ''
                for(let i1 = 0; i1 < res[i].phones.length; i1++) {
                    phones = `${phones?`${phones}\n`:''}+996${res[i].phones[i1]}`
                }
                worksheet.getRow(i+2).getCell(1).value = res[i]._id.toString()
                worksheet.getRow(i+2).getCell(2).value = res[i].login
                worksheet.getRow(i+2).getCell(3).value = res[i].name
                worksheet.getRow(i+2).getCell(4).value = res[i].role
                worksheet.getRow(i+2).getCell(5).value = res[i].department
                worksheet.getRow(i+2).getCell(6).value = res[i].position
                worksheet.getRow(i+2).getCell(7).value = pdDDMMYYYY(res[i].startWork)
                worksheet.getRow(i+2).getCell(8).alignment = {wrapText: true}
                worksheet.getRow(i+2).getCell(8).value = phones
                worksheet.getRow(i+2).getCell(9).alignment = {wrapText: true}
                worksheet.getRow(i+2).getCell(9).value = res[i].store.name
            }
            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
    positions: async(parent, {search}, {user}) => {
        if(['admin',  'управляющий'].includes(user.role)) {
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
        if(['admin',  'управляющий'].includes(user.role)) {
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
        if(user.role) {
            if(user.store) store = user.store
            let res = await User.find({
                ...role?{role: {'$regex': role, '$options': 'i'}}:{role: {$ne: 'admin'}},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
                ...store ? {store} : {},
                ...department ? {department} : {},
                ...position ? {position} : {},
                del: {$ne: true}
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? limit ? limit : 30 : 10000000000)
                .sort('name')
                .select('_id role name store')
                .populate({
                    path: 'store',
                    select: '_id name'
                })
                .lean()
            return res
        }
        return []
    },
    usersCount: async(parent, {search, store, role, department, position}, {user}) => {
        if(['admin',  'управляющий'].includes(user.role)) {
            if(user.store) store = user.store
            return await User.countDocuments({
                ...role?{role: {'$regex': role, '$options': 'i'}}:{role: {$ne: 'admin'}},
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
        if(['admin',  'управляющий'].includes(user.role)) {
            let res = await User.findOne({
                role: {$ne: 'admin'},
                _id
            })
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .populate({
                    path: 'cashbox',
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
    uploadUser: async(parent, { document }, {user}) => {
        if (user.role === 'admin') {
            let {createReadStream, filename} = await document;
            let stream = createReadStream()
            filename = await saveFile(stream, filename);
            let xlsxpath = path.join(app.dirname, 'public', filename);
            let workbook = new ExcelJS.Workbook();
            workbook = await workbook.xlsx.readFile(xlsxpath);
            let worksheet = workbook.worksheets[0];
            let rowNumber = 1, row, _id, object
            while(true) {
                row = worksheet.getRow(rowNumber);
                if(row.getCell(2).value) {
                    if(row.getCell(10).value)
                        row.getCell(10).value = (await Store.findOne({name: row.getCell(10).value}).select('_id').lean())._id
                    if(row.getCell(1).value&&!mongoose.Types.ObjectId.isValid(row.getCell(1).value))
                        row.getCell(1).value = (await User.findOne({name: row.getCell(1).value}).select('_id').lean())._id
                    _id = row.getCell(1).value
                    if(row.getCell(3).value)
                        row.getCell(3).value = row.getCell(3).value.toString()
                    if(_id) {
                        object = await User.findById(_id)
                        if(object) {
                            let history = new History({
                                who: user._id,
                                where: object._id,
                                what: ''
                            });
                            if (row.getCell(2).value&&row.getCell(2).value!=='admin'&&object.login!==row.getCell(2).value) {
                                history.what = `Логин:${object.login}→${row.getCell(2).value};\n`
                                object.login = row.getCell(2).value
                            }
                            if (row.getCell(3).value&&row.getCell(3).value.length>7) {
                                history.what = `${history.what}Пароль;\n`
                                object.password = row.getCell(3).value
                            }
                            if (row.getCell(4).value&&row.getCell(4).value!=='admin'&&object.name!==row.getCell(4).value&&await checkUniqueName(row.getCell(4).value, 'user')) {
                                history.what = `${history.what}ФИО:${object.name}→${row.getCell(4).value};\n`
                                object.name = row.getCell(4).value
                            }
                            if (row.getCell(6).value&&object.department!==row.getCell(6).value) {
                                history.what = `${history.what}Отдел:${object.department}→${row.getCell(6).value};\n`
                                object.department = row.getCell(6).value
                            }
                            if (row.getCell(7).value&&object.position!==row.getCell(7).value) {
                                history.what = `${history.what}Должность:${object.position}→${row.getCell(7).value};\n`
                                object.position = row.getCell(7).value
                            }
                            if(row.getCell(8).value&&pdDDMMYYYY(object.startWork)!==row.getCell(8).value) {
                                history.what = `${history.what}Начало работы:${pdDDMMYYYY(object.startWork)}→${row.getCell(8).value};\n`
                                row.getCell(8).value = row.getCell(8).value.split('.')
                                object.startWork = new Date(`${row.getCell(8).value[1]}.${row.getCell(8).value[0]}.${row.getCell(8).value[2]}`)
                                object.startWork.setHours(0, 0, 0, 0)
                            }
                            if (row.getCell(9).value) {
                                row.getCell(9).value = row.getCell(9).value.toString().split(', ')
                                if(JSON.stringify(row.getCell(9).value)!==JSON.stringify(object.phones)) {
                                    history.what = `${history.what}Телефоны:${object.phones.toString()}→${row.getCell(9).value.toString()};\n`
                                    object.phones = row.getCell(9).value
                                }
                            }
                            if(row.getCell(10).value&&object.store.toString()!==row.getCell(10).value.toString()) {
                                history.what = `${history.what}Магазин:${object.store}→${row.getCell(10)};\n`
                                object.store = row.getCell(10)
                            }
                            await object.save();
                            await History.create(history)
                        }
                    }
                    else if(row.getCell(2).value&&row.getCell(2).value!=='admin'&&row.getCell(3).value&&row.getCell(3).value.length>7&&row.getCell(4).value&&row.getCell(4).value!=='admin'&&await checkUniqueName(row.getCell(4).value, 'user')&&row.getCell(5).value&&['менеджер', 'завсклад', 'кассир', 'доставщик', 'менеджер/завсклад', 'управляющий', 'юрист', 'сотрудник'].includes(row.getCell(5).value)&&row.getCell(6).value&&row.getCell(7).value&&row.getCell(8).value&&row.getCell(10).value) {
                        row.getCell(9).value = row.getCell(9).value?row.getCell(9).value.toString().split(', '):[]
                        row.getCell(8).value = row.getCell(8).value.split('.')
                        row.getCell(8).value = new Date(`${row.getCell(8).value[1]}.${row.getCell(8).value[0]}.${row.getCell(8).value[2]}`)
                        row.getCell(8).value.setHours(0, 0, 0, 0)
                        object = new User({
                            login: row.getCell(2).value,
                            role: row.getCell(5).value,
                            status: 'active',
                            password: row.getCell(3).value.toString(),
                            name: row.getCell(4).value,
                            phones: row.getCell(9).value,
                            store: row.getCell(10).value,
                            department: row.getCell(6).value,
                            position: row.getCell(7).value,
                            startWork: row.getCell(8).value,
                            add: true,
                            edit: true,
                            deleted: true
                        });
                        object = await User.create(object)
                        let history = new History({
                            who: user._id,
                            where: object._id,
                            what: 'Создание'
                        });
                        await History.create(history)
                    }
                    rowNumber++
                }
                else break
            }
            await deleteFile(filename)
            return 'OK'
        }
        return 'ERROR'
    },
    addUser: async(parent, {login, role, password, cashbox, add, edit, deleted, name, phones, store, department, startWork, position}, {user}) => {
        if(['admin'].includes(user.role)&&name!=='admin'&&login!=='admin'&&await checkUniqueName(name, 'user')) {
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
                deleted,
                cashbox
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
    setUser: async(parent, {_id, add, edit, deleted, cashbox, login, status, password, name, phones, store, department, position, startWork}, {user, res}) => {
        if(['admin'].includes(user.role)&&await checkUniqueName(name, 'user')) {
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
                    if (login&&login!=='admin') {
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
                if (cashbox) {
                    history.what = `${history.what}Касса;\n`
                    object.cashbox = cashbox
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
                    history.what = `${history.what}Начало работы:${pdDDMMYYYY(object.startWork)}→${pdDDMMYYYY(startWork)};\n`
                    object.startWork = startWork
                }
                if (phones) {
                    history.what = `${history.what}Телефоны:${object.phones.toString()}→${phones.toString()};\n`
                    object.phones = phones
                }
                if (status) {
                    history.what = `${history.what}Статус:${object.status}→${status};`
                    object.status = status
                }
                if(store) {
                    history.what = `${history.what}Магазин:${object.store}→${store};\n`
                    object.store = store
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
    deleteUser: async(parent, { _id }, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await User.findOne({_id: _id})
            if(object&&object.name!=='admin'&&object.login!=='admin') {
                object.del = true
                object.name += '(удален)'
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