const { isMainThread } = require('worker_threads');
const connectDB = require('../models/index');
const cron = require('node-cron');
const Consultation = require('../models/consultation');
const BalanceCashboxDay = require('../models/balanceCashboxDay');
const BalanceItemDay = require('../models/balanceItemDay');
const BalanceItem = require('../models/balanceItem');
const Cashbox = require('../models/cashbox');
const app = require('../app');
const fs = require('fs');
const path = require('path');

connectDB.connect();
if(!isMainThread) {
    cron.schedule('00 00 * * *', async () => {
        let object
        let today = new Date()
        today.setHours(0, 0, 0, 0)
        //создание истории баланса моделей
        let balanceItems = await BalanceItem.find({}).select('store warehouse item amount').lean()
        for(let i1 = 0; i1 < balanceItems.length; i1++) {
            object = new BalanceItemDay({
                item: balanceItems[i1].item,
                startAmount: balanceItems[i1].amount,
                endAmount: balanceItems[i1].amount,
                store: balanceItems[i1].store,
                date: today,
                warehouse: balanceItems[i1].warehouse,
                plus: 0,
                minus: 0
            });
            await BalanceItemDay.create(object);
        }
        //создание истории кассы
        let cashboxes = await Cashbox.find({del: {$ne: true}}).select('_id balance store').lean()
        for(let i1 = 0; i1 < cashboxes.length; i1++) {
            object = new BalanceCashboxDay({
                cashbox: cashboxes[i1]._id,
                startBalance: cashboxes[i1].balance,
                endBalance: cashboxes[i1].balance,
                store: cashboxes[i1].store,
                date: today
            });
            await BalanceCashboxDay.create(object);
        }
        //закрытие консультаций
        await Consultation.updateMany({end: null}, {end: new Date()})
        //очистка выгрузки
        fs.readdir(path.join(app.dirname, 'public', 'xlsx'), function(err, items) {
            for(let i=0; i<items.length; i++){
                if(items[i]!=='.gitignore')
                    fs.unlink(path.join(app.dirname, 'public', 'xlsx', items[i]), ()=>{
                        console.log(`delete ${items[i]}`);
                    })
                else
                    console.log('nope')
            }
        });
    });
}