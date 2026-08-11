const express=require("express")
const {protect}=require("../middlewares/protect.js")
// get the controller for registring business
const {verifyBusinessRegistration
    ,searchBusiness,getUserBusinessVerification,updateBusinessVerification,publicBusinesses}=require("../controllers/business.js")
// router
const router=express.Router()
router.post("/verify-business",protect,verifyBusinessRegistration)
router.put("/business", protect, updateBusinessVerification);
router.get("/get-business",protect,getUserBusinessVerification)
router.get("/search",searchBusiness)
router.get("/public/businesses",publicBusinesses)
module.exports=router