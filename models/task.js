const mongoose = require('mongoose');

const TaskSchema = mongoose.Schema({
    who: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserINHOUSE'
    },
    whom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserINHOUSE'
    },
    date: Date,
    status: String,
    info: String,
}, {
    timestamps: true
});

TaskSchema.index({who: 1})
TaskSchema.index({whom: 1})
TaskSchema.index({date: 1})
TaskSchema.index({status: 1})

const Task = mongoose.model('TaskINHOUSE', TaskSchema);

module.exports = Task;