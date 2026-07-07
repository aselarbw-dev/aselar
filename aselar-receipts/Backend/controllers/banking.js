// controllers/bankingController.js
const Banking = require('../models/bankingModel');

// Create new banking details
const createBankingDetails = async (req, res) => {
  try {
    const {
      accountName,
      bankName,
      accountNumber,
      branchName,
      swiftCode,
      accountType,
    } = req.body;

    const bankingDetails = new Banking({
      accountName: accountName || '',
      bankName: bankName || '',
      accountNumber, // required now — no fallback to ''
      branchName: branchName || '',
      swiftCode: swiftCode ? swiftCode.toUpperCase() : '',
      accountType: accountType || 'checking',
      user: req.user._id
    });

    const savedBanking = await bankingDetails.save();

    res.status(201).json({
      success: true,
      message: 'Banking details created successfully',
      data: {
        id: savedBanking._id,
        accountName: savedBanking.accountName,
        bankName: savedBanking.bankName,
        accountNumber: savedBanking.accountNumber,
        branchName: savedBanking.branchName,
        swiftCode: savedBanking.swiftCode,
        accountType: savedBanking.accountType,
        verificationStatus: savedBanking.verificationStatus,
        displayName: savedBanking.displayName,
        createdAt: savedBanking.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating banking details:', error);

    // Duplicate within the SAME user's own records (compound index: user + accountNumber)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'You already have banking details saved with this account number',
        error: 'DUPLICATE_ACCOUNT_NUMBER'
      });
    }

    // Missing/invalid required fields (e.g. accountNumber not provided)
    if (error.name === 'ValidationError') {
      const firstError = Object.values(error.errors)[0]?.message || 'Validation failed';
      return res.status(400).json({
        success: false,
        message: firstError,
        error: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Get all banking details (with pagination)
const getAllBankingDetails = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filters = {};

    if (req.user && req.user._id) {
      filters.user = req.user._id;
    }
    if (req.query.user) filters.user = req.query.user;
    if (req.query.accountType) filters.accountType = req.query.accountType;
    if (req.query.verificationStatus) filters.verificationStatus = req.query.verificationStatus;
    if (req.query.isActive !== undefined) filters.isActive = req.query.isActive === 'true';

    const total = await Banking.countDocuments(filters);

    const bankingDetails = await Banking.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email');

    res.status(200).json({
      success: true,
      data: bankingDetails,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching banking details:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Get banking details by ID
const getBankingDetailsById = async (req, res) => {
  try {
    const { id } = req.params;

    const bankingDetails = await Banking.findById(id)
      .populate('user', 'name email');

    if (!bankingDetails) {
      return res.status(404).json({
        success: false,
        message: 'Banking details not found'
      });
    }

    res.status(200).json({
      success: true,
      data: bankingDetails.toObject()
    });

  } catch (error) {
    console.error('Error fetching banking details:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid banking details ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Update banking details
const updateBankingDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    delete updates._id;
    delete updates.__v;
    delete updates.createdAt;
    delete updates.user;

    const bankingDetails = await Banking.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: Date.now() },
      { new: true, runValidators: true } // enforce required/validation on updates too
    );

    if (!bankingDetails) {
      return res.status(404).json({
        success: false,
        message: 'Banking details not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Banking details updated successfully',
      data: bankingDetails.toObject()
    });

  } catch (error) {
    console.error('Error updating banking details:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid banking details ID'
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'You already have banking details saved with this account number',
        error: 'DUPLICATE_ACCOUNT_NUMBER'
      });
    }

    if (error.name === 'ValidationError') {
      const firstError = Object.values(error.errors)[0]?.message || 'Validation failed';
      return res.status(400).json({
        success: false,
        message: firstError,
        error: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Delete banking details
const deleteBankingDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const bankingDetails = await Banking.findByIdAndDelete(id);

    if (!bankingDetails) {
      return res.status(404).json({
        success: false,
        message: 'Banking details not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Banking details deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting banking details:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid banking details ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Update verification status
const updateVerificationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { verificationStatus } = req.body;

    if (!['pending', 'verified', 'rejected'].includes(verificationStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification status. Must be: pending, verified, or rejected'
      });
    }

    const bankingDetails = await Banking.findByIdAndUpdate(
      id,
      { verificationStatus, updatedAt: Date.now() },
      { new: true }
    );

    if (!bankingDetails) {
      return res.status(404).json({
        success: false,
        message: 'Banking details not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Verification status updated successfully',
      data: {
        id: bankingDetails._id,
        verificationStatus: bankingDetails.verificationStatus,
        updatedAt: bankingDetails.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating verification status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Get most recent banking details for the logged-in user
const getMostRecentBankingDetails = async (req, res) => {
  try {
    const mostRecentBanking = await Banking.findOne({
      user: req.user._id,
      isActive: true
    })
    .sort({ createdAt: -1 })
    .select('bankName accountNumber branchName swiftCode accountName createdAt verificationStatus')
    .lean();

    if (!mostRecentBanking) {
      return res.status(404).json({
        success: false,
        message: 'No banking details found for this user'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Most recent banking details retrieved successfully',
      data: {
        id: mostRecentBanking._id,
        bankName: mostRecentBanking.bankName,
        accountNumber: mostRecentBanking.accountNumber,
        branchName: mostRecentBanking.branchName,
        swiftCode: mostRecentBanking.swiftCode,
        accountName: mostRecentBanking.accountName,
        verificationStatus: mostRecentBanking.verificationStatus,
        createdAt: mostRecentBanking.createdAt
      }
    });

  } catch (error) {
    console.error('Error fetching most recent banking details:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

module.exports = {
  createBankingDetails,
  getAllBankingDetails,
  getBankingDetailsById,
  updateBankingDetails,
  deleteBankingDetails,
  updateVerificationStatus,
  getMostRecentBankingDetails
};