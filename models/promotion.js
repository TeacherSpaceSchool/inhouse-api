const mongoose = require('mongoose');

const PromotionSchema = mongoose.Schema({
    store: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoreINHOUSE'
    },
    del: Boolean,
    name: String
}, {
    timestamps: true
});

PromotionSchema.index({del: 1})
PromotionSchema.index({store: 1})
PromotionSchema.index({name: 1})

const Promotion = mongoose.model('PromotionINHOUSE', PromotionSchema);

module.exports = Promotion;