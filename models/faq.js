const mongoose = require('mongoose');

const FaqSchema = mongoose.Schema({
    url: String,
    name: String,
    video: String,
    roles:  [String]
}, {
    timestamps: true
});

const Faq = mongoose.model('FaqSALYK', FaqSchema);

module.exports = Faq;