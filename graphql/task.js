const Task = require('../models/task');
const History = require('../models/history');
const { urlMain, pdDDMMYYYY } = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const randomstring = require('randomstring');
const { sendWebPush } = require('../module/webPush');

const type = `
  type Task {
    _id: ID
    createdAt: Date
    who: User
    whom: User
    date: Date
    status: String
    info: String
  }
`;

const query = `
    unloadTasks(status: String, search: String, employment: ID, soon: Boolean, late: Boolean, today: Boolean): String
    tasks(status: String, search: String, skip: Int, employment: ID, limit: Int, soon: Boolean, late: Boolean, today: Boolean): [Task]
    tasksCount(status: String, search: String, employment: ID, soon: Boolean, late: Boolean, today: Boolean): [Int]
    task(_id: ID!): Task
`;

const mutation = `
    addTask(whom: ID!, date: Date!, info: String!): String
    setTask(_id: ID!, date: Date, status: String, info: String): String
    deleteTask(_id: ID!): String
`;

const resolvers = {
    unloadTasks: async(parent, {status, search, employment, soon, late, today}, {user}) => {
        if(user.role) {
            let date, dateStart, dateEnd
            if(late||today) {
                date = new Date()
                date.setHours(0, 0, 0, 0)
            }
            else if (soon) {
                dateStart = new Date()
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 3)
            }
            let res = await Task.find({
                ...user.role!=='admin'||employment?{
                    $and: [
                        ...user.role!=='admin'?[{
                            $or: [
                                {who: user._id},
                                {whom: user._id}
                            ]
                        }]:[],
                        ...employment?[{
                            $or: [
                                {who: employment},
                                {whom: employment}
                            ]
                        }]:[],
                    ]
                }:{},
                del: {$ne: true},
                ...search?{info: {'$regex': search, '$options': 'i'}}:{},
                ...late? {date: {$lt: date}, status: {$nin: ['выполнен', 'проверен']}}
                    :
                    today?
                        {date: date, status: {$nin: ['выполнен', 'проверен']}}
                        :
                        soon?
                            {$and: [{date: {$gte: dateStart}}, {date: {$lt: dateEnd}}], status: {$nin: ['выполнен', 'проверен']}}
                            :
                            {...status?{status}:{}}
            })
                .sort('-createdAt')
                .populate({
                    path: 'who',
                    select: 'name _id'
                })
                .populate({
                    path: 'whom',
                    select: 'name _id'
                })
                .lean()
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Выгрузка');
            worksheet.getColumn(2).width = 15
            worksheet.getColumn(3).width = 40
            worksheet.getColumn(4).width = 40
            worksheet.getRow(1).getCell(1).font = {bold: true};
            worksheet.getRow(1).getCell(1).value = 'Статус'
            worksheet.getRow(1).getCell(2).font = {bold: true};
            worksheet.getRow(1).getCell(2).value = 'Срок'
            worksheet.getRow(1).getCell(3).font = {bold: true};
            worksheet.getRow(1).getCell(3).value = 'От кого'
            worksheet.getRow(1).getCell(4).font = {bold: true};
            worksheet.getRow(1).getCell(4).value = 'Исполнитель'
            worksheet.getRow(1).getCell(5).font = {bold: true};
            worksheet.getRow(1).getCell(5).value = 'Комментарий'
            for(let i = 0; i < res.length; i++) {
                worksheet.getRow(i+2).getCell(1).value = res[i].status
                worksheet.getRow(i+2).getCell(2).value = pdDDMMYYYY(res[i].date)
                worksheet.getRow(i+2).getCell(3).value = res[i].who.name
                worksheet.getRow(i+2).getCell(4).value = res[i].whom.name
                worksheet.getRow(i+2).getCell(5).value = res[i].info
            }
            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
    tasks: async(parent, {status, search, skip, limit, employment, soon, late, today}, {user}) => {
        if(user.role) {
            let date, dateStart, dateEnd
            if(late||today) {
                date = new Date()
                date.setHours(0, 0, 0, 0)
            }
            else if (soon) {
                dateStart = new Date()
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 3)
            }
            return await Task.find({
                ...user.role!=='admin'||employment?{
                    $and: [
                        ...user.role!=='admin'?[{
                            $or: [
                                {who: user._id},
                                {whom: user._id}
                            ]
                        }]:[],
                        ...employment?[{
                            $or: [
                                {who: employment},
                                {whom: employment}
                            ]
                        }]:[],
                    ]
                }:{},
                del: {$ne: true},
                ...search?{info: {'$regex': search, '$options': 'i'}}:{},
                ...late? {date: {$lt: date}, status: {$nin: ['выполнен', 'проверен']}}
                    :
                    today?
                        {date: date, status: {$nin: ['выполнен', 'проверен']}}
                        :
                        soon?
                            {$and: [{date: {$gte: dateStart}}, {date: {$lt: dateEnd}}], status: {$nin: ['выполнен', 'проверен']}}
                            :
                            {...status?{status}:{}}
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? limit ? limit : 30 : 10000000000)
                .sort('-createdAt')
                .populate({
                    path: 'who',
                    select: 'name _id'
                })
                .populate({
                    path: 'whom',
                    select: 'name _id'
                })
                .lean()
        }
    },
    task: async(parent, {_id}, {user}) => {
        if(user.role) {
            let res = await Task.findOne({
                ...user.role!=='admin'?{
                    $or: [
                        {who: user._id},
                        {whom: user._id}
                    ]
                }:{},
                _id,
            })
                .populate({
                    path: 'who',
                    select: 'name _id'
                })
                .populate({
                    path: 'whom',
                    select: 'name _id'
                })
                .lean()
            return res
        }
    },
    tasksCount: async(parent, {status, search, employment, soon, late, today}, {user}) => {
        if(user.role) {
            let date, dateStart, dateEnd
            if(late||today) {
                date = new Date()
                date.setHours(0, 0, 0, 0)
            }
            else if (soon) {
                dateStart = new Date()
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 3)
            }
            let res =  [
                await Task.countDocuments({
                    ...user.role!=='admin'||employment?{
                        $and: [
                            ...user.role!=='admin'?[{
                                $or: [
                                    {who: user._id},
                                    {whom: user._id}
                                ]
                            }]:[],
                            ...employment?[{
                                $or: [
                                    {who: employment},
                                    {whom: employment}
                                ]
                            }]:[],
                        ]
                    }:{},
                    del: {$ne: true},
                    ...search?{name: {'$regex': search, '$options': 'i'}}:{},
                    ...late? {date: {$lt: date}, status: {$nin: ['выполнен', 'проверен']}}
                        :
                        today?
                            {date: date, status: {$nin: ['выполнен', 'проверен']}}
                            :
                            soon?
                                {$and: [{date: {$gte: dateStart}}, {date: {$lt: dateEnd}}], status: {$nin: ['выполнен', 'проверен']}}
                                :
                                {...status?{status}:{}}
                })
                    .lean(),
                await Task.countDocuments({
                    del: {$ne: true},
                    ...search?{name: {'$regex': search, '$options': 'i'}}:{},
                    $and: [
                        ...user.role!=='admin'||employment?[
                            ...user.role!=='admin'?[{
                                $or: [
                                    {who: user._id},
                                    {whom: user._id}
                                ]
                            }]:[],
                            ...employment?[{
                                $or: [
                                    {who: employment},
                                    {whom: employment}
                                ]
                            }]:[],
                        ]:[],
                        ...late? [{date: {$lt: date}, status: {$nin: ['выполнен', 'проверен']}}]
                            :
                            today?
                                [{date: date, status: {$nin: ['выполнен', 'проверен']}}]
                                :
                                soon?
                                    [{$and: [{date: {$gte: dateStart}}, {date: {$lt: dateEnd}}], status: {$nin: ['выполнен', 'проверен']}}]
                                    :
                                    [],
                        {status: 'обработка'},
                        ...status?[{status}]:[]
                    ]
                })
                    .lean(),
                await Task.countDocuments({
                    del: {$ne: true},
                    ...search?{name: {'$regex': search, '$options': 'i'}}:{},
                    $and: [
                        ...user.role!=='admin'||employment?[
                            ...user.role!=='admin'?[{
                                $or: [
                                    {who: user._id},
                                    {whom: user._id}
                                ]
                            }]:[],
                            ...employment?[{
                                $or: [
                                    {who: employment},
                                    {whom: employment}
                                ]
                            }]:[],
                        ]:[],
                        ...late? [{date: {$lt: date}, status: {$nin: ['выполнен', 'проверен']}}]
                            :
                            today?
                                [{date: date, status: {$nin: ['выполнен', 'проверен']}}]
                                :
                                soon?
                                    [{$and: [{date: {$gte: dateStart}}, {date: {$lt: dateEnd}}], status: {$nin: ['выполнен', 'проверен']}}]
                                    :
                                    [],
                        {status: 'отложен'},
                        ...status?[{status}]:[]
                    ]
                })
                    .lean(),
                await Task.countDocuments({
                    del: {$ne: true},
                    ...search?{name: {'$regex': search, '$options': 'i'}}:{},
                    $and: [
                        ...user.role!=='admin'||employment?[
                            ...user.role!=='admin'?[{
                                $or: [
                                    {who: user._id},
                                    {whom: user._id}
                                ]
                            }]:[],
                            ...employment?[{
                                $or: [
                                    {who: employment},
                                    {whom: employment}
                                ]
                            }]:[],
                        ]:[],
                        ...late? [{date: {$lt: date}, status: {$nin: ['выполнен', 'проверен']}}]
                            :
                            today?
                                [{date: date, status: {$nin: ['выполнен', 'проверен']}}]
                                :
                                soon?
                                    [{$and: [{date: {$gte: dateStart}}, {date: {$lt: dateEnd}}], status: {$nin: ['выполнен', 'проверен']}}]
                                    :
                                    [],
                        {status: 'в процессе'},
                        ...status?[{status}]:[]
                    ]
                })
                    .lean(),
                await Task.countDocuments({
                    del: {$ne: true},
                    ...search?{name: {'$regex': search, '$options': 'i'}}:{},
                    $and: [
                        ...user.role!=='admin'||employment?[
                            ...user.role!=='admin'?[{
                                $or: [
                                    {who: user._id},
                                    {whom: user._id}
                                ]
                            }]:[],
                            ...employment?[{
                                $or: [
                                    {who: employment},
                                    {whom: employment}
                                ]
                            }]:[],
                        ]:[],
                        ...late? [{date: {$lt: date}, status: {$nin: ['выполнен', 'проверен']}}]
                            :
                            today?
                                [{date: date, status: {$nin: ['выполнен', 'проверен']}}]
                                :
                                soon?
                                    [{$and: [{date: {$gte: dateStart}}, {date: {$lt: dateEnd}}], status: {$nin: ['выполнен', 'проверен']}}]
                                    :
                                    [],
                        {status: 'выполнен'},
                        ...status?[{status}]:[]
                    ]
                })
                    .lean(),
                await Task.countDocuments({
                    del: {$ne: true},
                    ...search?{name: {'$regex': search, '$options': 'i'}}:{},
                    $and: [
                        ...user.role!=='admin'||employment?[
                            ...user.role!=='admin'?[{
                                $or: [
                                    {who: user._id},
                                    {whom: user._id}
                                ]
                            }]:[],
                            ...employment?[{
                                $or: [
                                    {who: employment},
                                    {whom: employment}
                                ]
                            }]:[],
                        ]:[],
                        ...late? [{date: {$lt: date}, status: {$nin: ['выполнен', 'проверен']}}]
                            :
                            today?
                                [{date: date, status: {$nin: ['выполнен', 'проверен']}}]
                                :
                                soon?
                                    [{$and: [{date: {$gte: dateStart}}, {date: {$lt: dateEnd}}], status: {$nin: ['выполнен', 'проверен']}}]
                                    :
                                    [],
                        {status: 'проверен'},
                        ...status?[{status}]:[]
                    ]
                })
                    .lean()
            ]
            return res
        }
        return 0
    },
};

