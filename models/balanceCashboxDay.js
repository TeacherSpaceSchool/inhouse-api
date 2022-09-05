const mongoose = require('mongoose');

const BalanceCashboxDaySchema = mongoose.Schema({
    cashbox: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CashboxINHOUSE'
    },
    startBalance: mongoose.Schema.Types.Mixed,
    endBalance: mongoose.Schema.Types.Mixed,
    store: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoreINHOUSE'
    },
    date: Date
}, {
    timestamps: true
});

BalanceCashboxDaySchema.index({store: 1})
BalanceCashboxDaySchema.index({cashbox: 1})

const BalanceCashboxDay = mongoose.model('BalanceCashboxDayINHOUSE', BalanceCashboxDaySchema);

module.exports = BalanceCashboxDay;