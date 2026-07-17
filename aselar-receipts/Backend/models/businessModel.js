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
place: { type: String, required: true },       // keep as-is for display, e.g. "123 Tati Road, Extension 9"
city: { type: String, required: true },        // new, e.g. "Gaborone"
geocodedAt: { type: Date }, // lets you tell "never geocoded" apart from "geocoded, no result"
  user: { type: mongoose.Schema.Types.ObjectId, 
    ref: "User", required: true }, // Ensure ownership
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
verifyBusinessModel.index({ businessNature: 1 }); // speeds up your industry filter
module.exports=verifyModel

