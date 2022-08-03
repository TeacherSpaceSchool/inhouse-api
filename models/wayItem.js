const mongoose = require('mongoose');

const WayItemSchema = mongoose.Schema({
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ItemINHOUSE'
    },
    store: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoreINHOUSE'
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrderINHOUSE'
    },
    bookings: mongoose.Schema.Types.Mixed,
    amount: Number,
    status: String,
    arrivalDate: Date
}, {
    timestamps: true
});

WayItemSchema.index({item: 1})

const WayItem = mongoose.model('WayItemINHOUSE', WayItemSchema);

module.exports = WayItem;