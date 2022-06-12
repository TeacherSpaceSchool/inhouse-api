const express = require('express');
const router = express.Router();
const ModelsError = require('../models/error');
const Integration = require('../models/integration');
const {getIntegrationBranchs, getIntegrationBranch, putIntegrationBranch} = require('../module/branch');
const {getIntegrationCashboxes, getIntegrationCashbox, putIntegrationCashbox} = require('../module/cashbox');
const {getIntegrationUsers, getIntegrationUser, putIntegrationUser} = require('../module/user');
const {getIntegrationClients, getIntegrationClient, putIntegrationClient} = require('../module/client');
const {getIntegrationPrepayments, getIntegrationPrepayment} = require('../module/prepayment');
const {getIntegrationConsignations, getIntegrationConsignation} = require('../module/consignation');
const {getIntegrationDistricts, getIntegrationDistrict, putIntegrationDistrict} = require('../module/district');
const {getIntegrationItems, getIntegrationItem, putIntegrationItem} = require('../module/item');
const {getIntegrationWorkShifts, getIntegrationWorkShift, putIntegrationOpenWorkshift} = require('../module/workshift');
const {getIntegrationSales, getIntegrationSale, putIntegrationSale} = require('../module/sale');
const {getIntegrationDeposits, getIntegrationDeposit, putIntegrationDeposit} = require('../module/deposit');
const {getIntegrationWithdraws, getIntegrationWithdraw, putIntegrationWithdraw} = require('../module/withdraw');
const {getIntegrationReports, getIntegrationReport, putIntegrationReport} = require('../module/report');

let verifiedLegalObject = async (req, res, action, params) => {
    res.set('Content+Type', 'application/json');
    try{
        if(req.body.password){
            let legalObject = await Integration.findOne({
                password: req.body.password
            })
                .select('legalObject')
                .lean();
            if(legalObject) {
                legalObject = legalObject.legalObject
                res.end(JSON.stringify(await action({...req.body, legalObject, ...params})));
            }
            else
                res.end(JSON.stringify({status: 'ошибка'}))
        }
        else {
            res.end(JSON.stringify({status: 'ошибка'}))
        }
    } catch (err) {
        let _object = new ModelsError({
            err: err.message,
            path: 'API'
        });
        await ModelsError.create(_object)
        console.error(err)
        res.status(501);
        res.end(JSON.stringify({status: 'ошибка'}))
    }
}

router.post('/put/sale', async (req, res) => await verifiedLegalObject(req, res, putIntegrationSale));

router.post('/put/xreport', async (req, res) => await verifiedLegalObject(req, res, putIntegrationReport, {type: 'X'}));

router.post('/put/zreport', async (req, res) => await verifiedLegalObject(req, res, putIntegrationReport, {type: 'Z'}));

router.post('/put/withdraw', async (req, res) => await verifiedLegalObject(req, res, putIntegrationWithdraw));

router.post('/put/deposit', async (req, res) => await verifiedLegalObject(req, res, putIntegrationDeposit));

router.post('/put/district', async (req, res) => await verifiedLegalObject(req, res, putIntegrationDistrict));

router.post('/put/item', async (req, res) => await verifiedLegalObject(req, res, putIntegrationItem));

router.post('/put/client', async (req, res) => await verifiedLegalObject(req, res, putIntegrationClient));

router.post('/put/branch', async (req, res) => await verifiedLegalObject(req, res, putIntegrationBranch));

router.post('/put/employment', async (req, res) => await verifiedLegalObject(req, res, putIntegrationUser));

router.post('/put/cashbox', async (req, res) => await verifiedLegalObject(req, res, putIntegrationCashbox));

router.post('/put/openworkshift', async (req, res) => await verifiedLegalObject(req, res, putIntegrationOpenWorkshift));

router.post('/get/xreports', async (req, res) => await verifiedLegalObject(req, res, getIntegrationReports, {type: 'X'}));

router.post('/get/xreport', async (req, res) => await verifiedLegalObject(req, res, getIntegrationReport, {type: 'X'}));

router.post('/get/zreports', async (req, res) => await verifiedLegalObject(req, res, getIntegrationReports, {type: 'Z'}));

router.post('/get/zreport', async (req, res) => await verifiedLegalObject(req, res, getIntegrationReport, {type: 'Z'}));

router.post('/get/deposits', async (req, res) => await verifiedLegalObject(req, res, getIntegrationDeposits));

router.post('/get/deposit', async (req, res) => await verifiedLegalObject(req, res, getIntegrationDeposit));

router.post('/get/withdraws', async (req, res) => await verifiedLegalObject(req, res, getIntegrationWithdraws));

router.post('/get/withdraw', async (req, res) => await verifiedLegalObject(req, res, getIntegrationWithdraw));

router.post('/get/sales', async (req, res) => await verifiedLegalObject(req, res, getIntegrationSales));

router.post('/get/sale', async (req, res) => await verifiedLegalObject(req, res, getIntegrationSale));

router.post('/get/workshifts', async (req, res) => await verifiedLegalObject(req, res, getIntegrationWorkShifts));

router.post('/get/workshift', async (req, res) => await verifiedLegalObject(req, res, getIntegrationWorkShift));

router.post('/get/items', async (req, res) => await verifiedLegalObject(req, res, getIntegrationItems));

router.post('/get/item', async (req, res) => await verifiedLegalObject(req, res, getIntegrationItem));

router.post('/get/branchs', async (req, res) => await verifiedLegalObject(req, res, getIntegrationBranchs));

router.post('/get/branch', async (req, res) => await verifiedLegalObject(req, res, getIntegrationBranch));

router.post('/get/cashboxes', async (req, res) => await verifiedLegalObject(req, res, getIntegrationCashboxes));

router.post('/get/cashbox', async (req, res) => await verifiedLegalObject(req, res, getIntegrationCashbox));

router.post('/get/employments', async (req, res) => await verifiedLegalObject(req, res, getIntegrationUsers));

router.post('/get/employment', async (req, res) => await verifiedLegalObject(req, res, getIntegrationUser));

router.post('/get/clients', async (req, res) => await verifiedLegalObject(req, res, getIntegrationClients));

router.post('/get/client', async (req, res) => await verifiedLegalObject(req, res, getIntegrationClient));

router.post('/get/prepayments', async (req, res) => await verifiedLegalObject(req, res, getIntegrationPrepayments));

router.post('/get/prepayment', async (req, res) => await verifiedLegalObject(req, res, getIntegrationPrepayment));

router.post('/get/consignations', async (req, res) => await verifiedLegalObject(req, res, getIntegrationConsignations));

router.post('/get/consignation', async (req, res) => await verifiedLegalObject(req, res, getIntegrationConsignation));

router.post('/get/districts', async (req, res) => await verifiedLegalObject(req, res, getIntegrationDistricts));

router.post('/get/district', async (req, res) => await verifiedLegalObject(req, res, getIntegrationDistrict));

module.exports = router;