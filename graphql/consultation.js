const Consultation = require('../models/consultation');
const { urlMain, pdDDMMYYHHMM } = require('../module/const');
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
  }
`;

const query = `
    unloadConsultations(manager: ID, date: Date, store: ID): String
    consultations(skip: Int, manager: ID, store: ID, date: Date, active: Boolean): [Consultation]
    consultationsCount(manager: ID, date: Date, store: ID): Int
`;

const mutation = `
    startConsultation: Consultation
    endConsultation(_id: ID): String
`;

const resolvers = {
    unloadConsultations: async(parent, {manager, date, store, active}, {user}) => {
        if(['admin', 'управляющий'].includes(user.role)) {
            if(user.store) store = user.store
            let dateStart, dateEnd
            if (date) {
                dateStart = new Date(date)
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            if(user.store) store = user.store
            let res =  await Consultation.find({
                del: {$ne: true},
                ...manager?{manager}:{},
                ...store?{store}:{},
                ...active?{end: null}:{},
                ...date?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{},
            })
                .sort('-createdAt')
                .populate({
                    path: 'manager',
                    select: 'name _id'
                })
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .lean()
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Выгрузка');
            worksheet.getColumn(1).width = 40
            worksheet.getColumn(2).width = 40
            worksheet.getColumn(3).width = 15
            worksheet.getColumn(4).width = 15
            worksheet.getRow(1).getCell(1).font = {bold: true};
            worksheet.getRow(1).getCell(1).value = 'Менеджер'
            worksheet.getRow(1).getCell(2).font = {bold: true};
            worksheet.getRow(1).getCell(2).value = 'Магазин'
            worksheet.getRow(1).getCell(3).font = {bold: true};
            worksheet.getRow(1).getCell(3).value = 'Начало'
            worksheet.getRow(1).getCell(4).font = {bold: true};
            worksheet.getRow(1).getCell(4).value = 'Конец'
            for(let i = 0; i < res.length; i++) {
                worksheet.getRow(i+2).getCell(1).alignment = {wrapText: true}
                worksheet.getRow(i+2).getCell(1).value = `${res[i].manager.name}\n${res[i].manager._id.toString()}`
                worksheet.getRow(i+2).getCell(2).alignment = {wrapText: true}
                worksheet.getRow(i+2).getCell(2).value = `${res[i].store.name}\n${res[i].store._id.toString()}`
                worksheet.getRow(i+2).getCell(3).value = pdDDMMYYHHMM(res[i].createdAt)
                worksheet.getRow(i+2).getCell(4).value = res[i].end?pdDDMMYYHHMM(res[i].end):''
            }
            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
    consultations: async(parent, {skip, manager, date, store, active}, {user}) => {
        if(['admin', 'менеджер', 'менеджер/завсклад', 'управляющий'].includes(user.role)) {
            if(user.store) store = user.store
            if(['менеджер', 'менеджер/завсклад'].includes(user.role)) manager = user._id
            let dateStart, dateEnd
            if (date) {
                dateStart = new Date(date)
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            return await Consultation.find({
                del: {$ne: true},
                ...manager?{manager}:{},
                ...store?{store}:{},
                ...active?{end: null}:{},
                ...date?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{},
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort('-createdAt')
                .populate({
                    path: 'manager',
                    select: 'name _id'
                })
                .populate({
                    path: 'store',
                    select: 'name _id'
                })
                .lean()
        }
    },
    consultationsCount: async(parent, {manager, date, store, active}, {user}) => {
        if(['admin', 'управляющий'].includes(user.role)) {
            if(user.store) store = user.store
            let dateStart, dateEnd
            if (date) {
                dateStart = new Date(date)
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            return await Consultation.countDocuments({
                del: {$ne: true},
                ...store?{store}:{},
                ...manager?{manager}:{},
                ...active?{end: null}:{},
                ...date?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{},
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
            return object
        }
        return {_id: 'ERROR'}
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