const mongoose = require('mongoose');

const SalarySchema = mongoose.Schema({
    employment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserINHOUSE'
    },
    store: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoreINHOUSE'
    },
    date: Date,
    salary: Number,
    premium: Number,
    bid: Number,
    actualDays: Number,
    workingDay: Number,
    debtStart: Number,
    accrued: Number,
    bonus: Number,
    penaltie: Number,
    advance: Number,
    pay: Number,
    paid: Number,
    debtEnd: Number,

}, {
    timestamps: true
});

SalarySchema.index({user: 1})
SalarySchema.index({date: 1})

const Salary = mongoose.model('SalaryINHOUSE', SalarySchema);

module.exports = Salary;