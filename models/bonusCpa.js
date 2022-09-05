const mongoose = require('mongoose');

const BonusCpaSchema = mongoose.Schema({
    sale: [[Number]],
    order: [[Number]],
    installment: [[Number]],
    store: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoreINHOUSE'
    }
}, {
    timestamps: true
});

BonusCpaSchema.index({manager: 1})

const BonusCpa = mongoose.model('BonusCpaINHOUSE', BonusCpaSchema);

module.exports = BonusCpa;