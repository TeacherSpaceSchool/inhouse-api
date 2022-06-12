const ModelsError = require('../models/error');
const Sale = require('../models/sale');
const Report = require('../models/report');
const WorkShift = require('../models/workshift');
const axios = require('axios');
const builder = require('xmlbuilder');
const { typePayments, pdQRKKM, pdKKM, ndsTypesKKM, nspTypesKKM } = require('../module/const');
const QRCode = require('qrcode')
const {pdDDMMYYHHMM} = require('../module/const');
const xml2js = require('xml-js').xml2js;
const memberCode = process.env.memberCode?process.env.memberCode.trim():'';
const subsystemCode = process.env.subsystemCode?process.env.subsystemCode.trim():'';
const url = 'http://localhost:81';
const xmlKKM = (serviceCode, request) => {
    let xmlKKM = {
        'soapenv:Envelope': {
            '@xmlns:soapenv': 'http://schemas.xmlsoap.org/soap/envelope/',
            '@xmlns:xro': 'http://x-road.eu/xsd/xroad.xsd',
            '@xmlns:tns': 'http://x-road.eu/xsd/identifiers',
            '@xmlns:ps': 'http://ps_xroad6.infosystema.org',
            'soapenv:Header': {
                'xro:protocolVersion': '4.0',
                'xro:id': '630887d7-706c-4939-a285-479078d459df',
                'xro:service': {
                    '@tns:objectType': 'SERVICE',
                    'tns:xRoadInstance': 'central-server',
                    'tns:memberClass': 'GOV',
                    'tns:memberCode': '70000002',
                    'tns:subsystemCode': 'kkm',
                    'tns:serviceCode': serviceCode
                },
                'xro:client': {
                    '@tns:objectType': 'SUBSYSTEM',
                    'tns:xRoadInstance': 'central-server',
                    'tns:memberClass': 'COM',
                    'tns:memberCode': memberCode,
                    'tns:subsystemCode': subsystemCode
                },
            },
            'soapenv:Body': {}
        }
    }
    xmlKKM['soapenv:Envelope']['soapenv:Body'][`ps:${serviceCode==='check'?'check1':serviceCode}`] = request
    return xmlKKM
};

module.exports.tpDataByINNforBusinessActivity = async (inn)=>{
    if(process.env.NODE_ENV!=='test') {
        let resXml = ''
        try {
            let xml = {
                'soapenv:Envelope': {
                    '@xmlns:soapenv': 'http://schemas.xmlsoap.org/soap/envelope/',
                    '@xmlns:xro': 'http://x-road.eu/xsd/xroad.xsd',
                    '@xmlns:iden': 'http://x-road.eu/xsd/identifiers',
                    '@xmlns:prod': 'http://gns-security-server.x-road.fi/producer',
                    'soapenv:Header': {
                        'xro:protocolVersion': '4.0',
                        'xro:id': '630887d7-706c-4939-a285-479078d459df',
                        'xro:service': {
                            '@iden:objectType': 'SERVICE',
                            'iden:xRoadInstance': 'central-server',
                            'iden:memberClass': 'GOV',
                            'iden:memberCode': '70000002',
                            'iden:subsystemCode': 'gns-service',
                            'iden:serviceCode': 'tpDataByINNforBusinessActivity',
                            'iden:serviceVersion': 'v1'
                        },
                        'xro:client': {
                            '@iden:objectType': 'SUBSYSTEM',
                            'iden:xRoadInstance': 'central-server',
                            'iden:memberClass': 'COM',
                            'iden:memberCode': memberCode,
                            'iden:subsystemCode': subsystemCode
                        },
                    },
                    'soapenv:Body': {
                        'prod:tpDataByINNforBusinessActivity': {
                            'prod:request': {
                                'prod:inn': inn
                            }
                        }
                    }
                }
            }
            xml = (builder.create(xml)).end({pretty: true})
            //console.log(xml)
            let config = {
                headers: {'Content-Type': 'text/xml;charset=UTF-8', 'Accept': 'text/xml;charset=UTF-8'}
            };
            let res = await axios.post(url, xml, config)
            //console.log(res.data)
            resXml = res.data
            res = await xml2js(res.data, {compact: true})
            return res['SOAP-ENV:Envelope']['SOAP-ENV:Body']['ts1:tpDataByINNforBusinessActivityResponse']['ts1:response']['ts1:inn']['_text'] ? {
                inn: res['SOAP-ENV:Envelope']['SOAP-ENV:Body']['ts1:tpDataByINNforBusinessActivityResponse']['ts1:response']['ts1:inn']['_text'],
                rayonCode: res['SOAP-ENV:Envelope']['SOAP-ENV:Body']['ts1:tpDataByINNforBusinessActivityResponse']['ts1:response']['ts1:RayonCode']['_text'],
                fullName: res['SOAP-ENV:Envelope']['SOAP-ENV:Body']['ts1:tpDataByINNforBusinessActivityResponse']['ts1:response']['ts1:FullName']['_text'],
                ZIP: res['SOAP-ENV:Envelope']['SOAP-ENV:Body']['ts1:tpDataByINNforBusinessActivityResponse']['ts1:response']['ts1:ZIP']['_text'],
                fullAddress: res['SOAP-ENV:Envelope']['SOAP-ENV:Body']['ts1:tpDataByINNforBusinessActivityResponse']['ts1:response']['ts1:FullAddress']['_text']
            } : {message: 'Неверный ИНН'}
        } catch (err) {
            let _object = new ModelsError({
                err: `${resXml} ${err.message}`,
                path: 'tpDataByINNforBusinessActivity'
            });
            await ModelsError.create(_object)
            console.error(err)
            return {message: 'Ошибка'}
        }
    }
    else return 'OK'
};

