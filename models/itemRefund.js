const mongoose = require('mongoose');

const ItemRefundSchema = mongoose.Schema({
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

ItemRefundSchema.index({item: 1})
ItemRefundSchema.index({status: 1})

const ItemRefund = mongoose.model('ItemRefundINHOUSE', ItemRefundSchema);
/*ItemRefund.collection.dropIndex('name_1', function(err, result) {
    if (err) {
        console.log('Error in dropping index!', err);
    }
});*/
module.exports = ItemRefund;