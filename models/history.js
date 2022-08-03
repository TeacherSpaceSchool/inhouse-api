const mongoose = require('mongoose');

const HistorySchema = mongoose.Schema({
    who: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserINHOUSE'
    },
    what: String,
    where: String
}, {
    timestamps: true
});

HistorySchema.index({where: 1})

const History = mongoose.model('HistoryINHOUSE', HistorySchema);

module.exports = History;