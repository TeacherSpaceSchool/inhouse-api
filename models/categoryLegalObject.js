const mongoose = require('mongoose');

const CategoryLegalObjectSchema = mongoose.Schema({
    categorys: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CategorySALYK'
    }],
    legalObject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LegalObjectSALYK'
    },
}, {
    timestamps: true
});

CategoryLegalObjectSchema.index({legalObject: 1})

const CategoryLegalObject = mongoose.model('CategoryLegalObjectSALYK', CategoryLegalObjectSchema);

module.exports = CategoryLegalObject;