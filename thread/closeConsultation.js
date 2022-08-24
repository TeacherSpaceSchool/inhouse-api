const { isMainThread } = require('worker_threads');
const connectDB = require('../models/index');
const cron = require('node-cron');
const Consultation = require('../models/consultation');

connectDB.connect();
if(!isMainThread) {
    cron.schedule('00 00 * * *', async () => {
        await Consultation.updateMany({end: null}, {end: new Date()})
    });
}