const resolversMutation = {
    addTask: async(parent, {whom, date, info}, {user}) => {
        if(user.role) {
            date = new Date(date)
            date.setHours(0, 0, 0, 0)
            let object = new Task({
                whom,
                who: user._id,
                date,
                status: 'обработка',
                info
            });
            await Task.create(object)
            await sendWebPush({
                tag: object._id,
                title: 'Задача',
                message: info,
                url: `https://inhouse-app.kg/task/${object._id}`,
                user: whom
            })
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
    setTask: async(parent, {_id, date, status, info}, {user}) => {
        let object = await Task.findOne({
            _id,
        })
        if(['admin'].includes(user.role)||object.who.toString()===user._id.toString()||object.whom.toString()===user._id.toString()) {
            let history = new History({
                who: user._id,
                where: object._id,
                what: ''
            });
            let webPush = {
                tag: object._id,
                title: `Задача: ${object.info.slice(0, 20)}`,
                message: '',
                url: `https://inhouse-app.kg/task/${object._id}`,
                user: object.who.toString()!==user._id.toString()?object.who:object.whom
            }
            if (date&&['отложен', 'обработка'].includes(object.status)) {
                history.what = `Срок:${object.date}→${date};\n`
                date = new Date(date)
                date.setHours(0, 0, 0, 0)
                object.date = date
                webPush.message = `${webPush.message}\nСрок задачи изменен`
            }
            if (info&&object.who.toString()===user._id.toString()&&['отложен', 'обработка'].includes(object.status)) {
                history.what = `${history.what}Комментарий:${object.info}→${info};\n`
                object.info = info
                webPush.message = `${webPush.message}\nКомментарий задачи изменен`
            }
            if (status&&object.status!=='проверен') {
                history.what = `${history.what}Статус:${object.status}→${status};`
                object.status = status
                webPush.message = `${webPush.message}\nСтатус задачи изменен на ${status}`
            }
            await sendWebPush(webPush)
            await object.save();
            await History.create(history)
            return 'OK'
        }
        return 'ERROR'
    },
    deleteTask: async(parent, { _id }, {user}) => {
        let object = await Task.findOne({_id})
        if(object&&object.status!=='выполнен'&&(['admin'].includes(user.role)||object.who.toString()===user._id.toString())) {
            await sendWebPush({
                title: `Задача: ${object.info.slice(0, 20)}`,
                message: 'Задача отменена',
                user: object.whom
            })
            await Task.deleteOne({_id})
            await History.deleteMany({where: _id})
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