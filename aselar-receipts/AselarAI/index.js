// server.js  (or index.js) — Aselar AI Backend
import express from "express";
import cors from "cors";
import Groq from "groq-sdk";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { createRequire } from "module";

// Bridge for CommonJS middleware
const require = createRequire(import.meta.url);
const { protect } = require('../Shared/protect');
const { connectDB } = require('../Shared/config');
const { mongoose } = require('../Shared/config');

dotenv.config();

const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "DELETE", "OPTIONS"],   // added for safety
  allowedHeaders: ["Content-Type", "Authorization"]
}));


app.use(express.json());
app.use(cookieParser());

// ─────────────────────────────────────────
// MongoDB Models
// ─────────────────────────────────────────
const messageSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  sessionId: { type: String, required: true },
  role:      { type: String, enum: ["user", "assistant"], required: true },
  content:   { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const sessionSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title:     { type: String, default: "New Chat" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const ChatMessage = mongoose.models.ChatMessage || mongoose.model("ChatMessage", messageSchema);
const ChatSession  = mongoose.models.ChatSession  || mongoose.model("ChatSession",  sessionSchema);

// ─────────────────────────────────────────
// System Prompt
// ─────────────────────────────────────────
const SYSTEM_PROMPT = `You are Aselar AI Assistant, a specialized business and accounting AI built into the Aselar platform.

You are an expert in:
- Business strategy, operations, and management
- Accounting principles (GAAP, IFRS), bookkeeping, and financial statements
- Invoicing, quotations, ledgers, and income statements
- Inventory management and debt collection
- Payroll, payslips, and payments
- Financial math: ROI, profit margins, break-even analysis, ratios
- Tax planning and compliance
- Business growth and financial planning

When doing calculations:
- Show your working step by step
- Format numbers clearly (e.g., P1,234.56 for Botswana Pula)
- Double-check your results

Always give practical, actionable advice. If a question is outside business/accounting/finance, gently redirect.`;

// ─────────────────────────────────────────
// Helper: Ensure DB is connected before DB operations
// ─────────────────────────────────────────
const ensureDbConnected = async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: "Database not connected. Please try again later."
    });
  }
  next();
};

// ─────────────────────────────────────────
// Routes — all protected
// ─────────────────────────────────────────

app.post("/api/chat/session", protect, ensureDbConnected, async (req, res) => {
  try {
    console.log("[CREATE SESSION] User ID:", req.user?._id);
    console.log("[CREATE SESSION] Request body:", req.body); // usually empty for this route

    if (!req.user?._id) {
      return res.status(401).json({ error: "No authenticated user" });
    }

    const session = await ChatSession.create({
      userId: req.user._id
    });

    console.log("[CREATE SESSION] Success - new ID:", session._id);

    res.json({
      sessionId: session._id.toString(),
      title: session.title
    });
  } catch (err) {
    console.error("[CREATE SESSION] ERROR:");
    console.error(err.stack || err.message);
    res.status(500).json({
      error: "Failed to create session",
      details: err.message || "Unknown database error"
    });
  }
});
app.get("/api/chat/sessions", protect, ensureDbConnected, async (req, res) => {
  try {
    const sessions = await ChatSession.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .select("_id title updatedAt");
    res.json(sessions);
  } catch (err) {
    console.error("List sessions error:", err);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

app.get("/api/chat/session/:sessionId", protect, ensureDbConnected, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await ChatSession.findOne({ _id: sessionId, userId: req.user._id });
    if (!session) return res.status(404).json({ error: "Session not found" });

    const messages = await ChatMessage.find({ sessionId }).sort({ createdAt: 1 });
    res.json({ session, messages });
  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.delete("/api/chat/session/:sessionId", protect, ensureDbConnected, async (req, res) => {
  try {
    const { sessionId } = req.params;
    await ChatSession.deleteOne({ _id: sessionId, userId: req.user._id });
    await ChatMessage.deleteMany({ sessionId });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete session error:", err);
    res.status(500).json({ error: "Failed to delete session" });
  }
});

app.post("/api/chat/stream", protect, ensureDbConnected, async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message || !sessionId) {
    return res.status(400).json({ error: "message and sessionId are required" });
  }

  try {
    // Ownership check
    const session = await ChatSession.findOne({ _id: sessionId, userId: req.user._id });
    if (!session) return res.status(404).json({ error: "Session not found" });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    // Save user message
    await ChatMessage.create({
      userId: req.user._id,
      sessionId,
      role: "user",
      content: message,
    });

   
   // Auto-title with first user message (cleaner)
if (session.title === "New Chat") {
  let title = message.trim();
  title = title.length > 60 ? title.slice(0, 57) + "..." : title;
  session.title = title || "New Chat";
  session.updatedAt = new Date();
  await session.save();
}
    session.updatedAt = new Date();
    await session.save();

    // Context (last 20 messages before current)
    const history = await ChatMessage.find({ sessionId })
      .sort({ createdAt: -1 })
      .limit(21)
      .lean();

    const contextMessages = history
      .reverse()
      .slice(0, -1)
      .map(m => ({ role: m.role, content: m.content }));

    // Stream from Groq
    const stream = await groq.chat.completions.create({
  model: "llama-3.3-70b-versatile",
  messages: [
    { role: "system", content: SYSTEM_PROMPT },   // ← this was the bug
    ...contextMessages,
    { role: "user", content: message },
  ],
  stream: true,
  temperature: 0.7,
  max_tokens: 1024,
});

    let fullResponse = "";
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // Save assistant response
    await ChatMessage.create({
      userId: req.user._id,
      sessionId,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

  } catch (error) {
    console.error("Stream error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "AI service error" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "AI service error. Please try again." })}\n\n`);
      res.end();
    }
  }
});

// Health check (useful for debugging)
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    db: {
      connected: mongoose.connection.readyState === 1,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host || "not connected"
    },
    model: "llama-3.3-70b-versatile (Groq)"
  });
});

// ─────────────────────────────────────────
// Start Server — DB first, then listen
// ─────────────────────────────────────────
const PORT = process.env.PORT || 5014;

async function startServer() {
  try {
    await connectDB();
    console.log("MongoDB connection established → starting HTTP server");

    app.listen(PORT, () => {
      console.log(`Aselar AI backend → http://localhost:${PORT}`);
      console.log(`CORS allowed origin: ${process.env.FRONTEND_URL || "http://localhost:5173"}`);
    });
  } catch (err) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("FAILED TO START SERVER — MongoDB connection failed");
    console.error(err);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    process.exit(1);
  }
}

startServer();