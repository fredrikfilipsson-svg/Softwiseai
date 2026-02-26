const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');
const { loginRateLimiter } = require('../middleware/rateLimiter');
const subscriberService = require('../services/subscriberService');
const newsletterService = require('../services/newsletterService');
const logger = require('../utils/logger');

const uploadNewsletter = multer({
  dest: path.join(__dirname, '..', 'uploads'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/html' || path.extname(file.originalname).toLowerCase() === '.html') {
      cb(null, true);
    } else {
      cb(new Error('Only HTML files are allowed'));
    }
  },
});

const uploadCsv = multer({
  dest: path.join(__dirname, '..', 'uploads'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// --- Login ---
router.get('/login', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect('/admin');
  }
  res.render('login', { title: 'Admin Login', error: null, csrfToken: req.csrfToken ? req.csrfToken() : '' });
});

router.post('/login', loginRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return res.render('login', { title: 'Admin Login', error: 'Admin credentials not configured.', csrfToken: req.csrfToken ? req.csrfToken() : '' });
    }

    if (email !== adminEmail) {
      return res.render('login', { title: 'Admin Login', error: 'Invalid credentials.', csrfToken: req.csrfToken ? req.csrfToken() : '' });
    }

    let passwordMatch = false;
    if (adminPassword.startsWith('$2b$') || adminPassword.startsWith('$2a$')) {
      passwordMatch = await bcrypt.compare(password, adminPassword);
    } else {
      passwordMatch = password === adminPassword;
    }

    if (!passwordMatch) {
      return res.render('login', { title: 'Admin Login', error: 'Invalid credentials.', csrfToken: req.csrfToken ? req.csrfToken() : '' });
    }

    req.session.isAdmin = true;
    req.session.adminEmail = adminEmail;
    logger.info({ email: adminEmail }, 'Admin login successful');
    res.redirect('/admin');
  } catch (error) {
    logger.error({ error: error.message }, 'Login error');
    res.render('login', { title: 'Admin Login', error: 'An error occurred. Please try again.', csrfToken: req.csrfToken ? req.csrfToken() : '' });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

// --- Dashboard ---
router.get('/', requireAuth, (req, res) => {
  const subscriberStats = subscriberService.getStats();
  const newslettersSent = newsletterService.getStats();

  res.render('dashboard', {
    title: 'Dashboard',
    stats: {
      ...subscriberStats,
      newslettersSent,
    },
    csrfToken: req.csrfToken ? req.csrfToken() : '',
  });
});

// --- Compose ---
router.get('/compose', requireAuth, (req, res) => {
  res.render('compose', {
    title: 'Compose Newsletter',
    newsletter: null,
    csrfToken: req.csrfToken ? req.csrfToken() : '',
  });
});

router.post('/compose/upload', requireAuth, uploadNewsletter.single('htmlFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const htmlContent = fs.readFileSync(req.file.path, 'utf-8');
    fs.unlinkSync(req.file.path);

    const newsletter = newsletterService.create({
      subject: req.body.subject || 'Newsletter',
      previewText: req.body.previewText || '',
      htmlContent,
    });

    res.json({ success: true, newsletter });
  } catch (error) {
    logger.error({ error: error.message }, 'Upload error');
    res.status(500).json({ error: 'Upload failed.' });
  }
});

router.post('/compose/save', requireAuth, (req, res) => {
  try {
    const { subject, previewText, htmlContent } = req.body;

    if (!subject || !htmlContent) {
      return res.status(400).json({ error: 'Subject and content are required.' });
    }

    const newsletter = newsletterService.create({
      subject,
      previewText: previewText || '',
      htmlContent,
    });

    res.json({ success: true, newsletter });
  } catch (error) {
    logger.error({ error: error.message }, 'Save error');
    res.status(500).json({ error: 'Save failed.' });
  }
});

router.post('/send/:id', requireAuth, async (req, res) => {
  try {
    const newsletter = newsletterService.findById(req.params.id);
    if (!newsletter) {
      return res.status(404).json({ error: 'Newsletter not found.' });
    }

    if (newsletter.status === 'sending') {
      return res.status(400).json({ error: 'Newsletter is already being sent.' });
    }

    const activeCount = subscriberService.getStats().active;
    if (activeCount === 0) {
      return res.status(400).json({ error: 'No active subscribers.' });
    }

    res.json({ success: true, message: 'Sending started.', totalRecipients: activeCount });

    newsletterService.sendToAll(newsletter.id).catch(err => {
      logger.error({ error: err.message, newsletterId: newsletter.id }, 'Send all failed');
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Send error');
    res.status(500).json({ error: 'Failed to start sending.' });
  }
});

router.post('/send-test/:id', requireAuth, async (req, res) => {
  try {
    const testEmail = req.body.testEmail || process.env.ADMIN_EMAIL;
    const result = await newsletterService.sendTest(req.params.id, testEmail);

    if (result.success) {
      res.json({ success: true, message: `Test email sent to ${testEmail}` });
    } else {
      res.status(500).json({ error: `Failed to send test email: ${result.error}` });
    }
  } catch (error) {
    logger.error({ error: error.message }, 'Test send error');
    res.status(500).json({ error: 'Failed to send test email.' });
  }
});

// --- Subscribers ---
router.get('/subscribers', requireAuth, (req, res) => {
  const { page = 1, status, source, search } = req.query;
  const result = subscriberService.listSubscribers({
    page: parseInt(page, 10),
    limit: 25,
    status: status || undefined,
    source: source || undefined,
    search: search || undefined,
  });

  res.render('subscribers', {
    title: 'Subscribers',
    ...result,
    filters: { status, source, search },
    csrfToken: req.csrfToken ? req.csrfToken() : '',
  });
});

router.post('/subscribers/add', requireAuth, (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !subscriberService.isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required.' });
    }

    const existing = subscriberService.findByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already exists.' });
    }

    subscriberService.createSubscriber({
      email,
      name: name || null,
      source: 'manual',
      status: 'active',
    });

    res.redirect('/admin/subscribers');
  } catch (error) {
    logger.error({ error: error.message }, 'Add subscriber error');
    res.status(500).json({ error: 'Failed to add subscriber.' });
  }
});

