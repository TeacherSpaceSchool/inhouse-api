const mongoose = require('mongoose');

const BalanceItemDaySchema = mongoose.Schema({
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
    startAmount: Number,
    endAmount: Number,
    plus: Number,
    minus: Number,
    date: Date
}, {
    timestamps: true
});

BalanceItemDaySchema.index({store: 1})
BalanceItemDaySchema.index({warehouse: 1})
BalanceItemDaySchema.index({item: 1})

const BalanceItemDay = mongoose.model('BalanceItemDayINHOUSE', BalanceItemDaySchema);

module.exports = BalanceItemDay;