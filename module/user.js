const User = require('../models/user');
const Branch = require('../models/branch');
const IntegrationObject = require('../models/integrationObject');
const WorkShift = require('../models/workshift');
const randomstring = require('randomstring');
const History = require('../models/history');
let superadminId = '';

module.exports.getSuperadminId = () => {
    return superadminId
}

module.exports.checkSuperadmin = async (role, status) => {
    return (role=='superadmin'&&status=='active')
}

module.exports.createAdmin = async () => {
    await User.deleteMany({$or:[
        {login: process.env.superadminlogin.trim(), role: {$ne: 'superadmin'}},
        {role: 'superadmin', login: {$ne: process.env.superadminlogin.trim()}},
    ]});
    let findAdmin = await User.findOne({role: 'superadmin', login: process.env.superadminlogin.trim()});
    if(!findAdmin){
        const _user = new User({
            login: process.env.superadminlogin.trim(),
            role: 'superadmin',
            status: 'active',
            statistic: true,
            add: true,
            payment: true,
            password: process.env.superadminpass.trim(),
            name: 'superadmin'
        });
        findAdmin = await User.create(_user);
    }
    superadminId = findAdmin._id.toString();
}

module.exports.getIntegrationUsers = async ({skip, branch, legalObject, role}) => {
    let resIntegrationObject = {}, res = []
    if(branch){
        let _branch = await IntegrationObject.findOne({
            UUID: branch,
            legalObject,
            branch: {$ne: null}
        })
            .select('branch')
            .lean();
        if(_branch)
            branch = _branch.branch
    }
    let _res = await User.find({
        legalObject,
        ...role?{role}:{role: {$in: ['кассир', 'супервайзер']}},
        ...branch?{branch}:{},
        del: {$ne: true},
    })
        .skip(skip != undefined ? skip : 0)
        .limit(skip != undefined ? 100 : 10000000000)
        .sort('name')
        .select('_id name branch role')
        .lean()
    let _resIntegrationObject = await IntegrationObject.find({
        legalObject,
        $or: [
            {branch: {$ne: null}},
            {user: {$ne: null}}
        ]
    })
        .select('branch user UUID')
        .lean()
    for(let i=0; i<_resIntegrationObject.length; i++){
        if(_resIntegrationObject[i].branch)
            resIntegrationObject[_resIntegrationObject[i].branch] = _resIntegrationObject[i].UUID
        if(_resIntegrationObject[i].user)
            resIntegrationObject[_resIntegrationObject[i].user] = _resIntegrationObject[i].UUID
    }
    for(let i=0; i<_res.length; i++) {
        res[i] = {
            UUID: resIntegrationObject[_res[i]._id]?resIntegrationObject[_res[i]._id]:_res[i]._id,
            name: _res[i].name,
            role: _res[i].role,
            branch: resIntegrationObject[_res[i].branch]?resIntegrationObject[_res[i].branch]:_res[i].branch
        }
    }
    return {status: 'успех', res}
}

module.exports.getIntegrationUser = async ({UUID, legalObject}) => {
    let resIntegrationObject = await IntegrationObject.findOne({
        UUID,
        legalObject,
        user: {$ne: null}
    })
        .select('user')
        .lean();
    if(resIntegrationObject)
        UUID = resIntegrationObject.user;
    let res = await User.findOne({
        legalObject,
        _id: UUID,
        del: {$ne: true},
    })
        .select('name phone branch role email')
        .lean()
    if(res) {
        delete res._id
        if(res.branch) {
            let branch = await IntegrationObject.findOne({
                branch: res.branch,
                legalObject
            })
                .select('UUID')
                .lean();
            if (branch)
                res.branch = branch.UUID
        }
    }
    return {status: 'успех', res}
}

module.exports.putIntegrationUser = async ({legalObject, UUID, newUUID, branch, del}) => {
    if(UUID){
        if(del===true||del==='true') {
            let _UUID = await IntegrationObject.findOne({
                legalObject,
                $or: [{user: UUID}, {UUID: UUID}]
            }).select('user UUID').lean()
            if (_UUID)
                UUID = _UUID.user
            let user = await User.findOne({
                legalObject,
                _id: UUID
            })
            if(user) {
                user.del = true
                user.login = randomstring.generate({length: 10, charset: 'numeric'});
                user.save()

                let history = new History({
                    where: user._id,
                    what: 'API: Удаление'
                });
                await History.create(history)

                await IntegrationObject.deleteOne({user: user._id})
                return {
                    status: 'успех'
                }
            }
            else
                return {
                    status: 'ошибка'
                }
        }
        else {
            if (newUUID && !(await IntegrationObject.findOne({legalObject, UUID: newUUID}).select('_id').lean())) {
                let _UUID = await IntegrationObject.findOne({
                    legalObject,
                    $or: [{user: UUID}, {UUID: UUID}]
                })
                if (_UUID) {
                    _UUID.UUID = newUUID
                    await _UUID.save()
                }
                else {
                    let user = await User.findOne({
                        legalObject,
                        _id: UUID
                    }).select('_id').lean()
                    if (user) {
                        _UUID = new IntegrationObject({
                            legalObject, UUID: newUUID, user: user._id
                        });
                        await IntegrationObject.create(_UUID)
                    }
                    else
                        return {
                            status: 'ошибка'
                        }
                }
                return {
                    status: 'успех',
                    res: newUUID
                }
            }
            else if (branch) {
                let _UUID = await IntegrationObject.findOne({
                    legalObject,
                    $or: [{user: UUID}, {UUID: UUID}]
                }).select('user UUID').lean()
                if (_UUID)
                    UUID = _UUID.user
                let user = await User.findOne({
                    legalObject,
                    _id: UUID
                })
                if (user&&!(await WorkShift.findOne({cashier: user._id, end: null}).select('_id').lean())) {
                    let resIntegrationObject = await IntegrationObject.findOne({
                        UUID: branch,
                        legalObject,
                        branch: {$ne: null}
                    })
                        .select('branch')
                        .lean();
                    if (resIntegrationObject)
                        branch = resIntegrationObject.branch;
                    if (await Branch.findOne({_id: branch}).select('_id').lean()) {
                        user.branch = branch
                        let history = new History({
                            where: user._id,
                            what: `API: branch:${user.branch}→${branch};`
                        });
                        await History.create(history)
                        await user.save()
                    }
                    else
                        return {
                            status: 'ошибка'
                        }
                    return {
                        status: 'успех',
                        res: _UUID?_UUID.UUID:UUID
                    }
                }
                else
                    return {
                        status: 'ошибка'
                    }
            }
            else
                return {
                    status: 'ошибка'
                }
        }
    }
    else
        return {
            status: 'ошибка'
        }
}
