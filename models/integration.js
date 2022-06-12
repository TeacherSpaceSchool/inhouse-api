const mongoose = require('mongoose');

const IntegrationSchema = mongoose.Schema({
    legalObject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LegalObjectSALYK'
    },
    IP: String,
    password: String
}, {
    timestamps: true
});

IntegrationSchema.index({legalObject: 1})
IntegrationSchema.index({password: 1})
IntegrationSchema.index({IP: 1})

const Integration = mongoose.model('IntegrationSALYK', IntegrationSchema);

module.exports = Integration;