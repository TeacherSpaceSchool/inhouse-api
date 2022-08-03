const mongoose = require('mongoose');

const CashboxSchema = mongoose.Schema({
    name: String,
    balance: mongoose.Schema.Types.Mixed,
    store: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoreINHOUSE'
    },
    del: Boolean
}, {
    timestamps: true
});

CashboxSchema.index({store: 1})
CashboxSchema.index({name: 1})

const Cashbox = mongoose.model('CashboxINHOUSE', CashboxSchema);

module.exports = Cashbox;