const mongoose=require("mongoose")
const fileModel=mongoose.Schema({
    files:{
        type:String,
        required:true
    }
}
,
{
    timestamps:true
}
)
const fileData=model.mongoose("fileData",fileModel)
module.exports=fileData