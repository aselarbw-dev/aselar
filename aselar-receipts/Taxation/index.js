// Taxation/index.js: entry point for the VAT service.
//
// Env vars this file reads:
//   PORT          port to listen on (Render sets this automatically)
//   JWT_SECRET    must be the SAME value as your other services so tokens verify
//   CORS_ORIGINS  comma-separated frontend origins (default: http://localhost:5173)
//   (plus whatever Shared/config.js reads for the MongoDB connection)

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// Shared DB connection. Keep the exact casing of "Shared": Render runs Linux, which is case-sensitive.
const { connectDB } = require("../Shared/config");

// Registers the VAT models on the shared mongoose instance.
require("./models/vatModels");

const vatRoutes = require("./routes/routes");

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not set. Refusing to start.");
  process.exit(1);
}

const app = express();
app.set("trust proxy", 1); // Render sits behind a proxy

// ---------------------------------------------------------------------------
// middleware
// ---------------------------------------------------------------------------
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // No Origin header = non-browser call (health checks, PowerShell, cron): allow.
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true, // protect also reads a token cookie
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// ---------------------------------------------------------------------------
// routes
// ---------------------------------------------------------------------------
// Public health check (no auth, no DB): used by Render and for quick manual checks.
app.get("/health", (req, res) => res.json({ status: "ok", service: "vat" }));

// Auth (the shared protect middleware) is applied per route inside routes/routes.js.
app.use("/api/vat", vatRoutes);

// 404
app.use((req, res) => res.status(404).json({ message: "Not found" }));

// ---------------------------------------------------------------------------
// error handler (must be last)
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ message: "Origin not allowed" });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON body" });
  }
  if (err.name === "ValidationError") {
    return res.status(400).json({
      message: "Validation failed",
      errors: Object.values(err.errors).map((e) => e.message),
    });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ message: `Invalid value for ${err.path || "field"}` });
  }
  // Log the message only (no request bodies: they can contain personal data).
  console.error("VAT service error:", err.message);
  return res.status(500).json({ message: "Something went wrong" });
});

// ---------------------------------------------------------------------------
// start
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 4100;
let server;

(async () => {
  try {
    await connectDB();
    server = app.listen(PORT, () => console.log(`VAT service listening on port ${PORT}`));
  } catch (err) {
    console.error("VAT service failed to start:", err.message);
    process.exit(1);
  }
})();

// Render sends SIGTERM on deploys: finish in-flight requests, then exit.
process.on("SIGTERM", () => {
  if (server) server.close(() => process.exit(0));
  else process.exit(0);
});