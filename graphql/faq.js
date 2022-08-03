const Faq = require('../models/faq');
const { saveFile, deleteFile, urlMain } = require('../module/const');

const type = `
  type Faq {
    _id: ID
    url: String
    name: String
    text: String
    video: String
    createdAt: Date
  }
`;

const query = `
    faqs(search: String, skip: Int): [Faq]
    faqsCount(search: String): Int
`;

const mutation = `
    addFaq(file: Upload, name: String!, text: String!, video: String): Faq
    setFaq(_id: ID!, file: Upload, name: String, text: String, video: String, delFile: Boolean): Faq
    deleteFaq(_id: ID!): String
`;

const resolvers = {
    faqs: async(parent, {search, skip}, {user}) => {
        if(user.role) {
            return await Faq.find({
                ...search?{name: {'$regex': search, '$options': 'i'}}:{}
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort('name')
                .lean()
        }
    },
    faqsCount: async(parent, {search}, {user}) => {
        if(user.role) {
            return await Faq.countDocuments({
                ...search?{name: {'$regex': search, '$options': 'i'}}:{}
            }).lean()
        }
        return 0
    }
};

const resolversMutation = {
    addFaq: async(parent, {file, name, video, text}, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = new Faq({
                name, text
            });
            if (file) {
                let {createReadStream, filename} = await file;
                let stream = createReadStream()
                filename = await saveFile(stream, filename)
                object.url = urlMain+filename
            }
            if(video)object.video = video
            object = await Faq.create(object)
            return object
        }
        return {_id: 'ERROR'}
    },
    setFaq: async(parent, {_id, file, name, video, delFile, text}, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await Faq.findById(_id)
            if (file&&!delFile) {
                let {createReadStream, filename} = await file;
                let stream = createReadStream()
                if(object.url) await deleteFile(object.url)
                filename = await saveFile(stream, filename)
                object.url = urlMain + filename
            }
            else if(delFile&&object.url){
                await deleteFile(object.url)
                object.url = null
            }
            if(text) object.text = text
            if(name) object.name = name
            if(video) object.video = video
            await object.save();
            return {
                _id: 'OK',
                ...file?{url: object.url}:{}
            }
        }
        return {_id: 'ERROR'}
    },
    deleteFaq: async(parent, { _id }, {user}) => {
        if(['admin'].includes(user.role)) {
            let object = await Faq.findOne({_id}).select('file').lean()
            if(object.url)
                await deleteFile(object.url)
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