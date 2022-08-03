const mongoose = require('mongoose');

const FaqSchema = mongoose.Schema({
    url: String,
    name: String,
    text: String,
    video: String
}, {
    timestamps: true
});

const Faq = mongoose.model('FaqINHOUSE', FaqSchema);

module.exports = Faq;