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
module.exports=verifyModel

