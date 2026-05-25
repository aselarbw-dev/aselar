const mongoose=require("mongoose")
const servicesSchema=mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    rate:{
        type:Number,
        required:true,
    },
    time:{
        type:Number,
        require:true
    },
    description:{
        type:String,
        required:true
    },
 
    expenses:{
        type:String,
        required:true
    }
},
{
    timestamps:true
}

)
const services=mongoose.model("services",servicesSchema)
module.exports=services