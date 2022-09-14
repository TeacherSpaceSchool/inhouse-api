const Consultation = require('../models/consultation');
const { urlMain, pdDDMMYYHHMM, checkDate } = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const randomstring = require('randomstring');

const type = `
  type Consultation {
      _id: ID
      createdAt: Date
      manager: User
      store: Store
      end: Date
      info: String
      client: Client
      operation: String
      statusClient: String
  }
`;

const query = `
    unloadConsultations(manager: ID, dateStart: Date, dateEnd: Date, store: ID, statusClient: String, operation: String): String
    consultations(skip: Int, manager: ID, store: ID, dateStart: Date, dateEnd: Date, active: Boolean, statusClient: String, operation: String): [Consultation]
    consultationsCount(manager: ID, dateStart: Date, dateEnd: Date, store: ID, statusClient: String, operation: String): Int
`;

const mutation = `
    startConsultation: Consultation
    setConsultation(info: String, client: ID, statusClient: String, operation: String): String
    endConsultation(_id: ID): String
`;

const resolvers = {
    unloadConsultations: async(parent, {manager, dateStart, dateEnd, store, statusClient, operation}, {user}) => {
        if(['admin', 'управляющий'].includes(user.role)) {
            if(user.store) store = user.store
            dateStart = checkDate(dateStart)
            dateStart.setHours(0, 0, 0, 0)
            if(dateEnd)
                dateEnd = new Date(dateEnd)
            else {
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            dateEnd.setHours(0, 0, 0, 0)
            if(user.store) store = user.store
            let res =  await Consultation.find({
                del: {$ne: true},
                ...operation?{operation}:{},
                ...manager?{manager}:{},
                ...store?{store}:{},
                ...statusClient?{statusClient}:{},
                ...dateStart?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{},
            })
                .sort('-createdAt')
                .populate({
                    path: 'manager',
                    select: 'name _id'
                })
                .populate({
                    path: 'client',
                    select: 'name _id'
                })
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .lean()
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Выгрузка');
            let cell = 1
            worksheet.getColumn(cell).width = 25
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Менеджер'
            cell++
            worksheet.getColumn(cell).width = 25
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Магазин'
            cell++
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Начало'
            cell++
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Конец'
            cell++
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Операция'
            cell++
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Клиент'
            cell++
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Статус'
            cell++
            worksheet.getColumn(cell).width = 15
            worksheet.getRow(1).getCell(cell).font = {bold: true};
            worksheet.getRow(1).getCell(cell).value = 'Комментарий'
            for(let i = 0; i < res.length; i++) {
                cell = 1
                worksheet.getRow(i+2).getCell(cell).value = res[i].manager.name
                cell++
                worksheet.getRow(i+2).getCell(cell).value = res[i].store.name
                cell++
                worksheet.getRow(i+2).getCell(cell).value = pdDDMMYYHHMM(res[i].createdAt)
                cell++
                worksheet.getRow(i+2).getCell(cell).value = res[i].end?pdDDMMYYHHMM(res[i].end):''
                cell++
                worksheet.getRow(i+2).getCell(cell).value = res[i].operation
                cell++
                worksheet.getRow(i+2).getCell(cell).value = res[i].client?res[i].client.name:''
                cell++
                worksheet.getRow(i+2).getCell(cell).value = res[i].statusClient
                cell++
                worksheet.getRow(i+2).getCell(cell).value = res[i].info
            }
            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
    consultations: async(parent, {skip, manager, dateStart, dateEnd,store, active, statusClient, operation}, {user}) => {
        if(['admin', 'менеджер', 'менеджер/завсклад', 'управляющий'].includes(user.role)) {
            if(user.store) store = user.store
            if(['менеджер', 'менеджер/завсклад'].includes(user.role)) manager = user._id
            if (dateStart) {
                dateStart = new Date(dateStart)
                dateStart.setHours(0, 0, 0, 0)
                if (dateEnd)
                    dateEnd = new Date(dateEnd)
                else {
                    dateEnd = new Date(dateStart)
                    dateEnd.setDate(dateEnd.getDate() + 1)
                }
                dateEnd.setHours(0, 0, 0, 0)
            }
            let res = await Consultation.find({
                del: {$ne: true},
                ...operation?{operation}:{},
                ...manager?{manager}:{},
                ...store?{store}:{},
                ...active?{end: null}:{},
                ...dateStart?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{},
                ...statusClient?{statusClient}:{},
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort('-createdAt')
                .populate({
                    path: 'manager',
                    select: 'name _id'
                })
                .populate({
                    path: 'client',
                    select: 'name _id address geo'
                })
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .lean()
            return res
        }
    },
    consultationsCount: async(parent, {manager, dateStart, dateEnd,store, statusClient, operation}, {user}) => {
        if(['admin', 'управляющий'].includes(user.role)) {
            if(user.store) store = user.store
            dateStart = checkDate(dateStart)
            dateStart.setHours(0, 0, 0, 0)
            if(dateEnd)
                dateEnd = new Date(dateEnd)
            else {
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            dateEnd.setHours(0, 0, 0, 0)
            return await Consultation.countDocuments({
                del: {$ne: true},
                ...operation?{operation}:{},
                ...store?{store}:{},
                ...manager?{manager}:{},
                ...dateStart?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{},
                ...statusClient?{statusClient}:{},
            })
                .lean()
        }
    },
};

const resolversMutation = {
    startConsultation: async(parent, ctx, {user}) => {
        if(['менеджер', 'менеджер/завсклад'].includes(user.role)&&!(await Consultation.countDocuments({manager: user._id, end: null}).lean())) {
            let object = new Consultation({
                manager: user._id,
                store: user.store,
                end: null
            });
            object = await Consultation.create(object)
            return await Consultation.findById(object._id)
                .populate({
                    path: 'manager',
                    select: 'name _id'
                })
                .populate({
                    path: 'client',
                    select: 'name _id'
                })
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .lean()
        }
        return {_id: 'ERROR'}
    },
    setConsultation: async(parent, {info, client, statusClient, operation}, {user}) => {
        if(['менеджер', 'менеджер/завсклад'].includes(user.role)) {
            let object = await Consultation.findOne({
                manager: user._id,
                end: null
            })
            if(object) {
                object.info = info
                object.operation = operation
                object.client = client
                object.statusClient = statusClient
                await object.save()
                return 'OK'
            }
        }
        return 'ERROR'
    },
    endConsultation: async(parent, {_id}, {user}) => {
        if(['admin', 'менеджер', 'менеджер/завсклад'].includes(user.role)) {
            let object = await Consultation.findOne({
                ...['менеджер', 'менеджер/завсклад'].includes(user.role)?{manager: user._id}:{_id},
                end: null
            })
            if(object) {
                object.end = new Date()
                await object.save()
                return 'OK'
            }
        }
        return 'ERROR'
    },
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;