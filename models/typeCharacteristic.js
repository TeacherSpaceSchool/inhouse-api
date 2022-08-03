const mongoose = require('mongoose');

const TypeCharacteristicSchema = mongoose.Schema({
    name: String
}, {
    timestamps: true
});

TypeCharacteristicSchema.index({name: 1})

const TypeCharacteristic = mongoose.model('TypeCharacteristicINHOUSE', TypeCharacteristicSchema);

module.exports = TypeCharacteristic;