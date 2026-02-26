const { getDb } = require('../database/init');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

function findByEmail(email) {
  const db = getDb();
  return db.prepare('SELECT * FROM subscribers WHERE email = ?').get(email.toLowerCase().trim());
}

function findById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM subscribers WHERE id = ?').get(id);
}

function findByConfirmationToken(token) {
  const db = getDb();
  return db.prepare('SELECT * FROM subscribers WHERE confirmation_token = ?').get(token);
}

function findByUnsubscribeToken(token) {
  const db = getDb();
  return db.prepare('SELECT * FROM subscribers WHERE unsubscribe_token = ?').get(token);
}

function getActiveSubscribers() {
  const db = getDb();
  return db.prepare("SELECT * FROM subscribers WHERE status = 'active'").all();
}

function getStats() {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as count FROM subscribers').get().count;
  const active = db.prepare("SELECT COUNT(*) as count FROM subscribers WHERE status = 'active'").get().count;
  const unsubscribed = db.prepare("SELECT COUNT(*) as count FROM subscribers WHERE status = 'unsubscribed'").get().count;
  const pending = db.prepare("SELECT COUNT(*) as count FROM subscribers WHERE status = 'pending'").get().count;
  return { total, active, unsubscribed, pending };
}

function createSubscriber({ email, name, source, status }) {
  const db = getDb();
  const normalizedEmail = email.toLowerCase().trim();
  const unsubscribeToken = uuidv4();

  if (status === 'active') {
    const stmt = db.prepare(`
      INSERT INTO subscribers (email, name, source, status, unsubscribe_token, confirmed_at)
      VALUES (?, ?, ?, 'active', ?, CURRENT_TIMESTAMP)
    `);
    const result = stmt.run(normalizedEmail, name || null, source || 'manual', unsubscribeToken);
    logger.info({ email: normalizedEmail, source }, 'Subscriber created (active)');
    return findById(result.lastInsertRowid);
  }

  const confirmationToken = uuidv4();
  const tokenExpires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const stmt = db.prepare(`
    INSERT INTO subscribers (email, name, source, status, confirmation_token, token_expires_at, unsubscribe_token)
    VALUES (?, ?, ?, 'pending', ?, ?, ?)
  `);
  const result = stmt.run(normalizedEmail, name || null, source || 'widget', confirmationToken, tokenExpires, unsubscribeToken);
  logger.info({ email: normalizedEmail, source }, 'Subscriber created (pending)');
  return findById(result.lastInsertRowid);
}

function confirmSubscriber(token) {
  const db = getDb();
  const subscriber = findByConfirmationToken(token);
  if (!subscriber) return null;

  if (subscriber.status === 'active') return subscriber;

  if (subscriber.token_expires_at && new Date(subscriber.token_expires_at) < new Date()) {
    return { expired: true, subscriber };
  }

  db.prepare(`
    UPDATE subscribers
    SET status = 'active', confirmed_at = CURRENT_TIMESTAMP, confirmation_token = NULL, token_expires_at = NULL
    WHERE id = ?
  `).run(subscriber.id);

  logger.info({ email: subscriber.email }, 'Subscriber confirmed');
  return findById(subscriber.id);
}

function unsubscribe(token) {
  const db = getDb();
  const subscriber = findByUnsubscribeToken(token);
  if (!subscriber) return null;

  db.prepare(`
    UPDATE subscribers SET status = 'unsubscribed', unsubscribed_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(subscriber.id);

  logger.info({ email: subscriber.email }, 'Subscriber unsubscribed');
  return findById(subscriber.id);
}

function resubscribe(email) {
  const db = getDb();
  const subscriber = findByEmail(email);
  if (!subscriber) return null;

  const confirmationToken = uuidv4();
  const tokenExpires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    UPDATE subscribers
    SET status = 'pending', confirmation_token = ?, token_expires_at = ?, unsubscribed_at = NULL
    WHERE id = ?
  `).run(confirmationToken, tokenExpires, subscriber.id);

  return findById(subscriber.id);
}

function deleteSubscriber(id) {
  const db = getDb();
  const subscriber = findById(id);
  if (!subscriber) return false;
  db.prepare('DELETE FROM subscribers WHERE id = ?').run(id);
  logger.info({ email: subscriber.email }, 'Subscriber deleted');
  return true;
}

function listSubscribers({ page = 1, limit = 25, status, source, search }) {
  const db = getDb();
  let where = [];
  let params = [];

  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  if (source) {
    where.push('source = ?');
    params.push(source);
  }
  if (search) {
    where.push('(email LIKE ? OR name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const total = db.prepare(`SELECT COUNT(*) as count FROM subscribers ${whereClause}`).get(...params).count;
  const subscribers = db.prepare(`SELECT * FROM subscribers ${whereClause} ORDER BY subscribed_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);

  return {
    subscribers,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    limit,
  };
}

function importSubscribers(rows) {
  const db = getDb();
  let imported = 0;
  let skipped = 0;
  const errors = [];

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO subscribers (email, name, source, status, unsubscribe_token, confirmed_at)
    VALUES (?, ?, 'import', 'active', ?, CURRENT_TIMESTAMP)
  `);

  const importMany = db.transaction((rows) => {
    for (const row of rows) {
      const email = (row.email || '').toLowerCase().trim();
      if (!email || !isValidEmail(email)) {
        errors.push(`Invalid email: ${row.email || '(empty)'}`);
        skipped++;
        continue;
      }
      const result = insertStmt.run(email, row.name || null, uuidv4());
      if (result.changes > 0) {
        imported++;
      } else {
        skipped++;
      }
    }
  });

  importMany(rows);
  logger.info({ imported, skipped }, 'CSV import completed');
  return { imported, skipped, errors };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = {
  findByEmail,
  findById,
  findByConfirmationToken,
  findByUnsubscribeToken,
  getActiveSubscribers,
  getStats,
  createSubscriber,
  confirmSubscriber,
  unsubscribe,
  resubscribe,
  deleteSubscriber,
  listSubscribers,
  importSubscribers,
  isValidEmail,
};
