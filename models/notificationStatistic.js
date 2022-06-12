const mongoose = require('mongoose');

const NotificationStatisticSchema = mongoose.Schema({
    tag: String,
    url: String,
    title: String,
    text: String,
    delivered: Number,
    failed: Number,
    click: {
        type: Number,
        default: 0
    },
    ips: {
        type: [String],
        default: []
    },
    who: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserSALYK'
    },
}, {
    timestamps: true
});

NotificationStatisticSchema.index({createdAt: 1})
NotificationStatisticSchema.index({title: 1})
NotificationStatisticSchema.index({text: 1})
NotificationStatisticSchema.index({url: 1})
NotificationStatisticSchema.index({tag: 1})

const NotificationStatistic = mongoose.model('NotificationStatisticSALYK', NotificationStatisticSchema);

module.exports = NotificationStatistic;