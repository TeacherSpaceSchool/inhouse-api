const mongoose = require('mongoose');

const InstallmentSchema = mongoose.Schema({
    number: String,
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClientINHOUSE'
    },
    store: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoreINHOUSE'
    },
    grid: mongoose.Schema.Types.Mixed,
    info: String,
    status: String,
    debt: Number,
    sale: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SaleINHOUSE'
    },
    paid: Number,
    amount: Number,
    datePaid: Date
}, {
    timestamps: true
});

InstallmentSchema.index({client: 1})
InstallmentSchema.index({amount: 1})

const Installment = mongoose.model('InstallmentINHOUSE', InstallmentSchema);

module.exports = Installment;