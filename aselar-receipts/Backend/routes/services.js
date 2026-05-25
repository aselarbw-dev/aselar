const express=require("express")
const {servicesController}=require("../controllers/services.js")
const router=express.Router()
router.post("/create-services",servicesController)
module.exports=router