const mongoose = require('mongoose');

const BonusManagerSchema = mongoose.Schema({
    manager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserINHOUSE'
    },
    bonus: mongoose.Schema.Types.Mixed,
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