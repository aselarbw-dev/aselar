const servicesSchema=require("../models/servicesModel")
const asyncHandler=require("express-async-handler")
// create from req.body
// first check
const servicesController=asyncHandler(async(req,res)=>{
    const {name,expenses,rate,description,time}=req.body
     // create file
     const createService=await servicesSchema.create({
        name,expenses,rate,description,time
     })
     if(createService){
      //  const {name,expenses,profit,sales,ratePerTime,description,timeTaken}=createServices
        res.status(201).json({
            name,
            expenses,
            rate
            ,description
            ,time
        })
     }else{
        res.status(400)
        throw new Error("Please try again,something went wrong.")
     }
})
module.exports={servicesController}