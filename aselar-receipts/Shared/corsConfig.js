const cors = require('cors');

// Comma-separated list in env, e.g. "https://yourdomain.com,https://www.yourdomain.com"
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
        // Allow server-to-server / curl / health checks with no Origin header
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        console.warn(`🚫 CORS blocked request from origin: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false, // you're on JWT Bearer tokens, not cookies — no need for credentials: true
    optionsSuccessStatus: 200
};

module.exports = { corsOptions };