const mongoose = require('mongoose');

const ApplicationToConnectSchema = mongoose.Schema({
    taken: Boolean,
    name: String,
    phone: String,
    address: String,
    comment: String,
    who: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserSALYK'
    },
    whereKnow: String
}, {
    timestamps: true
});

ApplicationToConnectSchema.index({createdAt: 1})
ApplicationToConnectSchema.index({taken: 1})

const ApplicationToConnect = mongoose.model('ApplicationToConnectSALYK', ApplicationToConnectSchema);

module.exports = ApplicationToConnect;