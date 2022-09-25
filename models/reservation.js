const mongoose = require('mongoose');

const ReservationSchema = mongoose.Schema({
    number: String,
    amount: Number,
    currency: String,
    manager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserINHOUSE'
    },
    sale: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SaleINHOUSE'
    },
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClientINHOUSE'
    },
    paymentConfirmation: Boolean,
    itemsReservation: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ItemReservationINHOUSE'
    }],
    store: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoreINHOUSE'
    },
    term: Date,
    paid: Number,
    paymentAmount: Number,
    typePayment: String,
    comment: String,
    status: String,
}, {
    timestamps: true
});

ReservationSchema.index({manager: 1})
ReservationSchema.index({client: 1})
ReservationSchema.index({status: 1})
ReservationSchema.index({typePayment: 1})
ReservationSchema.index({store: 1})

const Reservation = mongoose.model('ReservationINHOUSE', ReservationSchema);

module.exports = Reservation;