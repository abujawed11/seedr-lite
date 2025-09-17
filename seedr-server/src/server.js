const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { errorHandler } = require('./middlewares/errorHandler');

const torrentsRoutes = require('./routes/torrents.routes');
const streamRoutes = require('./routes/stream.routes');
const authRoutes = require('./routes/auth');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || true, credentials: false }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/health', (_, res) => res.json({ ok: true }));

// Auth routes (public)
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/torrents', torrentsRoutes);
app.use('/', streamRoutes); // /stream /download /direct
app.use("/api/files", require("./routes/files.routes"));
app.use("/files", require("./routes/files.routes"));

app.use(errorHandler);

const PORT = Number(process.env.PORT || 5000);
app.listen(PORT, () => {
  console.log(`API on http://localhost:${PORT}`);
});
