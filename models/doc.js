const mongoose = require('mongoose');

const DocSchema = mongoose.Schema({
    name: String,
    address: String,
    inn: String,
    okpo: String,
    bank: String,
    bik: String,
    wallet: String,
    court: String,
    phoneCheckInstallment: String,
    account: String,
    director: String,
}, {
    timestamps: true
});

const Doc = mongoose.model('DocINHOUSE', DocSchema);

module.exports = Doc;