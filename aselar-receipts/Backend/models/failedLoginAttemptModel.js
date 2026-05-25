// models/failedLoginAttemptModel.js
const mongoose = require('mongoose');

const failedLoginAttemptSchema = new mongoose.Schema({
    email: { type: String, required: true },
    ip: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: '15m' } // Auto-delete after 15m
});

module.exports = mongoose.model('FailedLoginAttempt', failedLoginAttemptSchema);