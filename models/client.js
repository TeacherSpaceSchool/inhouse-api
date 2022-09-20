const mongoose = require('mongoose');

const ClientSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserINHOUSE'
    },
    name: String,
    emails: [String],
    phones: [String],
    address: String,
    address1: String,
    geo: [Number],
    info: String,
    work: String,
    passport: String,
    inn: String,
    level: String,
    birthday: Date,
    del: Boolean
}, {
    timestamps: true
});

ClientSchema.index({legalObject: 1})
ClientSchema.index({name: 1})
ClientSchema.index({inn: 1})
ClientSchema.index({del: 1})

const Client = mongoose.model('ClientINHOUSE', ClientSchema);

module.exports = Client;