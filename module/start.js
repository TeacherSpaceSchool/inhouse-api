const { createAdmin } = require('./user');
const { Worker, isMainThread } = require('worker_threads');
const { clearDB } = require('./const');

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

    /*await clearDB()*/

    await createAdmin();
    await startResetUnloading()
    await startWebPush()
}

module.exports.start = start;
