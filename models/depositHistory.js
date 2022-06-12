const mongoose = require('mongoose');

const DepositHistorySchema = mongoose.Schema({
    number: String,
    comment: String,
    amount: Number,
    legalObject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LegalObjectSALYK'
    },
    syncMsg: String,
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

DepositHistorySchema.index({legalObject: 1})
DepositHistorySchema.index({branch: 1})
DepositHistorySchema.index({createdAt: 1})
DepositHistorySchema.index({cashbox: 1})
DepositHistorySchema.index({cashier: 1})
DepositHistorySchema.index({workShift: 1})


const DepositHistory = mongoose.model('DepositHistorySALYK', DepositHistorySchema);

module.exports = DepositHistory;