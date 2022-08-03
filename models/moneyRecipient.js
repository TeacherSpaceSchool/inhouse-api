const mongoose = require('mongoose');

const MoneyRecipientSchema = mongoose.Schema({
    name: String,
    del: Boolean
}, {
    timestamps: true
});

MoneyRecipientSchema.index({name: 1})

const MoneyRecipient = mongoose.model('MoneyRecipientINHOUSE', MoneyRecipientSchema);

module.exports = MoneyRecipient;