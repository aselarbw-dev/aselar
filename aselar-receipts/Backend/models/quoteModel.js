const mongoose=require("mongoose")
const quoteSchema=mongoose.Schema({
    data:[
        {

            field1: { type: String, required: true },
            field2: { type: String, required: true },
            field3: { type: Number, required: true },
            field4: { type: Number, required: true },
        }
    ],
    totalSum: { type: String, required: true },
    date: {
        type: Date,
        default: Date.now,  // Default to the current date if no date is provided
      },
      
},
 {
    timestamps: true,
}

)
const quote=mongoose.model("quote",quoteSchema)
module.exports=quote