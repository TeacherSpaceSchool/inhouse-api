const mongoose = require('mongoose');

const TariffSchema = mongoose.Schema({
    pkkm: Number,
    ofd: Number,
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserSALYK'
    },
}, {
    timestamps: true
});

TariffSchema.index({createdAt: 1})

const Tariff = mongoose.model('TariffSALYK', TariffSchema);

module.exports = Tariff;