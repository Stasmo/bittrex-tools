var express = require('express');
var passport = require('passport');
var mongoose = require('mongoose');
var Account = require('../models/account');
var Alert = require('../models/alert');
var TriggeredAlert = require('../models/triggeredAlert');
var router = express.Router();


router.get('/', async function (req, res) {
    if(req.isAuthenticated()){
        const alerts = Alert.find({user: req.user._id}).exec();
        const triggered = TriggeredAlert.find({user: req.user._id}).exec();
        const finalResult = await Promise.all([alerts, triggered]);
        res.render('alerts', { user: req.user, alerts: finalResult[0], triggeredAlerts: finalResult[1] });
    }
    else
        res.render('index', { user : req.user });
});

router.get('/register', function(req, res) {
    res.render('register', { });
});

router.post('/register', function(req, res, next) {
    Account.register(new Account({ username : req.body.username.toLowerCase(), _id: mongoose.Types.ObjectId() }), req.body.password, function(err, account) {
        if (err) {
          return res.render('register', { error : err.message });
        }

        passport.authenticate('local')(req, res, function () {
            req.session.save(function (err) {
                if (err) {
                    return next(err);
                }
                res.redirect('/');
            });
        });
    });
});

router.get('/login', function(req, res) {
    res.render('login');
});

router.post('/login', (req, res, next) => { req.body.username = req.body.username.toLowerCase(); next(); }, passport.authenticate('local'), function(req, res) {
    res.redirect('/');
});

router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

router.get('/ping', function(req, res){
    res.status(200).send("pong!");
});

router.get('/settings', function(req, res) {
    if (!req.isAuthenticated()) return res.redirect('/login');
    res.render('settings', { user : req.user });
});

router.post('/settings', function(req, res) {
    if (!req.isAuthenticated()) return res.redirect('/login');
    if (req.body.email == '' || req.body.email != req.user.email) req.user.emailVerified = false;
    req.user.email = req.body.email;
    if (!req.user.emailVerified && req.user.email != '') app.sendVerificationEmail(user);
    req.user.bittrexKey = req.body.bittrexKey;
    req.user.bittrexSecret = req.body.bittrexSecret;
    req.user.pushoverUser = req.body.pushoverUser;
    req.user.pushoverToken = req.body.pushoverToken;
    if (req.body.phoneNumber == '' || req.body.phoneNumber != req.user.phoneNumber) req.user.phoneNumberVerified = false;
    req.user.phoneNumber = req.body.phoneNumber;
    req.user.save();
    res.redirect('/');
});


router.get('/alerts/new', function(req, res) {
    if (!req.isAuthenticated()) res.redirect('/login');
    res.render('create_alert', { user : req.user, alert: new Alert(), marketNames: req.app.get('marketNames') });
});

router.post('/alerts/new', function(req, res, next) {
    if (!req.isAuthenticated()) return res.redirect('/login');
    var alert = new Alert({
        name: req.body.name,
        currencyName: req.body.currencyName,
        threshold: req.body.threshold,
        thresholdType: req.body.thresholdType,
        user: req.user._id
    });
    alert.save(err => {
        if (err) return next(err);
        res.redirect('/');
    });
});

router.post('/alerts/delete', function(req, res, next) {
    if (!req.isAuthenticated()) return res.redirect('/login');
    Alert.findByIdAndRemove(req.body.id, err => {
        console.log('Removed')
        if (err) return next(err);
        res.redirect('/');
    });
});

router.get('/marketNames', (req, res, next) => {
    res.send(req.app.get('marketNames'));
});

router.get('/marketTicker', (req, res, next) => {
    req.app.getMarketTicker(req.query.marketName, (ticker, err) => {
        res.send(ticker);
    })
});

module.exports = router;