const Subscriber = require('../models/subscriber');
const User = require('../models/user');
const q = require('q');
const webPush = require('web-push');
const keys = require((process.env.URL).trim()!=='http://localhost'?'./../config/keys_prod':'./../config/keys_dev');
const NotificationStatistic = require('../models/notificationStatistic');

let sendWebPush = async({title, message, tag, url, icon, user}) => {
    const payload = {
        title: title?title:title,
        message: message?message:message,
        url: url?url:'https://salyk.store',
        icon: icon?icon:'https://salyk.store/192x192.png',
        tag: tag?tag:'salyk.store'
    };
    if(user==='all'){
        let _object = new NotificationStatistic({
            tag: payload.tag,
            url: payload.url,
            title: payload.title,
            text: payload.message,
            delivered: 0,
            failed: 0,
        });
        _object = await NotificationStatistic.create(_object)
        payload._id = _object._id
        Subscriber.find({}, (err, subscriptions) => {
            if (err) {
                console.error('Error occurred while getting subscriptions');
            } else {
                let parallelSubscriberCalls = subscriptions.map((subscription) => {
                    return new Promise((resolve, reject) => {
                        const pushSubscriber = {
                            endpoint: subscription.endpoint,
                            keys: {
                                p256dh: subscription.keys.p256dh,
                                auth: subscription.keys.auth
                            }
                        };

                        const pushPayload = JSON.stringify(payload);
                        const pushOptions = {
                            vapidDetails: {
                                subject: 'https://salyk.store',
                                privateKey: keys.privateKey,
                                publicKey: keys.publicKey
                            },
                            headers: {}
                        };
                        webPush.sendNotification(
                            pushSubscriber,
                            pushPayload,
                            pushOptions
                        ).then((value) => {
                            resolve({
                                status: true,
                                endpoint: subscription.endpoint,
                                data: value
                            });
                        }).catch((err) => {
                            reject({
                                status: false,
                                endpoint: subscription.endpoint,
                                data: err
                            });
                        });
                    });
                });
                q.allSettled(parallelSubscriberCalls).then(async(pushResults) => {
                    try{
                        let delivered = 0;
                        let failed = 0;
                        for(let i=0; i<pushResults.length; i++){
                            let endpoint = pushResults[i].reason?pushResults[i].reason.endpoint:pushResults[i].value?pushResults[i].value.endpoint:undefined
                            let subscriber = await Subscriber.findOne({endpoint: endpoint})
                            if(pushResults[i].state === 'rejected'||pushResults[i].reason){
                                failed+=1
                                if(subscriber){
                                    subscriber.status = 'провалено'
                                    await subscriber.save()
                                }
                            }
                            else {
                                delivered += 1
                                if(subscriber){
                                    subscriber.status = 'доставлено'
                                    await subscriber.save()
                                }
                            }
                        }
                        _object.delivered = delivered
                        _object.failed = failed
                        await _object.save()
                    } catch (err) {
                        console.error(err)
                    }
                });
            }
        });
    }
    else {
        Subscriber.find({user: user}, (err, subscriptions) => {
            if (err) {
                console.error('Error occurred while getting subscriptions');
            } else {
                let parallelSubscriberCalls = subscriptions.map((subscription) => {
                    return new Promise((resolve, reject) => {
                        const pushSubscriber = {
                            endpoint: subscription.endpoint,
                            keys: {
                                p256dh: subscription.keys.p256dh,
                                auth: subscription.keys.auth
                            }
                        };

                        const pushPayload = JSON.stringify(payload);
                        const pushOptions = {
                            vapidDetails: {
                                subject: 'https://salyk.store',
                                privateKey: keys.privateKey,
                                publicKey: keys.publicKey
                            },
                            headers: {}
                        };
                        webPush.sendNotification(
                            pushSubscriber,
                            pushPayload,
                            pushOptions
                        ).then((value) => {
                            resolve({
                                status: true,
                                endpoint: subscription.endpoint,
                                data: value
                            });
                        }).catch((err) => {
                            reject({
                                status: false,
                                endpoint: subscription.endpoint,
                                data: err
                            });
                        });
                    });
                });
                q.allSettled(parallelSubscriberCalls).then(async (pushResults) => {
                    //console.log(pushResults)
                });
            }
        });
    }

}


let sendWebPushByRolesIds = async ({title, message, url, roles, _ids})=>{
    for(let i = 0; i<roles.length; i++){
        let users
        users = await User.find({role: roles[i]}).distinct('_id').lean()
        for(let i1 = 0; i1<users.length; i1++) {
            await sendWebPush({title, message, url, user: users[i1]})
        }
    }
    for(let i = 0; i<_ids.length; i++) {
        await sendWebPush({title, message, url, user: _ids[i]})
    }

}

module.exports.sendWebPush = sendWebPush
module.exports.sendWebPushByRolesIds = sendWebPushByRolesIds