const passport = require('passport');
const LocalStrategy = require('passport-local');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const jwtsecret = process.env.jwtsecret;
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
                if(!error) {
                    const payload = {
                        id: user._id,
                        login: user.login,
                        status: user.status,
                        role: user.role
                    };
                    const token = await jwt.sign(payload, jwtsecret);
                    await res.clearCookie('jwt');
                    await res.cookie('jwt', token, {maxAge: 10 * 365 * 24 * 60 * 60 * 1000});
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
module.exports.verifydeuserGQL = verifydeuserGQL;
module.exports.start = start;
module.exports.signinuserGQL = signinuserGQL;
