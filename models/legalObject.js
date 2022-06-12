const mongoose = require('mongoose');

const LegalObjectSchema = mongoose.Schema({
    name: String,
    inn: {
        type: String,
        required: true,
        unique: true
    },
    rateTaxe: String,
    ndsType: String,
    nspType: String,
    address: String,
    phone: [String],
    status: String,
    taxpayerType: String,
    email: [String],
    ugns: String,
    responsiblePerson: String,
    regType: String,
    del: Boolean,
    payment: Boolean,
    sync: Boolean,
    syncMsg: String,
    ofd: {
        type: Boolean,
        default: true
    },
    agent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserSALYK'
    },
}, {
    timestamps: true
});

LegalObjectSchema.index({name: 1})
LegalObjectSchema.index({del: 1})
LegalObjectSchema.index({ofd: 1})
LegalObjectSchema.index({inn: 1})
LegalObjectSchema.index({agent: 1})

const LegalObject = mongoose.model('LegalObjectSALYK', LegalObjectSchema);

module.exports = LegalObject;