const express = require('express');
const router = express.Router();
const subscriberService = require('../services/subscriberService');
const emailService = require('../services/emailService');
const { subscribeRateLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');

router.post('/subscribe', subscribeRateLimiter, async (req, res) => {
  try {
    const { email, name, source, _hp_field } = req.body;

    if (_hp_field) {
      return res.status(200).json({ message: 'Thank you for subscribing!' });
    }

    if (!email || !subscriberService.isValidEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const existing = subscriberService.findByEmail(email);

    if (existing) {
      if (existing.status === 'active') {
        return res.status(200).json({ message: 'You are already subscribed!' });
      }
      if (existing.status === 'unsubscribed') {
        const resubscribed = subscriberService.resubscribe(email);
        if (resubscribed) {
          const confirmUrl = `${process.env.BASE_URL}/api/confirm/${resubscribed.confirmation_token}`;
          await emailService.sendConfirmationEmail(resubscribed, confirmUrl);
          return res.status(200).json({ message: 'Please check your email to confirm your re-subscription.' });
        }
      }
      if (existing.status === 'pending') {
        return res.status(200).json({ message: 'A confirmation email has already been sent. Please check your inbox.' });
      }
    }

    const signupSource = source || 'widget';
    const subscriber = subscriberService.createSubscriber({
      email,
      name: name || null,
      source: signupSource,
      status: 'pending',
    });

    const confirmUrl = `${process.env.BASE_URL}/api/confirm/${subscriber.confirmation_token}`;
    await emailService.sendConfirmationEmail(subscriber, confirmUrl);

    res.status(200).json({ message: 'Thank you! Please check your email to confirm your subscription.' });
  } catch (error) {
    logger.error({ error: error.message }, 'Subscribe error');
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

router.get('/confirm/:token', async (req, res) => {
  try {
    const result = subscriberService.confirmSubscriber(req.params.token);

    if (!result) {
      return res.status(404).render('pages/link-expired', {
        title: 'Invalid Link',
        message: 'This confirmation link is invalid.',
        baseUrl: process.env.BASE_URL,
      });
    }

    if (result.expired) {
      return res.render('pages/link-expired', {
        title: 'Link Expired',
        message: 'This confirmation link has expired. Please subscribe again.',
        baseUrl: process.env.BASE_URL,
      });
    }

    res.render('pages/confirmed', {
      title: 'Subscription Confirmed',
      subscriber: result,
      baseUrl: process.env.BASE_URL,
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Confirm error');
    res.status(500).render('pages/link-expired', {
      title: 'Error',
      message: 'Something went wrong. Please try again.',
      baseUrl: process.env.BASE_URL,
    });
  }
});

router.get('/unsubscribe/:token', (req, res) => {
  try {
    const subscriber = subscriberService.unsubscribe(req.params.token);

    if (!subscriber) {
      return res.status(404).render('pages/unsubscribed', {
        title: 'Not Found',
        message: 'This unsubscribe link is invalid.',
        email: null,
        baseUrl: process.env.BASE_URL,
      });
    }

    res.render('pages/unsubscribed', {
      title: 'Unsubscribed',
      message: 'You have been unsubscribed from the Redress Compliance newsletter.',
      email: subscriber.email,
      baseUrl: process.env.BASE_URL,
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Unsubscribe error');
    res.status(500).render('pages/unsubscribed', {
      title: 'Error',
      message: 'Something went wrong. Please try again.',
      email: null,
      baseUrl: process.env.BASE_URL,
    });
  }
});

module.exports = router;
