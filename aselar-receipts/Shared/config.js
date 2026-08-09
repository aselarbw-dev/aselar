const mongoose = require('mongoose');
let isConnected = false;

const connectDB = async () => {
    try {
        const readyState = mongoose.connection.readyState;
        if (isConnected && readyState === 1) return mongoose.connection;
        if (readyState === 2) {
            await new Promise((resolve, reject) => {
                mongoose.connection.once('connected', resolve);
                mongoose.connection.once('error', reject);
            });
            return mongoose.connection;
        }

        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) throw new Error('MONGO_URI not defined');

        const conn = await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
             maxPoolSize: 15,   // NEW — was defaulting to 100
    minPoolSize: 2,    // NEW — keep a couple warm to avoid cold-connection latency
        });

        isConnected = true;
        console.log(`📊 MongoDB Connected: ${conn.connection.host}`);

        // Setup listeners
        if (mongoose.connection.listeners('connected').length === 0) {
            mongoose.connection.on('connected', () => {
                isConnected = true;
                console.log('📊 Mongoose connected to MongoDB');
            });
            mongoose.connection.on('error', (err) => {
                console.error('📊 Mongoose error:', err);
                isConnected = false;
            });
            mongoose.connection.on('disconnected', () => {
                console.log('📊 Mongoose disconnected');
                isConnected = false;
            });
        }

        return conn.connection;
    } catch (error) {
        console.error('❌ DB connection failed:', error.message);
        isConnected = false;
        throw error;
    }
};

const getConnectionState = () => ({
    isConnected,
    readyState: mongoose.connection.readyState,
    states: {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    }
});

module.exports = {
    connectDB,
    getConnectionState,
    isConnected: () => isConnected && mongoose.connection.readyState === 1,
    mongoose
};
