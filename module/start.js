const { createAdmin } = require('./user');
const { createTestLegalObject } = require('./legalObject');
const { Worker, isMainThread } = require('worker_threads');
const Cashbox = require('../models/cashbox');
const Branch = require('../models/branch');
const Sale = require('../models/sale');
const WorkShift = require('../models/workshift');
const Report = require('../models/report');
const LegalObject = require('../models/legalObject');
const SyncKKM = require('../models/syncKKM');

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

let startSyncKKM = async () => {
    if(isMainThread) {
        let w = new Worker('./thread/syncKKM.js', {workerData: 0});
        w.on('message', (msg) => {
            console.log('SyncKKM: '+msg);
        })
        w.on('error', console.error);
        w.on('exit', (code) => {
            if(code !== 0)
                console.error(new Error(`SyncKKM stopped with exit code ${code}`))
        });
        console.log('SyncKKM '+w.threadId+ ' run')
    }
}

let start = async () => {
/*
    let dateStart = new Date()
    dateStart.setMonth(11)
    dateStart.setDate(1)
    dateStart.setYear(2021)
    let legalObject = (await LegalObject.findOne({inn: '00103201810134'}).select('_id').lean())._id
    console.log(await Cashbox.updateMany({legalObject, createdAt: {$gt: dateStart}}, {sync: false}))
    console.log(await Branch.updateMany({legalObject, createdAt: {$gt: dateStart}}, {sync: false}))
    console.log(await Sale.updateMany({legalObject, createdAt: {$gt: dateStart}}, {sync: false}))
    console.log(await WorkShift.updateMany({legalObject, createdAt: {$gt: dateStart}}, {sync: false}))
    console.log(await Report.updateMany({legalObject, createdAt: {$gt: dateStart}}, {sync: false}))
*/
    await createTestLegalObject();
    await createAdmin();
    await startResetUnloading()
    console.log('SyncKKM', await SyncKKM.deleteMany({end: null}))
    if((process.env.URL).trim()!=='http://localhost')
        await startSyncKKM()
}

module.exports.start = start;
