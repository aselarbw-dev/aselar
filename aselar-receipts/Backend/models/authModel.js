/*
const mongoose=require("mongoose")
const bcrypt=require("bcryptjs")
const authModel=mongoose.Schema({
       nameOfBusiness:{
        type:String,
        required:true
       },
       name:{
        type:String,
        required:true
       },
       emailBusiness: {
        type: String,
        required: true,
        match: [/\S+@\S+\.\S+/, 'Please enter a valid email address']
      },
      
       businessPhone:{
        type:String,
        required:true
       },
       profilePicture:{
        type: String,
        required: true
       }
      ,
       password:{
        type:String,
        required:true
        
       },
       products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
},
{
    timestamps: true,
  }
)
//   Encrypt password before saving to DB
authModel.pre("save", async function (next) {
    if (!this.isModified("password")) {
      return next();
    }
  
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(this.password, salt);
    this.password = hashedPassword;
    next();
  });

const User=mongoose.model("User",authModel)
module.exports=User

*/

