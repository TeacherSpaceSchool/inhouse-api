const mongoose = require('mongoose');

const CharacteristicSchema = mongoose.Schema({
    name: String
}, {
    timestamps: true
});

CharacteristicSchema.index({type: 1})
CharacteristicSchema.index({name: 1})

const Characteristic = mongoose.model('CharacteristicINHOUSE', CharacteristicSchema);

module.exports = Characteristic;