const mongoose = require('mongoose');

const ReportSchema = mongoose.Schema({
    legalObject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LegalObjectSALYK'
    },
    workShift: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WorkShiftSALYK'
    },
    branch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BranchSALYK'
    },
    cashbox: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CashboxSALYK'
    },
    number: String,
    type: String,
    start: Date,
    end: Date,
    sync: Boolean,
    syncMsg: String,
    cashEnd: {
        type: Number,
        default: 0
    },
    deposit: {
        type: Number,
        default: 0
    },
    withdraw: {
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    extra: {
        type: Number,
        default: 0
    },
    cash: {
        type: Number,
        default: 0
    },
    cashless: {
        type: Number,
        default: 0
    },
    saleAll: {
        type: Number,
        default: 0
    },
    consignationAll: {
        type: Number,
        default: 0
    },
    paidConsignationAll: {
        type: Number,
        default: 0
    },
    prepaymentAll: {
        type: Number,
        default: 0
    },
    returnedAll: {
        type: Number,
        default: 0
    },
    buyAll: {
        type: Number,
        default: 0
    },
    returnedBuyAll: {
        type: Number,
        default: 0
    },
    sale: {
        type: Number,
        default: 0
    },
    saleCount: {
        type: Number,
        default: 0
    },
    consignation: {
        type: Number,
        default: 0
    },
    consignationCount: {
        type: Number,
        default: 0
    },
    paidConsignation: {
        type: Number,
        default: 0
    },
    paidConsignationCount: {
        type: Number,
        default: 0
    },
    prepayment: {
        type: Number,
        default: 0
    },
    prepaymentCount: {
        type: Number,
        default: 0
    },
    returned: {
        type: Number,
        default: 0
    },
    returnedCount: {
        type: Number,
        default: 0
    },
    buy: {
        type: Number,
        default: 0
    },
    buyCount: {
        type: Number,
        default: 0
    },
    returnedBuy: {
        type: Number,
        default: 0
    },
    returnedBuyCount: {
        type: Number,
        default: 0
    },
}, {
    timestamps: true
});

ReportSchema.index({legalObject: 1})
ReportSchema.index({cashbox: 1})
ReportSchema.index({createdAt: 1})
ReportSchema.index({type: 1})

const Report = mongoose.model('ReportSALYK', ReportSchema);

module.exports = Report;