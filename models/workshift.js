const mongoose = require('mongoose');

const WorkShiftSchema = mongoose.Schema({
    legalObject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LegalObjectSALYK'
    },
    branch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BranchSALYK'
    },
    cashier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserSALYK'
    },
    cashbox: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CashboxSALYK'
    },
    number: String,
    start: Date,
    end: Date,
    cashStart: {
        type: Number,
        default: 0
    },
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
    sync: Boolean,
    syncMsg: String,
}, {
    timestamps: true
});

WorkShiftSchema.index({legalObject: 1})
WorkShiftSchema.index({branch: 1})
WorkShiftSchema.index({createdAt: 1})
WorkShiftSchema.index({number: 1})
WorkShiftSchema.index({end: 1})
WorkShiftSchema.index({cashier: 1})
WorkShiftSchema.index({workShift: 1})

const WorkShift = mongoose.model('WorkShiftSALYK', WorkShiftSchema);

module.exports = WorkShift;