const Jimp = require('jimp');
const randomstring = require('randomstring');
const app = require('../app');
const fs = require('fs');
const path = require('path');
const urlMain = `${process.env.URL.trim()}:3000`;
const limit = 15;
const adminLogin = '000000000';
const adminPass = 'cE59eDeaA82d';

module.exports.weekDay = [
    'BC',
    'ПН',
    'ВТ',
    'СР',
    'ЧТ',
    'ПТ',
    'СБ',
]
module.exports.month = [
    'январь',
    'февраль',
    'март',
    'апрель',
    'май',
    'июнь',
    'июль',
    'август',
    'сентябрь',
    'октябрь',
    'ноябрь',
    'декабрь'
]

const statsCollection = async (collection) => {
    return (await (require(collection)).collection.stats())
}

const checkInt = (int) => {
    return isNaN(parseInt(int))?0:parseInt(int)
}

const checkFloat = (float) => {
    float = parseFloat(float)
    return isNaN(float)?0:Math.round(float * 10)/10
}

module.exports.checkDate = (date) => {
    date = new Date(date)
    return date=='Invalid Date'?new Date():date
}

module.exports.saveFile = (stream, filename) => {
    return new Promise((resolve) => {
        filename = `${randomstring.generate(7)}${filename}`;
        let filepath = path.join(app.dirname, 'public', 'files', filename)
        let fstream = fs.createWriteStream(filepath);
        stream.pipe(fstream)
        fstream.on('finish', async () => {
            resolve(`/files/${filename}`)
        })
    })
}

module.exports.saveImage = (stream, filename) => {
    return new Promise(async (resolve) => {
        let randomfilename = `${randomstring.generate(7)}${filename}`;
        let filepath = path.join(app.dirname, 'public', 'images', randomfilename)
        let fstream = fs.createWriteStream(filepath);
        stream.pipe(fstream)
        fstream.on('finish', async () => {
            let image = await Jimp.read(filepath)
            if(image.bitmap.width>800||image.bitmap.height>800) {
                randomfilename = `${randomstring.generate(7)}${filename}`;
                let filepathResize = path.join(app.dirname, 'public', 'images', randomfilename)
                image.resize(800, Jimp.AUTO)
                    .quality(80)
                    .write(filepathResize);
                fs.unlink(filepath, ()=>{
                    resolve(`/images/${randomfilename}`)
                })
            }
            else
                resolve(`/images/${randomfilename}`)
        })
    })
}

module.exports.deleteFile = (oldFile) => {
    return new Promise((resolve) => {
        oldFile = oldFile.replace(urlMain, '')
        oldFile = path.join(app.dirname, 'public', oldFile)
        fs.unlink(oldFile, ()=>{
            resolve()
        })
    })
}

module.exports.clearDB = async () => {
    let collections = fs.readdirSync('./models');
    for(let i=0; i<collections.length; i++){
        if('index.js'!==collections[i]) {
            await (require(`../models/${collections[i]}`)).deleteMany({login: {$ne: 'admin'}})
        }
    }
    console.log('clearDB done')
}

const pdDDMMYYYY = (date) =>
{
    date = new Date(date)
    date = `${date.getDate()<10?'0':''}${date.getDate()}.${date.getMonth()<9?'0':''}${date.getMonth()+1}.${date.getFullYear()}`
    return date
}
const pdDDMMYYHHMM = (date) =>
{
    date = new Date(date)
    date = `${date.getDate()<10?'0':''}${date.getDate()}.${date.getMonth()<9?'0':''}${date.getMonth()+1}.${date.getFullYear()} ${date.getHours()<10?'0':''}${date.getHours()}:${date.getMinutes()<10?'0':''}${date.getMinutes()}`
    return date
}
const pdHHMM = (date) =>
{
    date = new Date(date)
    date = `${date.getHours()<10?'0':''}${date.getHours()}:${date.getMinutes()<10?'0':''}${date.getMinutes()}`
    return date
}


module.exports.statsCollection = statsCollection;
module.exports.checkInt = checkInt;
module.exports.pdHHMM = pdHHMM;
module.exports.pdDDMMYYYY = pdDDMMYYYY;
module.exports.pdDDMMYYHHMM = pdDDMMYYHHMM;
module.exports.limit = limit;
module.exports.adminPass = adminPass;
module.exports.adminLogin = adminLogin;
module.exports.urlMain = urlMain;
module.exports.checkFloat = checkFloat;
