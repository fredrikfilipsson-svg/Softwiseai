const { getDb } = require('../database/init');
const emailService = require('./emailService');
const subscriberService = require('./subscriberService');
const logger = require('../utils/logger');

function create({ subject, previewText, htmlContent }) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO newsletters (subject, preview_text, html_content, status)
    VALUES (?, ?, ?, 'draft')
  `);
  const result = stmt.run(subject, previewText || null, htmlContent);
  return findById(result.lastInsertRowid);
}

function findById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM newsletters WHERE id = ?').get(id);
}

function listAll() {
  const db = getDb();
  return db.prepare('SELECT * FROM newsletters ORDER BY created_at DESC').all();
}

function listSent() {
  const db = getDb();
  return db.prepare("SELECT * FROM newsletters WHERE status IN ('sent', 'sending') ORDER BY sent_at DESC").all();
}

function getStats() {
  const db = getDb();
  return db.prepare("SELECT COUNT(*) as count FROM newsletters WHERE status = 'sent'").get().count;
}

function updateStatus(id, status) {
  const db = getDb();
  if (status === 'sent' || status === 'sending') {
    db.prepare('UPDATE newsletters SET status = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
  } else {
    db.prepare('UPDATE newsletters SET status = ? WHERE id = ?').run(status, id);
  }
}

function updateSendCounts(id, successful, failed) {
  const db = getDb();
  db.prepare('UPDATE newsletters SET successful_sends = ?, failed_sends = ? WHERE id = ?').run(successful, failed, id);
}

function logSend(newsletterId, subscriberId, status, errorMessage) {
  const db = getDb();
  db.prepare(`
    INSERT INTO send_log (newsletter_id, subscriber_id, status, error_message)
    VALUES (?, ?, ?, ?)
  `).run(newsletterId, subscriberId, status, errorMessage || null);
}

function getSendLog(newsletterId) {
  const db = getDb();
  return db.prepare(`
    SELECT sl.*, s.email, s.name
    FROM send_log sl
    JOIN subscribers s ON sl.subscriber_id = s.id
    WHERE sl.newsletter_id = ?
    ORDER BY sl.sent_at DESC
  `).all(newsletterId);
}

function duplicate(id) {
  const original = findById(id);
  if (!original) return null;
  return create({
    subject: `${original.subject} (Copy)`,
    previewText: original.preview_text,
    htmlContent: original.html_content,
  });
}

async function sendToAll(newsletterId, progressCallback) {
  const newsletter = findById(newsletterId);
  if (!newsletter) throw new Error('Newsletter not found');

  const subscribers = subscriberService.getActiveSubscribers();
  if (subscribers.length === 0) throw new Error('No active subscribers');

  const batchSize = parseInt(process.env.BATCH_SIZE, 10) || 50;
  const batchDelay = parseInt(process.env.BATCH_DELAY_MS, 10) || 2000;
  const totalRecipients = subscribers.length;

  const db = getDb();
  db.prepare('UPDATE newsletters SET status = ?, total_recipients = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run('sending', totalRecipients, newsletterId);

  let successful = 0;
  let failed = 0;

  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize);

    for (const subscriber of batch) {
      try {
        const result = await emailService.sendNewsletter(subscriber, newsletter);
        if (result.success) {
          successful++;
          logSend(newsletterId, subscriber.id, 'sent', null);
        } else {
          failed++;
          logSend(newsletterId, subscriber.id, 'failed', result.error);
        }
      } catch (error) {
        failed++;
        logSend(newsletterId, subscriber.id, 'failed', error.message);
        logger.error({ subscriberId: subscriber.id, error: error.message }, 'Send failed');
      }

      updateSendCounts(newsletterId, successful, failed);

      if (progressCallback) {
        progressCallback({ successful, failed, total: totalRecipients });
      }
    }

    if (i + batchSize < subscribers.length) {
      await new Promise(resolve => setTimeout(resolve, batchDelay));
    }
  }

  const finalStatus = failed === totalRecipients ? 'failed' : 'sent';
  updateStatus(newsletterId, finalStatus);
  updateSendCounts(newsletterId, successful, failed);

  logger.info({ newsletterId, successful, failed, total: totalRecipients }, 'Newsletter send completed');
  return { successful, failed, total: totalRecipients };
}

async function sendTest(newsletterId, testEmail) {
  const newsletter = findById(newsletterId);
  if (!newsletter) throw new Error('Newsletter not found');

  const testSubscriber = {
    email: testEmail,
    name: 'Test Recipient',
    unsubscribe_token: 'test-token-preview',
  };

  const result = await emailService.sendNewsletter(testSubscriber, newsletter);
  logger.info({ newsletterId, testEmail, success: result.success }, 'Test email sent');
  return result;
}

module.exports = {
  create,
  findById,
  listAll,
  listSent,
  getStats,
  updateStatus,
  logSend,
  getSendLog,
  duplicate,
  sendToAll,
  sendTest,
};
