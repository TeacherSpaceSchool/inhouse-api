const Faq = require('../models/faq');
const { saveFile, deleteFile, urlMain } = require('../module/const');

const type = `
  type Faq {
    _id: ID
    url: String
    name: String
    video: String
    roles: [String]
    createdAt: Date
  }
`;

const query = `
    faqs(search: String, skip: Int): [Faq]
`;

const mutation = `
    addFaq(file: Upload, name: String!, roles: [String]!, video: String): Faq
    setFaq(_id: ID!, file: Upload, name: String, roles: [String], video: String): String
    deleteFaq(_id: ID!): String
`;

const resolvers = {
    faqs: async(parent, {search, skip}, {user}) => {
        if(user.role) {
            return await Faq.find({
                ...search&&search.length?{name: {'$regex': search, '$options': 'i'}}:{},
                ...!['admin', 'superadmin'].includes(user.role)?{roles: user.role}:{}
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .sort('name')
                .lean()
        }
    }
};

const resolversMutation = {
    addFaq: async(parent, {file, name, video, roles}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let _object = new Faq({
                name: name,
                roles: roles
            });
            if (file) {
                let {createReadStream, filename} = await file;
                let stream = createReadStream()
                filename = await saveFile(stream, filename)
                _object.url = urlMain+filename
            }
            if(video)_object.video = video
            _object = await Faq.create(_object)
            return _object
        }
    },
    setFaq: async(parent, {_id, file, name, video, roles}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let object = await Faq.findById(_id)
            if (file) {
                let {createReadStream, filename} = await file;
                let stream = createReadStream()
                if(object.url) await deleteFile(object.url)
                 filename = await saveFile(stream, filename)
                object.url = urlMain + filename
            }
            if(name) object.name = name
            if(video) object.video = video
            if(roles) object.roles = roles
            await object.save();
            return 'OK'
        }
        return 'ERROR'
    },
    deleteFaq: async(parent, { _id }, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let object = await Faq.findOne({_id}).select('file').lean()
            if(object.file)
                await deleteFile(object.file)
            await Faq.deleteOne({_id})
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