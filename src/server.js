require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

// ── Critical env var check on startup ────────────────────────
const REQUIRED_ENV = ['JWT_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error('❌ FATAL: Missing required environment variables:', missing.join(', '));
  console.error('Set these in your Render dashboard under Environment Variables.');
  process.exit(1);
}

const authRoutes     = require('./routes/auth');
const sermonsRoutes  = require('./routes/sermons');
const eventsRoutes   = require('./routes/events');
const resourcesRoutes = require('./routes/resources');
const contactRoutes  = require('./routes/contact');

const app = express();

// ── Security Headers ──────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'https://mfm-ifesowapo.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Render health checks, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body Parsers ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Health Check ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'MFM Ifesowapo API',
    timestamp: new Date().toISOString(),
  });
});

// ── Wake endpoint — frontend pings this to keep server alive ──
app.get('/wake', (req, res) => {
  res.status(200).json({ awake: true });
});

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/sermons',   sermonsRoutes);
app.use('/api/events',    eventsRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/contact',   contactRoutes);

// ── 404 Handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
});

// ── Global Error Handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err.message);
  if (err.code === 'LIMIT_FILE_SIZE')  return res.status(400).json({ success: false, message: 'File too large. Maximum size is 200MB.' });
  if (err.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ success: false, message: 'Too many files. Maximum is 5 per upload.' });
  if (err.message && err.message.includes('CORS blocked')) return res.status(403).json({ success: false, message: err.message });
  res.status(500).json({ success: false, message: 'An internal server error occurred.' });
});

// ── Start Server ──────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ MFM Ifesowapo API running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 JWT_SECRET: ${process.env.JWT_SECRET ? 'SET ✓' : 'MISSING ✗'}`);
  console.log(`🗄️  Supabase: ${process.env.SUPABASE_URL ? 'SET ✓' : 'MISSING ✗'}`);
});

module.exports = app;
