const mongoose = require('mongoose');

const ItemSchema = mongoose.Schema({
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CategorySALYK'
    },
    legalObject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LegalObjectSALYK'
    },
    priority: Number,
    price: Number,
    unit: String,
    barCode: String,
    name: String,
    type: String,
    del: Boolean,
    quick: Boolean,
    editedPrice: Boolean,
    tnved: String,
    mark: Boolean,
}, {
    timestamps: true
});

ItemSchema.index({legalObject: 1})
ItemSchema.index({type: 1})
ItemSchema.index({category: 1})
ItemSchema.index({name: 1})

const Item = mongoose.model('ItemSALYK', ItemSchema);

module.exports = Item;