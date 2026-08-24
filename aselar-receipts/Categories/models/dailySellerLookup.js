// models/dailySellerLookup.js — lives inside the Categories service,
// NOT a copy of the real DailySeller controller/logic. This is a
// read-only reference to the same "dailysellers" collection that the
// other service already writes to via the same Atlas URI.
const { mongoose } = require('../../Shared/config'); // use OUR already-connected mongoose

const dailySellerLookupSchema = new mongoose.Schema({
  name: String,
  user: mongoose.Schema.Types.ObjectId,
  date: String,
  timestamp: Date,
}, { collection: 'dailysellers' }); // explicit — matches the real collection name exactly

module.exports = mongoose.model('DailySellerLookup', dailySellerLookupSchema);