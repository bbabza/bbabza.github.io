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
    const STORE_KEY = 'bba_admin';

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
      const user = document.getElementById('adminUser').value.trim();
      const pass = document.getElementById('adminPass').value;
      const errEl = document.getElementById('adminError');
      const btn = e.target.querySelector('button[type="submit"]');

      btn.disabled = true;
      btn.textContent = 'Verifying…';
      errEl.textContent = '';

      const hash = await sha256(pass);

      if (user === ADMIN_USER && hash === ADMIN_HASH) {
        localStorage.setItem(STORE_KEY, '1');
        hideModal();
        injectAdminNav();
        injectAddMemberBtn();
      } else {
        errEl.textContent = 'Invalid username or password.';
        btn.disabled = false;
        btn.textContent = 'Login';
      }
    }

    function handleLogout() {
      localStorage.removeItem(STORE_KEY);
      hideModal();
      removeAdminNav();
      document.getElementById('addMemberBtn')?.remove();
    }

    function injectFooterTrigger() {
      const quickLinksUl = document.querySelector('.footer-links ul');
      if (!quickLinksUl || document.getElementById('adminLoginTrigger')) return;
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.id = 'adminLoginTrigger';
      a.href = '#';
      a.textContent = isLoggedIn() ? 'Admin Panel' : 'Admin Login';
      a.addEventListener('click', e => {
        e.preventDefault();
        isLoggedIn() ? showAdminPanel() : showLoginModal();
      });
      li.appendChild(a);
      quickLinksUl.appendChild(li);
    }

    // ── Add Member (members page only) ───────────────────────
    function injectAddMemberBtn() {
      if (!document.getElementById('membersTable')) return;
      if (document.getElementById('addMemberBtn')) return;
      const controls = document.querySelector('.members-controls');
      if (!controls) return;
      const btn = document.createElement('button');
      btn.id = 'addMemberBtn';
      btn.className = 'btn btn-gold add-member-btn';
      btn.innerHTML = '&#43; Add Member';
      btn.addEventListener('click', showAddMemberModal);
      controls.after(btn);
    }

    function showAddMemberModal() {
      const overlay = buildModal(`
        <button class="admin-modal-close" aria-label="Close">&times;</button>
        <div class="admin-modal-header">
          <span class="admin-modal-icon">&#128100;</span>
          <h3>Add New Member</h3>
        </div>
        <form id="addMemberForm" autocomplete="off">
          <div class="admin-form-group">
            <label for="m-enr">Enrollment No. *</label>
            <input type="text" id="m-enr" required placeholder="e.g. AP/001/2025" />
          </div>
          <div class="admin-form-group">
            <label for="m-name">Full Name *</label>
            <input type="text" id="m-name" required placeholder="Sri / Smt. Full Name" />
          </div>
          <div class="admin-form-group">
            <label for="m-area">Practice Area</label>
            <select id="m-area">
              <option value="">-- Select --</option>
              <option>Civil</option>
              <option>Criminal</option>
              <option>Constitutional</option>
              <option>Family</option>
              <option>Labour</option>
              <option>Revenue</option>
              <option>Commercial</option>
            </select>
          </div>
          <div class="admin-form-group">
            <label for="m-year">Enrolled Year *</label>
            <input type="number" id="m-year" required placeholder="e.g. 2024" min="1900" max="2099" />
          </div>
          <div class="admin-form-group">
            <label for="m-status">Status</label>
            <select id="m-status">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <p class="admin-error" id="memberError"></p>
          <button type="submit" class="admin-submit-btn">Save Member</button>
        </form>
      `);
      overlay.querySelector('.admin-modal').classList.add('admin-modal--wide');
      overlay.querySelector('#addMemberForm').addEventListener('submit', handleAddMember);
      overlay.querySelector('#m-enr').focus();
    }

    async function handleAddMember(e) {
      e.preventDefault();
      const enr = document.getElementById('m-enr').value.trim();
      const name = document.getElementById('m-name').value.trim();
      const area = document.getElementById('m-area').value;
      const year = parseInt(document.getElementById('m-year').value);
      const status = document.getElementById('m-status').value;
      const errEl = document.getElementById('memberError');
      const btn = e.target.querySelector('button[type="submit"]');

      errEl.textContent = '';
      if (!enr || !name || !year) {
        errEl.textContent = 'Please fill in all required fields.';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Saving…';

      if (!window._supabase) {
        errEl.textContent = 'Database not connected.';
        btn.disabled = false; btn.textContent = 'Save Member';
        return;
      }

      const { data, error } = await window._supabase
        .from('members')
        .insert({ enrollment_no: enr, name, practice_area: area || null, enrolled_year: year, status })
        .select()
        .single();

      if (error) {
        errEl.textContent = error.code === '23505'
          ? 'Enrollment number already exists.'
          : 'Save failed: ' + error.message;
        btn.disabled = false; btn.textContent = 'Save Member';
        return;
      }

      // Prepend new row to table
      const tbody = document.querySelector('#membersTable tbody');
      if (tbody) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${data.enrollment_no}</td>
          <td>${data.name}</td>
          <td>${data.practice_area || ''}</td>
          <td>${data.enrolled_year || ''}</td>
          <td><span class="badge badge-${data.status === 'Active' ? 'active' : 'inactive'}">${data.status}</span></td>`;
        tbody.insertBefore(tr, tbody.firstChild);
        const count = tbody.querySelectorAll('tr').length;
        const noteEl = document.querySelector('.table-note');
        if (noteEl) noteEl.textContent =
          `Showing ${count} member${count !== 1 ? 's' : ''} — Contact the Association office for enrollment inquiries.`;
      }

      hideModal();
    }

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') hideModal();
    });

    injectFooterTrigger();
    if (isLoggedIn()) {
      injectAdminNav();
      injectAddMemberBtn();
    }
  })();

  // ── Scrolling news ticker ──────────────────────────────────
  (function initTicker() {
    const track = document.getElementById('tickerTrack');
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
      pauseBtn.textContent = isPaused ? '▶' : '❚❚';
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
  const mainNav = document.getElementById('mainNav');

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
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-content');

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
  const searchInput = document.getElementById('memberSearch');
  const filterSelect = document.getElementById('memberFilter');

  function filterMembers() {
    const query = (searchInput?.value || '').toLowerCase().trim();
    const area = (filterSelect?.value || '').toLowerCase();
    const tableRows = document.querySelectorAll('#membersTable tbody tr');

    tableRows.forEach(row => {
      const text = row.textContent.toLowerCase();
      const practiceEl = row.cells[2];
      const practice = practiceEl ? practiceEl.textContent.toLowerCase() : '';

      const matchesQuery = !query || text.includes(query);
      const matchesArea = !area || practice === area;

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

  // ── Contact form — Web3Forms ───────────────────────────────
  const WEB3FORMS_KEY = '613ba491-83c4-4792-8e66-646cdd80468e';

  const contactForm = document.getElementById('contactForm');
  const formMsg = document.getElementById('formMsg');

  contactForm?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = contactForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    formMsg.textContent = '';
    formMsg.style.color = '';

    // Mirror email field into replyto so replies go back to sender
    const emailVal = document.getElementById('femail')?.value.trim();
    const replyTo = document.getElementById('replyToField');
    if (replyTo && emailVal) replyTo.value = emailVal;

    try {
      const formData = new FormData(contactForm);
      formData.set('access_key', WEB3FORMS_KEY);

      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: formData
      });
      const json = await res.json();

      if (res.ok && json.success) {
        formMsg.textContent = 'Thank you for your message. We will get back to you shortly.';
        formMsg.style.color = '#4caf50';
        contactForm.reset();
      } else {
        formMsg.textContent = json.message || 'Something went wrong. Please try again or email us at bbabza@gmail.com.';
        formMsg.style.color = '#c0392b';
      }
    } catch (_) {
      formMsg.textContent = 'Network error. Please check your connection and try again.';
      formMsg.style.color = '#c0392b';
    }

    btn.disabled = false;
    btn.textContent = 'Send Message';
  });

  // ── Scroll-reveal for cards ────────────────────────────────
  const revealEls = document.querySelectorAll(
    '.bearer-card, .news-card, .event-item, .notice-item, .pillar, .timeline li, .exec-member'
  );

  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  revealEls.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity .45s ease, transform .45s ease';
    revealObserver.observe(el);
  });

  // ── Counter animation for hero stats ──────────────────────
  const counters = document.querySelectorAll('.stat-num');

  const counterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const raw = el.textContent.replace(/[^0-9]/g, '');
      if (!raw) return;

      const target = parseInt(raw, 10);
      const suffix = el.textContent.replace(/[0-9]/g, '');
      const duration = 1200;
      const start = performance.now();

      function step(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target).toLocaleString() + suffix;
        if (progress < 1) requestAnimationFrame(step);
      }

      requestAnimationFrame(step);
      counterObserver.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(c => counterObserver.observe(c));

})();
