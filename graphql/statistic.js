const {statsCollection} = require('../module/const');
const Payment = require('../models/payment');
const Item = require('../models/item');
const Consignation = require('../models/consignation');
const Prepayment = require('../models/prepayment');
const Client = require('../models/client');
const ItemBarCode = require('../models/itemBarCode');
const District = require('../models/district');
const IntegrationObject = require('../models/integrationObject');
const app = require('../app');
const path = require('path');
const { saveFile, deleteFile, checkFloat, month, checkDate, types, pdDDMMYYHHMM } = require('../module/const');
const readXlsxFile = require('read-excel-file/node');
const LegalObject = require('../models/legalObject');
const Branch = require('../models/branch');
const Cashbox = require('../models/cashbox');
const WorkShift = require('../models/workshift');
const Sale = require('../models/sale');
const Report = require('../models/report');
const SyncKKM = require('../models/syncKKM');
const fs = require('fs');

const type = `
    type Statistic {
        columns: [String]
        row: [StatisticData]
    }
    type StatisticData {
        _id: ID
        data: [String]
    }
    type ChartStatistic {
        label: String
        data: [[String]]
    }
    type GeoStatistic {
        client: ID
        address: [String]
        data: [String]
    }
    type ChartStatisticAll {
        all: Float
        chartStatistic: [ChartStatistic]
    }
`;

const query = `
    statisticActivityLegalObject(type: String, agent: ID): Statistic
    statisticStorageSize: Statistic
    statisticExpiredWorkShifts: Statistic
    statisticPayment(dateStart: Date): Statistic
    statisticSale(dateStart: Date, dateType: String, type: String, legalObject: ID, branch: ID): Statistic
    statisticIntegration: Statistic
    statisticSyncKKM: Statistic
`;

const mutation = `
    uploadingClients(document: Upload!, legalObject: ID!): Data
    uploadingItems(document: Upload!, legalObject: ID!): Data
    uploadingDistricts(document: Upload!, legalObject: ID!): Data
   `;

