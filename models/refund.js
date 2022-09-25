const mongoose = require('mongoose');

const RefundSchema = mongoose.Schema({
    number: String,
    manager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserINHOUSE'
    },
    sale: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SaleINHOUSE'
    },
    currency: String,
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClientINHOUSE'
    },
    itemsRefund: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ItemRefundINHOUSE'
    }],
    store: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoreINHOUSE'
    },
    paymentConfirmation: Boolean,
    paymentAmount: Number,
    amount: Number,
    comment: String,
    discount: Number,
    status: String
}, {
    timestamps: true
});

RefundSchema.index({manager: 1})
RefundSchema.index({client: 1})
RefundSchema.index({status: 1})
RefundSchema.index({store: 1})

const Refund = mongoose.model('RefundINHOUSE', RefundSchema);

module.exports = Refund;