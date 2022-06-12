const passport = require('passport');
const LocalStrategy = require('passport-local');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const jwtsecret = process.env.jwtsecret.trim();
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const { SingletonRedis } = require('../module/redis')

let start = () => {
    passport.use(new LocalStrategy({
            usernameField: 'login',
            passwordField: 'password',
            session: false
        },
        async function (login, password, done) {
            let allowSignIn = await new SingletonRedis().allowSignIn(login)
            if(allowSignIn.allow){
                User.findOne({login: login}, async (err, user) => {
                    if (err) {
                        return done(err);
                    }
                    else if (!user||!user.checkPassword(password)) {
                        return done(null, false,);
                    }
                    else {
                        await new SingletonRedis().clearSignIn(login)
                        return done(null, user);
                    }
                });
            }
            else {
                return done(null, allowSignIn)
            }
        })
    );
    const jwtOptions = {};
    jwtOptions.jwtFromRequest= ExtractJwt.fromAuthHeaderAsBearerToken();
    jwtOptions.secretOrKey=jwtsecret;
    passport.use(new JwtStrategy(jwtOptions, function (payload, done) {
        User.findOne({login: payload.login}, (err, user) => {
            if (err) {
                return done(err)
            }
            if (user) {
                return done(null, user)
            } else {
                return done(null, false)
            }
        }).lean()
    }));
}

const verifydrole = async (req, res, func) => {
    await passport.authenticate('jwt', async function (err, user) {
        try{
            if (user&&user.status==='active') {
                await func(user.role)
            } else {
                console.error('No such user')
                res.status(401);
                res.end('No such user');
            }
        } catch (err) {
            console.error(err)
            res.status(401);
            res.end('err')
        }
    } )(req, res)
}

const verifydeuser = async (req, res, func) => {
    await passport.authenticate('jwt', async function (err, user) {
        try{
            if (user&&user.status==='active') {
                await func(user)
            } else {
                console.error('No such user')
                res.status(401);
                res.end('No such user');
            }
        } catch (err) {
            console.error(err)
            res.status(401);
            res.end('err')
        }
    } )(req, res)
}

const getuser = async (req, res, func) => {
    await passport.authenticate('jwt', async function (err, user) {
        try{
            await func(user)

        } catch (err) {
            console.error(err)
            res.status(401);
            res.end('err')
        }
    } )(req, res)
}

const verifydeuserGQL = async (req, res) => {
    return new Promise((resolve) => { passport.authenticate('jwt', async function (err, user) {
        try{
            if (user&&user.status==='active') {
                resolve(user)
            } else {
                resolve({})
            }
        } catch (err) {
            console.error(err)
            resolve({})
        }
    } )(req, res)
    })


}

const signinuser = (req, res) => {
    passport.authenticate('local', async function (err, user) {
        try{
            if (user&&user.status==='active') {
                const payload = {
                    id: user._id,
                    login: user.login,
                    status: user.status,
                    role: user.role
                };
                const token = await jwt.sign(payload, jwtsecret);
                await res.status(200);
                await res.clearCookie('jwt');
                await res.cookie('jwt', token, {maxAge: 3650*24*60*60*1000}).end(token);
            } else {
                res.status(401);
                res.end('Login failed',401)
            }
        } catch (err) {
            console.error(err)
            res.status(401);
            res.end('login not be unique')
        }
    })(req, res);
}

const getstatus = async (req, res) => {
    await passport.authenticate('jwt', async function (err, user) {
        try{
            if (user&&user.status==='active') {
                res.status(200);
                res.end(JSON.stringify({status: user.status, role: user.role, id: user._id}))
            } else {
                console.error('No such user')
                res.status(401);
                res.end('No such user');
            }
        } catch (err) {
            console.error(err)
            res.status(401);
            res.end('err')
        }
    } )(req, res)

}

const signupuser = async (req, res) => {
    try{
        let _user = new User({
            login: req.query.login,
            role: 'client',
            status: 'active',
            password: req.query.password,
        });
        const user = await User.create(_user);
        const payload = {
            id: user._id,
            login: user.login,
            status: user.status,
            role: user.role
        };
        const token = jwt.sign(payload, jwtsecret);
        await res.status(200);
        await res.clearCookie('jwt');
        await res.cookie('jwt', token, {maxAge: 3650*24*60*60*1000}).end(token)
    } catch (err) {
        console.error(err)
        res.status(401);
        res.end('login not be unique')
    }
}

const signinuserGQL = (req, res) => {
    return new Promise((resolve) => {
        passport.authenticate('local', async function (err, user) {
            try{
                let error
                if(user.error){
                    error = user.error
                }
                else if(!user){
                    error = 'Неверный логин или пароль'
                }
                else if(user.status!=='active'){
                    error = 'Доступ отключен'
                }
                else if(user.enteredDate&&((new Date()-user.enteredDate)/1000/60/60)<24){
                    error = 'Доступ уже активен'
                }
                if(!error) {
                    if (user.role === 'кассир') {
                        user.enteredDate = new Date()
                        await user.save()
                    }
                    const payload = {
                        id: user._id,
                        login: user.login,
                        status: user.status,
                        role: user.role
                    };
                    const token = await jwt.sign(payload, jwtsecret);
                    await res.clearCookie('jwt');
                    await res.cookie('jwt', token, {maxAge: user.role === 'кассир' ? 24 * 60 * 60 * 1000 : 10 * 365 * 24 * 60 * 60 * 1000});
                    resolve({
                        role: user.role,
                        status: user.status,
                        login: user.login,
                        _id: user._id
                    })
                }
                else {
                    resolve({error})
                }
            } catch (err) {
                console.error(err)
                resolve({error: 'Неверный логин или пароль'})
            }
        })(req, res);
    })
}

const createJwtGQL = async (res, user) => {
    const payload = {
        id: user._id,
        login: user.login,
        status: user.status,
        role: user.role
    };
    const token = await jwt.sign(payload, jwtsecret);
    await res.clearCookie('jwt');
    await res.cookie('jwt', token, {maxAge: 3650*24*60*60*1000 });
}

module.exports.getuser = getuser;
module.exports.createJwtGQL = createJwtGQL;
module.exports.verifydrole = verifydrole;
module.exports.getstatus = getstatus;
module.exports.verifydeuserGQL = verifydeuserGQL;
module.exports.start = start;
module.exports.verifydeuser = verifydeuser;
module.exports.signinuser = signinuser;
module.exports.signinuserGQL = signinuserGQL;
module.exports.signupuser = signupuser;