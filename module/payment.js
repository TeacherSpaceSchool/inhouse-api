const axios = require('axios');
const pg_merchant_id = process.env.pg_merchant_id?process.env.pg_merchant_id.trim():'';
const pg_secret_key = process.env.pg_secret_key?process.env.pg_secret_key.trim():'';
const pg_type_payment = 'init_payment.php';
const pg_description = 'Оплата за подписку';
const pg_salt = 'salyk.store';
const pg_currency = 'KGS';
const pg_result_url = `${process.env.URL.trim()}:3000/payment/paybox/result`;
const pg_request_method = 'POST';
const pg_success_url = `${process.env.URL.trim()}/payment/success`;
const pg_failure_url = `${process.env.URL.trim()}/payment/failure`;
const pg_success_url_method = 'GET';
const pg_failure_url_method = 'GET';
const pg_language = 'ru';
const pg_testing_mode = '1';
const test = process.env.URL.trim()==='http://localhost'?true:false;
const md5 = require('crypto-js/md5');
const pg_lifetime = '1800';
const xml2js = require('xml-js').xml2js;
const ModelsError = require('../models/error');

module.exports.paymentPayBox = async ({_id, amount, password}) => {
    try {
        _id = _id.toString()
        const pg_sig = md5(`${pg_type_payment};${password};${amount};${pg_currency};${pg_description};${pg_failure_url};${pg_failure_url_method};${pg_language};${pg_lifetime};${pg_merchant_id};${_id};${pg_request_method};${pg_result_url};${pg_salt};${pg_success_url};${pg_success_url_method};${test?`${pg_testing_mode};`:''}${pg_secret_key}`).toString()
        const config = {
            params: {
                pg_order_id: _id,
                pg_merchant_id: pg_merchant_id,
                pg_amount: amount,
                pg_description: pg_description,
                pg_salt: pg_salt,
                pg_currency: pg_currency,
                pg_result_url: pg_result_url,
                pg_request_method: pg_request_method,
                pg_success_url: pg_success_url,
                pg_failure_url: pg_failure_url,
                pg_success_url_method: pg_success_url_method,
                pg_failure_url_method: pg_failure_url_method,
                pg_sig: pg_sig,
                pg_language: pg_language,
                ...test ? {pg_testing_mode: pg_testing_mode} : {},
                pg_lifetime: pg_lifetime,
                password
            }
        }
        let res = await axios.post(`https://api.paybox.money/${pg_type_payment}`, null, config)
        res = await xml2js(res.data, {compact: true})
        return res.response.pg_redirect_url._text
    } catch (err) {
        let _object = new ModelsError({
            err: err.message,
            path: 'paymentPayBox'
        });
        await ModelsError.create(_object)
        console.error(err)
        return 'Ошибка'
    }
}
