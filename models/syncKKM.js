const mongoose = require('mongoose');

const SyncKKMSchema = mongoose.Schema({
    legalObjects: Number,
    branchs: Number,
    cashboxes: Number,
    workShifts: Number,
    sales: Number,
    reports: Number,
    end: Date
}, {
    timestamps: true
});

SyncKKMSchema.index({end: 1})
SyncKKMSchema.index({createdAt: 1})

const SyncKKM = mongoose.model('SyncKKMSALYK', SyncKKMSchema);

module.exports = SyncKKM;