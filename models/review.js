const mongoose = require('mongoose');

const ReviewSchema = mongoose.Schema({
    legalObject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LegalObjectSALYK'
    },
    taken: Boolean,
    type: String,
    who: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserSALYK'
    },
    text: String
}, {
    timestamps: true
});

ReviewSchema.index({legalObject: 1})
ReviewSchema.index({taken: 1})

const Review = mongoose.model('ReviewSALYK', ReviewSchema);

module.exports = Review;