module.exports.registerTaxPayer = async ({
                                             tpType,
                                             inn,
                                             name,
                                             ugns,
                                             legalAddress,
                                             responsiblePerson,
                                             regType
                                         })=>{
    if(process.env.NODE_ENV!=='test') {
        let syncMsg
        try {
            let xml = xmlKKM('registerTaxPayer', {
                'request': {
                    tpType,
                    inn,
                    name,
                    ugns,
                    legalAddress,
                    responsiblePerson,
                    regType
                }
            })
            xml = (builder.create(xml)).end({pretty: true})
            //console.log(xml)
            let config = {
                headers: {'Content-Type': 'text/xml;charset=UTF-8', 'Accept': 'text/xml;charset=UTF-8'}
            };
            let res = await axios.post(url, xml, config)
            //console.log(res.data)
            syncMsg = `${pdDDMMYYHHMM(new Date())} ${res.data}`
            res = await xml2js(res.data, {compact: true})
            return {
                sync: res['soap:Envelope']['soap:Body']['ns2:registerTaxPayerResponse']['response']['status']['_text'] == 200 ? true : false,
                syncMsg
            }
        } catch (err) {
            console.error(err)
            return {
                syncMsg: `${pdDDMMYYHHMM(new Date())} ${syncMsg ? `${syncMsg} ${err.message}` : err.message ? err.message : err.errno}`,
                sync: false
            }
        }
    }
    else return {
        syncMsg: 'OK',
        sync: true
    }
};

module.exports.registerSalesPoint = async ({
                                               tpInn,
                                               name,
                                               vType/*Optional*/,
                                               pType/*Optional*/,
                                               bType/*Optional*/,
                                               ugns,
                                               factAddress,
                                               xCoordinate/*Optional*/,
                                               yCoordinate/*Optional*/,
                                               uniqueId/*Optional*/,
                                               regType
                                           })=>{
    if(process.env.NODE_ENV!=='test') {
        let syncMsg
        try{
            let xml = xmlKKM('registerSalesPoint', {'request': {
                tpInn,
                name,
                ...pType!=undefined?{pType: pType.toString()}:{},
                ...vType!=undefined?{vType: vType.toString()}:{},
                ...bType!=undefined?{bType: bType.toString()}:{},
                ugns,
                factAddress,
                ...xCoordinate!=undefined?{xCoordinate: xCoordinate.toString()}:{},
                ...yCoordinate!=undefined?{yCoordinate: yCoordinate.toString()}:{},
                regType,
                ...uniqueId?{uniqueId}:{}
            }})
            xml = (builder.create(xml)).end({ pretty: true})
            //console.log(xml)
            let config = {
                headers: {'Content-Type': 'text/xml;charset=UTF-8', 'Accept': 'text/xml;charset=UTF-8'}
            };
            let res = await axios.post(url, xml, config)
            //console.log(res.data)
            syncMsg = `${pdDDMMYYHHMM(new Date())} ${res.data}`
            res = await xml2js(res.data, {compact: true})
            return {
                sync: res['soap:Envelope']['soap:Body']['ns2:registerSalesPointResponse']['response']['status']['_text']==200?true:false,
                syncMsg,
                ...!uniqueId?{uniqueId: res['soap:Envelope']['soap:Body']['ns2:registerSalesPointResponse']['response']['uniqueId']['_text']}:{}
            }
        } catch (err) {
            console.error(err)
            return {
                syncMsg: `${pdDDMMYYHHMM(new Date())} ${syncMsg?`${syncMsg} ${err.message}`:err.message?err.message:err.errno}`,
                sync: false
            }
        }
    }
    else return {
        syncMsg: 'OK',
        sync: true
    }
};

