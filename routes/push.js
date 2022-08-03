const express = require('express');
const router = express.Router();
const { sendWebPush } = require('../module/webPush');
const User = require('../models/user');
const ModelsError = require('../models/error');

router.get('/admin', async (req, res) => {
    try{
        let user = await User.findOne({role: {$regex: 'admin', $options: 'i'}}).select('_id').lean()
        if(user){
            sendWebPush({title: 'Inhouse', message: 'Просто будь собой! Удачного дня!', user: user._id})
            res.json('Push triggered');
        }
        else {
            res.json('Push error');
        }
    } catch (err) {
        let object = new ModelsError({
            err: err.message,
            path: 'push admin'
        });
        await ModelsError.create(object)
        console.error(err)
        res.status(501);
        res.end('error')
    }
});

router.get('/all', async(req, res) => {
    try{
        sendWebPush({title: 'Inhouse', message: 'Просто будь собой! Удачного дня!', user: 'all'})
        res.json('Push triggered');
    } catch (err) {
        let object = new ModelsError({
            err: err.message,
            path: 'push all'
        });
        await ModelsError.create(object)
        console.error(err)
        res.status(501);
        res.end('error')
    }
});

module.exports = router;