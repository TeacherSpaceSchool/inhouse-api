const mongoose = require('mongoose');

const ConsultationSchema = mongoose.Schema({
    manager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserINHOUSE'
    },
    store: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoreINHOUSE'
    },
    end: Date,
    info: String,
    statusClient: String,
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClientINHOUSE'
    }
}, {
    timestamps: true
});

ConsultationSchema.index({manager: 1})

const Consultation = mongoose.model('ConsultationINHOUSE', ConsultationSchema);

module.exports = Consultation;