module.exports.registerKkm = async ({
                                        spId,
                                        name,
                                        number,
                                        regType,
                                        rnmNumber/*Optional*/
                                    })=>{
    if(process.env.NODE_ENV!=='test') {
        let syncMsg
        try {
            let xml = xmlKKM('registerKkm', {
                'request': {
                    spId,
                    name,
                    number,
                    kkmType: '2',
                    regType,
                    ...rnmNumber ? {rnmNumber} : {}
                }
            })
            xml = (builder.create(xml)).end({pretty: true})
            //console.log(xml)
            let config = {
                headers: {'Content-Type': 'text/xml;charset=UTF-8', 'Accept': 'text/xml;charset=UTF-8'}
            };
            let res = await axios.post(url, xml, config)
            //console.log(res.data)
            syncMsg = `${pdDDMMYYHHMM(new Date())} ${res.data}`
            res = await xml2js(res.data, {compact: true})
            return {
                sync: res['soap:Envelope']['soap:Body']['ns2:registerKkmResponse']['response']['status']['_text'] == 200 ? true : false,
                syncMsg,
                ...!rnmNumber ? {rnmNumber: res['soap:Envelope']['soap:Body']['ns2:registerKkmResponse']['response']['rnmNumber']['_text']} : {}
            }
        } catch (err) {
            console.error(err)
            return {
                sync: false,
                syncMsg: `${pdDDMMYYHHMM(new Date())} ${syncMsg ? `${syncMsg} ${err.message}` : err.message ? err.message : err.errno}`
            }
        }
    }
    else return {
        syncMsg: 'OK',
        sync: true,
        rnmNumber: 'OK'
    }
};

module.exports.openShift = async ({
                                      workShift,
                                      rnmNumber,
                                      number,
                                      date
                                  })=>{
    if(process.env.NODE_ENV!=='test') {
        let syncMsg
        try {
            workShift = await WorkShift.findOne({_id: workShift})
            let xml = xmlKKM('openShift', {'request': {rnmNumber, number, date}})
            xml = (builder.create(xml)).end({pretty: true})
            //console.log(xml)
            let config = {
                headers: {'Content-Type': 'text/xml;charset=UTF-8', 'Accept': 'text/xml;charset=UTF-8'}
            };
            let res = await axios.post(url, xml, config)
            //console.log(res.data)
            syncMsg = `${pdDDMMYYHHMM(new Date())} ${res.data}`
            res = await xml2js(res.data, {compact: true})
            workShift.sync = res['soap:Envelope']['soap:Body']['ns2:openShiftResponse']['response']['status']['_text'] == 200 ? true : false
            workShift.syncMsg = syncMsg
            await workShift.save()
        } catch (err) {
            console.error(err)
            workShift.sync = false
            workShift.syncMsg = `${pdDDMMYYHHMM(new Date())} ${syncMsg ? `${syncMsg} ${err.message}` : err.message ? err.message : err.errno}`
            await workShift.save()
        }
    }
    else {
        workShift.sync = true
        workShift.syncMsg = 'OK'
        await workShift.save()
    }
};

