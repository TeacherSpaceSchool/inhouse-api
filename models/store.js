const mongoose = require('mongoose');

const StoreSchema = mongoose.Schema({
    name: String,
    del: Boolean
}, {
    timestamps: true
});

StoreSchema.index({name: 1})

const Store = mongoose.model('StoreINHOUSE', StoreSchema);

module.exports = Store;