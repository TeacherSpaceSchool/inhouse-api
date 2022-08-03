const mongoose = require('mongoose');

const CpaSchema = mongoose.Schema({
    name: String,
    emails: [String],
    phones: [String],
    percent: Number,
    info: String,
    del: Boolean
}, {
    timestamps: true
});

CpaSchema.index({name: 1})

const Cpa = mongoose.model('CpaINHOUSE', CpaSchema);

module.exports = Cpa;