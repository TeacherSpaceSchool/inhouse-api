const Subscriber = require('../models/subscriber');
const q = require('q');
const webPush = require('web-push');
const keys = require((process.env.URL).trim()!=='http://localhost'?'./../config/keys_prod':'./../config/keys_dev');

let sendWebPush = async({title, message, tag, url, icon, user, users}) => {
    const payload = {
        title: title?title:title,
        message: message?message:message,
        url: url?url:'https://salyk.store',
        icon: icon?icon:'https://salyk.store/192x192.png',
        tag: tag?tag:'salyk.store'
    };
    if(user==='all'){
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
                        for(let i=0; i<pushResults.length; i++){
                            let endpoint = pushResults[i].reason?pushResults[i].reason.endpoint:pushResults[i].value?pushResults[i].value.endpoint:undefined
                            let subscriber = await Subscriber.findOne({endpoint: endpoint})
                            if(pushResults[i].state === 'rejected'||pushResults[i].reason){
                                if(subscriber){
                                    subscriber.status = 'провалено'
                                    await subscriber.save()
                                }
                            }
                            else {
                                if(subscriber){
                                    subscriber.status = 'доставлено'
                                    await subscriber.save()
                                }
                            }
                        }
                    } catch (err) {
                        console.error(err)
                    }
                });
            }
        });
    }
    else if(users) {
        Subscriber.find({user: {$in: users}}, (err, subscriptions) => {
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
        })
    }
    else {
        Subscriber.find({user}, (err, subscriptions) => {
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
        })
    }

}

module.exports.sendWebPush = sendWebPush
