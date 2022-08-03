const mongoose = require('mongoose');

const BalanceClientSchema = mongoose.Schema({
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClientINHOUSE'
    },
    balance: mongoose.Schema.Types.Mixed
}, {
    timestamps: true
});

BalanceClientSchema.index({client: 1})
BalanceClientSchema.index({amount: 1})

const BalanceClient = mongoose.model('BalanceClientINHOUSE', BalanceClientSchema);

module.exports = BalanceClient;