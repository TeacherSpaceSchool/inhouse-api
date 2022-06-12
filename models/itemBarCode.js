const mongoose = require('mongoose');

const ItemBarCodeSchema = mongoose.Schema({
    barCode: String,
    name: String,
    check: Boolean
}, {
    timestamps: true
});

ItemBarCodeSchema.index({barCode: 1})
ItemBarCodeSchema.index({name: 1})
ItemBarCodeSchema.index({check: 1})
ItemBarCodeSchema.index({createdAt: 1})

const ItemBarCode = mongoose.model('ItemBarCodeSALYK', ItemBarCodeSchema);

module.exports = ItemBarCode;