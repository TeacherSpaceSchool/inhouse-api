const Blog = require('../models/blog');
const { resolvers, resolversMutation } = require('../graphql/blog');

module.exports.blogTest = () => describe('blog gql', () => {

    beforeEach(async () => {
        await Blog.deleteMany({})
    });

    let findedBlogs, findedBlog, res, editedBlog
    it('get blogs not authenticated', async () => {
        findedBlogs = await resolvers.blogs(null, {}, {user: {}})
        expect(findedBlogs).toBeFalsy()
    });
    it('edit blog not admin', async () => {
        findedBlog = await resolversMutation.addBlog(null, {}, {user: {role: 'lol'}})
        expect(findedBlog).toBeFalsy()
        res = await resolversMutation.setBlog(null, {}, {user: {role: 'lol'}})
        expect(res).toEqual('ERROR')
        res = await resolversMutation.deleteBlog(null, {}, {user: {role: 'lol'}})
        expect(res).toEqual('ERROR')
    });
    it('edit blog not add permission', async () => {
        findedBlog = await resolversMutation.addBlog(null, {}, {user: {role: 'admin'}})
        expect(findedBlog).toBeFalsy()
        res = await resolversMutation.setBlog(null, {}, {user: {role: 'admin'}})
        expect(res).toEqual('ERROR')
        res = await resolversMutation.deleteBlog(null, {}, {user: {role: 'admin'}})
        expect(res).toEqual('ERROR')
    });
    it('add blog superadmin', async () => {
        editedBlog = {text: 'text', name: 'name'}
        findedBlog = await resolversMutation.addBlog(null, editedBlog, {user: {role: 'superadmin', add: true}})
        editedBlog._id = findedBlog._id
        findedBlog = findedBlog.toJSON()
        expect(findedBlog).toMatchObject(editedBlog)
        findedBlogs = await resolvers.blogs(null, {}, {user: {role: 'superadmin', add: true}})
        expect(findedBlogs).toContainEqual(findedBlog)

        res = await resolversMutation.deleteBlog(null, {_id: editedBlog._id}, {user: {role: 'superadmin', add: true}})
        expect(res).toEqual('OK')
        findedBlogs = await resolvers.blogs(null, {}, {user: {role: 'superadmin', add: true}})
        expect(findedBlogs).toHaveLength(0);
    });
    it('add blog admin', async () => {
        editedBlog = {text: 'text', name: 'name'}
        findedBlog = await resolversMutation.addBlog(null, editedBlog, {user: {role: 'admin', add: true}})
        editedBlog._id = findedBlog._id
        findedBlog = findedBlog.toJSON()
        expect(findedBlog).toMatchObject(editedBlog)
        findedBlogs = await resolvers.blogs(null, {}, {user: {role: 'admin', add: true}})
        expect(findedBlogs).toContainEqual(findedBlog)

        res = await resolversMutation.deleteBlog(null, {_id: editedBlog._id}, {user: {role: 'admin', add: true}})
        expect(res).toEqual('OK')
        findedBlogs = await resolvers.blogs(null, {}, {user: {role: 'admin', add: true}})
        expect(findedBlogs).toHaveLength(0);
    });
    it('search blog', async () => {
        findedBlog = (await resolversMutation.addBlog(null, {
            name: 'name',
            video: 'video',
            roles: ['roles']
        }, {user: {role: 'admin', add: true}})).toJSON()

        findedBlogs = await resolvers.blogs(null, {search: findedBlog.text}, {user: {role: 'admin', add: true}})
        expect(findedBlogs).toContainEqual(findedBlog)
        findedBlogs = await resolvers.blogs(null, {search: findedBlog.name}, {user: {role: 'admin', add: true}})
        expect(findedBlogs).toContainEqual(findedBlog)
        findedBlogs = await resolvers.blogs(null, {search: 'undefined'}, {user: {role: 'admin', add: true}})
        expect(findedBlogs).toHaveLength(0)
    });
    it('pagination blog', async () => {
        let addedPagination = [], getedPagination = []
        for (let i = 0; i < 40; i++) {
            findedBlog = (await resolversMutation.addBlog(null, {
                text: `text ${i}`,
                name: `name ${i}`
            }, {user: {role: 'admin', add: true}})).toJSON()
            addedPagination = [findedBlog, ...addedPagination]
        }

        for (let i = 0; i < 3; i++) {
            findedBlogs = await resolvers.blogs(null, {skip: i*15}, {user: {role: 'admin', add: true}})
            expect(findedBlogs.length).toBeLessThanOrEqual(15);
            getedPagination = [...getedPagination, ...findedBlogs]
        }
        expect(addedPagination).toEqual(getedPagination)

        findedBlogs = await resolvers.blogs(null, {}, {user: {role: 'admin', add: true}})
        expect(findedBlogs).toHaveLength(40);
        expect(addedPagination).toEqual(findedBlogs)
    });
});