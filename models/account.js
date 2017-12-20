var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');

var Account = new Schema({
    _id: Schema.Types.ObjectId,
    username: String,
    password: String,
    bittrexKey: String,
    bittrexSecret: String,
    email: String,
    pushoverUser: String,
    pushoverToken: String,
    alerts: [{type: Schema.Types.ObjectId, ref: 'Alert'}]
});

Account.plugin(passportLocalMongoose);

module.exports = mongoose.model('Account', Account);
