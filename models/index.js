let mongoose = require('mongoose');
let connect = function() {
    mongoose.connect('mongodb://localhost:27017/admin',
        {
            ...process.env.pass&&process.env.user? {user: process.env.user, pass: process.env.pass}:{},
            keepAlive: 1,
            useNewUrlParser: true,
            connectTimeoutMS: 30000,
            useUnifiedTopology: true,
        },
        function (err) {

            if (err) {
                throw err;
            }
            console.log('Successfully connected');

        }
    );
};
module.exports.connect = connect;

let connectTest = function() {
    mongoose.connect('mongodb://localhost:27017/test',
        {
            keepAlive: 1,
            useNewUrlParser: true,
            connectTimeoutMS: 30000,
            useUnifiedTopology: true,
        },
        function (err) {
            if (err) {
                throw err;
            }
        }
    );
};
module.exports.connectTest = connectTest;