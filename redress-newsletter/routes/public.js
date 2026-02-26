const express = require('express');
const router = express.Router();

router.get('/subscribe', (req, res) => {
  res.render('landing', {
    title: 'Subscribe | Redress Compliance',
    baseUrl: process.env.BASE_URL,
    csrfToken: req.csrfToken ? req.csrfToken() : '',
  });
});

module.exports = router;
