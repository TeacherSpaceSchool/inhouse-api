const {connectTest} = require('../models/index');
const {tariffTest} = require('./tariff');
const {contactTest} = require('./contact');
const {itemBarCodeTest} = require('./itemBarCode');
const {blogTest} = require('./blog');
const {faqTest} = require('./faq');
const {categoryTest} = require('./category');
const {legalObjectTest} = require('./legalObject');
const {branchTest} = require('./branch');
const {errorTest} = require('./error');
const {generateUsers} = require('./lib');
const {applicationToConnectTest} = require('./connectionApplication');
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

    contactTest()
    blogTest()
    faqTest()
    categoryTest()
    itemBarCodeTest()
    applicationToConnectTest()
    tariffTest()
    errorTest()
    legalObjectTest()
    branchTest()

});