const resolvers = {
    statisticActivityLegalObject: async(parent, {agent, type}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.statistic||user.role==='агент'){
            if(user.role==='агент')
                agent = user._id
            let activeAll = 0, inactiveAll = 0, statistic = {}, data, cashboxes, now = new Date()
            data = await LegalObject.find({
                status: 'active',
                del: {$ne: true},
                ...agent?{agent}:type==='Агент'?{agent: {$ne: null}}:{},
            })
                .select('agent _id name')
                .populate({
                    path: 'agent',
                    select: 'name _id'
                })
                .lean()
            for(let i=0; i<data.length; i++) {
                let id = type==='Агент'&&!agent?data[i].agent._id:data[i]._id
                let name = type==='Агент'&&!agent?data[i].agent.name:data[i].name
                if(!statistic[id])
                    statistic[id] = {
                        name,
                        active: 0,
                        inactive: 0,
                        legalObject: 0
                    }
                cashboxes = await Cashbox.find({
                    legalObject: data[i]._id,
                    del: {$ne: true}
                })
                    .select('endPayment')
                    .lean()
                if(type==='Агент'&&!agent){
                    statistic[id].legalObject += 1
                }
                for(let i1=0; i1<cashboxes.length; i1++) {
                    if(cashboxes[i1].endPayment>now){
                        statistic[id].active += 1
                        activeAll += 1
                    }
                    else {
                        statistic[id].inactive += 1
                        inactiveAll += 1
                    }
                }
            }
            const keys = Object.keys(statistic)
            data = []
            for(let i=0; i<keys.length; i++){
                data.push({
                    _id: keys[i],
                    data: [
                        statistic[keys[i]].name,
                        statistic[keys[i]].active,
                        statistic[keys[i]].inactive,
                        `${process.env.URL}/${type==='Агент'?'user':'legalobject'}/${keys[i]}`,
                        ...type==='Агент'&&!agent?[statistic[keys[i]].legalObject]:[]
                    ]
                })
            }
            data = data.sort(function(a, b) {
                return b.data[1] - a.data[1]
            });
            data = [
                {
                    _id: 'All',
                    data: [
                        activeAll,
                        inactiveAll
                    ]
                },
                ...data
            ]
            return {
                columns: ['название', 'активные', 'неактивные', ...type==='Агент'&&!agent?['налогоплательщиков']:[]],
                row: data
            };
        }
    },
    statisticStorageSize: async(parent, ctx, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)){
            let allSize = 0
            let allCount = 0
            let mbSize = 1048576
            let size = 0
            let stats
            let data = []
            let url = path.join(app.dirname, 'models')
            let collections = fs.readdirSync(url);
            for(let i=0; i<collections.length; i++){
                if('index.js'!==collections[i]) {
                    stats = await statsCollection(`../models/${collections[i]}`)
                    size = checkFloat(stats.storageSize / mbSize)
                    allSize += size
                    allCount += stats.count
                    data.push(
                        {_id: `#${i}`, data: [collections[i], size, stats.count]}
                    )
                }
            }
            data = data.sort(function(a, b) {
                return b.data[1] - a.data[1]
            });
            data = [
                {
                    _id: 'Всего',
                    data: [
                        checkFloat(allSize),
                        allCount
                    ]
                },
                ...data
            ]
            return {
                columns: ['коллекция', 'размер(MB)', 'количество(шт)'],
                row: data
            };
        }
    },
    statisticExpiredWorkShifts: async(parent, ctx, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.statistic){
            let dateExpired = new Date()
            dateExpired.setHours(dateExpired.getHours() - 24)
            let res = [], data
            data = await WorkShift.find({start: {$lte: dateExpired}, end: null})
                .select('_id number legalObject start')
                .lean()
            let legalObjects = {}
            for (let i = 0; i < data.length; i++) {
                if(!legalObjects[data[i].legalObject])
                    legalObjects[data[i].legalObject] = (await LegalObject.findOne({_id: data[i].legalObject}).select('name').lean()).name
                res.push({
                    _id: data[i]._id,
                    data: [
                        data[i].number,
                        pdDDMMYYHHMM(data[i].start),
                        legalObjects[data[i].legalObject],
                        `${process.env.URL}/workshift/${data[i]._id}`
                    ]
                })
            }
            res = [
                {
                    _id: 'All',
                    data: [
                        res.length
                    ]
                },
                ...res
            ]
            return {
                columns: ['номер', 'начало', 'налогоплательщик'],
                row: res
            };
        }
    },
    statisticPayment: async(parent, {dateStart}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.statistic){
            let dateEnd, profitAll = 0, refundAll = 0, statistic = {}, data
            dateStart = checkDate(dateStart)
            dateStart.setHours(0, 0, 0, 0)
            dateStart.setDate(1)
            for(let i=0; i<12; i++) {
                statistic[month[i]] = {
                    profit: 0,
                    refund: 0
                }
                dateStart.setMonth(i)
                dateEnd = new Date(dateStart)
                dateEnd.setMonth(i+1)
                data = await Payment.find(
                    {
                        status: 'Оплачен',
                        $and: [
                            {createdAt: {$gte: dateStart}},
                            {createdAt: {$lt: dateEnd}}
                        ]
                    }
                )
                    .select('amount refund')
                    .lean()
                for (let i1 = 0; i1 < data.length; i1++) {
                    if(data[i1].refund) {
                        refundAll += data[i1].amount
                        statistic[month[i]].refund += data[i1].amount
                    }
                    else {
                        profitAll += data[i1].amount
                        statistic[month[i]].profit += data[i1].amount
                    }
                }
            }
            const keys = Object.keys(statistic)
            data = []
            for(let i=0; i<keys.length; i++){
                data.push({
                    _id: keys[i],
                    data: [
                        keys[i],
                        statistic[keys[i]].profit,
                        statistic[keys[i]].refund
                    ]
                })
            }
            data = data.sort(function(a, b) {
                return b.data[1] - a.data[1]
            });
            data = [
                {
                    _id: 'All',
                    data: [
                        profitAll,
                        refundAll
                    ]
                },
                ...data
            ]
            return {
                columns: ['месяц', 'выручка', 'возвраты'],
                row: data
            };
        }
    },
    statisticSale: async(parent, {dateStart, dateType, type, legalObject, branch}, {user}) => {
        if(['admin', 'superadmin', 'управляющий'].includes(user.role)&&user.statistic){
            if(user.legalObject) legalObject = user.legalObject
            if(user.branch) branch = user.branch
            let dateEnd,
                consignationAll = 0,
                paidConsignationAll = 0,
                prepaymentAll = 0,
                returnedAll = 0,
                saleAll = 0,
                consignationCountAll = 0,
                saleCountAll = 0,
                paidConsignationCountAll = 0,
                prepaymentCountAll = 0,
                returnedCountAll = 0,
                buyAll = 0,
                buyCountAll = 0,
                returnedBuyAll = 0,
                returnedBuyCountAll = 0,
                statistic = {},
                data
            dateStart = checkDate(dateStart)
            dateStart.setHours(0, 0, 0, 0)
            dateEnd = new Date(dateStart)
            if(dateType==='Год')
                dateEnd.setFullYear(dateEnd.getFullYear() + 1)
            else if(dateType==='День')
                dateEnd.setDate(dateEnd.getDate() + 1)
            else if(dateType==='Неделя')
                dateEnd.setDate(dateEnd.getDate() + 7)
            else
                dateEnd.setMonth(dateEnd.getMonth() + 1)
            data = await WorkShift.find(
                {
                    $and: [
                        {createdAt: {$gte: dateStart}},
                        {createdAt: {$lt: dateEnd}}
                    ],
                    ...legalObject?{legalObject}:{},
                    ...branch?{branch}:{}
                }
            )
                .select('legalObject buy buyCount returnedBuy returnedBuyCount branch cashier consignation paidConsignation  prepayment returned sale consignationCount saleCount paidConsignationCount prepaymentCount returnedCount')
                .populate({
                    path: 'legalObject',
                    select: 'name _id'
                })
                .populate({
                    path: 'branch',
                    select: 'name _id'
                })
                .populate({
                    path: 'cashier',
                    select: 'name _id'
                })
                .lean()
            for(let i=0; i<data.length; i++) {
                let id = type==='Объект'?data[i].branch._id:type==='Кассир'?data[i].cashier._id:data[i].legalObject._id
                let name = type==='Объект'?data[i].branch.name:type==='Кассир'?data[i].cashier.name:data[i].legalObject.name
                if(!statistic[id])
                    statistic[id] = {
                        name,
                        consignation: 0,
                        paidConsignation: 0,
                        prepayment: 0,
                        returned: 0,
                        sale: 0,
                        consignationCount: 0,
                        saleCount: 0,
                        paidConsignationCount: 0,
                        prepaymentCount: 0,
                        returnedCount: 0,
                        buy: 0,
                        buyCount: 0,
                        returnedBuy: 0,
                        returnedBuyCount: 0,
                    }
                statistic[id].consignation += data[i].consignation
                statistic[id].paidConsignation += data[i].paidConsignation
                statistic[id].prepayment += data[i].prepayment
                statistic[id].returned += data[i].returned
                statistic[id].sale += data[i].sale
                statistic[id].consignationCount += data[i].consignationCount
                statistic[id].saleCount += data[i].saleCount
                statistic[id].paidConsignationCount += data[i].paidConsignationCount
                statistic[id].prepaymentCount += data[i].prepaymentCount
                statistic[id].returnedCount += data[i].returnedCount
                statistic[id].buy += data[i].buy
                statistic[id].buyCount += data[i].buyCount
                statistic[id].returnedBuy += data[i].returnedBuy
                statistic[id].returnedBuyCount += data[i].returnedBuyCount
            }
            const keys = Object.keys(statistic)
            data = []
            for(let i=0; i<keys.length; i++){
                consignationAll += statistic[keys[i]].consignation
                paidConsignationAll += statistic[keys[i]].paidConsignation
                prepaymentAll += statistic[keys[i]].prepayment
                returnedAll += statistic[keys[i]].returned
                saleAll += statistic[keys[i]].sale
                consignationCountAll += statistic[keys[i]].consignationCount
                saleCountAll += statistic[keys[i]].saleCount
                paidConsignationCountAll += statistic[keys[i]].paidConsignationCount
                prepaymentCountAll += statistic[keys[i]].prepaymentCount
                returnedCountAll += statistic[keys[i]].returnedCount
                buyAll += statistic[keys[i]].buy
                buyCountAll += statistic[keys[i]].buyCount
                returnedBuyAll += statistic[keys[i]].returnedBuy
                returnedBuyCountAll += statistic[keys[i]].returnedBuyCount
                data.push({
                    _id: keys[i],
                    data: [
                        statistic[keys[i]].name,
                        `${statistic[keys[i]].sale} сом | ${statistic[keys[i]].saleCount} шт`,
                        `${statistic[keys[i]].returned} сом | ${statistic[keys[i]].returnedCount} шт`,
                        `${statistic[keys[i]].prepayment} сом | ${statistic[keys[i]].prepaymentCount} шт`,
                        `${statistic[keys[i]].consignation} сом | ${statistic[keys[i]].consignationCount} шт`,
                        `${statistic[keys[i]].paidConsignation} сом | ${statistic[keys[i]].paidConsignationCount} шт`,
                        `${statistic[keys[i]].buy} сом | ${statistic[keys[i]].buyCount} шт`,
                        `${statistic[keys[i]].returnedBuy} сом | ${statistic[keys[i]].returnedBuyCount} шт`,
                    ]
                })
            }
            data = data.sort(function(a, b) {
                return b.data[1] - a.data[1]
            });
            data = [
                {
                    _id: 'All',
                    data: [
                        `${saleAll} сом | ${saleCountAll} шт`,
                        `${returnedAll} сом | ${returnedCountAll} шт`,
                        `${prepaymentAll} сом | ${prepaymentCountAll} шт`,
                        `${consignationAll} сом | ${consignationCountAll} шт`,
                        `${paidConsignationAll} сом | ${paidConsignationCountAll} шт`,
                        `${buyAll} сом | ${buyCountAll} шт`,
                        `${returnedBuyAll} сом | ${returnedBuyCountAll} шт`,
                    ]
                },
                ...data
            ]
            return {
                columns: ['название', 'продажи', 'возвраты', 'авансы', 'кредиты', 'погашение кредита', 'покупка', 'возврат покупки'],
                row: data
            };
        }
    },
    statisticIntegration: async(parent, ctx, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.statistic){
            let res = [{
                _id: 'All',
                data: [0, 0, 0, 0, 0, 0]
            }]
            let dateStart = new Date()
            dateStart.setMonth(11)
            dateStart.setDate(1)
            dateStart.setYear(2021)
            let testedLegalObject = (await LegalObject.findOne({name: 'Налогоплательщик'}).select('_id').lean())._id
            let legalObjects = await LegalObject.find({
                sync: {$ne: true},
                _id: {$ne: testedLegalObject},
                createdAt: {$gt: dateStart}
            }).select('_id name createdAt').lean()
            res[0].data[0] = legalObjects.length
            for(let i=0; i<legalObjects.length; i++) {
                res.push({
                    _id: legalObjects[i]._id,
                    data: [
                        `Налогоплательщик: ${legalObjects[i].name}`,
                        pdDDMMYYHHMM(legalObjects[i].createdAt),
                        `${process.env.URL}/legalobject/${legalObjects[i]._id}`
                    ]
                })
            }
            let branchs = await Branch.find({
                sync: {$ne: true},
                legalObject: {$ne: testedLegalObject},
                createdAt: {$gt: dateStart}
            })
                .select('_id name createdAt').lean()
            res[0].data[1] = branchs.length
            for(let i=0; i<branchs.length; i++) {
                res.push({
                    _id: branchs[i]._id,
                    data: [
                        `Объект: ${branchs[i].name}`,
                        pdDDMMYYHHMM(branchs[i].createdAt),
                        `${process.env.URL}/branch/${branchs[i]._id}`
                    ]
                })
            }
            let cashboxes = await Cashbox.find({
                sync: {$ne: true},
                legalObject: {$ne: testedLegalObject},
                createdAt: {$gt: dateStart}
            })
                .select('_id name createdAt').lean()
            res[0].data[2] = cashboxes.length
            for(let i=0; i<cashboxes.length; i++) {
                res.push({
                    _id: cashboxes[i]._id,
                    data: [
                        `Касса: ${cashboxes[i].name}`,
                        pdDDMMYYHHMM(cashboxes[i].createdAt),
                        `${process.env.URL}/cashbox/${cashboxes[i]._id}`
                    ]
                })
            }
            let workShifts = await WorkShift.find({
                sync: {$ne: true},
                syncMsg: {$ne: 'Фискальный режим отключен'},
                legalObject: {$ne: testedLegalObject},
                createdAt: {$gt: dateStart}
            })
                .select('_id number createdAt').lean()
            res[0].data[3] = workShifts.length
            for(let i=0; i<workShifts.length; i++) {
                res.push({
                    _id: workShifts[i]._id,
                    data: [
                        `Смена: ${workShifts[i].number}`,
                        pdDDMMYYHHMM(workShifts[i].createdAt),
                        `${process.env.URL}/workshift/${workShifts[i]._id}`
                    ]
                })
            }
            let sales = await Sale.find({
                sync: {$ne: true},
                syncMsg: {$ne: 'Фискальный режим отключен'},
                legalObject: {$ne: testedLegalObject},
                createdAt: {$gt: dateStart}
            })
                .select('_id number createdAt').lean()
            res[0].data[4] = sales.length
            for(let i=0; i<sales.length; i++) {
                res.push({
                    _id: sales[i]._id,
                    data: [
                        `Операция: ${sales[i].number}`,
                        pdDDMMYYHHMM(sales[i].createdAt),
                        `${process.env.URL}/sale/${sales[i]._id}`
                    ]
                })
            }
            let reports = await Report.find({
                sync: {$ne: true},
                syncMsg: {$ne: 'Фискальный режим отключен'},
                legalObject: {$ne: testedLegalObject},
                type: 'Z',
                createdAt: {$gt: dateStart}
            })
                .select('_id number createdAt').lean()
            res[0].data[5] = reports.length
            for(let i=0; i<reports.length; i++) {
                res.push({
                    _id: reports[i]._id,
                    data: [
                        `Отчет: ${reports[i].number}`,
                        pdDDMMYYHHMM(reports[i].createdAt),
                        `${process.env.URL}/report/${reports[i]._id}`
                    ]
                })
            }
            res[0].data[6] = res[0].data[0]+res[0].data[1]+res[0].data[2]+res[0].data[3]+res[0].data[4]+res[0].data[5]
            return {
                columns: ['название', 'дата'],
                row: res
            };
        }
    },
    statisticSyncKKM: async(parent, ctx, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.statistic){
            let res = []
            let syncKKMs = await SyncKKM.find().lean().sort('-createdAt')
            for(let i=0; i<syncKKMs.length; i++) {
                res.push({
                    _id: syncKKMs[i]._id,
                    data: [
                        pdDDMMYYHHMM(syncKKMs[i].createdAt),
                        pdDDMMYYHHMM(syncKKMs[i].end),
                        `${syncKKMs[i].legalObjects}/${syncKKMs[i].branchs}/${syncKKMs[i].cashboxes}/${syncKKMs[i].workShifts}/${syncKKMs[i].sales}/${syncKKMs[i].reports}`
                    ]
                })
            }
            return {
                columns: ['начало', 'конец', 'На/Об/Ка/См/Оп/От'],
                row: res
            };
        }
    },
};

