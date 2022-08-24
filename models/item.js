const mongoose = require('mongoose');

const ItemSchema = mongoose.Schema({
    name: String,
    ID: String,
    del: Boolean,
    images: [String],
    priceUSD: Number,
    primeCostUSD: Number,
    priceKGS: Number,
    primeCostKGS: Number,
    typeDiscount: String,
    type: String,
    discount: Number,
    priceAfterDiscountKGS: Number,
    info: String,
    unit: String,
    art: String,
    size: String,
    characteristics: [[String]],
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CategoryINHOUSE'
    },
    factory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FactoryINHOUSE'
    },
}, {
    timestamps: true
});

ItemSchema.index({factory: 1})
ItemSchema.index({ID: 1})
ItemSchema.index({category: 1})
ItemSchema.index({name: 1})

const Item = mongoose.model('ItemINHOUSE', ItemSchema);

module.exports = Item;