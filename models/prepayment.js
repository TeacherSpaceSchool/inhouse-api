const mongoose = require('mongoose');

const PrepaymentSchema = mongoose.Schema({
    legalObject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LegalObjectSALYK'
    },
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClientSALYK'
    },
    prepayment: Number,
    used: Number,
    balance: Number
}, {
    timestamps: true
});

PrepaymentSchema.index({legalObject: 1})
PrepaymentSchema.index({client: 1})
PrepaymentSchema.index({balance: 1})

const Prepayment = mongoose.model('PrepaymentSALYK', PrepaymentSchema);

module.exports = Prepayment;