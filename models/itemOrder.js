const mongoose = require('mongoose');

const ItemOrderSchema = mongoose.Schema({
    name: String,
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ItemINHOUSE'
    },
    count: Number,
    price: Number,
    amount: Number,
    characteristics: [[String]],
    status: String,
    unit: String
}, {
    timestamps: true
});

ItemOrderSchema.index({item: 1})
ItemOrderSchema.index({status: 1})

const ItemOrder = mongoose.model('ItemOrderINHOUSE', ItemOrderSchema);

module.exports = ItemOrder;