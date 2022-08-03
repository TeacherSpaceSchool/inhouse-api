const mongoose = require('mongoose');

const ItemSaleSchema = mongoose.Schema({
    name: String,
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ItemINHOUSE'
    },
    count: Number,
    price: Number,
    amount: Number,
    characteristics: [[String]],
    unit: String,
    status: String
}, {
    timestamps: true
});

ItemSaleSchema.index({item: 1})
ItemSaleSchema.index({status: 1})

const ItemSale = mongoose.model('ItemSaleINHOUSE', ItemSaleSchema);

module.exports = ItemSale;