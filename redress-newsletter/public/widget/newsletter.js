(function() {
  'use strict';

  var CONTAINER_ID = 'redress-newsletter-signup';
  var container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  var style = container.getAttribute('data-style') || 'inline';
  var apiBase = (function() {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src;
      if (src && src.indexOf('/widget/newsletter.js') !== -1) {
        return src.replace('/widget/newsletter.js', '');
      }
    }
    return '';
  })();

  // Inject scoped CSS
  var css = document.createElement('style');
  css.textContent = [
    '.rcnl-widget * { box-sizing: border-box; margin: 0; padding: 0; }',
    '.rcnl-widget { font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }',
    '.rcnl-widget input { font-family: inherit; }',
    '.rcnl-widget .rcnl-input {',
    '  padding: 10px 14px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px;',
    '  outline: none; transition: border-color 0.2s; color: #333; background: #fff;',
    '}',
    '.rcnl-widget .rcnl-input:focus { border-color: #B8860B; box-shadow: 0 0 0 3px rgba(184,134,11,0.1); }',
    '.rcnl-widget .rcnl-btn {',
    '  padding: 10px 20px; background: #B8860B; color: #fff; border: none; border-radius: 6px;',
    '  font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s; font-family: inherit; white-space: nowrap;',
    '}',
    '.rcnl-widget .rcnl-btn:hover { background: #9a7209; }',
    '.rcnl-widget .rcnl-btn:disabled { opacity: 0.7; cursor: not-allowed; }',
    '.rcnl-widget .rcnl-msg { font-size: 13px; margin-top: 8px; }',
    '.rcnl-widget .rcnl-msg-success { color: #155724; }',
    '.rcnl-widget .rcnl-msg-error { color: #721c24; }',
    '.rcnl-widget .rcnl-hp { position: absolute; left: -9999px; }',
    '',
    '/* Inline variant */',
    '.rcnl-inline { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }',
    '.rcnl-inline .rcnl-input { flex: 1; min-width: 200px; }',
    '',
    '/* Card variant */',
    '.rcnl-card {',
    '  background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;',
    '  max-width: 380px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);',
    '}',
    '.rcnl-card .rcnl-heading {',
    '  font-size: 18px; font-weight: 700; color: #002B5C; margin-bottom: 6px;',
    '}',
    '.rcnl-card .rcnl-desc {',
    '  font-size: 14px; color: #6c757d; margin-bottom: 16px; line-height: 1.5;',
    '}',
    '.rcnl-card .rcnl-form-row { display: flex; flex-direction: column; gap: 10px; }',
    '.rcnl-card .rcnl-btn { width: 100%; }',
  ].join('\n');
  document.head.appendChild(css);

  // Build HTML
  var html = '';
  container.classList.add('rcnl-widget');

  if (style === 'card') {
    html += '<div class="rcnl-card">';
    html += '<div class="rcnl-heading">Stay Informed</div>';
    html += '<div class="rcnl-desc">Get expert enterprise software licensing insights delivered to your inbox.</div>';
    html += '<form class="rcnl-form-row" id="rcnl-form">';
    html += '<div class="rcnl-hp"><input type="text" name="_hp_field" tabindex="-1" autocomplete="off"></div>';
    html += '<input type="email" class="rcnl-input" name="email" placeholder="Enter your email" required>';
    html += '<button type="submit" class="rcnl-btn">Subscribe</button>';
    html += '</form>';
    html += '<div class="rcnl-msg" id="rcnl-msg"></div>';
    html += '</div>';
  } else {
    html += '<form class="rcnl-inline" id="rcnl-form">';
    html += '<div class="rcnl-hp"><input type="text" name="_hp_field" tabindex="-1" autocomplete="off"></div>';
    html += '<input type="email" class="rcnl-input" name="email" placeholder="Enter your email" required>';
    html += '<button type="submit" class="rcnl-btn">Subscribe</button>';
    html += '</form>';
    html += '<div class="rcnl-msg" id="rcnl-msg"></div>';
  }

  container.innerHTML = html;

  // Handle submission
  var form = document.getElementById('rcnl-form');
  var msg = document.getElementById('rcnl-msg');

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    var emailInput = form.querySelector('input[name="email"]');
    var hpInput = form.querySelector('input[name="_hp_field"]');
    var btn = form.querySelector('button');

    btn.disabled = true;
    btn.textContent = 'Subscribing...';
    msg.className = 'rcnl-msg';
    msg.textContent = '';

    var payload = {
      email: emailInput.value,
      source: 'widget',
      _hp_field: hpInput ? hpInput.value : ''
    };

    var xhr = new XMLHttpRequest();
    xhr.open('POST', apiBase + '/api/subscribe');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
      var data;
      try { data = JSON.parse(xhr.responseText); } catch (err) { data = {}; }

      if (xhr.status >= 200 && xhr.status < 300) {
        msg.className = 'rcnl-msg rcnl-msg-success';
        msg.textContent = data.message || 'Thank you! Check your email to confirm.';
        emailInput.value = '';
      } else {
        msg.className = 'rcnl-msg rcnl-msg-error';
        msg.textContent = data.error || 'Something went wrong. Please try again.';
      }
      btn.disabled = false;
      btn.textContent = 'Subscribe';
    };
    xhr.onerror = function() {
      msg.className = 'rcnl-msg rcnl-msg-error';
      msg.textContent = 'Network error. Please try again.';
      btn.disabled = false;
      btn.textContent = 'Subscribe';
    };
    xhr.send(JSON.stringify(payload));
  });
})();