const resolversMutation = {
    uploadingItems: async(parent, { document, legalObject }, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add){
            let item, integrateObject
            let {createReadStream, filename} = await document;
            let stream = createReadStream()
            filename = await saveFile(stream, filename);
            let xlsxpath = path.join(app.dirname, 'public', filename);
            let rows = await readXlsxFile(xlsxpath)
            for (let i = 0; i < rows.length; i++) {
                if(rows[i][6])
                    integrateObject = await IntegrationObject.findOne({
                        legalObject,
                        UUID: rows[i][6],
                        item: {$ne: null}
                    }).lean()
                if(!integrateObject) {
                    item = new Item({
                        category: undefined,
                        legalObject,
                        name: rows[i][0]?rows[i][0]:'Товар',
                        price: checkFloat(rows[i][1]),
                        unit: rows[i][2]?rows[i][2]:'шт',
                        barCode: rows[i][3]?rows[i][3]:'',
                        type: rows[i][4]&&types.includes(rows[i][4])?rows[i][4]:'товары',
                        mark: rows[i][5] === 'да',
                        editedPrice: false,
                        tnved: '',
                    });
                    item = await Item.create(item);
                    if(rows[i][3]&&rows[i][0]&&!(await ItemBarCode.findOne({barCode: rows[i][3]}).select('_id').lean())){
                        let newItemBarCode = new ItemBarCode({barCode: rows[i][3], name: rows[i][0], check: false})
                        await ItemBarCode.create(newItemBarCode)
                    }
                    if(rows[i][6]) {
                        integrateObject = new IntegrationObject({
                            legalObject,
                            type: 'товары',
                            UUID: rows[i][6],
                            branch: null,
                            user: null,
                            cashbox: null,
                            client: null,
                            item: item._id,
                            district: null
                        });
                        await IntegrationObject.create(integrateObject)
                    }
                }
                else {
                    item = await Item.findOne({_id: integrateObject.item, legalObject})
                    if(rows[i][0])
                        item.name = rows[i][0]
                    if(rows[i][1])
                        item.price = checkFloat(rows[i][1])
                    if(rows[i][2])
                        item.unit = rows[i][2]
                    if(rows[i][3])
                        item.barCode = rows[i][3]
                    if(rows[i][4])
                        item.mark = rows[i][4] === 'да'
                    if(rows[i][5]&&types.includes(rows[i][5]))
                        item.type = rows[i][5]
                    await item.save()
                }
            }
            await deleteFile(filename)
            return 'OK'
        }
    },
    uploadingClients: async(parent, { document, legalObject }, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add){
            let client, integrateObject
            let {createReadStream, filename} = await document;
            let stream = createReadStream()
            filename = await saveFile(stream, filename);
            let xlsxpath = path.join(app.dirname, 'public', filename);
            let rows = await readXlsxFile(xlsxpath)
            for (let i = 0; i < rows.length; i++) {
                if(rows[i][5])
                    integrateObject = await IntegrationObject.findOne({
                        legalObject,
                        UUID: rows[i][5],
                        client: {$ne: null}
                    }).lean()
                if(!integrateObject) {
                    client = new Client({
                        name: rows[i][0]?rows[i][0]:'Клиент',
                        legalObject,
                        phone: rows[i][2]?[rows[i][2]]:[],
                        address: rows[i][3]?[rows[i][3]]:[],
                        info: '',
                        email: rows[i][4]?[rows[i][4]]:[],
                        inn: rows[i][1]?rows[i][1]:'',
                        files: []

                    });
                    client = await Client.create(client)
                    let consignation = new Consignation({
                        legalObject,
                        client: client._id,
                        consignation: 0,
                        paid: 0,
                        debt: 0
                    });
                    await Consignation.create(consignation)
                    let prepayment = new Prepayment({
                        legalObject,
                        client: client._id,
                        prepayment: 0,
                        used: 0,
                        balance: 0
                    });
                    await Prepayment.create(prepayment)
                    if(rows[i][5]) {
                        integrateObject = new IntegrationObject({
                            legalObject,
                            type: 'клиенты',
                            UUID: rows[i][5],
                            branch: null,
                            user: null,
                            cashbox: null,
                            client: client._id,
                            item: null,
                            district: null
                        });
                        await IntegrationObject.create(integrateObject)
                    }
                }
                else {
                    client = await Client.findOne({_id: integrateObject.client, legalObject})
                    if(rows[i][0])
                        client.name = rows[i][0]
                    if(rows[i][1])
                        client.inn = checkFloat(rows[i][1])
                    if(rows[i][2])
                        client.phone = [rows[i][2]]
                    if(rows[i][3])
                        client.address = [rows[i][3]]
                    if(rows[i][4])
                        client.email = [rows[i][4]]
                    await client.save()
                }
            }
            await deleteFile(filename)
            return 'OK'
        }
    },
    uploadingDistricts: async(parent, { document, legalObject }, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add){
            let district, integrateObject, districts = {}
            let {createReadStream, filename} = await document;
            let stream = createReadStream()
            filename = await saveFile(stream, filename);
            let xlsxpath = path.join(app.dirname, 'public', filename);
            let rows = await readXlsxFile(xlsxpath)
            for (let i = 0; i < rows.length; i++) {
                if(!districts[rows[i][1]])
                    districts[rows[i][1]] = {
                        name: districts[rows[i][0]],
                        branchs: []
                    }
                districts[rows[i][1]].branchs.push(rows[i][2])
            }
            const keys = Object.keys(districts)
            for (let i = 0; i < keys.length; i++) {
                integrateObject = await IntegrationObject.findOne({
                    legalObject,
                    UUID: keys[i],
                    district: {$ne: null}
                }).lean()
                if(!integrateObject) {
                    district = new District({
                        legalObject,
                        branchs: await IntegrationObject.find({UUID: {$in: districts[keys[i]].branchs}, branch: {$ne: null}}).distinct('branch').lean(),
                        cashiers: undefined,
                        supervisors: undefined,
                        name: districts[keys[i]].name
                    });
                    district = await District.create(district)
                    integrateObject = new IntegrationObject({
                        legalObject,
                        type: 'районы',
                        UUID: keys[i],
                        branch: null,
                        user: null,
                        cashbox: null,
                        client: null,
                        item: null,
                        district: district._id
                    });
                    await IntegrationObject.create(integrateObject)
                }
                else {
                    district = await District.findOne({_id: integrateObject.district, legalObject})
                    district.branchs = await IntegrationObject.find({UUID: {$in: districts[keys[i]].branchs}, branch: {$ne: null}}).distinct('branch').lean()
                    await district.save()
                }
            }
            await deleteFile(filename)
            return 'OK'
        }
    }
}

module.exports.mutation = mutation;
module.exports.resolversMutation = resolversMutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;