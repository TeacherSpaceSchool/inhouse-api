const mongoose = require('mongoose');

const BlogSchema = mongoose.Schema({
    name: String,
    text: String,
}, {
    timestamps: true
});

BlogSchema.index({createdAt: 1})
BlogSchema.index({name: 1})

const Blog = mongoose.model('BlogSALYK', BlogSchema);

module.exports = Blog;