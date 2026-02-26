const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');
const logger = require('../utils/logger');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

async function renderTemplate(templateName, data) {
  const templatePath = path.join(__dirname, '..', 'templates', 'email', `${templateName}.ejs`);
  return ejs.renderFile(templatePath, data);
}

async function sendEmail({ to, subject, html, previewText, unsubscribeUrl }) {
  const transport = getTransporter();

  const headers = {};
  if (unsubscribeUrl) {
    headers['List-Unsubscribe'] = `<${unsubscribeUrl}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }

  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || 'Redress Compliance'}" <${process.env.SMTP_FROM_EMAIL || 'info@redresscompliance.com'}>`,
    to,
    subject,
    html,
    headers,
  };

  if (previewText) {
    mailOptions.text = previewText;
  }

  try {
    const result = await transport.sendMail(mailOptions);
    logger.info({ to, subject, messageId: result.messageId }, 'Email sent successfully');
    return { success: true, messageId: result.messageId };
  } catch (error) {
    logger.error({ to, subject, error: error.message }, 'Failed to send email');
    return { success: false, error: error.message };
  }
}

async function sendConfirmationEmail(subscriber, confirmUrl) {
  const html = await renderTemplate('confirmation', {
    name: subscriber.name || 'there',
    confirmUrl,
    baseUrl: process.env.BASE_URL,
  });

  return sendEmail({
    to: subscriber.email,
    subject: 'Please confirm your subscription to Redress Compliance',
    html,
  });
}

async function sendNewsletter(subscriber, newsletter) {
  const baseUrl = process.env.BASE_URL;
  const unsubscribeUrl = `${baseUrl}/api/unsubscribe/${subscriber.unsubscribe_token}`;

  const wrappedHtml = await renderTemplate('wrapper', {
    content: newsletter.html_content,
    subject: newsletter.subject,
    previewText: newsletter.preview_text || '',
    unsubscribeUrl,
    baseUrl,
  });

  return sendEmail({
    to: subscriber.email,
    subject: newsletter.subject,
    html: wrappedHtml,
    previewText: newsletter.preview_text,
    unsubscribeUrl,
  });
}

module.exports = {
  sendEmail,
  sendConfirmationEmail,
  sendNewsletter,
  renderTemplate,
  getTransporter,
};
