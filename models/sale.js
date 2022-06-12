const mongoose = require('mongoose');

const SaleSchema = mongoose.Schema({
    number: String,
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
    workShift: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WorkShiftSALYK'
    },
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClientSALYK'
    },
    sale: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SaleSALYK'
    },
    used: Boolean,
    returned: Boolean,
    typePayment: String,
    comment: String,
    type: String,
    paid: Number,
    paidConsignation: Number,
    usedPrepayment: Number,
    change: Number,
    ndsPrecent: Number,
    nspPrecent: Number,
    extra: Number,
    discount: Number,
    amountEnd: Number,
    nds: Number,
    sync: Boolean,
    syncMsg: String,
    nsp: Number,
    docType: String,
    qr: String,
    items: [{
        name: String,
        unit: String,
        count: Number,
        price: Number,
        amountStart: Number,
        discount: Number,
        extra: Number,
        amountEnd: Number,
        nds: Number,
        nsp: Number,
        ndsType: String,
        nspType: String,
        tnved: String,
        mark: Boolean
    }],
}, {
    timestamps: true
});

SaleSchema.index({legalObject: 1})
SaleSchema.index({number: 1})
SaleSchema.index({branch: 1})
SaleSchema.index({cashier: 1})
SaleSchema.index({cashbox: 1})
SaleSchema.index({client: 1})
SaleSchema.index({dateStart: 1})
SaleSchema.index({workShift: 1})
SaleSchema.index({type: 1})

const Sale = mongoose.model('SaleSALYK', SaleSchema);

module.exports = Sale;