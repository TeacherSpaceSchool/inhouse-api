const mongoose = require('mongoose');

const WarehouseSchema = mongoose.Schema({
    hide: Boolean,
    name: String,
    store: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoreINHOUSE'
    },
    del: Boolean
}, {
    timestamps: true
});

WarehouseSchema.index({name: 1})

const Warehouse = mongoose.model('WarehouseINHOUSE', WarehouseSchema);

module.exports = Warehouse;