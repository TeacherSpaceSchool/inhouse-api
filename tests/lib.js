const fs = require('fs');
const User = require('../models/user');
const dontDeleteID = []
const objects = {}

module.exports.getTestPdf = () => new Promise(resolve => resolve({
    createReadStream: () => fs.createReadStream('./tests/file/TEST_PDF.pdf'),
    filename: 'TEST_PDF.pdf'
}))

module.exports.generateUsers = async () => {
    //superadmin
    let object = new User({
        login: 'superadmin',
        role: 'superadmin',
        status: 'active',
        statistic: true,
        add: true,
        payment: true,
        password: '12345678',
        name: 'superadmin'
    });
    object = await User.create(object);
    dontDeleteID.push(object._id)
    objects['superadmin'] = object.toJSON()
    //admin
    object = new User({
        login: 'admin',
        role: 'admin',
        status: 'active',
        statistic: true,
        add: true,
        payment: true,
        password: '12345678',
        name: 'admin'
    });
    object = await User.create(object);
    dontDeleteID.push(object._id)
    objects['admin'] = object.toJSON()
}

module.exports.dontDeleteID = dontDeleteID
module.exports.objects = objects
