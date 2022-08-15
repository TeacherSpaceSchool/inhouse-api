const mongoose = require('mongoose');

const MoneyFlowSchema = mongoose.Schema({
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClientINHOUSE'
    },
    employment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserINHOUSE'
    },
    moneyRecipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MoneyRecipientINHOUSE'
    },
    moneyArticle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MoneyArticleINHOUSE'
    },
    cashbox: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CashboxINHOUSE'
    },
    store: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoreINHOUSE'
    },
    cashboxRecipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CashboxINHOUSE'
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrderINHOUSE'
    },
    sale: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SaleINHOUSE'
    },
    reservation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ReservationINHOUSE'
    },
    refund: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RefundINHOUSE'
    },
    installment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InstallmentINHOUSE'
    },
    installmentMonth: Date,
    number: String,
    operation: String,
    info: String,
    amount: Number,
    currency: String,
    date: Date,
}, {
    timestamps: true
});

MoneyFlowSchema.index({client: 1})
MoneyFlowSchema.index({employment: 1})
MoneyFlowSchema.index({moneyRecipient: 1})
MoneyFlowSchema.index({moneyArticle: 1})
MoneyFlowSchema.index({operation: 1})
MoneyFlowSchema.index({cashbox: 1})

const MoneyFlow = mongoose.model('MoneyFlowINHOUSE', MoneyFlowSchema);

module.exports = MoneyFlow;