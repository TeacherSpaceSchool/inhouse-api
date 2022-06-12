const mongoose = require('mongoose');

const BranchSchema = mongoose.Schema({
    legalObject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LegalObjectSALYK'
    },
    bType: String,
    pType: String,
    ugns: String,
    name: String,
    address: String,
    status: String,
    geo: [Number],
    uniqueId: String,
    sync: Boolean,
    syncMsg: String,
    del: Boolean
}, {
    timestamps: true
});

BranchSchema.index({legalObject: 1})
BranchSchema.index({createdAt: 1})
BranchSchema.index({name: 1})
BranchSchema.index({del: 1})
BranchSchema.index({sync: 1})

const Branch = mongoose.model('BranchSALYK', BranchSchema);

module.exports = Branch;