const Blog = require('../models/blog');

const type = `
  type Blog {
    _id: ID
    text: String
    name: String
    createdAt: Date
  }
`;

const query = `
    blogs(skip: Int, search: String): [Blog]
`;

const mutation = `
    addBlog(text: String!, name: String!): Blog
    setBlog(_id: ID!, text: String, name: String): String
    deleteBlog(_id: ID!): String
`;

const resolvers = {
    blogs: async(parent, {skip, search}, {user}) => {
        if(user.role) {
            return await Blog.find({
                ...search&&search.length?{$or: [
                    {name: {'$regex': search, '$options': 'i'}},
                    {text: {'$regex': search, '$options': 'i'}}
                ]}:{}
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .sort('-createdAt')
                .lean()
        }
    }
};

const resolversMutation = {
    addBlog: async(parent, {text, name}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let _object = new Blog({
                text,
                name
            });
            _object = await Blog.create(_object)
            return _object
        }
    },
    setBlog: async(parent, {_id, text, name}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let object = await Blog.findById(_id)
            if(text)object.text = text
            if(name)object.name = name
            await object.save();
            return 'OK'
        }
        return 'ERROR'
    },
    deleteBlog: async(parent, { _id }, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            await Blog.deleteOne({_id})
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