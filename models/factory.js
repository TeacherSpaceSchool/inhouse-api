const mongoose = require('mongoose');

const FactorySchema = mongoose.Schema({
    name: String,
    del: Boolean
}, {
    timestamps: true
});

FactorySchema.index({name: 1})

const Factory = mongoose.model('FactoryINHOUSE', FactorySchema);

module.exports = Factory;