const User=require("../models/userModel.js")
const bcrypt = require("bcryptjs");
const passcodeController=( async (req, res) => {
    const { passcode } = req.body;
  // Validate passcode length
  if (passcode.length < 4) {
    return res.status(400).json({ success: false, message: "Passcode must be at least 4 characters long." });
  }

    // Get the current user (e.g., from session or token)
    const userId =req.user._id.toString() // Assuming you're using session-based auth
  
    try {
      // Update the user's passcode in the database
       // Hash the passcode
    const salt = await bcrypt.genSalt(10); // Generate a salt
    const hashedPasscode = await bcrypt.hash(passcode, salt); // Hash the passcode
      await User.findByIdAndUpdate(userId, { passcode:hashedPasscode });
  
      res.json({ success: true, message: "Passcode set successfully." });
    } catch (error) {
      console.error("Error setting passcode:", error);
      res.status(500).json({ success: false, message: "Failed to set passcode." });
    }
  });
  const verifypasscode=(async (req, res) => {
    const { passcode } = req.body;
   // Validate passcode length
   if (passcode.length < 4) {
    return res.status(400).json({ success: false, message: "Passcode must be at least 4 characters long." });
  }

    // Get the current user (e.g., from session or token)
    const userId =req.user._id.toString() // Assuming you're using session-based auth
  
    try {
      // Fetch the user's stored passcode
      const user = await User.findById(userId);
     if (!user.passcode) {
  return res.status(404).json({ success: false, message: "Passcode not set." });
}
      // Compare the entered passcode with the hashed passcode
      const isMatch = await bcrypt.compare(passcode, user.passcode);
  
      if (isMatch) {
        res.json({ success: true, message: "Passcode verified." });
      } else {
        res.status(401).json({ success: false, message: "Invalid passcode." });
      }
      
    } catch (error) {
      console.error("Error verifying passcode:", error);
      res.status(500).json({ success: false, message: "Failed to verify passcode." });
    }
  });
  module.exports={passcodeController,verifypasscode}