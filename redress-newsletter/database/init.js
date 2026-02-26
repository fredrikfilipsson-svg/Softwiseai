const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, 'newsletter.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initialize() {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'unsubscribed')),
      source TEXT DEFAULT 'manual' CHECK(source IN ('manual', 'widget', 'landing-page', 'import')),
      confirmation_token TEXT,
      token_expires_at DATETIME,
      unsubscribe_token TEXT UNIQUE,
      subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      confirmed_at DATETIME,
      unsubscribed_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS newsletters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject TEXT NOT NULL,
      preview_text TEXT,
      html_content TEXT NOT NULL,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'sending', 'sent', 'failed')),
      total_recipients INTEGER DEFAULT 0,
      successful_sends INTEGER DEFAULT 0,
      failed_sends INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sent_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS send_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      newsletter_id INTEGER REFERENCES newsletters(id),
      subscriber_id INTEGER REFERENCES subscribers(id),
      status TEXT CHECK(status IN ('sent', 'failed')),
      error_message TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expired DATETIME NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
    CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers(status);
    CREATE INDEX IF NOT EXISTS idx_subscribers_confirmation_token ON subscribers(confirmation_token);
    CREATE INDEX IF NOT EXISTS idx_subscribers_unsubscribe_token ON subscribers(unsubscribe_token);
    CREATE INDEX IF NOT EXISTS idx_send_log_newsletter ON send_log(newsletter_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expired ON sessions(expired);
  `);

  return database;
}

module.exports = { getDb, initialize };
