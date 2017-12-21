// dependencies
const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const sgMail = require('@sendgrid/mail');
const push = require('pushover-notifications');
const bittrex = require('node-bittrex-api');
const routes = require('./routes/index');
const users = require('./routes/users');
const alerts = require('./routes/alerts');
const mongooseConnectionString = process.env['DATABASE_STRING'];
const app = express();

sgMail.setApiKey(process.env['SENDGRID_API_KEY']);

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
var marketToLast = {};

function checkValues() {
    app.locals.lastChecked = (new Date()).toISOString();
    console.log('Checking alerts')
    bittrex.getmarketsummaries((data,err) => {
        marketToLast = {};
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
    });

    alert.populate('user', (err, a) => {
        if (a.user.email) {
            sendEmailAlert(a);
        }
        if (a.user.pushoverUser && a.user.pushoverToken) {
            sendPushoverAlert(a);
        }
    })
}

function sendEmailAlert(alert) {
    const msg = {
      to: alert.user.email,
      from: "noreply@alert.stasmo.wtf",
      subject: "Bittrex Alert - " + alert.name,
      text: `The currency ${ alert.currencyName } has reached the threshold of ${ alert.thresholdType } ${ alert.threshold } at ${ marketToLast[alert.currencyName] } on ${ Date() }.`,
      html: `The currency ${ alert.currencyName } has reached the threshold of ${ alert.thresholdType } ${ alert.threshold } at ${ marketToLast[alert.currencyName] } on ${ Date() }.`,
    };
    sgMail.send(msg);
}

function sendPushoverAlert(alert) {
    if (!alert.user.pushoverClient) {
        alert.user.pushoverClient = new push( {
          user: alert.user.pushoverUser,
          token: alert.user.pushoverToken
        });
    }
    const msg = {
        message: `Your ${ alert.currencyName } alert at stasmo.wtf has triggered. ${ alert.currencyName } ${ alert.thresholdType } ${ alert.threshold} at ${ marketToLast[alert.currencyName] }`,
        title: `${ alert.currencyName } ${ alert.thresholdType } ${ alert.threshold}`,
        sound: 'cashregister',
        priority: 1
    };
    alert.user.pushoverClient.send( msg, function( err, result ) {
        if ( err ) {
            console.log('Error while sending message')
            console.error(err);
        }
    });
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
