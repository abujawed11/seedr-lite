const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { errorHandler } = require('./middlewares/errorHandler');
const database = require('./models/database');
const ActivityLogger = require('./utils/activityLogger');

const torrentsRoutes = require('./routes/torrents.routes');
const streamRoutes = require('./routes/stream.routes');
const authRoutes = require('./routes/auth');
const plansRoutes = require('./routes/plans');
const adminRoutes = require('./routes/admin');
const dmcaRoutes = require('./routes/dmca');
const paymentRoutes = require('./routes/payment');

const app = express();

// APIs should not rely on browser caching/ETags; 304 responses can surface as empty bodies to XHR/axios and
// cause the UI to think there are "no torrents". Disable ETag and force no-store for API routes.
app.set('etag', false);
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Trust proxy for correct IP detection (needed for Cloudflare, nginx, load balancers)
// This allows req.ip to show real client IP instead of proxy IP
app.set('trust proxy', true);

// Debug middleware: Log all incoming requests immediately
app.use((req, res, next) => {
  console.log(`[DEBUG] Incoming request: ${req.method} ${req.url} from Origin: ${req.headers.origin}`);
  next();
});

// Activity Logger Middleware
app.use((req, res, next) => {
  req.activityLogger = new ActivityLogger(database);
  next();
});

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : true;

console.log('CORS Configuration:', { allowedOrigins });

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(helmet());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/health', (_, res) => res.json({ ok: true }));

// Auth routes (public)
app.use('/api/auth', authRoutes);

// DMCA routes (public submission, admin management)
app.use('/api/dmca', dmcaRoutes);

// Protected routes
app.use('/api', plansRoutes); // Plan management routes
app.use('/api/admin', adminRoutes); // Admin control panel routes
app.use('/api/payment', paymentRoutes); // Razorpay payment routes
app.use('/api/torrents', torrentsRoutes);
app.use('/', streamRoutes); // /stream /download /direct
app.use("/api/files", require("./routes/files.routes"));
app.use("/files", require("./routes/files.routes"));

app.use(errorHandler);

const PORT = Number(process.env.PORT || 5000);
app.listen(PORT, () => {
  console.log(`API on http://localhost:${PORT}`);
});
