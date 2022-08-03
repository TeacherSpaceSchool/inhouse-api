const mongoose = require('mongoose');

const ErrorSchema = mongoose.Schema({
    err: String,
    path: String,
}, {
    timestamps: true
});

const Error = mongoose.model('ErrorINHOUSE', ErrorSchema);

module.exports = Error;