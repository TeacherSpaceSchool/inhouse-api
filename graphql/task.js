const Task = require('../models/task');
const History = require('../models/history');

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
    tasks(status: String, search: String, skip: Int, limit: Int): [Task]
    tasksCount(status: String, search: String): Int
    task(_id: ID!): Task
`;

const mutation = `
    addTask(whom: ID!, date: Date!, info: String!): String
    setTask(_id: ID!, date: Date, status: String, info: String): String
    deleteTask(_id: ID!): String
`;

const resolvers = {
    tasks: async(parent, {status, search, skip, limit}, {user}) => {
        if(user.role) {
            return await Task.find({
                ...user.role!=='admin'?{
                    $or: [
                        {who: user._id},
                        {whom: user._id}
                    ]
                }:{},
                del: {$ne: true},
                ...search?{info: {'$regex': search, '$options': 'i'}}:{},
                ...status?{status}:{},
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
    tasksCount: async(parent, {status, search}, {user}) => {
        if(user.role) {
            return await Task.countDocuments({
                ...user.role!=='admin'?{
                    $or: [
                        {who: user._id},
                        {whom: user._id}
                    ]
                }:{},
                del: {$ne: true},
                ...status?{status}:{},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
            })
                .lean()
        }
        return 0
    },
};

const resolversMutation = {
    addTask: async(parent, {whom, date, info}, {user}) => {
        date = new Date(date)
        date.setHours(0, 0, 0, 0)
        if(user.role) {
            let object = new Task({
                whom,
                who: user._id,
                date,
                status: 'обработка',
                info
            });
            await Task.create(object)
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
        if(['admin'].includes(user.role)||object.who===user._id||object.whom===user._id) {
            let history = new History({
                who: user._id,
                where: object._id,
                what: ''
            });
            if (date&&(['admin'].includes(user.role)||object.who===user._id)&&object.status==='обработка') {
                history.what = `Срок:${object.date}→${date};\n`
                date = new Date(date)
                date.setHours(0, 0, 0, 0)
                object.date = date
            }
            if (info&&(['admin'].includes(user.role)||object.who===user._id)&&object.status==='обработка') {
                history.what = `${history.what}Информация:${object.info}→${info};\n`
                object.info = info
            }
            if (object.status!=='проверен') {
                history.what = `${history.what}Статус:${object.status}→${status};`
                object.status = status
            }
            await object.save();
            await History.create(history)
            return 'OK'
        }
        return 'ERROR'
    },
    deleteTask: async(parent, { _id }, {user}) => {
        let object = await Task.findOne({_id})
        if(object&&object.status==='обработка'&&(['admin'].includes(user.role)||object.who===user._id)) {
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