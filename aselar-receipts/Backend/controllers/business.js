const verifyBusinessModel = require("../models/businessModel.js");
const asyncHandler = require("express-async-handler");

// Controller function
const verifyBusinessRegistration = asyncHandler(async (req, res) => {
    const { businessNature, place, businessNumber, businessDescription } = req.body;
    
    // Validate input
    if (!businessNature || !place || !businessNumber || !businessDescription) {
        res.status(400);
        throw new Error("You should enter all necessary data as requested.");
    }
    
    // Check if user already has a business verification (using user ID from protect middleware)
    const existingVerification = await verifyBusinessModel.findOne({ user: req.user._id});
    if (existingVerification) {
        res.status(400);
        throw new Error("You have already submitted a business verification request.");
    }
    
    // Check if business number is already registered by another user
    const existingBusinessNumber = await verifyBusinessModel.findOne({ businessNumber });
    if (existingBusinessNumber) {
        res.status(400);
        throw new Error("This business number is already registered.");
    }
    
    // Create the business verification in DB with user association
    const createBusiness = await verifyBusinessModel.create({
        user: req.user._id,
        businessNature,
        place,
        businessNumber,
        businessDescription
       
    });
    
    if (createBusiness) {
        res.status(201).json({
            _id: createBusiness._id,
            businessNature: createBusiness.businessNature,
            place: createBusiness.place,
            businessNumber: createBusiness.businessNumber,
            businessDescription: createBusiness.businessDescription,

            user: req.user._id.toString()
        });
    } else {
        res.status(400);
        throw new Error("Failed to create business verification.");
    }
});

// Get business verification for the authenticated user
// Get business verification for the authenticated user
const getUserBusinessVerification = asyncHandler(async (req, res) => {
    try {
        const verification = await verifyBusinessModel.findOne({ user: req.user._id });

        console.log("Fetching business for user:", req.user?._id);

        if (!verification) {
            return res.status(200).json({
                message: "No business verification found. Please submit a business verification request.",
                hasVerification: false
            });
        }

        // Always return what the user submitted (pending, approved, rejected, etc.)
        return res.status(200).json({
            _id: verification._id,
            businessNature: verification.businessNature,
            place: verification.place,
            businessNumber: verification.businessNumber,
            businessDescription: verification.businessDescription,
            status: verification.status,  // keep status here for tracking
            user: verification.user,
            hasVerification: true
        });
    } catch (error) {
        console.error("Error fetching user business verification:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// Search businesses
const searchBusiness = asyncHandler(async (req, res) => {
    const { businessNature } = req.query;
  
    // Validate input
    if (!businessNature) {
        return res.status(400).json({ message: "Business nature is required" });
    }
  
    try {
        // Fetch businesses from the database (case-insensitive search)
        // Only return approved businesses for search
        const businesses = await verifyBusinessModel
            .find({ 
                businessNature: new RegExp(businessNature, "i"),
                status: 'approved' // Only show approved businesses in search
            })
            .limit(4)
            .sort({ createdAt: -1 })
            .select('businessNature place businessDescription createdAt'); // Only return necessary fields
  
        // Handle no results
        if (businesses.length === 0) {
            return res.status(404).json({ message: "No businesses found" });
        }
  
        // Return successful response
        res.status(200).json(businesses);
    } catch (error) {
        console.error("Error fetching businesses:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

module.exports = {
    verifyBusinessRegistration,
    searchBusiness,
    getUserBusinessVerification
};