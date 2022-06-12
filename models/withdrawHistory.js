const mongoose = require('mongoose');

const WithdrawHistorySchema = mongoose.Schema({
    number: String,
    comment: String,
    amount: Number,
    syncMsg: String,
    legalObject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LegalObjectSALYK'
    },
    branch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BranchSALYK'
    },
    cashier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserSALYK'
    },
    workShift: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WorkShiftSALYK'
    },
    cashbox: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CashboxSALYK'
    }
}, {
    timestamps: true
});

WithdrawHistorySchema.index({legalObject: 1})
WithdrawHistorySchema.index({branch: 1})
WithdrawHistorySchema.index({createdAt: 1})
WithdrawHistorySchema.index({cashbox: 1})
WithdrawHistorySchema.index({cashier: 1})
WithdrawHistorySchema.index({workShift: 1})

const WithdrawHistory = mongoose.model('WithdrawHistorySALYK', WithdrawHistorySchema);

module.exports = WithdrawHistory;