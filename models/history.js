const mongoose = require('mongoose');

const HistorySchema = mongoose.Schema({
    who: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserSALYK'
    },
    what: String,
    where: String
}, {
    timestamps: true
});

HistorySchema.index({where: 1})

const History = mongoose.model('HistorySALYK', HistorySchema);

module.exports = History;