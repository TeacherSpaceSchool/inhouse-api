const mongoose = require('mongoose');

const IntegrationObjectSchema = mongoose.Schema({
    legalObject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LegalObjectSALYK'
    },
    type: String,
    UUID: String,
    branch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BranchSALYK'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserSALYK'
    },
    cashbox: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CashboxSALYK'
    },
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClientSALYK'
    },
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ItemSALYK'
    },
    district: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DistrictSALYK'
    },
}, {
    timestamps: true
});

IntegrationObjectSchema.index({legalObject: 1})
IntegrationObjectSchema.index({password: 1})
IntegrationObjectSchema.index({IP: 1})

const IntegrationObject = mongoose.model('IntegrationObjectSALYK', IntegrationObjectSchema);

module.exports = IntegrationObject;