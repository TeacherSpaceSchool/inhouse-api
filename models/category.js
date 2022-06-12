const mongoose = require('mongoose');

const CategorySchema = mongoose.Schema({
    type: String,
    name: String,
    del: Boolean,
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CategorySALYK'
    },
}, {
    timestamps: true
});

CategorySchema.index({type: 1})
CategorySchema.index({category: 1})
CategorySchema.index({del: 1})
CategorySchema.index({name: 1})

const Category = mongoose.model('CategorySALYK', CategorySchema);

module.exports = Category;