const { createAdmin } = require('./user');
const { createMoneyArticle } = require('./moneyArticle');
const { Worker, isMainThread } = require('worker_threads');

let startCloseConsultation = async () => {
    if(isMainThread) {
        let w = new Worker('./thread/closeConsultation.js', {workerData: 0});
        w.on('message', (msg) => {
            console.log('CloseConsultation: '+msg);
        })
        w.on('error', console.error);
        w.on('exit', (code) => {
            if(code !== 0)
                console.error(new Error(`CloseConsultation stopped with exit code ${code}`))
        });
        console.log('CloseConsultation '+w.threadId+ ' run')
    }
}

let startResetUnloading = async () => {
    if(isMainThread) {
        let w = new Worker('./thread/resetUnloading.js', {workerData: 0});
        w.on('message', (msg) => {
            console.log('ResetUnloading: '+msg);
        })
        w.on('error', console.error);
        w.on('exit', (code) => {
            if(code !== 0)
                console.error(new Error(`ResetUnloading stopped with exit code ${code}`))
        });
        console.log('ResetUnloading '+w.threadId+ ' run')
    }
}

let startWebPush = async () => {
    if(isMainThread) {
        let w = new Worker('./thread/webPush.js', {workerData: 0});
        w.on('message', (msg) => {
            console.log('WebPush: '+msg);
        })
        w.on('error', console.error);
        w.on('exit', (code) => {
            if(code !== 0)
                console.error(new Error(`WebPush stopped with exit code ${code}`))
        });
        console.log('WebPush '+w.threadId+ ' run')
    }
}

let start = async () => {
    await createAdmin();
    await createMoneyArticle();
    await startResetUnloading()
    await startWebPush()
    await startCloseConsultation()
}

module.exports.start = start;
