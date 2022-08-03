const mongoose = require('mongoose');

const MoneyArticleSchema = mongoose.Schema({
    name: String,
    del: Boolean
}, {
    timestamps: true
});

MoneyArticleSchema.index({name: 1})

const MoneyArticle = mongoose.model('MoneyArticleINHOUSE', MoneyArticleSchema);

module.exports = MoneyArticle;