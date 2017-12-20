// dependencies
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

const bittrex = require('node-bittrex-api');

var routes = require('./routes/index');
var users = require('./routes/users');
var alerts = require('./routes/alerts');

var mongooseConnectionString = process.env['DATABASE_STRING'];

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('express-session')({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));
app.use(function(req,res,next){
    res.locals.session = req.session;
    res.locals.user = req.user;
    next();
});


app.use('/', routes);

// passport config
var Account = require('./models/account');
passport.use(new LocalStrategy(Account.authenticate()));
passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());

// mongoose
mongoose.connect(mongooseConnectionString, { useMongoClient: true });

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

setInterval(checkValues, 30000);

var Alert = require('./models/alert');
var TriggeredAlert = require('./models/triggeredAlert');

function checkValues() {
    app.locals.lastChecked = Date();
    console.log('Checking alerts')
    bittrex.getmarketsummaries((data,err) => {
        var marketToLast = {};
        data.result.map((a) => { marketToLast[a.MarketName] = a.Last });
        Alert.find((err, alerts) => {
            for (var i in alerts) {
                var alert = alerts[i];
                if ((alert.thresholdType == 'above' && marketToLast[alert.currencyName] > alert.threshold)
                 || (alert.thresholdType == 'below' && marketToLast[alert.currencyName] < alert.threshold))
                    triggerAlert(alert);
            }
        })
    });
}

function triggerAlert(alert) {
    console.log('Alert triggered')
    console.log(alert);
    var triggeredAlert = new TriggeredAlert({
        name: alert.name,
        user: alert.user,
        currencyName: alert.currencyName,
        triggeredOn: Date(),
        threshold: alert.threshold,
        thresholdType: alert.thresholdType
    });
    triggeredAlert.save(() => {
        alert.remove();
    })
}

checkValues();

app.getMarketTicker = function(marketName, callback) {
    bittrex.getticker({market: marketName}, callback);
}

bittrex.getmarketsummaries((data,err) => {
    console.log(Date() + ' - Getting market names');
    app.set('marketNames', data.result.map((a) => a.MarketName ));
});


module.exports = app;
