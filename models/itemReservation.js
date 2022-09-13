const mongoose = require('mongoose');

const ItemReservationSchema = mongoose.Schema({
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
    unit: String,
    cost: Number,
    type: String,
    category: String,
    factory: String,
    size: String
}, {
    timestamps: true
});

ItemReservationSchema.index({item: 1})
ItemReservationSchema.index({status: 1})

const ItemReservation = mongoose.model('ItemReservationINHOUSE', ItemReservationSchema);

module.exports = ItemReservation;