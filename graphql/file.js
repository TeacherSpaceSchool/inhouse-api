const app = require('../app');
const {pdDDMMYYHHMM} = require('../module/const');
const fs = require('fs');
const path = require('path');
const dirs = ['images', 'xlsx', 'files']
const { deleteFile, urlMain } = require('../module/const');
const Blog = require('../models/blog');
const Contact = require('../models/contact');
const Faq = require('../models/faq');
const Client = require('../models/client');

const type = `
  type File {
    name: String
    url: String
    size: Float
    createdAt: String
    active: String
    owner: String
  }
`;

const query = `
    files(filter: String): [File]
`;

const mutation = `
    clearAllDeactiveFiles: String
`;

const resolvers = {
    files: async(parent, {filter}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.statistic) {
            let data = [], res = [], filesUrl = [], stat, size, createdAt, url
            for (let i = 0; i < dirs.length; i++) {
                url = path.join(app.dirname, 'public', dirs[i])
                if (fs.existsSync(url)) {
                    const files = fs.readdirSync(url, 'utf8');
                    for (let name of files) {
                        url = path.join(app.dirname, 'public', dirs[i], name)
                        stat = fs.statSync(url)
                        createdAt = pdDDMMYYHHMM(stat.atime)
                        size = Math.round((stat.size/1000000) * 1000)/1000;
                        data.push({name, size, url: dirs[i], createdAt});
                        filesUrl.push(`${urlMain}/${dirs[i]}/${name}`)
                    }
                }
            }
            res = [
                ...(await Blog.find({image: {$in: filesUrl}}).select('name image').lean()).map(element=>{return {...element, type: 'Блог'}}),
                ...(await Contact.find({image: {$in: filesUrl}}).select('image').lean()).map(element=>{return {...element, name: '', type: 'Контакты'}}),
                ...(await Faq.find({url: {$in: filesUrl}}).select('name url').lean()).map(element=>{return {...element, type: 'Инструкция'}}),
                ...(await Client.find({files: {$elemMatch: {$in: filesUrl}}}).select('name').lean()).map(element=>{return {...element, type: 'Клиент'}}),
            ]
            filesUrl = {}
            for (let i = 0; i < res.length; i++) {
                filesUrl[res[i].image?res[i].image:res[i].url?res[i].url:'lol'] = res[i]
            }
            res = []
            let fileUrl
            for (let i = 0; i < data.length; i++) {
                if(data[i].name!=='.gitignore') {
                    fileUrl = filesUrl[`${urlMain}/${data[i].url}/${data[i].name}`]
                    data[i].active = fileUrl ? 'активен' : 'неактивен'
                    data[i].owner = fileUrl ? `${fileUrl.type} ${fileUrl.name}` : 'Отсутствует'
                    if (!filter || !filter.length || (filter === 'active' && fileUrl) || (filter === 'deactive' && !fileUrl))
                        res.push(data[i])
                }
            }
            res = res.sort(function (a, b) {
                return b.size - a.size
            });
            return res;
        }
    }
};

const resolversMutation = {
    clearAllDeactiveFiles: async(parent, ctx, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.statistic) {
            let data = [], url, filesUrl = []
            for (let i = 0; i < dirs.length; i++) {
                url = path.join(app.dirname, 'public', dirs[i])
                if (fs.existsSync(url)) {
                    const files = fs.readdirSync(url, 'utf8');
                    for (let name of files) {
                        data.push(`${urlMain}/${dirs[i]}/${name}`)
                    }
                }
            }
            filesUrl = [
                ...(await Blog.find({image: {$in: data}}).distinct('image').lean()),
                ...(await Contact.find({image: {$in: data}}).distinct('image').lean()),
                ...(await Faq.find({url: {$in: data}}).distinct('url').lean()),
            ]
            for (let i = 0; i < data.length; i++) {
                if(data[i].name!=='.gitignore'&&!filesUrl.includes(data[i]))
                    await deleteFile(data[i])
            }
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