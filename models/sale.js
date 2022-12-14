const mongoose = require('mongoose');

const SaleSchema = mongoose.Schema({
    number: String,
    deliverymans: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserINHOUSE'
    }],
    manager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserINHOUSE'
    },
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClientINHOUSE'
    },
    itemsSale: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ItemSaleINHOUSE'
    }],
    geo: [Number],
    discount: Number,
    paymentConfirmation: Boolean,
    paymentAmount: Number,
    cpa:  {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CpaINHOUSE'
    },
    promotion:  {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PromotionINHOUSE'
    },
    bonusManager: Number,
    prepaid: Number,
    bonusCpa: Number,
    percentCpa: Number,
    amountStart: Number,
    amountEnd: Number,
    typePayment: String,
    installment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InstallmentINHOUSE'
    },
    address: String,
    addressInfo: String,
    selfDelivery: Boolean,
    delivery: Date,
    deliveryFact: Date,
    status: String,
    comment: String,
    currency: String,
    paid: Number,
    store: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoreINHOUSE'
    },
    order: Boolean,
    divide: Boolean,
    reservations: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ReservationINHOUSE'
    }],
    refunds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RefundINHOUSE'
    }]
}, {
    timestamps: true
});

SaleSchema.index({manager: 1})
SaleSchema.index({client: 1})
SaleSchema.index({cpa: 1})
SaleSchema.index({installment: 1})
SaleSchema.index({status: 1})
SaleSchema.index({typePayment: 1})
SaleSchema.index({store: 1})
SaleSchema.index({delivery: 1})

const Sale = mongoose.model('SaleINHOUSE', SaleSchema);

module.exports = Sale;