var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var TriggeredAlert = new Schema({
    name: String,
    currencyName: String,
    threshold: Number,
    thresholdType: String,
    user: { type: Schema.Types.ObjectId, ref: 'Account' },
    triggeredOn: String
});

module.exports = mongoose.model('TriggeredAlert', TriggeredAlert);
