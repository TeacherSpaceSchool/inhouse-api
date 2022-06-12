const mongoose = require('mongoose');

const DistrictSchema = mongoose.Schema({
    name: String,
    legalObject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LegalObjectSALYK'
    },
    branchs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BranchSALYK'
    }],
    cashiers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserSALYK'
    }],
    supervisors: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserSALYK'
    }]
}, {
    timestamps: true
});

DistrictSchema.index({legalObject: 1})
DistrictSchema.index({name: 1})
DistrictSchema.index({supervisors: 1})
DistrictSchema.index({branchs: 1})
DistrictSchema.index({cashiers: 1})

const District = mongoose.model('DistrictSALYK', DistrictSchema);

module.exports = District;