const mongoose = require('mongoose');

const BalanceItemSchema = mongoose.Schema({
    store: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoreINHOUSE'
    },
    warehouse: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WarehouseINHOUSE'
    },
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ItemINHOUSE'
    },
    amount: Number
}, {
    timestamps: true
});

BalanceItemSchema.index({warehouse: 1})
BalanceItemSchema.index({item: 1})
BalanceItemSchema.index({amount: 1})

const BalanceItem = mongoose.model('BalanceItemINHOUSE', BalanceItemSchema);

module.exports = BalanceItem;