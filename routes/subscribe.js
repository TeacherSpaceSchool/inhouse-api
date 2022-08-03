    const express = require('express');
const router = express.Router();
const randomstring = require('randomstring');
const Subscriber = require('../models/subscriber');
const passportEngine = require('../module/passport');
const ModelsError = require('../models/error');
const User = require('../models/user');

router.post('/register', async (req, res) => {
    await passportEngine.getuser(req, res, async (user)=> {
        try {
            let subscriptionModel;
            let number = req.body.number
            subscriptionModel = await Subscriber.findOne({$or: [{number: number}, {endpoint: req.body.endpoint}]})
            if (subscriptionModel) {
                if (user) subscriptionModel.user = user._id
                subscriptionModel.endpoint = req.body.endpoint
                subscriptionModel.keys = req.body.keys
            }
            else {
                number = randomstring.generate({length: 20, charset: 'numeric'});
                while (await Subscriber.findOne({number: number}).select('_id').lean())
                    number = randomstring.generate({length: 20, charset: 'numeric'});
                subscriptionModel = new Subscriber({
                    endpoint: req.body.endpoint,
                    keys: req.body.keys,
                    number: number,
                });
                if (user) subscriptionModel.user = user._id
            }
            if(user) {
                let object = await User.findOne({_id: user._id}).select('notification')
                object.notification = true
                await object.save()
            }
            subscriptionModel.save((err) => {
                if (err) {
                    console.error(`Error occurred while saving subscription. Err: ${err}`);
                    res.status(500).json({
                        error: 'Technical error occurred'
                    });
                } else {
                    console.log('Subscription saved');
                    res.send(subscriptionModel.number)
                }
            });
        } catch (err) {
            let object = new ModelsError({
                err: err.message,
                path: 'register subscribe'
            });
            await ModelsError.create(object)
            console.error(err)
            res.status(501);
            res.end('error')
        }
    })
});

router.post('/unregister', async (req, res) => {
    try{
        let subscriptionModel = await Subscriber.findOne({number: req.body.number})
        let object = await User.findOne({_id: subscriptionModel.user}).select('notification')
        if(object) {
            object.notification = false
            await object.save()
        }
        subscriptionModel.user = null
        await subscriptionModel.save()
    } catch (err) {
        let object = new ModelsError({
            err: err.message,
            path: 'unregister subscribe'
        });
        await ModelsError.create(object)
        console.error(err)
        res.status(501);
        res.end('error')
    }
});

router.post('/delete', async (req, res) => {
    try{
        let subscriptionModel = await Subscriber.findOne({number: req.body.number})
        let object = await User.findOne({_id: subscriptionModel.user}).select('notification')
        if(object) {
            object.notification = false
            await object.save()
        }
        await Subscriber.deleteMany({number: req.body.number})
    } catch (err) {
        let object = new ModelsError({
            err: err.message,
            path: 'delete subscribe'
        });
        await ModelsError.create(object)
        console.error(err)
        res.status(501);
        res.end('error')
    }
});

router.get('/check', async(req, res) => {
    try{
        await Subscriber.findOne()
        res.status(200);
        res.end('ok')
    } catch (err) {
        console.error(err)
        res.status(501);
        res.end('error')
    }
});

module.exports = router;