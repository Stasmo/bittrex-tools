var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Alert = new Schema({
    name: String,
    currencyName: String,
    threshold: Number,
    user: { type: Schema.Types.ObjectId, ref: 'Account' },
    thresholdType: {
        type: String,
        enum: ['above', 'below']
    }
});

module.exports = mongoose.model('Alert', Alert);
