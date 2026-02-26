require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const { doubleCsrf } = require('csrf-csrf');
const logger = require('./utils/logger');
const { initialize } = require('./database/init');

// Initialize database
initialize();

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      frameSrc: ["'self'"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS — allow widget embedding
app.use(cors({
  origin: [
    'https://redresscompliance.com',
    'https://www.redresscompliance.com',
    process.env.BASE_URL || 'http://localhost:3000',
  ],
  methods: ['GET', 'POST'],
  credentials: true,
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Widget JS with CORS headers
app.get('/widget/newsletter.js', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/javascript');
  next();
});

// Session
app.use(session({
  store: new SQLiteStore({
    db: 'newsletter.db',
    dir: path.join(__dirname, 'database'),
    table: 'sessions',
  }),
  secret: process.env.SESSION_SECRET || 'change-this-to-a-random-string',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax',
  },
}));

// CSRF protection
const { doubleCsrfProtection, generateToken } = doubleCsrf({
  getSecret: () => process.env.SESSION_SECRET || 'change-this-to-a-random-string',
  cookieName: '_csrf',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  },
  getTokenFromRequest: (req) => {
    return req.body._csrf || req.headers['x-csrf-token'] || '';
  },
});

// Make CSRF token available to views
app.use((req, res, next) => {
  req.csrfToken = () => {
    try {
      return generateToken(req, res);
    } catch (e) {
      return '';
    }
  };
  next();
});

// Apply CSRF to admin routes (POST only)
app.use('/admin', (req, res, next) => {
  if (req.method === 'POST') {
    return doubleCsrfProtection(req, res, (err) => {
      if (err) {
        logger.warn({ path: req.path }, 'CSRF validation failed');
        if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
          return res.status(403).json({ error: 'Invalid CSRF token. Please refresh the page.' });
        }
        return res.status(403).send('Invalid CSRF token. Please refresh the page and try again.');
      }
      next();
    });
  }
  next();
});

// View engine
app.set('view engine', 'ejs');
app.set('views', [
  path.join(__dirname, 'views'),
  path.join(__dirname, 'templates'),
]);

// Routes
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const publicRoutes = require('./routes/public');

app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);
app.use('/', publicRoutes);

// Home redirect
app.get('/', (req, res) => {
  res.redirect('/subscribe');
});

// 404 handler
app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Page Not Found | Redress Compliance</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Inter', sans-serif; background: #f4f5f7; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .container { text-align: center; }
        h1 { font-size: 4rem; color: #002B5C; margin-bottom: 0.5rem; }
        p { color: #6c757d; margin-bottom: 1.5rem; }
        a { color: #B8860B; font-weight: 600; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>404</h1>
        <p>The page you're looking for doesn't exist.</p>
        <a href="/subscribe">Go to Newsletter Sign-up</a>
      </div>
    </body>
    </html>
  `);
});

// Error handler
app.use((err, req, res, next) => {
  logger.error({ error: err.message, stack: err.stack }, 'Unhandled error');
  res.status(500).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Error | Redress Compliance</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Inter', sans-serif; background: #f4f5f7; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .container { text-align: center; }
        h1 { font-size: 2rem; color: #002B5C; margin-bottom: 0.5rem; }
        p { color: #6c757d; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Something went wrong</h1>
        <p>We're sorry, an unexpected error occurred. Please try again later.</p>
      </div>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  logger.info({ port: PORT }, `Redress Newsletter app running on port ${PORT}`);
});

module.exports = app;
