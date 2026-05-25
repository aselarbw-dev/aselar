  const express = require('express');
  const { protect } = require('../../Shared/protect'); // Correct path to Backend service
  const router=express.Router() 
  const {receiver,
      getReceiver}=require("../controllers/receivers.js")
    // Route to create a receiver
    router.post("/receiver", protect, receiver);
    // route to get the latest receiver
    router.get("/get-receiver", protect, getReceiver);
    module.exports = router;