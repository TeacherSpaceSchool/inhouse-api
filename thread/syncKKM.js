const { isMainThread } = require('worker_threads');
const connectDB = require('../models/index');
const cron = require('node-cron');
const LegalObject = require('../models/legalObject');
const Branch = require('../models/branch');
const SyncKKM = require('../models/syncKKM');
const Cashbox = require('../models/cashbox');
const WorkShift = require('../models/workshift');
const Sale = require('../models/sale');
const Report = require('../models/report');
const {registerTaxPayer, registerSalesPoint, registerKkm, openShift, check, zReport} = require('../module/kkm');
const {ugnsTypes, taxpayerTypes, pTypes, bTypes, pdKKM} = require('../module/const');

connectDB.connect();
if(!isMainThread) {
    cron.schedule('10 * * * *', async() => {
        if(!(await SyncKKM.findOne({end: null}).select('_id').lean())){
            let date = new Date()
            if(date.getDay()===1&&date.getHours()===1&&date.getMinutes()===10) {
                date.setDate(date.getDate() - 7)
                await SyncKKM.deleteMany({dateStart: {$lte: date}})
            }
            let syncKKM = new SyncKKM({
                legalObjects: 0,
                branchs: 0,
                cashboxes: 0,
                workShifts: 0,
                sales: 0,
                reports: 0
            });
            syncKKM = await SyncKKM.create(syncKKM)
            let dateEnd = new Date()
            dateEnd.setMinutes(dateEnd.getMinutes()-10)
            let dateStart = new Date()
            dateStart.setMonth(11)
            dateStart.setDate(1)
            dateStart.setYear(2021)
            let testedLegalObject = (await LegalObject.findOne({name: 'Налогоплательщик'}).select('_id').lean())._id
            let legalObjects = await LegalObject.find({
                sync: {$ne: true},
                _id: {$ne: testedLegalObject},
                $and: [{createdAt: {$gt: dateStart}}, {createdAt: {$lte: dateEnd}}]
            })
            if((process.env.URL).trim()==='http://localhost')
                console.log('legalObjects', legalObjects.length)
            syncKKM.legalObjects = legalObjects.length
            for(let i=0; i<legalObjects.length; i++){
                let sync = await registerTaxPayer({
                    tpType: taxpayerTypes[legalObjects[i].taxpayerType],
                    inn: legalObjects[i].inn,
                    name: legalObjects[i].name,
                    ugns: ugnsTypes[legalObjects[i].ugns],
                    legalAddress: legalObjects[i].address,
                    responsiblePerson: legalObjects[i].responsiblePerson,
                    regType: '2'
                })
                legalObjects[i].sync = sync.sync
                legalObjects[i].syncMsg = sync.syncMsg
                await legalObjects[i].save()
                if((process.env.URL).trim()==='http://localhost')
                    console.log('legalObject', i+1)
            }
            let branchs = await Branch.find({
                sync: {$ne: true},
                legalObject: {$ne: testedLegalObject},
                $and: [{createdAt: {$gt: dateStart}}, {createdAt: {$lte: dateEnd}}]
            })
                .populate({
                    path: 'legalObject',
                    select: 'inn'
                })
            if((process.env.URL).trim()==='http://localhost')
                console.log('branchs', branchs.length)
            syncKKM.branchs = branchs.length
            for(let i=0; i<branchs.length; i++){
                let sync = await registerSalesPoint({
                    tpInn: branchs[i].legalObject.inn,
                    name: branchs[i].name,
                    pType: branchs[i].pType==='Прочее'?'9999':pTypes.indexOf(branchs[i].pType),
                    bType: branchs[i].bType==='Прочее'?'9999':bTypes.indexOf(branchs[i].bType),
                    ugns: ugnsTypes[branchs[i].ugns],
                    factAddress: branchs[i].address,
                    xCoordinate: branchs[i].geo ? branchs[i].geo[0] : null,
                    yCoordinate: branchs[i].geo ? branchs[i].geo[1] : null,
                    regType: branchs[i].del?'3':!branchs[i].uniqueId?'1':'2',
                    uniqueId: branchs[i].uniqueId
                })
                branchs[i].sync = sync.sync
                branchs[i].syncMsg = sync.syncMsg
                if (!branchs[i].uniqueId && sync.uniqueId) branchs[i].uniqueId = sync.uniqueId
                await branchs[i].save()
                if((process.env.URL).trim()==='http://localhost')
                    console.log('branch', i+1)
            }
            let cashboxes = await Cashbox.find({
                sync: {$ne: true},
                legalObject: {$ne: testedLegalObject},
                $and: [{createdAt: {$gt: dateStart}}, {createdAt: {$lte: dateEnd}}]
            })
                .populate({
                    path: 'branch',
                    select: 'uniqueId'
                })
            if((process.env.URL).trim()==='http://localhost')
                console.log('cashboxes', cashboxes.length)
            syncKKM.cashboxes = cashboxes.length
            for(let i=0; i<cashboxes.length; i++){
                if(cashboxes[i].branch.uniqueId) {
                    let sync = await registerKkm({
                        spId: cashboxes[i].branch.uniqueId,
                        name: cashboxes[i].name,
                        number: cashboxes[i]._id.toString(),
                        regType: cashboxes[i].del?'3':!cashboxes[i].rnmNumber?'1':'2',
                        rnmNumber: cashboxes[i].rnmNumber
                    })
                    cashboxes[i].sync = sync.sync
                    cashboxes[i].syncMsg = sync.syncMsg
                    if (sync.rnmNumber && !cashboxes[i].rnmNumber) cashboxes[i].rnmNumber = sync.rnmNumber
                }
                else {
                    cashboxes[i].sync = false
                    cashboxes[i].syncMsg = 'Нет uniqueId'
                }
                await cashboxes[i].save()
                if((process.env.URL).trim()==='http://localhost')
                    console.log('cashbox', i+1)
            }
            let workShifts = await WorkShift.find({
                sync: {$ne: true},
                syncMsg: {$ne: 'Фискальный режим отключен'},
                legalObject: {$ne: testedLegalObject},
                $and: [{createdAt: {$gt: dateStart}}, {createdAt: {$lte: dateEnd}}]
            })
                .select('_id cashbox number start')
                .populate({
                    path: 'cashbox',
                    select: 'rnmNumber'
                })
                .lean()
            if((process.env.URL).trim()==='http://localhost')
                console.log('workShifts', workShifts.length)
            syncKKM.workShifts = workShifts.length
            for(let i=0; i<workShifts.length; i++){
                if(workShifts[i].cashbox.rnmNumber) {
                    await openShift({
                        workShift: workShifts[i]._id,
                        rnmNumber: workShifts[i].cashbox.rnmNumber,
                        number: workShifts[i].number,
                        date: pdKKM(workShifts[i].start)
                    })
                }
                if((process.env.URL).trim()==='http://localhost')
                    console.log('workShift', i+1)
            }
            let sales = await Sale.find({
                sync: {$ne: true},
                syncMsg: {$ne: 'Фискальный режим отключен'},
                legalObject: {$ne: testedLegalObject},
                $and: [{createdAt: {$gt: dateStart}}, {createdAt: {$lte: dateEnd}}]
            })
                .select('_id cashbox')
                .populate({
                    path: 'cashbox',
                    select: 'rnmNumber'
                }).lean()
            if((process.env.URL).trim()==='http://localhost')
                console.log('sales', sales.length)
            syncKKM.sales = sales.length
            for(let i=0; i<sales.length; i++){
                if(sales[i].cashbox.rnmNumber)
                    await check(sales[i]._id)
                else
                    await Sale.updateOne({_id: sales[i]._id}, {sync: false, syncMsg: 'Нет rnmNumber'})
                if((process.env.URL).trim()==='http://localhost')
                    console.log('sale', i+1)
            }
            let reports = await Report.find({
                sync: {$ne: true},
                syncMsg: {$ne: 'Фискальный режим отключен'},
                legalObject: {$ne: testedLegalObject},
                type: 'Z',
                $and: [{createdAt: {$gt: dateStart}}, {createdAt: {$lte: dateEnd}}]
            })
                .populate({
                    path: 'workShift',
                    select: 'sync'
                }).lean()
            if((process.env.URL).trim()==='http://localhost')
                console.log('reports', reports.length)
            syncKKM.reports = reports.length
            for(let i=0; i<reports.length; i++){
                if (reports[i].workShift.sync)
                    await zReport(reports[i]._id)
                else
                    await Report.updateOne({_id: reports[i]._id}, {sync: false, syncMsg: 'Смена не синхронизирована'})
                if((process.env.URL).trim()==='http://localhost')
                    console.log('report', i+1)
            }
            syncKKM.end = new Date()
            await syncKKM.save()
        }
    });
}