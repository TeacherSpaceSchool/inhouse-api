const mongoose = require('mongoose');

const ClientSchema = mongoose.Schema({
    name: String,
    legalObject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LegalObjectSALYK'
    },
    email: [String],
    phone: [String],
    address: String,
    info: String,
    inn: String,
    del: Boolean
}, {
    timestamps: true
});

ClientSchema.index({legalObject: 1})
ClientSchema.index({name: 1})
ClientSchema.index({inn: 1})
ClientSchema.index({del: 1})

const Client = mongoose.model('ClientSALYK', ClientSchema);

module.exports = Client;