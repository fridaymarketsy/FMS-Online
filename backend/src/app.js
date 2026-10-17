const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { MulterError } = require('multer');
const apiRoutes = require('./routes');
const { logError } = require('./utils/errors');

const app = express();
const configuredOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([
  'http://localhost:5173',
  ...configuredOrigins,
]);

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    const error = new Error('المصدر غير مسموح');
    error.status = 403;
    error.expose = true;
    return callback(error);
  },
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(express.json({ limit: '1mb' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));
app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', apiRoutes);
app.use((req, res) => res.status(404).json({ error: 'المسار غير موجود' }));
app.use((error, req, res, _next) => {
  const status = Number(error.status) || (error instanceof MulterError ? 400 : 500);
  if (status >= 500) {
    const route = req.route?.path || req.path;
    const path = `${req.baseUrl}${route}`;
    logError(`${req.method} ${path.startsWith('/api') ? path : `/api${path}`}`, error);
  }
  const message = status >= 500
    ? 'خطأ في الخادم'
    : error.expose
      ? error.message
      : 'تعذر تنفيذ الطلب';
  res.status(status).json({ error: message });
});

module.exports = app;
