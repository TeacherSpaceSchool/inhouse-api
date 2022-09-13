const express = require('express');
const app = express();

if(process.env.NODE_ENV!=='test') {

    const createError = require('http-errors');
    const path = require('path');
    const cookieParser = require('cookie-parser');
    const logger = require('morgan');
    const connectDB = require('./models/index');
    const cors = require('cors');
    const compression = require('compression');
    const bodyParser = require('body-parser');
    const subscribe = require('./routes/subscribe');
    const push = require('./routes/push');
    const helmet = require('helmet');
    const { graphqlUploadExpress } = require('graphql-upload');
    const passportEngine = require('./module/passport');

    app.use(cookieParser());
    require('body-parser-xml-json')(bodyParser);
    passportEngine.start();
    connectDB.connect()
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'jade');
    app.use(logger('dev'));
    app.use(bodyParser.urlencoded({extended: false}))
    app.use(function (req, res, next) {
        if (req.is('text/*')) {
            req.text = '';
            req.setEncoding('utf8');
            req.on('data', function (chunk) {
                try {
                    req.text += chunk
                } catch (err) {
                    console.error(err)
                    res.status(401);
                    res.end(JSON.stringify(err.message))
                }
            });
            req.on('end', function () {
                try {
                    req.body = JSON.parse(req.text);
                    next()
                } catch (err) {
                    console.error(err)
                    res.status(401);
                    res.end(JSON.stringify(err.message))
                }
            });
        } else {
            next();
        }
    });
    app.use(bodyParser.json({limit: '1000mb'}));
    app.use(bodyParser.xml({limit: '1000mb'}));
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(compression());
    app.use(helmet());
    app.use('*', (req, res, next) => {
        const query = req.query.query || req.body.query || '';
        if (query.length > 2000 || query.includes('__schema')) {
            throw new Error('Query too large');
        }
        next();
    });
    app.set('trust proxy', true)
    const corsOptions = {
        origin: process.env.URL.trim(),
        credentials: true
    };
    app.use(cors(corsOptions));
    app.use('/subscribe', subscribe);
    app.use('/push', push);

    app.use(function (req, res, next) {
        if (req.path !== '/graphql')
            next(createError(404));
        else
            next()
    });

    app.use(function (err, req, res, next) {
        res.locals.message = err.message;
        res.locals.error = req.app.get('env') === 'development' ? err : {};

        res.status(err.status || 500);
        res.render('error');
    });
    app.use(graphqlUploadExpress());
}

module.exports.dirname = __dirname;
module.exports.app = app;