module.exports.check = async (_id)=>{
    let syncMsg
    let sale = await Sale.findOne({_id})
        .populate({
            path: 'cashbox',
            select: 'rnmNumber'
        })
        .populate({
            path: 'sale',
            select: 'number'
        })
    if (!sale.qr)
        sale.qr = await QRCode.toDataURL(
            `https://kkm.salyk.kg/kkm/check?rnmNumber=${sale.cashbox.rnmNumber}&checkNumber=${sale.number}&amount=${sale.amountEnd}&date=${pdQRKKM(sale.createdAt)}`
        )
    if(process.env.NODE_ENV!=='test') {
        try{
            let details = [], tax
            for(let i=0; i<sale.items.length; i++) {
                if((sale.items[i].ndsType!=undefined||sale.items[i].nspType!=undefined)&&!tax) {
                    tax = {
                        ...sale.items[i].ndsType != undefined ? {ndsType: ndsTypesKKM[sale.items[i].ndsType]} : {},
                        ...sale.nds != undefined ? {nds: sale.nds} : {},
                        ...sale.items[i].nspType != undefined ? {nspType: nspTypesKKM[sale.items[i].nspType]} : {},
                        ...sale.nsp != undefined ? {nsp: sale.nsp} : {}
                    }
                }
                details.push({
                    detail: {
                        productName: sale.items[i].name,
                        amount: sale.items[i].count,
                        priceForUnit: sale.items[i].price,
                        sum: sale.items[i].amountEnd,
                        ...sale.items[i].ndsType!=undefined?{ndsType: ndsTypesKKM[sale.items[i].ndsType]}:{},
                        ...sale.items[i].nds!=undefined?{nds: sale.items[i].nds}:{},
                        ...sale.items[i].nspType!=undefined?{nspType: nspTypesKKM[sale.items[i].nspType]}:{},
                        ...sale.items[i].nsp!=undefined?{nsp: sale.items[i].nsp}:{},
                        ...sale.items[i].discount?{discount: sale.items[i].discount}:{},
                        ...sale.items[i].extra?{overprice: sale.items[i].extra}:{}
                    }
                })
            }
            if(!details.length)
                details = {}
            let xml = xmlKKM('check', {'request': {
                docType: sale.docType,
                paymentType: typePayments[sale.typePayment],
                rnmNumber: sale.cashbox.rnmNumber,
                checkNumber: sale.number,
                date: pdKKM(sale.createdAt),
                totalSum: sale.amountEnd,
                ...sale.sale?{returnCheckNumber: sale.sale.number}:{},
                details,
                taxes: tax?[{tax}]:{}
            }})
            xml = (builder.create(xml, {separateArrayItems: true})).end({ pretty: true})
            let config = {
                headers: {'Content-Type': 'text/xml;charset=UTF-8', 'Accept': 'text/xml;charset=UTF-8'}
            };
            let res = await axios.post(url, xml, config)
            //console.log(res.data)
            syncMsg = `${pdDDMMYYHHMM(new Date())} ${res.data}`
            res = await xml2js(res.data, {compact: true})
            sale.sync = res['soap:Envelope']['soap:Body']['ns2:check1Response']['response']['status']['_text']==200?true:false
            sale.syncMsg = syncMsg
            await sale.save()
        }
        catch (err) {
            console.error(err)
            sale.sync = false
            sale.syncMsg = `${pdDDMMYYHHMM(new Date())} ${syncMsg?`${syncMsg} ${err.message}`:err.message?err.message:err.errno}`
            await sale.save()
        }
    }
    else {
        sale.sync = true
        sale.syncMsg = 'OK'
        await sale.save()
    }
};

module.exports.zReport = async (_id)=>{
    let syncMsg
    let report = await Report.findOne({_id})
        .populate({
            path: 'cashbox',
            select: 'rnmNumber'
        })
    if(process.env.NODE_ENV!=='test') {
        try {
            let sales = await Sale.find({
                workShift: report.workShift,
                syncMsg: {$ne: 'Фискальный режим отключен'}
            }).select('typePayment docType amountEnd').lean()
            let zdetails = {}, key = ''
            for (let i = 0; i < sales.length; i++) {
                key = `${sales[i].docType}${typePayments[sales[i].typePayment]}`
                if (!zdetails[key])
                    zdetails[key] = {
                        docType: sales[i].docType,
                        paymentType: typePayments[sales[i].typePayment],
                        amount: 0,
                        sum: 0
                    }
                zdetails[key].amount += 1
                zdetails[key].sum += sales[i].amountEnd
            }
            zdetails = Object.values(zdetails)
            if (!zdetails.length)
                zdetails = {}
            let xml = xmlKKM('zReport', {
                'request': {
                    rnmNumber: report.cashbox.rnmNumber,
                    zNumber: report.number,
                    date: pdKKM(report.end),
                    totalCache: report.cash,
                    totalCacheless: report.cashless,
                    zdetails
                }
            })
            xml = (builder.create(xml)).end({pretty: true})
            //console.log(xml)
            let config = {
                headers: {'Content-Type': 'text/xml;charset=UTF-8', 'Accept': 'text/xml;charset=UTF-8'}
            };
            let res = await axios.post(url, xml, config)
            //console.log(res.data)
            syncMsg = `${pdDDMMYYHHMM(new Date())} ${res.data}`
            res = await xml2js(res.data, {compact: true})
            report.sync = res['soap:Envelope']['soap:Body']['ns2:zReportResponse']['response']['status']['_text'] == 200 ? true : false
            report.syncMsg = syncMsg
            await report.save()
        } catch (err) {
            console.error(err)
            report.sync = false
            report.syncMsg = `${pdDDMMYYHHMM(new Date())} ${syncMsg ? `${syncMsg} ${err.message}` : err.message ? err.message : err.errno}`
            await report.save()
        }
    }
    else {
        report.sync = true
        report.syncMsg = 'OK'
        await report.save()
    }
};
