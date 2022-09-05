const { createAdmin } = require('./user');
const { createMoneyArticle } = require('./moneyArticle');
const { createTestBalanceCashboxDay } = require('./balanceCashboxDay');
const { Worker, isMainThread } = require('worker_threads');

let startMidnight = async () => {
    if(isMainThread) {
        let w = new Worker('./thread/midnight.js', {workerData: 0});
        w.on('message', (msg) => {
            console.log('Midnight: '+msg);
        })
        w.on('error', console.error);
        w.on('exit', (code) => {
            if(code !== 0)
                console.error(new Error(`Midnight stopped with exit code ${code}`))
        });
        console.log('Midnight '+w.threadId+ ' run')
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
    if((process.env.URL).trim()==='http://localhost')
        await createTestBalanceCashboxDay()
    await startWebPush()
    await startMidnight()
}

module.exports.start = start;
