const Payment = require('../models/payment');
const LegalObject = require('../models/legalObject');
const Cashbox = require('../models/cashbox');
const {paymentPayBox} = require('../module/payment');
const randomstring = require('randomstring');
const Tariff = require('../models/tariff');
const QRCode = require('qrcode')

const type = `
  type Payment {
      _id: ID
      createdAt: Date
      number: String
      type: String
      qr: String
      paymentSystem: String
      amount: Float
      months: Int
      days: Int
      paid: Int
      data: String
      change: Float
      legalObject: LegalObject
      cashboxes: [Cashbox]
      who: User
      refund: Boolean
      status: String
}
`;

const query = `
    payments(search: String, filter: String, date: String, skip: Int, legalObject: ID): [Payment]
    paymentsCount(search: String, date: String, filter: String, legalObject: ID): Int
    payment(_id: ID!): Payment
`;

const mutation = `
    addPayment(months: Int!, days: Int!, paid: Int, legalObject: ID!, cashboxes: [ID]!): String
    refundPayment(_id: ID!): String
    deletePayment(_id: ID!): String
`;

const resolvers = {
    payments: async(parent, {search, date, skip, filter, legalObject}, {user}) => {
        if(['управляющий', 'admin', 'superadmin'].includes(user.role)||search&&search.length>2&&user.role==='оператор'||['кассир', 'супервайзер'].includes(user.role)&&user.payment) {
            if(user.legalObject) legalObject = user.legalObject
            let dateStart, dateEnd
            if (date&&date.length) {
                dateStart = new Date(date)
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            let res = await Payment.find({
                ...dateStart?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{},
                ...search&&search.length?{number: {'$regex': search, '$options': 'i'}}:{},
                ...filter&&filter.length?{paymentSystem: filter}:{},
                ...legalObject ? {legalObject: legalObject} : {},
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .sort('-createdAt')
                .populate({
                    path: 'who',
                    select: 'name _id role'
                })
                .populate({
                    path: 'legalObject',
                    select: 'name _id'
                })
                .lean()
            return res
        }
        return []
    },
    paymentsCount: async(parent, {search, date, filter, legalObject}, {user}) => {
        if(['управляющий', 'admin', 'superadmin'].includes(user.role)||search&&search.length>2&&user.role==='оператор'||['кассир', 'супервайзер'].includes(user.role)&&user.payment) {
            let dateStart, dateEnd
            if (date&&date.length) {
                dateStart = new Date(date)
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            if(user.legalObject) legalObject = user.legalObject
            return await Payment.countDocuments({
                ...dateStart?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{},
                ...search&&search.length?{number: {'$regex': search, '$options': 'i'}}:{},
                ...filter&&filter.length?{paymentSystem: filter}:{},
                ...legalObject ? {legalObject: legalObject} : {},
            })
                .lean()
        }
        return 0
    },
    payment: async(parent, {_id}, {user}) => {
        if(['управляющий', 'admin', 'superadmin', 'оператор'].includes(user.role)||['кассир', 'супервайзер'].includes(user.role)&&user.payment) {
            return await Payment.findOne({
                _id: _id,
                ...user.legalObject?{legalObject: user.legalObject}:{}
            })
                .populate({
                    path: 'who',
                    select: 'name _id role'
                })
                .populate({
                    path: 'legalObject',
                    select: 'name _id'
                })
                .populate({
                    path: 'cashboxes',
                    populate: [
                        {
                            path: 'presentCashier',
                            select: 'name _id role'
                        },
                        {
                            path: 'legalObject',
                            select: 'name _id'
                        },
                        {
                            path: 'branch',
                            select: 'name _id'
                        }
                    ]
                })
                .lean()
        }
    }
};

const resolversMutation = {
    addPayment: async(parent, {months, days, paid, legalObject, cashboxes}, {user}) => {
        let tariff = await Tariff.find()
            .limit(1)
            .sort('-createdAt')
            .lean()

        let amount = (tariff[0].ofd+tariff[0].pkkm*cashboxes.length)*months
        if(days){
            amount += tariff[0].ofd+tariff[0].pkkm/30*cashboxes.length*days
        }
        if (['admin', 'superadmin', 'оператор'].includes(user.role) && user.payment && (['admin', 'superadmin'].includes(user.role)||paid>=amount)) {
            legalObject = await LegalObject.findOne({_id: legalObject}).select('_id').lean()
            if (legalObject) {
                let change = paid - amount
                let number = randomstring.generate({length: 10, charset: 'numeric'});
                while (await Payment.findOne({number: number}).select('_id').lean())
                    number = randomstring.generate({length: 10, charset: 'numeric'});
                let _object = new Payment({
                    paymentSystem: 'Наличными',
                    type: 'Подписка',
                    status: 'Оплачен',
                    number,
                    amount,
                    refund: false,
                    legalObject: legalObject._id,
                    who: user._id,
                    months,
                    days,
                    paid,
                    change: change>0?change:0,
                    cashboxes,
                });
                for (let i = 0; i < cashboxes.length; i++) {
                    let now = new Date()
                    let endPayment = (await Cashbox.findOne({_id: cashboxes[i]}).select('endPayment').lean()).endPayment
                    if (!endPayment||endPayment<now) endPayment = now
                    endPayment.setMonth(endPayment.getMonth() + months)
                    endPayment.setDate(endPayment.getDate() + days)
                    await Cashbox.updateOne({_id: cashboxes[i]}, {endPayment})
                }

                _object.qr = await QRCode.toDataURL(`${process.env.URL.trim()}/payment/receipt/${_object._id}`)

                _object = await Payment.create(_object)
                return _object._id
            }
        }
        else if (['управляющий', 'кассир', 'супервайзер'].includes(user.role) && user.payment) {
            legalObject = await LegalObject.findOne({_id: user.legalObject}).select('_id').lean()
            let password = randomstring.generate(20)
            let number = randomstring.generate({length: 10, charset: 'numeric'});
            while (await Payment.findOne({number: number}).select('_id').lean())
                number = randomstring.generate({length: 10, charset: 'numeric'});
            let _object = new Payment({
                paymentSystem: 'PayBox.money',
                type: 'Подписка',
                status: 'Обработка',
                number,
                amount,
                refund: false,
                legalObject: legalObject._id,
                who: user._id,
                months,
                days,
                paid: amount,
                change: 0,
                cashboxes,
                password
            });
            _object.qr = await QRCode.toDataURL(`${process.env.URL.trim()}/payment/receipt/${_object._id}`)
            _object = await Payment.create(_object)
            setTimeout(async () => await Payment.deleteOne({_id: _object._id, status: 'Обработка'}), 30*60*1000)
            return await paymentPayBox({_id: _object._id, amount, password})
        }
        else
            return 'Ошибка'
    },
    refundPayment: async(parent, {_id}, {user}) => {
        if(['admin', 'superadmin', 'оператор'].includes(user.role)&&user.payment) {
            let object = await Payment.findById(_id)
            object.refund = true
            for(let i=0; i<object.cashboxes.length; i++){
                let endPayment = (await Cashbox.findOne({_id: object.cashboxes[i]}).select('endPayment').lean()).endPayment
                if(!endPayment) endPayment = new Date()
                endPayment.setMonth(endPayment.getMonth()-object.months)
                endPayment.setDate(endPayment.getDate()-object.days)
                await Cashbox.updateOne({_id: object.cashboxes[i]}, {endPayment})
            }
            await object.save();
            return 'OK'
        }
        return 'ERROR'
    },
    deletePayment: async(parent, {_id}, {user}) => {
        if(['admin', 'superadmin', 'оператор', 'управляющий', 'кассир', 'супервайзер'].includes(user.role)&&user.payment) {
            await Payment.deleteOne({
                _id,
                status: 'Обработка',
                ...user.legalObject?{legalObject: user.legalObject}:{}
            })
            return 'OK'
        }
        return 'ERROR'
    }
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;
