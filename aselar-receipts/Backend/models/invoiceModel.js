const mongoose=require("mongoose")
const invoiceSchema=mongoose.Schema({
    fields:[
        {

            field1: { type: String, required: true },
            field2: { type: String, required: true },
            field3: { type: Number, required: true },
            field4: { type: Number, required: true },
        }
    ],
    addition: { type: String, required: true },
    
},
{
    timestamps: true,
  }
)
const invoice=mongoose.model("invoice",invoiceSchema)
module.exports=invoice