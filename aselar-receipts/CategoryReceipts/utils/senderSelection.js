// utils/senderSelection.js

// Countries where Twilio alphanumeric Sender ID is NOT supported —
// must use a real Twilio phone number instead
const ALPHA_NOT_SUPPORTED = new Set(['ZA']); // South Africa confirmed as of Sep 2026

/**
 * Picks the correct "from" value for Twilio based on destination country.
 * @param {string} countryCode - ISO alpha-2, e.g. 'ZA', 'BW', 'KE'
 */
function getSMSSender(countryCode) {
  if (ALPHA_NOT_SUPPORTED.has(countryCode)) {
    return process.env.TWILIO_PHONE_NUMBER; // a real Twilio long number, E.164 format
  }
  return process.env.TWILIO_ALPHANUMERIC_SENDER; // 'Aselarbw'
}

module.exports = { getSMSSender, ALPHA_NOT_SUPPORTED };