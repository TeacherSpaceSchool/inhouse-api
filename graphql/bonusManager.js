const BonusManager = require('../models/bonusManager');
const User = require('../models/user');
const History = require('../models/history');
const { saveFile, deleteFile, urlMain, checkFloat } = require('../module/const');
const ExcelJS = require('exceljs');
const app = require('../app');
const path = require('path');
const randomstring = require('randomstring');

const type = `
  type BonusManager {
    _id: ID
    createdAt: Date
    manager: User
    bonus: [[Float]]
    store: Store
  }
`;

const query = `
    unloadBonusManagers(search: String, store: ID): String
    managerForBonusManagers(search: String, store: ID): [User]
    bonusManagers(search: String, skip: Int, store: ID): [BonusManager]
    bonusManagersCount(search: String, store: ID): Int
`;

const mutation = `
    uploadBonusManager(document: Upload!): String
    addBonusManager(manager: ID!, bonus: [[Float]]!): BonusManager
    setBonusManager(_id: ID!, bonus: [[Float]]!): String
    deleteBonusManager(_id: ID!): String
`;

const resolvers = {
    unloadBonusManagers: async(parent, {search, store}, {user}) => {
        if(user.role==='admin') {
            if(user.store) store = user.store
            let searchUsers = []
            if(search)
                searchUsers = await User.find({name: {'$regex': search, '$options': 'i'}}).distinct('_id').lean()
            let res = await BonusManager.find({
                ...store?{store}:{},
                ...search?{manager: {$in: searchUsers}}:{},
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
            worksheet.getRow(1).getCell(1).font = {bold: true};
            worksheet.getRow(1).getCell(1).value = 'Менеджер'
            worksheet.getRow(1).getCell(2).font = {bold: true};
            worksheet.getRow(1).getCell(2).value = 'Магазин'
            worksheet.getColumn(3).width = 30
            worksheet.getRow(1).getCell(3).font = {bold: true};
            worksheet.getRow(1).getCell(3).value = 'Бонус'
            for(let i = 0; i < res.length; i++) {
                let bonus = ''
                for(let i1 = 0; i1 < res[i].bonus.length; i1++) {
                    bonus = `${bonus?`${bonus}\n`:''}${res[i].bonus[i1][0]}%: ${res[i].bonus[i1][1]}%`
                }
                worksheet.getRow(i+2).getCell(1).alignment = {wrapText: true}
                worksheet.getRow(i+2).getCell(1).value = `${res[i].manager.name}\n${res[i].manager._id.toString()}`
                worksheet.getRow(i+2).getCell(2).alignment = {wrapText: true}
                worksheet.getRow(i+2).getCell(2).value = `${res[i].store.name}\n${res[i].store._id.toString()}`
                worksheet.getRow(i+2).getCell(3).alignment = {wrapText: true}
                worksheet.getRow(i+2).getCell(3).value = bonus
            }
            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return urlMain + '/xlsx/' + xlsxname
        }
    },
    managerForBonusManagers: async(parent, {search, store}, {user}) => {
        if(['admin'].includes(user.role)) {
            let usedUsers = await BonusManager.find().distinct('manager').lean()
            return await User.find({
                ...store?{store}:{},
                del: {$ne: true},
                _id: {$nin: usedUsers},
                role: {$in: ['менеджер', 'менеджер/завсклад']},
                ...search?{name: {'$regex': search, '$options': 'i'}}:{},
            })
                .select('_id name')
                .sort('name')
                .lean()
        }
    },
    bonusManagers: async(parent, {search, skip, store}, {user}) => {
        if(['admin',  'управляющий'].includes(user.role)) {
            if(user.store) store = user.store
            let searchUsers = []
            if(search)
                searchUsers = await User.find({name: {'$regex': search, '$options': 'i'}}).distinct('_id').lean()
            let res = await BonusManager.find({
                ...store?{store}:{},
                ...search?{manager: {$in: searchUsers}}:{},
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort('-createdAt')
                .populate({
                    path: 'manager',
                    select: 'name _id'
                })
                .lean()
            return res
        }
    },
    bonusManagersCount: async(parent, {search, store}, {user}) => {
        if(['admin',  'управляющий'].includes(user.role)) {
            if(user.store) store = user.store
            let searchUsers = []
            if(search)
                searchUsers = await User.find({name: {'$regex': search, '$options': 'i'}}).distinct('_id').lean()
            return await BonusManager.countDocuments({
                ...store?{store}:{},
                ...search?{manager: {$in: searchUsers}}:{},
            })
                .lean()
        }
        return 0
    },
};

const resolversMutation = {
    uploadBonusManager: async(parent, { document }, {user}) => {
        if(['admin', 'завсклад',  'менеджер/завсклад'].includes(user.role)) {
            let {createReadStream, filename} = await document;
            let stream = createReadStream()
            filename = await saveFile(stream, filename);
            let xlsxpath = path.join(app.dirname, 'public', filename);
            let workbook = new ExcelJS.Workbook();
            workbook = await workbook.xlsx.readFile(xlsxpath);
            let worksheet = workbook.worksheets[0];
            let rowNumber = 1, row, object
            while(true) {
                row = worksheet.getRow(rowNumber);
                if(row.getCell(1).value) {
                    if(row.getCell(1).value&&row.getCell(1).value.split('|')[1]) {
                        row.getCell(1).value = row.getCell(1).value.split('|')[1]
                    }
                    let manager = (await User.findById(row.getCell(1).value).select('_id'))._id
                    object = await BonusManager.findOne({manager})
                    let bonus = []
                    row.getCell(2).value = row.getCell(2).value.toString().split(', ')
                    for(let i=0; i<row.getCell(2).value.length; i++) {
                        row.getCell(2).value[i] = row.getCell(2).value[i].split(': ')
                        bonus.push([checkFloat(row.getCell(2).value[i][0]), checkFloat(row.getCell(2).value[i][1])])
                    }

                    if(object) {
                        let history = new History({
                            who: user._id,
                            where: object._id,
                            what: `Бонус:${JSON.stringify(object.bonus)}→${JSON.stringify(bonus)};`
                        });
                        object.bonus = bonus
                        await object.save();
                        await History.create(history)
                    }
                    else {
                        object = new BonusManager({
                            manager,
                            store: (await User.findById(manager).select('store').lean()).store,
                            bonus
                        });
                        object = await BonusManager.create(object)
                        let history = new History({
                            who: user._id,
                            where: object._id,
                            what: 'Создание'
                        });
                        await History.create(history)
                    }
                    rowNumber++
                }
                else break
            }
            await deleteFile(filename)
            return 'OK'
        }
        return 'ERROR'
    },
    addBonusManager: async(parent, {manager, bonus}, {user}) => {
        if(['admin'].includes(user.role)&&!(await BonusManager.countDocuments({manager}).lean())) {
            let object = new BonusManager({
                manager,
                store: (await User.findById(manager).select('store').lean()).store,
                bonus
            });
            object = await BonusManager.create(object)
            let history = new History({
                who: user._id,
                where: object._id,
                what: 'Создание'
            });
            await History.create(history)
            return await BonusManager.findById(object._id)
                .populate({
                    path: 'manager',
                    select: 'name _id'
                })
                .lean()
        }
        return {_id: 'ERROR'}
    },
    setBonusManager: async(parent, {_id, bonus}, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await BonusManager.findOne({
                _id,
            })
            if (object) {
                let history = new History({
                    who: user._id,
                    where: object._id,
                    what: `Бонус:${JSON.stringify(object.bonus)}→${JSON.stringify(bonus)};`
                });
                object.bonus = bonus
                await object.save();
                await History.create(history)
                return 'OK'
            }
        }
        return 'ERROR'
    },
    deleteBonusManager: async(parent, { _id }, {user}) => {
        if(['admin'].includes(user.role)) {
            await BonusManager.deleteOne({_id})
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