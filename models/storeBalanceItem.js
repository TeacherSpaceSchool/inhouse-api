const mongoose = require('mongoose');

const StoreBalanceItemSchema = mongoose.Schema({
    store: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoreINHOUSE'
    },
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ItemINHOUSE'
    },
    amount: Number,
    free: Number,
    reservation: Number,
    sale: Number,
}, {
    timestamps: true
});

StoreBalanceItemSchema.index({store: 1})
StoreBalanceItemSchema.index({item: 1})

const StoreBalanceItem = mongoose.model('StoreBalanceItemINHOUSE', StoreBalanceItemSchema);

module.exports = StoreBalanceItem;