const mongoose = require('mongoose');

const CategorySchema = mongoose.Schema({
    name: String,
    del: Boolean
}, {
    timestamps: true
});

CategorySchema.index({del: 1})
CategorySchema.index({name: 1})

const Category = mongoose.model('CategoryINHOUSE', CategorySchema);

module.exports = Category;