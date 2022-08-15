const { isMainThread } = require('worker_threads');
const connectDB = require('../models/index');
const cron = require('node-cron');
const WayItem = require('../models/wayItem');
const User = require('../models/user');
const Store = require('../models/store');
const Installment = require('../models/installment');
const Reservation = require('../models/reservation');
const { sendWebPush } = require('../module/webPush');

connectDB.connect();
if(!isMainThread) {
    cron.schedule('00 08 * * *', async () => {
        let date = new Date()
        date.setHours(0, 0, 0, 0)
        let stores = await Store.find({del: {$ne: true}}).distinct('_id').lean()
        for(let i=0; i<stores.length; i++) {
            //в пути
            if(await WayItem.countDocuments({store: stores[i], arrivalDate: {$lt: date}, status: 'в пути'}).lean())
                await sendWebPush({
                    tag: 'Опаздывает товар',
                    title: 'Опаздывает товар',
                    message: 'Опаздывает товар',
                    users: [
                        ...await User.find({del: {$ne: true}, store: stores[i], role: {$in: ['завсклад', 'менеджер/завсклад']}}).distinct('_id').lean(),
                        ...await User.find({role: 'admin'}).distinct('_id').lean()
                    ]
                })
            if(await WayItem.countDocuments({store: stores[i], arrivalDate: date, status: 'в пути'}).lean())
                await sendWebPush({
                    tag: 'Поступает товар',
                    title: 'Поступает товар',
                    message: 'Поступает товар',
                    users: [
                        ...await User.find({del: {$ne: true}, store: stores[i], role: {$in: ['завсклад', 'менеджер/завсклад']}}).distinct('_id').lean(),
                        ...await User.find({role: 'admin'}).distinct('_id').lean()
                    ]
                })
            //рассрочки
            if(await Installment.countDocuments({store: stores[i], datePaid: {$lt: date}, status: 'обработка'}).lean())
                await sendWebPush({
                    tag: 'Просрочена рассрочка',
                    title: 'Просрочена рассрочка',
                    message: 'Просрочена рассрочка',
                    users: [
                        ...await User.find({del: {$ne: true}, store: stores[i], role: {$in: ['кассир']}}).distinct('_id').lean(),
                        ...await User.find({role: 'admin'}).distinct('_id').lean()
                    ]
                })
            if(await Installment.countDocuments({store: stores[i], datePaid: date, status: 'обработка'}).lean())
                await sendWebPush({
                    tag: 'Сегодня оплата рассрочки',
                    title: 'Сегодня оплата рассрочки',
                    message: 'Сегодня оплата рассрочки',
                    users: [
                        ...await User.find({del: {$ne: true}, store: stores[i], role: {$in: ['кассир']}}).distinct('_id').lean(),
                        ...await User.find({role: 'admin'}).distinct('_id').lean()
                    ]
                })
            //бронь
            let reservationManagers = await Reservation.find({store: stores[i], term: {$lt: date}, status: 'обработка'}).distinct('manager').lean()
            if(reservationManagers.length)
                await sendWebPush({
                    tag: 'Просрочена бронь',
                    title: 'Просрочена бронь',
                    message: 'Просрочена бронь',
                    users: [
                        ...await User.find({del: {$ne: true}, store: stores[i], _id: {$in: reservationManagers}}).distinct('_id').lean(),
                        ...await User.find({role: 'admin'}).distinct('_id').lean()
                    ]
                })
            reservationManagers = await Reservation.find({store: stores[i], term: date, status: 'обработка'}).distinct('manager').lean()
            if(reservationManagers.length)
                await sendWebPush({
                    tag: 'Сегодня заканчивается бронь',
                    title: 'Сегодня заканчивается бронь',
                    message: 'Сегодня заканчивается бронь',
                    users: [
                        ...await User.find({del: {$ne: true}, store: stores[i], _id: {$in: reservationManagers}}).distinct('_id').lean(),
                        ...await User.find({role: 'admin'}).distinct('_id').lean()
                    ]
                })
        }
    });
}