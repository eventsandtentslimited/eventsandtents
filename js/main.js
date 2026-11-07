(function () {
  'use strict';

  var nav = document.getElementById('mainNav');
  var toTop = document.getElementById('toTop');

  // Sticky navbar + back-to-top
  function onScroll() {
    var y = window.scrollY;
    nav.classList.toggle('scrolled', y > 40);
    toTop.classList.toggle('show', y > 600);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  // Close mobile menu after choosing a link
  var menu = document.getElementById('navMenu');
  document.querySelectorAll('#navMenu .nav-link, #navMenu .btn').forEach(function (el) {
    el.addEventListener('click', function () {
      if (menu.classList.contains('show')) bootstrap.Collapse.getOrCreateInstance(menu).hide();
    });
  });

  // Offset anchor scrolling for fixed nav
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length < 2 || a.classList.contains('g-item')) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top: id === '#home' ? 0 : top, behavior: 'smooth' });
    });
  });

  // Reveal on scroll
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var siblings = Array.prototype.slice.call(en.target.parentElement.children);
          en.target.style.transitionDelay = Math.min(siblings.indexOf(en.target), 5) * 90 + 'ms';
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  // Counters
  var counters = document.querySelectorAll('[data-count]');
  function runCounter(el) {
    var end = parseInt(el.dataset.count, 10), suffix = el.dataset.suffix || '', t0 = null, dur = 1400;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      el.textContent = Math.floor(p * end) + (p === 1 ? suffix : '');
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { runCounter(en.target); co.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { co.observe(c); });
  } else {
    counters.forEach(function (c) { c.textContent = c.dataset.count + (c.dataset.suffix || ''); });
  }

  // Gallery lightbox
  var lbEl = document.getElementById('lightbox');
  var lb = new bootstrap.Modal(lbEl);
  var gItems = Array.prototype.slice.call(document.querySelectorAll('.g-item'));
  var lbImg = document.getElementById('lightboxImg');
  var lbCap = document.getElementById('lightboxCap');
  var lbCount = document.getElementById('lightboxCount');
  var current = 0;

  function showSlide(i, dir) {
    current = (i + gItems.length) % gItems.length;
    var item = gItems[current];
    lbImg.classList.remove('slide-next', 'slide-prev');
    void lbImg.offsetWidth; // restart animation
    lbImg.src = item.dataset.img;
    lbImg.alt = item.dataset.cap;
    lbCap.textContent = item.dataset.cap;
    lbCount.textContent = (current + 1) + ' / ' + gItems.length;
    if (dir) lbImg.classList.add(dir > 0 ? 'slide-next' : 'slide-prev');
    // warm the cache for neighbouring photos so Next/Previous feel instant
    [current + 1, current - 1].forEach(function (n) {
      var im = new Image(); im.src = gItems[(n + gItems.length) % gItems.length].dataset.img;
    });
  }
  gItems.forEach(function (item, idx) {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      showSlide(idx, 0);
      lb.show();
    });
  });
  document.getElementById('lbPrev').addEventListener('click', function () { showSlide(current - 1, -1); });
  document.getElementById('lbNext').addEventListener('click', function () { showSlide(current + 1, 1); });
  lbEl.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') showSlide(current - 1, -1);
    if (e.key === 'ArrowRight') showSlide(current + 1, 1);
  });
  // Swipe on touch screens
  var touchX = null;
  lbEl.addEventListener('touchstart', function (e) { touchX = e.changedTouches[0].clientX; }, { passive: true });
  lbEl.addEventListener('touchend', function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) showSlide(current + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    touchX = null;
  }, { passive: true });

  // Quote form -> WhatsApp / Email
  var form = document.getElementById('quoteForm');
  var WA = '2347042773259', MAIL = 'eventsandtentslimited@gmail.com';

  function buildMessage() {
    var v = function (id) { return document.getElementById(id).value.trim(); };
    return [
      'Hello Events & Tents Limited, I would like a quote.',
      '',
      'Name: ' + v('qName'),
      'Phone: ' + v('qPhone'),
      v('qEmail') ? 'Email: ' + v('qEmail') : '',
      'Event type: ' + v('qType'),
      v('qDate') ? 'Event date: ' + v('qDate') : '',
      v('qGuests') ? 'Expected guests: ' + v('qGuests') : '',
      v('qMsg') ? '\nDetails: ' + v('qMsg') : ''
    ].filter(function (l, i) { return l !== '' || i === 1; }).join('\n');
  }
  // ---- reCAPTCHA (v2 checkbox) ----
  var RECAPTCHA_SITE_KEY = '6LeJXRUuAAAAABHnbH45hETw71ZqyFKCLN4dKLZc';
  var captchaId = null;
  var captchaErr = document.getElementById('captchaError');
  function renderCaptcha() {
    if (captchaId !== null || typeof grecaptcha === 'undefined' || !grecaptcha.render) return;
    var box = document.getElementById('recaptchaBox');
    // shrink the widget on very narrow phones so it never overflows
    var small = box.parentElement.clientWidth < 310;
    captchaId = grecaptcha.render(box, {
      sitekey: RECAPTCHA_SITE_KEY,
      theme: 'dark',
      size: small ? 'compact' : 'normal',
      callback: function () { captchaErr.classList.add('d-none'); }
    });
  }
  window.onRecaptchaLoad = renderCaptcha;
  if (typeof grecaptcha !== 'undefined' && grecaptcha.render) renderCaptcha();
  function captchaToken() {
    return (captchaId !== null && typeof grecaptcha !== 'undefined') ? grecaptcha.getResponse(captchaId) : '';
  }
  function resetCaptcha() {
    if (captchaId !== null && typeof grecaptcha !== 'undefined') grecaptcha.reset(captchaId);
  }

  function valid() {
    form.classList.add('was-validated');
    var fieldsOk = ['qName', 'qPhone', 'qType'].every(function (id) { return document.getElementById(id).value.trim(); });
    var captchaOk = !!captchaToken();
    captchaErr.classList.toggle('d-none', captchaOk);
    if (!captchaOk) captchaErr.textContent = captchaId === null
      ? 'Security check could not load. Please check your connection and refresh the page.'
      : 'Please tick "I\'m not a robot" before sending.';
    return fieldsOk && captchaOk;
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!valid()) return;
    window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(buildMessage()), '_blank', 'noopener');
    resetCaptcha();
  });
  // ---- EmailJS ----
  // Paste your EmailJS Public Key (Account > General) below.
  var EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';
  var EMAILJS_SERVICE_ID = 'service_t9vdob3';
  var EMAILJS_TEMPLATE_ID = 'template_o2g6tpp';

  var mailBtn = document.getElementById('mailBtn');
  var statusEl = document.getElementById('formStatus');
  function setStatus(type, msg) {
    statusEl.className = 'alert alert-' + type + ' py-2 mb-0 mt-1';
    statusEl.textContent = msg;
    statusEl.classList.remove('d-none');
  }
  mailBtn.addEventListener('click', function () {
    if (!valid()) return;
    var v = function (id) { return document.getElementById(id).value.trim(); };

    // Never fall back to the visitor's mail app: the message must go straight through EmailJS.
    if (typeof emailjs === 'undefined') {
      setStatus('danger', 'The email service could not load. Please check your connection and refresh the page.');
      return;
    }
    if (EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
      console.error('EmailJS public key is missing. Add it at the top of the EmailJS section in js/main.js.');
      setStatus('danger', 'Email sending is not set up yet. Please use WhatsApp or call us.');
      return;
    }

    var label = mailBtn.innerHTML;
    mailBtn.disabled = true;
    mailBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      from_name: v('qName'),
      phone: v('qPhone'),
      reply_to: v('qEmail') || 'Not provided',
      event_type: v('qType'),
      event_date: v('qDate') || 'Not specified',
      guests: v('qGuests') || 'Not specified',
      message: v('qMsg') || 'No additional details.',
      'g-recaptcha-response': captchaToken()
    }, { publicKey: EMAILJS_PUBLIC_KEY }).then(function () {
      setStatus('success', 'Thank you! Your request has been sent. We will get back to you shortly.');
      form.reset();
      form.classList.remove('was-validated');
    }, function (err) {
      console.error('EmailJS error:', err);
      setStatus('danger', 'Sorry, we could not send your request. Please try again, or use WhatsApp or call us.');
    }).finally(function () {
      resetCaptcha();
      mailBtn.disabled = false;
      mailBtn.innerHTML = label;
    });
  });

  // ---- Page-wide effects ----
  // Scroll progress bar
  var bar = document.getElementById('progress');
  function progress() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
  }
  window.addEventListener('scroll', progress, { passive: true });
  progress();

  // Hero sparkles
  var sp = document.getElementById('sparkles');
  if (sp) {
    for (var i = 0; i < 22; i++) {
      var s = document.createElement('span');
      s.style.left = Math.random() * 100 + '%';
      s.style.bottom = (-10 - Math.random() * 20) + '%';
      s.style.width = s.style.height = (3 + Math.random() * 6) + 'px';
      s.style.animationDuration = (9 + Math.random() * 12) + 's';
      s.style.animationDelay = (-Math.random() * 15) + 's';
      sp.appendChild(s);
    }
  }

  // Hero parallax
  var heroBg = document.querySelector('.hero-bg');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (heroBg) {
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      if (y < window.innerHeight) heroBg.style.marginTop = (y * 0.25) + 'px';
    }, { passive: true });
  }

  // Direction-based reveals
  document.querySelectorAll('.row.align-items-center').forEach(function (row) {
    var cols = row.querySelectorAll(':scope > .reveal');
    if (cols.length === 2) { cols[0].classList.add('reveal-left'); cols[1].classList.add('reveal-right'); }
  });
  document.querySelectorAll('.vm-card, .aud-card, .stat').forEach(function (el) {
    var p = el.closest('.reveal'); if (p) p.classList.add('reveal-zoom');
  });
  document.querySelectorAll('.g-item').forEach(function (el) {
    var p = el.closest('.reveal'); if (p) p.classList.add('reveal-zoom');
  });

  // Goals: staggered list entrance + progress line
  var goalList = document.querySelector('.goal-list');
  if (goalList) {
    var items = goalList.querySelectorAll('li');
    items.forEach(function (li, i) { li.style.setProperty('--d', (i * 140) + 'ms'); });
    var gio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { goalList.classList.add('go'); gio.disconnect(); }
      });
    }, { threshold: 0.25 });
    gio.observe(goalList);
  }

  // 3D tilt on cards
  if (window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.vm-card, .aud-card, .stat, .offer-band .offer-img').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = 'perspective(700px) rotateX(' + (-y * 8) + 'deg) rotateY(' + (x * 8) + 'deg) translateY(-6px)';
      });
      card.addEventListener('mouseleave', function () { card.style.transform = ''; });
    });
  }

  document.getElementById('year').textContent = new Date().getFullYear();
})();
