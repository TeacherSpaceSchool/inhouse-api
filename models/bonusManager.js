const mongoose = require('mongoose');

const BonusManagerSchema = mongoose.Schema({
    sale: [[Number]],
    saleInstallment: [[Number]],
    order: [[Number]],
    orderInstallment: [[Number]],
    promotion: [[Number]],
    store: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoreINHOUSE'
    }
}, {
    timestamps: true
});

BonusManagerSchema.index({manager: 1})

const BonusManager = mongoose.model('BonusManagerINHOUSE', BonusManagerSchema);

module.exports = BonusManager;