const mongoose=require("mongoose")
const verifyBusinessModel=mongoose.Schema({
    businessNature:{
        type:String,
        required:true,
    },
    place:{
        type:String,
        required:true,
    },
    businessNumber:{
        type:String,
        required:true,
    },
    // verifyModel — add these, don't touch anything else
location: {
  type: {
    type: String,
    enum: ["Point"],
    default: "Point",
  },
  coordinates: {
    type: [Number], // [longitude, latitude] — GeoJSON order, not lat/lng!
    default: undefined,
  },
},
place: { type: String, required: true },
city: { type: String, required: true },
geocodedAt: { type: Date },
currency: {
  type: String,
  enum: ["BWP", "ZMW", "ZAR", "NAD", "USD"],
  default: "BWP",
},
  user: { type: mongoose.Schema.Types.ObjectId, 
    ref: "User", required: true },
    businessDescription:{
        type:String,
        required:true,
    },
   
},
{
    timestamps: true,
  }

)

const verifyModel=mongoose.model("verifyModel",verifyBusinessModel)
verifyBusinessModel.index({ location: "2dsphere" });
verifyBusinessModel.index({ businessNature: 1 });
module.exports=verifyModel