const express = require('express');
const router = express.Router();
const ModelsError = require('../models/error');
const Payment = require('../models/payment');
const Cashbox = require('../models/cashbox');
const builder = require('xmlbuilder');
const pg_salt = 'salyk.store';
const md5 = require('crypto-js/md5');
const pg_type_payment = 'init_payment.php';
const pg_secret_key = 'tep9dlPeLv7SZxL4';

router.post('/paybox/result', async(req, res) => {
    let resXml = builder.create('response'), pg_description, pg_status;
    try{
        let payment = await Payment.findOne({_id: req.body.pg_order_id, password: req.body.password})
        if(payment){
            if(req.body.pg_result=='1'){
                if(payment.status==='Обработка') {
                    for (let i = 0; i < payment.cashboxes.length; i++) {
                        let now = new Date()
                         let endPayment = (await Cashbox.findOne({_id: payment.cashboxes[i]}).select('endPayment').lean()).endPayment
                        if (!endPayment||endPayment<now) endPayment = now
                        endPayment.setMonth(endPayment.getMonth() + payment.months)
                        endPayment.setDate(endPayment.getDate() + payment.days)
                        await Cashbox.updateOne({_id: payment.cashboxes[i]}, {endPayment})
                    }
                    payment.data = `Телефон покупателя: ${req.body.pg_user_phone}; Email покупателя: ${req.body.pg_user_contact_email}; Идентификатор PayBox.money: ${req.body.pg_payment_id}; Метод платежа: ${req.body.pg_payment_method};`
                    payment.status = 'Оплачен'
                    await payment.save()
                }
                pg_description = 'Платеж принят'
                pg_status = 'ok'
                const pg_sig = md5(`${pg_type_payment};${pg_description};${pg_salt};${pg_status};${pg_secret_key}`).toString()
                resXml.ele('pg_status', {}, pg_status)
                resXml.ele('pg_description', {}, pg_description)
                resXml.ele('pg_salt', {}, pg_salt)
                resXml.ele('pg_sig', {}, pg_sig)
                resXml = resXml.end({ pretty: true})
                res.status(200);
                res.end(resXml)
            }
            else {
                pg_description = 'Платеж отменен'
                pg_status = 'ok'
                const pg_sig = md5(`${pg_type_payment};${pg_description};${pg_salt};${pg_status};${pg_secret_key}`).toString()
                resXml.ele('pg_status', {}, pg_status)
                resXml.ele('pg_description', {}, pg_description)
                resXml.ele('pg_salt', {}, pg_salt)
                resXml.ele('pg_sig', {}, pg_sig)
                resXml = resXml.end({ pretty: true})
                res.status(200);
                res.end(resXml)
            }
        }
        else {
            pg_description = 'Платеж не найден'
            pg_status = 'error'
            const pg_sig = md5(`${pg_type_payment};${pg_description};${pg_salt};${pg_status};${pg_secret_key}`).toString()
            resXml.ele('pg_status', {}, pg_status)
            resXml.ele('pg_description', {}, pg_description)
            resXml.ele('pg_salt', {}, pg_salt)
            resXml.ele('pg_sig', {}, pg_sig)
            resXml = resXml.end({ pretty: true})
            res.status(200);
            res.end(resXml)
        }
    } catch (err) {
        let _object = new ModelsError({
            err: err.message,
            path: 'paybox/result'
        });
        await ModelsError.create(_object)
        console.error(err)
        pg_description = 'Ошибка платежа'
        pg_status = 'error'
        const pg_sig = md5(`${pg_type_payment};${pg_description};${pg_salt};${pg_status};${pg_secret_key}`).toString()
        resXml.ele('pg_status', {}, pg_status)
        resXml.ele('pg_description', {}, pg_description)
        resXml.ele('pg_salt', {}, pg_salt)
        resXml.ele('pg_sig', {}, pg_sig)
        resXml = resXml.end({ pretty: true})
        res.status(200);
        res.end(resXml) }
});

module.exports = router;