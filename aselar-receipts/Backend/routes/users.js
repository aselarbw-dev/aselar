const express=require("express")
const {registerBusiness,loginBusiness,
    logoutBusiness,getUserProfile
    ,loginStatus,
    forgotPassword,
    resetPassword,
    changePassword,
    deleteAccount,
    authLimiter,
        requireAuth,
        validateSession,
        extendSession,
        successLogin,
        getMe,
        publicBusinesses
   
   }=require("../controllers/users.js")
 
 
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });  
const {protect}=require("../middlewares/protect.js")
const router = express.Router();
router.post("/business-signup",upload.single('profilePicture'),registerBusiness)
router.post("/business-login",authLimiter,loginBusiness)
router.get("/logout",logoutBusiness)
router.get("/login-status",loginStatus)
router.get("/profile",protect,getUserProfile)
// sessions
router.post('/validate-session', requireAuth, validateSession);
router.post('/extend-session', requireAuth, extendSession);
router.post('/login-success',requireAuth, successLogin);
router.get('/me', protect, getMe);
router.get('/public-businesses', publicBusinesses);
// Unlock session (POST /api/session/unlock)
//router.post('/unlock', protect, unlockUserSession);

router.post("/forgot-password", forgotPassword);
router.put("/reset-password/:token", resetPassword);
router.put("/change-password", protect, changePassword);
router.delete("/delete-account", protect, deleteAccount);
  // Password reset routes

module.exports=router