const mongoose = require('mongoose');

const OrderSchema = mongoose.Schema({
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
    paymentConfirmation: Boolean,
    itemsOrder: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ItemOrderINHOUSE'
    }],
    store: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoreINHOUSE'
    },
    amount: Number,
    paid: Number,
    typePayment: String,
    comment: String,
    status: String,
}, {
    timestamps: true
});

OrderSchema.index({manager: 1})
OrderSchema.index({client: 1})
OrderSchema.index({status: 1})
OrderSchema.index({typePayment: 1})
OrderSchema.index({store: 1})

const Order = mongoose.model('OrderINHOUSE', OrderSchema);

module.exports = Order;