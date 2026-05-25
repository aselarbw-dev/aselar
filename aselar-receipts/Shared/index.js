// shared/auth/index.js
const dotenv = require('dotenv');
dotenv.config();

const { protect, initializeAuth, connectDB, isConnected } = require('./protect');
const User = require('./model');

let authReady = false;

// Re-wrap initializeAuth to track readiness
const init = async () => {
  try {
    const success = await initializeAuth();
    if (success) {
      authReady = true;
      console.log('✅ Shared auth system initialized');
    } else {
      console.error('❌ Shared auth initialization failed');
    }
    return success;
  } catch (err) {
    console.error('❌ Error during shared auth init:', err);
    return false;
  }
};

// Optional safe accessor (only if you want to be defensive)
const getProtect = () => {
  if (!authReady) {
    throw new Error('🚫 protect() called before auth initialized. Make sure initializeAuth() was run.');
  }
  return protect;
};

module.exports = {
  // same exports as before, but now auth init is tracked internally
  protect,                  // direct export if you're confident about order
  getProtect,               // safe accessor (optional)
  initializeAuth: init,
  connectDB,
  isConnected,
  User
};
