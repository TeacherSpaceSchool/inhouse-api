const {connectTest} = require('../models/index');
const {errorTest} = require('./error');
const {generateUsers} = require('./lib');
const mongoose = require('mongoose');
const fs = require('fs');

describe('index', () => {

    beforeAll(async () => {
        await connectTest()
        await generateUsers()
    });

    afterAll(async () => {
        let collections = fs.readdirSync('./models');
        for(let i=0; i<collections.length; i++){
            if('index.js'!==collections[i])
                await (require(`../models/${collections[i]}`)).deleteMany({})
        }
        await mongoose.connection.close();
        let files = fs.readdirSync('./public/test');
        for(let i=0; i<files.length; i++){
            if('.gitignore'!==files[i])
                fs.unlinkSync(`./public/test/${files[i]}`)
        }
    });

    errorTest()

});