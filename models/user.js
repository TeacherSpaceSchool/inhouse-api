const mongoose = require('mongoose');
const crypto = require('crypto');

const userSchema = mongoose.Schema({
    login: {
        type: String,
        required: true,
        unique: true
    },
    role: String,
    department: String,
    position: String,
    startWork: Date,
    status: String,
    IP: String,
    passwordHash: String,
    salt: String,
    name: String,
    phones: [String],
    device: String,
    notification: Boolean,
    add: Boolean,
    edit: Boolean,
    deleted: Boolean,
    store: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoreINHOUSE'
    },
    del: Boolean
}, {
    timestamps: true
});

userSchema.virtual('password')
    .set(function (password) {
        this._plainPassword = password;
        if (password) {
            this.salt = crypto.randomBytes(128).toString('base64');
            this.passwordHash = crypto.pbkdf2Sync(password, this.salt, 1, 128, 'sha1');
        } else {
            this.salt = undefined;
            this.passwordHash = undefined;
        }
    })
    .get(function () {
        return this._plainPassword;
    });

userSchema.methods.checkPassword = function (password) {
    if (!password) return false;
    if (!this.passwordHash) return false;
    return crypto.pbkdf2Sync(password, this.salt, 1, 128, 'sha1') == this.passwordHash;
};


userSchema.index({login: 1})
userSchema.index({role: 1})
userSchema.index({name: 1})
userSchema.index({del: 1})
userSchema.index({store: 1})

const User = mongoose.model('UserINHOUSE', userSchema);
/*
User.collection.dropIndex('phone_1', function(err, result) {
    if (err) {
        console.log('Error in dropping index!', err);
    }
});*/

module.exports = User;