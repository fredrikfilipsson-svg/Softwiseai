# Redress Compliance Newsletter Application

A self-hosted newsletter application for Redress Compliance LLC, built with Node.js, Express, and SQLite.

## Features

- **Admin Dashboard** — Overview stats, subscriber management, newsletter composition
- **Compose & Send** — Write in browser (Quill.js editor), paste HTML, or upload HTML files
- **Double Opt-in** — GDPR-compliant subscription flow with confirmation emails
- **Batch Sending** — Configurable batch size and delay to respect SMTP rate limits
- **Subscriber Management** — Add, import CSV, export CSV, search, filter, paginate
- **Embeddable Widget** — Lightweight JS snippet for any HTML page
- **Landing Page** — Beautiful, responsive newsletter sign-up page
- **Unsubscribe Flow** — One-click unsubscribe with List-Unsubscribe header support
- **CAN-SPAM Compliance** — Physical address and unsubscribe link in all emails

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** SQLite (via better-sqlite3)
- **Email:** Nodemailer (any SMTP provider)
- **Templating:** EJS
- **Editor:** Quill.js (CDN)
- **Auth:** bcrypt + express-session (SQLite session store)

## Quick Start

### 1. Clone and install

```bash
cd redress-newsletter
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your settings:

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 3000) |
| `BASE_URL` | Public URL of the newsletter app |
| `SESSION_SECRET` | Random string for session encryption |
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_PASSWORD` | Admin password (plain text or bcrypt hash) |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (587 for TLS, 465 for SSL) |
| `SMTP_SECURE` | `true` for port 465, `false` for 587 |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM_NAME` | Sender display name |
| `SMTP_FROM_EMAIL` | Sender email address |
| `BATCH_SIZE` | Emails per batch (default: 50) |
| `BATCH_DELAY_MS` | Delay between batches in ms (default: 2000) |

### 3. Start the application

```bash
# Production
npm start

# Development (auto-restart on changes)
npm run dev
```

### 4. Access the admin panel

Navigate to `http://localhost:3000/admin` and log in with your configured credentials.

## Production Deployment

### Using PM2 + Nginx

#### 1. Install PM2

```bash
npm install -g pm2
```

#### 2. Start with PM2

```bash
cd redress-newsletter
pm2 start server.js --name redress-newsletter
pm2 save
pm2 startup
```

#### 3. Nginx reverse proxy

```nginx
server {
    listen 80;
    server_name newsletter.redresscompliance.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 4. SSL with Certbot

```bash
sudo certbot --nginx -d newsletter.redresscompliance.com
```

## Embeddable Widget

Add to any HTML page:

```html
<div id="redress-newsletter-signup"></div>
<script src="https://newsletter.redresscompliance.com/widget/newsletter.js"></script>
```

### Style variants

- **Inline** (horizontal): `<div id="redress-newsletter-signup" data-style="inline"></div>`
- **Card** (vertical): `<div id="redress-newsletter-signup" data-style="card"></div>`

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/subscribe` | Public subscription |
| GET | `/api/confirm/:token` | Confirm subscription |
| GET | `/api/unsubscribe/:token` | Unsubscribe |
| POST | `/admin/login` | Admin login |
| GET | `/admin/logout` | Admin logout |
| GET | `/admin` | Dashboard |
| GET | `/admin/compose` | Compose newsletter |
| POST | `/admin/compose/save` | Save draft |
| POST | `/admin/compose/upload` | Upload HTML |
| POST | `/admin/send/:id` | Send newsletter |
| POST | `/admin/send-test/:id` | Send test email |
| GET | `/admin/subscribers` | List subscribers |
| POST | `/admin/subscribers/add` | Add subscriber |
| POST | `/admin/subscribers/import` | Import CSV |
| GET | `/admin/subscribers/export` | Export CSV |
| DELETE | `/admin/subscribers/:id` | Delete subscriber |
| GET | `/admin/history` | Sent history |
| GET | `/admin/history/:id` | View newsletter |

## License

Proprietary — Redress Compliance LLC
