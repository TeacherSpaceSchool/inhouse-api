const mongoose = require('mongoose');

const ConsignationSchema = mongoose.Schema({
    legalObject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LegalObjectSALYK'
    },
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClientSALYK'
    },
    consignation: Number,
    paid: Number,
    debt: Number
}, {
    timestamps: true
});

ConsignationSchema.index({legalObject: 1})
ConsignationSchema.index({client: 1})
ConsignationSchema.index({debt: 1})

const Consignation = mongoose.model('ConsignationSALYK', ConsignationSchema);

module.exports = Consignation;