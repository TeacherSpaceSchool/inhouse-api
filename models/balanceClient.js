const mongoose = require('mongoose');

const BalanceClientSchema = mongoose.Schema({
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClientINHOUSE'
    },
    balance: Number
}, {
    timestamps: true
});

BalanceClientSchema.index({client: 1})
BalanceClientSchema.index({amount: 1})

const BalanceClient = mongoose.model('BalanceClientINHOUSE', BalanceClientSchema);

module.exports = BalanceClient;