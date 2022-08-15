const User = require('../models/user');

module.exports.createAdmin = async () => {
    await User.deleteMany({$or:[
        {role: {$ne: 'admin'}, name: 'admin'},
        {role: {$ne: 'admin'}, login: process.env.adminlogin.trim()},
        {role: 'admin', login: {$ne: process.env.adminlogin.trim()}},
        {role: 'admin', add: {$ne: true}},
        {role: 'admin', edit: {$ne: true}},
        {role: 'admin', deleted: {$ne: true}}
    ]});
    let findAdmin = await User.findOne({role: 'admin', login: process.env.adminlogin.trim()});
    if(!findAdmin){
        const _user = new User({
            login: process.env.adminlogin.trim(),
            role: 'admin',
            status: 'active',
            password: process.env.adminpass.trim(),
            add: true,
            edit: true,
            deleted: true,
            name: 'admin'
        });
        await User.create(_user);
    }
    else if(!findAdmin.checkPassword(process.env.adminpass.trim()))
        await User.updateOne({login: 'admin'}, {password: process.env.adminpass.trim()})
}
