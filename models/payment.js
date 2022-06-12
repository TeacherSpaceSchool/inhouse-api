const mongoose = require('mongoose');

const PaymentSchema = mongoose.Schema({
    paymentSystem: String,
    number: String,
    data: String,
    amount: Number,
    months: Number,
    days: Number,
    paid: Number,
    status: String,
    password: String,
    type: String,
    change: Number,
    qr: String,
    refund: Boolean,
    legalObject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LegalObjectSALYK'
    },
    cashboxes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CashboxSALYK'
    }],
    who: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserSALYK'
    }
}, {
    timestamps: true
});

PaymentSchema.index({createdAt: 1})
PaymentSchema.index({legalObject: 1})
PaymentSchema.index({paymentSystem: 1})

const Payment = mongoose.model('PaymentSALYK', PaymentSchema);

module.exports = Payment;