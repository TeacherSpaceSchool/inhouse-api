const express = require('express');
const router = express.Router();
const { sendWebPush } = require('../module/webPush');
const User = require('../models/user');
const NotificationStatistic = require('../models/notificationStatistic');
const ModelsError = require('../models/error');

router.get('/admin', async (req, res) => {
    try{
        let user = await User.findOne({role: {$regex: 'admin', $options: 'i'}}).select('_id').lean()
        if(user){
            sendWebPush({title: 'SALYK.STORE', message: 'Не забудьте сделать свой заказ', user: user._id})
            res.json('Push triggered');
        }
        else {
            res.json('Push error');
        }
    } catch (err) {
        let _object = new ModelsError({
            err: err.message,
            path: 'push admin'
        });
        await ModelsError.create(_object)
        console.error(err)
        res.status(501);
        res.end('error')
    }
});

router.get('/all', async(req, res) => {
    try{
        sendWebPush({title: 'SALYK.STORE', message: 'Не забудьте сделать свой заказ', user: 'all'})
        res.json('Push triggered');
    } catch (err) {
        let _object = new ModelsError({
            err: err.message,
            path: 'push all'
        });
        await ModelsError.create(_object)
        console.error(err)
        res.status(501);
        res.end('error')
    }
});

router.post('/clicknotification', async (req, res) => {
    try{
        //let ip = JSON.stringify(req.ip)
        let object = await NotificationStatistic.findOne({_id: req.body.notification})
        if(object/*&&!object.ips.includes(ip)*/){
            object.click+=1
            //object.ips.push(ip)
            await object.save()
        }
    } catch (err) {
        let _object = new ModelsError({
            err: err.message,
            path: 'clicknotification'
        });
        await ModelsError.create(_object)
        console.error(err)
        res.status(501);
        res.end('error')
    }
});

module.exports = router;