const mongoose=require("mongoose")

const passcodeSchema = new mongoose.Schema({
  passSecret: { type: String, required: true },
 
});

const passcode = mongoose.model('passcode', passcodeSchema);
module.exports=passcode
