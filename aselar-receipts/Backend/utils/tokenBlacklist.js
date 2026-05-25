const redis = require('redis');
const jwt = require('jsonwebtoken');

const client = redis.createClient({
  // Add your Redis config if needed
  //host: 'localhost',
  //port: 6379,
});

client.on('error', (err) => console.log('Redis Client Error', err));

// Connect to Redis
client.connect();

const addToBlacklist = async (token) => {
  try {
    // Get token expiration time
    const decoded = jwt.decode(token);
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    
    // Only add if token hasn't expired yet
    if (ttl > 0) {
      await client.setEx(`blacklist:${token}`, ttl, '1');
    }
  } catch (error) {
    console.error('Error adding token to blacklist:', error);
  }
};

const isBlacklisted = async (token) => {
  try {
    const result = await client.get(`blacklist:${token}`);
    return result !== null;
  } catch (error) {
    console.error('Error checking blacklist:', error);
    return false;
  }
};

module.exports = { addToBlacklist, isBlacklisted };