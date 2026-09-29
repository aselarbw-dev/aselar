// models/discountSetting.js
const { mongoose } = require("../../Shared/config");

const DiscountSettingSchema = new mongoose.Schema({
  // one setting document per account
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  // OFF by default
  enabled: {
    type: Boolean,
    default: false
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const DiscountSetting = mongoose.model('DiscountSetting', DiscountSettingSchema);
module.exports = DiscountSetting;