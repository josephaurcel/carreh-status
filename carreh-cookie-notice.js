/* ═══════════════════════════════════════════════════════════════════════════
   Carreh — carreh-cookie-notice.js (the small sites' cookie notice)

   Founder, 16 Oct 2026: every Carreh website shows cookie consent to visitors
   in the EU, the rest of the EEA (Iceland, Liechtenstein, Norway), the UK and
   Switzerland, and to nobody else. carreh.com and Flight Board have the full
   manager (CarrehWebDeploy/cookie-consent.js); this is the same rule for the
   small sites. The canonical copy is carreh/scripts/shared-web/; each site
   keeps a copy next to its pages. Keep them in step.

     <script src="/carreh-cookie-notice.js" data-mode="notice"
             data-policy="https://carreh.com/cookie-policy"
             data-stores="your language"></script>

   data-mode="notice"     the site stores only what it needs to work: one notice,
                          one OK button, shown once.
   data-mode="analytics"  the site also measures use: Accept / Reject, equally
                          prominent. window.CarrehConsent.analytics says which,
                          and 'carreh:consent' fires on every change. Outside the
                          region analytics is on without a banner; anyone can
                          switch it off from a [data-cookie-settings] link or
                          CarrehCookieNotice.open().

   The country is Cloudflare's own answer for this site (/cdn-cgi/trace: same
   site, no cookie). An unknown country, Tor, or a failed or slow lookup counts
   as "ask". A choice someone made always wins, wherever they are.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__carrehNotice) return;
  window.__carrehNotice = true;

  var me = document.currentScript || {};
  var attr = function (k, d) { return (me.getAttribute && me.getAttribute('data-' + k)) || d; };
  var MODE = attr('mode', 'notice') === 'analytics' ? 'analytics' : 'notice';
  var POLICY = attr('policy', 'https://carreh.com/cookie-policy');
  var STORES = attr('stores', '');
  var KEY = 'carreh_cookie_notice';
  var REGION_KEY = 'carreh_consent_region';
  var REGION = ' AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE '
    + 'IS LI NO GB CH GF GP MQ RE YT MF AX GI JE GG IM ';

  function read() { try { var d = JSON.parse(localStorage.getItem(KEY) || 'null'); return d && d.v === 1 ? d : null; } catch (e) { return null; } }
  function save(analytics) { try { localStorage.setItem(KEY, JSON.stringify({ v: 1, analytics: !!analytics, ts: Date.now() })); } catch (e) {} }
  function knownRegion() { try { var v = sessionStorage.getItem(REGION_KEY); return v === '1' ? true : v === '0' ? false : null; } catch (e) { return null; } }

  var stored = read();
  window.CarrehConsent = window.CarrehConsent || { necessary: true, analytics: false, marketing: false };
  if (MODE === 'analytics') {
    window.CarrehConsent.analytics = stored ? !!stored.analytics : knownRegion() === false;
  }
  function announce() { try { window.dispatchEvent(new CustomEvent('carreh:consent', { detail: { analytics: window.CarrehConsent.analytics } })); } catch (e) {} }

  function regionAsks(cb) {
    var known = knownRegion();
    if (known !== null) { cb(known); return; }
    var done = false;
    function finish(asks, keep) {
      if (done) return;
      done = true;
      if (keep) { try { sessionStorage.setItem(REGION_KEY, asks ? '1' : '0'); } catch (e) {} }
      cb(asks);
    }
    setTimeout(function () { finish(true, false); }, 2500);
    try {
      fetch('/cdn-cgi/trace', { cache: 'no-store', credentials: 'omit' })
        .then(function (r) { return r.ok ? r.text() : ''; })
        .then(function (t) {
          var m = /(?:^|\n)loc=([A-Z0-9]{2})/.exec(t || '');
          var c = m && m[1];
          finish(!c || c === 'XX' || c === 'T1' || REGION.indexOf(' ' + c + ' ') !== -1, !!c);
        }, function () { finish(true, false); });
    } catch (e) { finish(true, false); }
  }

  var fr = /^fr\b/i.test(document.documentElement.lang || navigator.language || '');
  var T = fr ? {
    title: 'Cookies',
    notice: 'Ce site n’enregistre dans votre navigateur que ce qu’il faut pour fonctionner' + (STORES ? ' (' + STORES + ')' : '') + '. Aucun suivi, aucune publicité.',
    ask: 'Ce site enregistre ce qu’il faut pour fonctionner. Avec votre accord, il mesure aussi son utilisation, sans publicité.',
    ok: 'OK', accept: 'Accepter', reject: 'Refuser', policy: 'Politique cookies', settings: 'Cookies'
  } : {
    title: 'Cookies',
    notice: 'This site keeps only what it needs to work in your browser' + (STORES ? ' (' + STORES + ')' : '') + '. No tracking, no advertising.',
    ask: 'This site keeps what it needs to work. With your permission it also measures how it is used, with no advertising.',
    ok: 'OK', accept: 'Accept', reject: 'Reject', policy: 'Cookie policy', settings: 'Cookies'
  };

  var box = null;
  function close() { if (box && box.parentNode) box.parentNode.removeChild(box); box = null; }
  function show() {
    if (box) return;
    var css = '.cc-n{position:fixed;left:16px;right:16px;bottom:16px;max-width:420px;z-index:2147483000;background:#fff;color:#1a1a1a;'
      + 'border:1px solid rgba(0,0,0,.12);border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.18);padding:16px 18px;'
      + 'font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}'
      + '.cc-n h2{margin:0 0 6px;font-size:15px}.cc-n p{margin:0 0 12px}.cc-n a{color:inherit}'
      + '.cc-n .cc-b{display:flex;gap:8px;flex-wrap:wrap}.cc-n button{flex:1;min-width:110px;padding:9px 14px;border-radius:10px;'
      + 'font:600 14px/1 inherit;cursor:pointer;border:1px solid #1a1a1a;background:#1a1a1a;color:#fff}'
      + '.cc-n button.cc-s{background:transparent;color:#1a1a1a}'
      + '@media (prefers-color-scheme:dark){.cc-n{background:#1d1d1f;color:#f2f2f2;border-color:rgba(255,255,255,.14)}'
      + '.cc-n button{background:#f2f2f2;color:#1d1d1f;border-color:#f2f2f2}.cc-n button.cc-s{background:transparent;color:#f2f2f2}}';
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    box = document.createElement('div');
    box.className = 'cc-n'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-live', 'polite'); box.setAttribute('aria-label', T.title);
    var h = document.createElement('h2'); h.textContent = T.title;
    var p = document.createElement('p'); p.textContent = (MODE === 'analytics' ? T.ask : T.notice) + ' ';
    var a = document.createElement('a'); a.href = POLICY; a.textContent = T.policy; a.target = '_blank'; a.rel = 'noopener'; p.appendChild(a);
    var b = document.createElement('div'); b.className = 'cc-b';
    function btn(text, second, fn) { var x = document.createElement('button'); x.type = 'button'; x.textContent = text; if (second) x.className = 'cc-s'; x.onclick = fn; b.appendChild(x); return x; }
    if (MODE === 'analytics') {
      // Equal weight: neither choice is the easy one.
      btn(T.reject, true, function () { decide(false); });
      btn(T.accept, true, function () { decide(true); });
    } else {
      btn(T.ok, false, function () { save(false); close(); });
    }
    box.appendChild(h); box.appendChild(p); box.appendChild(b);
    document.body.appendChild(box);
  }
  function decide(analytics) {
    save(analytics);
    window.CarrehConsent.analytics = !!analytics;
    close();
    announce();
  }

  window.CarrehCookieNotice = { open: show, get: function () { return { analytics: !!window.CarrehConsent.analytics, decided: !!read() }; } };
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-cookie-settings]') : null;
    if (t) { e.preventDefault(); show(); }
  });

  function boot() {
    if (stored) return;
    regionAsks(function (asks) {
      if (asks) { show(); return; }
      if (MODE === 'analytics' && !window.CarrehConsent.analytics) { window.CarrehConsent.analytics = true; announce(); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
