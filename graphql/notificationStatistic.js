const NotificationStatistic = require('../models/notificationStatistic');
const {sendWebPush} = require('../module/webPush');
const { saveImage, urlMain, deleteFile } = require('../module/const');

const type = `
  type NotificationStatistic {
    _id: ID
    createdAt: Date
    title: String
    text: String
    tag: String
    url: String
    delivered: Int
    failed: Int
    click: Int
  }
`;

const query = `
    notificationStatistics(skip: Int, search: String!): [NotificationStatistic]
    notificationStatisticsCount(search: String!): Int
`;

const mutation = `
    addNotificationStatistic(icon: Upload, text: String!, title: String!, tag: String, url: String): NotificationStatistic
`;

const resolvers = {
    notificationStatisticsCount: async(parent, {search}, {user}) => {
        if(['superadmin', 'admin'].includes(user.role)) {
            return await NotificationStatistic.countDocuments({
                $or: [
                    {title: {'$regex': search, '$options': 'i'}},
                    {text: {'$regex': search, '$options': 'i'}},
                    {tag: {'$regex': search, '$options': 'i'}},
                    {url: {'$regex': search, '$options': 'i'}}
                ]
            })
                .lean()
        }
    },
    notificationStatistics: async(parent, {search, skip}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)) {
            return await NotificationStatistic.find({
                $or: [
                    {title: {'$regex': search, '$options': 'i'}},
                    {text: {'$regex': search, '$options': 'i'}},
                    {tag: {'$regex': search, '$options': 'i'}},
                    {url: {'$regex': search, '$options': 'i'}}
                ]
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .sort('-createdAt')
                .lean()
        }
    }
};

const resolversMutation = {
    addNotificationStatistic: async(parent, {text, title, tag , url, icon}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let payload = {title, message: text, user: 'all', tag, url}
            if(icon){
                let { createReadStream, filename } = await icon;
                let stream = createReadStream()
                filename = await saveImage(stream, filename)
                payload.icon = urlMain+filename
            }
            await sendWebPush(payload)
            if(icon)
                await deleteFile(payload.icon)
            return await NotificationStatistic.findOne().sort('-createdAt').lean()
        }
    }
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;