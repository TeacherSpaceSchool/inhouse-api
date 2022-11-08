const User = require('../models/user');

module.exports.createAdmin = async () => {
    await User.deleteMany({$or:[
        {role: {$ne: 'admin'}, name: 'admin'},
        {role: {$ne: 'admin'}, login: process.env.adminlogin},
        {role: 'admin', login: {$ne: process.env.adminlogin}},
        {role: 'admin', add: {$ne: true}},
        {role: 'admin', edit: {$ne: true}},
        {role: 'admin', deleted: {$ne: true}}
    ]});
    let findAdmin = await User.findOne({role: 'admin', login: process.env.adminlogin});
    if(!findAdmin){
        const _user = new User({
            login: process.env.adminlogin,
            role: 'admin',
            status: 'active',
            password: process.env.adminpass,
            add: true,
            edit: true,
            deleted: true,
            name: 'admin'
        });
        await User.create(_user);
    }
    else if(!findAdmin.checkPassword(process.env.adminpass)) {
        findAdmin.password = process.env.adminpass
        await findAdmin.save()
    }
}
