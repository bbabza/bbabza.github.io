/* Bezwada Bar Association — Main Script */

(function () {
  'use strict';

  // Root path prefix — set via data-root on <body> for subfolder pages
  const ROOT = document.body.getAttribute('data-root') || '';

  // ── Disable right-click ────────────────────────────────────
  document.addEventListener('contextmenu', e => e.preventDefault());

  // ── Admin authentication system ───────────────────────────
  (function initAdmin() {
    const ADMIN_USER = 'admin';
    // SHA-256 of 'bbabza@admin2026'
    const ADMIN_HASH = '5714adb1c5108de0f1f6e9aeb636733c4ac08874fc37ad9223cf8456d8513c19';
    const STORE_KEY  = 'bba_admin';

    function isLoggedIn() {
      return localStorage.getItem(STORE_KEY) === '1';
    }

    async function sha256(str) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function injectAdminNav() {
      const navUl = document.querySelector('.main-nav ul');
      if (!navUl || navUl.querySelector('.admin-nav-item')) return;
      const contactLi = navUl.querySelector('li:last-child');
      const li = document.createElement('li');
      li.className = 'admin-nav-item';
      li.innerHTML = '<a href="#" class="admin-nav-link" id="adminNavLink">&#128274; Admin</a>';
      navUl.insertBefore(li, contactLi);
      document.getElementById('adminNavLink').addEventListener('click', e => {
        e.preventDefault();
        showAdminPanel();
      });
    }

    function removeAdminNav() {
      document.querySelectorAll('.admin-nav-item').forEach(el => el.remove());
    }

    function buildModal(innerHtml) {
      document.getElementById('adminModal')?.remove();
      const overlay = document.createElement('div');
      overlay.id = 'adminModal';
      overlay.className = 'admin-modal-overlay';
      overlay.innerHTML = `<div class="admin-modal">${innerHtml}</div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', e => { if (e.target === overlay) hideModal(); });
      overlay.querySelector('.admin-modal-close')?.addEventListener('click', hideModal);
      requestAnimationFrame(() => overlay.classList.add('open'));
      return overlay;
    }

    function hideModal() {
      const overlay = document.getElementById('adminModal');
      overlay?.classList.remove('open');
      setTimeout(() => overlay?.remove(), 280);
    }

    function showLoginModal() {
      const overlay = buildModal(`
        <button class="admin-modal-close" aria-label="Close">&times;</button>
        <div class="admin-modal-header">
          <span class="admin-modal-icon">&#128274;</span>
          <h3>Admin Login</h3>
        </div>
        <form id="adminLoginForm" autocomplete="off">
          <div class="admin-form-group">
            <label for="adminUser">Username</label>
            <input type="text" id="adminUser" autocomplete="username" placeholder="Username" />
          </div>
          <div class="admin-form-group">
            <label for="adminPass">Password</label>
            <input type="password" id="adminPass" autocomplete="current-password" placeholder="Password" />
          </div>
          <p class="admin-error" id="adminError"></p>
          <button type="submit" class="admin-submit-btn">Login</button>
        </form>
      `);
      overlay.querySelector('#adminLoginForm').addEventListener('submit', handleLogin);
      overlay.querySelector('#adminUser').focus();
    }

    function showAdminPanel() {
      const overlay = buildModal(`
        <button class="admin-modal-close" aria-label="Close">&times;</button>
        <div class="admin-modal-header">
          <span class="admin-modal-icon">&#9989;</span>
          <h3>Admin Panel</h3>
        </div>
        <p class="admin-panel-greeting">Logged in as <strong>Administrator</strong></p>
        <button class="admin-submit-btn admin-logout-btn" id="adminLogoutBtn">Logout</button>
      `);
      overlay.querySelector('#adminLogoutBtn').addEventListener('click', handleLogout);
    }

    async function handleLogin(e) {
      e.preventDefault();
      const user  = document.getElementById('adminUser').value.trim();
      const pass  = document.getElementById('adminPass').value;
      const errEl = document.getElementById('adminError');
      const btn   = e.target.querySelector('button[type="submit"]');

      btn.disabled    = true;
      btn.textContent = 'Verifying…';
      errEl.textContent = '';

      const hash = await sha256(pass);

      if (user === ADMIN_USER && hash === ADMIN_HASH) {
        localStorage.setItem(STORE_KEY, '1');
        hideModal();
        injectAdminNav();
      } else {
        errEl.textContent = 'Invalid username or password.';
        btn.disabled    = false;
        btn.textContent = 'Login';
      }
    }

    function handleLogout() {
      localStorage.removeItem(STORE_KEY);
      hideModal();
      removeAdminNav();
    }

    function injectFooterTrigger() {
      const quickLinksUl = document.querySelector('.footer-links ul');
      if (!quickLinksUl || document.getElementById('adminLoginTrigger')) return;
      const li = document.createElement('li');
      const a  = document.createElement('a');
      a.id        = 'adminLoginTrigger';
      a.href      = '#';
      a.textContent = isLoggedIn() ? 'Admin Panel' : 'Admin Login';
      a.addEventListener('click', e => {
        e.preventDefault();
        isLoggedIn() ? showAdminPanel() : showLoginModal();
      });
      li.appendChild(a);
      quickLinksUl.appendChild(li);
    }

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') hideModal();
    });

    injectFooterTrigger();
    if (isLoggedIn()) injectAdminNav();
  })();

  // ── Scrolling news ticker ──────────────────────────────────
  (function initTicker() {
    const track    = document.getElementById('tickerTrack');
    const pauseBtn = document.getElementById('tickerPause');
    if (!track) return;

    const PX_PER_SEC = 60;
    let isPaused = false;

    function buildTrack(items) {
      function renderSet() {
        return items.map((item, i) => {
          const isLast = i === items.length - 1;
          return `<span class="ticker-item">
            <span class="ticker-item-date">${item.date}</span>
            <span class="ticker-item-text">${item.text}</span>
          </span>${isLast ? '' : '<span class="ticker-sep" aria-hidden="true">&#9679;</span>'}`;
        }).join('');
      }
      const setHTML = renderSet();
      track.innerHTML = setHTML + '<span class="ticker-sep" aria-hidden="true">&#9679;</span>' + setHTML;
      requestAnimationFrame(() => {
        const duration = (track.scrollWidth / 2) / PX_PER_SEC;
        track.style.animationDuration = duration + 's';
      });
    }

    function loadFallback() {
      buildTrack([
        { date: 'Aug 2026', text: 'Work abstention on 03.08.2026 — Members to abstain from court duties in protest against police atrocities on advocate at Hindupur.' },
        { date: 'Jul 2026', text: 'Group Insurance Scheme extended to all active members — submit updated details at the Association office.' },
        { date: 'Jun 2026', text: 'New Digital Library Wing inaugurated at Bar Association Hall — SCC Online, Manupatra and AIR terminals now available.' }
      ]);
    }

    fetch(ROOT + 'news/news.json')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(items => { if (!Array.isArray(items) || !items.length) throw new Error(); buildTrack(items); })
      .catch(loadFallback);

    pauseBtn?.addEventListener('click', () => {
      isPaused = !isPaused;
      track.classList.toggle('paused', isPaused);
      pauseBtn.textContent    = isPaused ? '▶' : '❚❚';
      pauseBtn.style.fontSize = isPaused ? '13px' : '10px';
      pauseBtn.setAttribute('title', isPaused ? 'Resume' : 'Pause');
    });
    track.addEventListener('mouseenter', () => { if (!isPaused) track.classList.add('paused'); });
    track.addEventListener('mouseleave', () => { if (!isPaused) track.classList.remove('paused'); });
  })();

  // ── Home page: recent news preview ────────────────────────
  (function initHomeNews() {
    const grid = document.getElementById('homeNewsGrid');
    if (!grid) return;
    fetch(ROOT + 'news/news.json')
      .then(r => r.json())
      .then(items => {
        grid.innerHTML = items.slice(0, 3).map(item => `
          <article class="news-card">
            <div class="news-meta">
              <span class="news-cat">Latest</span>
              <span class="news-date">${item.date}</span>
            </div>
            <p>${item.text}</p>
            <a href="news/index.html" class="read-more">View All News &rarr;</a>
          </article>`).join('');
      })
      .catch(() => {
        grid.innerHTML = '<p style="color:var(--muted);grid-column:1/-1;text-align:center">Unable to load latest news. <a href="news/">Visit the News page</a>.</p>';
      });
  })();

  // ── Mobile nav toggle ──────────────────────────────────────
  const navToggle = document.getElementById('navToggle');
  const mainNav   = document.getElementById('mainNav');

  navToggle?.addEventListener('click', () => {
    mainNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', mainNav.classList.contains('open'));
  });

  // Close nav on link click (mobile)
  mainNav?.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => mainNav.classList.remove('open'));
  });

  // ── Active nav highlight on scroll ────────────────────────
  const sections = document.querySelectorAll('section[id], header[id]');
  const navLinks = document.querySelectorAll('.main-nav a[href^="#"]');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(l => l.classList.remove('active'));
        const active = document.querySelector(`.main-nav a[href="#${entry.target.id}"]`);
        active?.classList.add('active');
      }
    });
  }, { threshold: 0.3, rootMargin: '-80px 0px 0px 0px' });

  sections.forEach(s => observer.observe(s));

  // ── Back to top button ─────────────────────────────────────
  const btt = document.getElementById('backToTop');
  window.addEventListener('scroll', () => {
    btt?.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  btt?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // ── Sticky header shrink ───────────────────────────────────
  const header = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    header?.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  // ── News / Events Tabs ─────────────────────────────────────
  const tabBtns    = document.querySelectorAll('.tab-btn');
  const tabPanels  = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(target)?.classList.add('active');
    });
  });

  // ── Member search & filter ─────────────────────────────────
  const searchInput  = document.getElementById('memberSearch');
  const filterSelect = document.getElementById('memberFilter');

  function filterMembers() {
    const query    = (searchInput?.value || '').toLowerCase().trim();
    const area     = (filterSelect?.value || '').toLowerCase();
    const tableRows = document.querySelectorAll('#membersTable tbody tr');

    tableRows.forEach(row => {
      const text       = row.textContent.toLowerCase();
      const practiceEl = row.cells[2];
      const practice   = practiceEl ? practiceEl.textContent.toLowerCase() : '';

      const matchesQuery = !query || text.includes(query);
      const matchesArea  = !area  || practice === area;

      row.classList.toggle('hidden', !(matchesQuery && matchesArea));
    });
  }

  searchInput?.addEventListener('input', filterMembers);
  filterSelect?.addEventListener('change', filterMembers);

  // ── Gallery filter ─────────────────────────────────────────
  const gFilterBtns = document.querySelectorAll('.gfilter-btn');
  const galleryItems = document.querySelectorAll('.gallery-item');

  gFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      gFilterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      galleryItems.forEach(item => {
        const show = filter === 'all' || item.dataset.category === filter;
        item.classList.toggle('hidden', !show);
        item.style.animation = show ? 'fadeIn .3s ease' : '';
      });
    });
  });

  // ── Contact form (static — shows confirmation message) ─────
  const contactForm = document.getElementById('contactForm');
  const formMsg     = document.getElementById('formMsg');

  contactForm?.addEventListener('submit', e => {
    e.preventDefault();
    const btn = contactForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Sending…';

    // Simulate async submission
    setTimeout(() => {
      formMsg.textContent = 'Thank you for your message. We will get back to you shortly.';
      formMsg.style.color = '#4caf50';
      contactForm.reset();
      btn.disabled = false;
      btn.textContent = 'Send Message';
    }, 1200);
  });

  // ── Scroll-reveal for cards ────────────────────────────────
  const revealEls = document.querySelectorAll(
    '.bearer-card, .news-card, .event-item, .notice-item, .pillar, .timeline li, .exec-member'
  );

  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity   = '1';
        entry.target.style.transform = 'translateY(0)';
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  revealEls.forEach(el => {
    el.style.opacity   = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity .45s ease, transform .45s ease';
    revealObserver.observe(el);
  });

  // ── Counter animation for hero stats ──────────────────────
  const counters = document.querySelectorAll('.stat-num');

  const counterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el  = entry.target;
      const raw = el.textContent.replace(/[^0-9]/g, '');
      if (!raw) return;

      const target   = parseInt(raw, 10);
      const suffix   = el.textContent.replace(/[0-9]/g, '');
      const duration = 1200;
      const start    = performance.now();

      function step(now) {
        const elapsed  = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased    = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target).toLocaleString() + suffix;
        if (progress < 1) requestAnimationFrame(step);
      }

      requestAnimationFrame(step);
      counterObserver.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(c => counterObserver.observe(c));

})();
