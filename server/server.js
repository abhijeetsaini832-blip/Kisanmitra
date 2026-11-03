require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/auth');

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 200 }));

const { getProvider } = require('./services/agent');
app.get('/api/health', (_req, res) => res.json({ ok: true, ai: Boolean(getProvider()), provider: getProvider() || 'fallback' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/crops', require('./routes/crops'));
app.use('/api/advisory', require('./routes/advisory'));
app.use('/api/prices', require('./routes/prices'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => app.listen(PORT, () => console.log(`API running on :${PORT}`)))
  .catch((e) => {
    console.error('DB connection failed:', e.message);
    process.exit(1);
  });
