const mongoose = require('mongoose');

const FullDeleteLegalObjectSchema = mongoose.Schema({
    legalObject: String,
    status: String,
    end: Date
}, {
    timestamps: true
});

const FullDeleteLegalObject = mongoose.model('FullDeleteLegalObjectSALYK', FullDeleteLegalObjectSchema);

module.exports = FullDeleteLegalObject;