router.post('/subscribers/import', requireAuth, uploadCsv.single('csvFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const csvContent = fs.readFileSync(req.file.path, 'utf-8');
    fs.unlinkSync(req.file.path);

    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty.' });
    }

    const headerLine = lines[0].toLowerCase();
    const hasHeader = headerLine.includes('email');
    const startIdx = hasHeader ? 1 : 0;

    const rows = [];
    for (let i = startIdx; i < lines.length; i++) {
      const parts = lines[i].split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
      if (parts.length >= 1) {
        rows.push({
          email: parts[0],
          name: parts[1] || null,
        });
      }
    }

    const result = subscriberService.importSubscribers(rows);
    res.redirect(`/admin/subscribers?importResult=${encodeURIComponent(JSON.stringify(result))}`);
  } catch (error) {
    logger.error({ error: error.message }, 'Import error');
    res.status(500).json({ error: 'Import failed.' });
  }
});

router.get('/subscribers/export', requireAuth, (req, res) => {
  const { subscribers } = subscriberService.listSubscribers({ page: 1, limit: 100000 });

  let csv = 'email,name,status,source,subscribed_at,confirmed_at,unsubscribed_at\n';
  for (const sub of subscribers) {
    csv += `"${sub.email}","${sub.name || ''}","${sub.status}","${sub.source}","${sub.subscribed_at || ''}","${sub.confirmed_at || ''}","${sub.unsubscribed_at || ''}"\n`;
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="subscribers.csv"');
  res.send(csv);
});

router.delete('/subscribers/:id', requireAuth, (req, res) => {
  try {
    const deleted = subscriberService.deleteSubscriber(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Subscriber not found.' });
    }
    res.json({ success: true });
  } catch (error) {
    logger.error({ error: error.message }, 'Delete subscriber error');
    res.status(500).json({ error: 'Failed to delete subscriber.' });
  }
});

// --- History ---
router.get('/history', requireAuth, (req, res) => {
  const newsletters = newsletterService.listSent();
  res.render('history', {
    title: 'Sent History',
    newsletters,
    csrfToken: req.csrfToken ? req.csrfToken() : '',
  });
});

router.get('/history/:id', requireAuth, (req, res) => {
  const newsletter = newsletterService.findById(req.params.id);
  if (!newsletter) {
    return res.status(404).send('Newsletter not found');
  }

  const sendLog = newsletterService.getSendLog(newsletter.id);

  res.render('history-detail', {
    title: newsletter.subject,
    newsletter,
    sendLog,
    csrfToken: req.csrfToken ? req.csrfToken() : '',
  });
});

router.post('/history/:id/duplicate', requireAuth, (req, res) => {
  try {
    const newsletter = newsletterService.duplicate(req.params.id);
    if (!newsletter) {
      return res.status(404).json({ error: 'Newsletter not found.' });
    }
    res.json({ success: true, newsletter });
  } catch (error) {
    logger.error({ error: error.message }, 'Duplicate error');
    res.status(500).json({ error: 'Duplication failed.' });
  }
});

router.post('/history/:id/resend', requireAuth, async (req, res) => {
  try {
    const result = await newsletterService.sendToAll(req.params.id);
    res.json({ success: true, result });
  } catch (error) {
    logger.error({ error: error.message }, 'Resend error');
    res.status(500).json({ error: error.message });
  }
});

// --- Settings ---
router.get('/settings', requireAuth, (req, res) => {
  res.render('settings', {
    title: 'Settings',
    settings: {
      smtpHost: process.env.SMTP_HOST || '',
      smtpPort: process.env.SMTP_PORT || '587',
      smtpSecure: process.env.SMTP_SECURE || 'false',
      smtpUser: maskString(process.env.SMTP_USER || ''),
      smtpFromName: process.env.SMTP_FROM_NAME || '',
      smtpFromEmail: process.env.SMTP_FROM_EMAIL || '',
      adminEmail: process.env.ADMIN_EMAIL || '',
      batchSize: process.env.BATCH_SIZE || '50',
      batchDelayMs: process.env.BATCH_DELAY_MS || '2000',
      baseUrl: process.env.BASE_URL || '',
    },
    csrfToken: req.csrfToken ? req.csrfToken() : '',
  });
});

// --- Newsletter status polling ---
router.get('/newsletter-status/:id', requireAuth, (req, res) => {
  const newsletter = newsletterService.findById(req.params.id);
  if (!newsletter) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json({
    status: newsletter.status,
    totalRecipients: newsletter.total_recipients,
    successfulSends: newsletter.successful_sends,
    failedSends: newsletter.failed_sends,
  });
});

function maskString(str) {
  if (!str || str.length <= 4) return '****';
  return str.substring(0, 2) + '****' + str.substring(str.length - 2);
}

module.exports = router;
