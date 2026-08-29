/* Bezwada Bar Association — Main Script */

(function () {
  'use strict';

  // Root path prefix — set via data-root on <body> for subfolder pages
  const ROOT = document.body.getAttribute('data-root') || '';

  // ── Disable right-click ────────────────────────────────────
  document.addEventListener('contextmenu', e => e.preventDefault());

  // ── Admin authentication system ───────────────────────────
  (function initAdmin() {
    const STORE_KEY = 'bba_admin';
    const AUTH_URL  = 'https://tiwazbntxvyvwfjzcwrv.supabase.co/functions/v1/admin-auth';

    function isLoggedIn() {
      return localStorage.getItem(STORE_KEY) === '1';
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
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:4px;">
          <button class="admin-submit-btn" id="adminReportBtn">&#128202; Tournament Registrations Report</button>
          <button class="admin-submit-btn admin-logout-btn" id="adminLogoutBtn">Logout</button>
        </div>
      `);
      overlay.querySelector('#adminLogoutBtn').addEventListener('click', handleLogout);
      overlay.querySelector('#adminReportBtn').addEventListener('click', function () {
        hideModal();
        showTournamentReport();
      });
    }

    // ── Lazy-load Supabase on pages that don't include it ─────
    function ensureSupabase() {
      if (window._supabase) return Promise.resolve(true);
      return new Promise(function (resolve) {
        var s1 = document.createElement('script');
        s1.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
        s1.onload = function () {
          var s2 = document.createElement('script');
          s2.src = ROOT + 'js/supabase-client.js';
          s2.onload  = function () { resolve(!!window._supabase); };
          s2.onerror = function () { resolve(false); };
          document.head.appendChild(s2);
        };
        s1.onerror = function () { resolve(false); };
        document.head.appendChild(s1);
      });
    }

    // ── Tournament report modal ────────────────────────────────
    async function showTournamentReport() {
      var overlay = buildModal(`
        <button class="admin-modal-close" aria-label="Close">&times;</button>
        <div class="admin-modal-header">
          <span class="admin-modal-icon">&#128202;</span>
          <h3>Tournament Registrations</h3>
        </div>
        <div id="reportContent" style="text-align:center;padding:32px 0;color:var(--muted);">
          Loading&hellip;
        </div>
      `);
      overlay.querySelector('.admin-modal').classList.add('admin-modal--report');

      var ready = await ensureSupabase();
      if (!ready) {
        document.getElementById('reportContent').innerHTML =
          '<p style="color:#c0392b">Could not connect to database. Please try from the Members or Tournament page.</p>';
        return;
      }

      var _ref = await window._supabase
        .from('tournament_registrations')
        .select('*')
        .order('created_at', { ascending: false });
      var data = _ref.data, error = _ref.error;

      if (error) {
        document.getElementById('reportContent').innerHTML =
          '<p style="color:#c0392b">Error: ' + error.message + '</p>';
        return;
      }

      renderReport(data || []);
    }

    function renderReport(rows) {
      var total     = rows.length;
      var submitted = rows.filter(function (r) { return r.payment_status === 'utr_submitted'; }).length;
      var pending   = rows.filter(function (r) { return r.payment_status === 'pending'; }).length;
      var totalAmt  = rows
        .filter(function (r) { return r.payment_status === 'utr_submitted'; })
        .reduce(function (s, r) { return s + (r.total_amount || 0); }, 0);

      // Category counts
      var catCount = {};
      rows.forEach(function (r) {
        (r.events || []).forEach(function (ev) {
          catCount[ev.label] = (catCount[ev.label] || 0) + 1;
        });
      });

      var catBadges = Object.entries(catCount).map(function (_ref2) {
        var label = _ref2[0], count = _ref2[1];
        return '<span class="report-cat-badge">' + label + ': ' + count + '</span>';
      }).join('');

      var tableRows = rows.map(function (r) {
        var events    = (r.events || []).map(function (e) { return e.label; }).join(', ');
        var badgeCls  = r.payment_status === 'utr_submitted' ? 'r-badge--submitted' : 'r-badge--pending';
        var badgeTxt  = r.payment_status === 'utr_submitted' ? 'UTR Submitted' : 'Pending';
        return '<tr data-status="' + r.payment_status + '" data-search="' +
          [r.ref, r.name, r.enrollment_no, r.bar_association, r.mobile, events].join(' ').toLowerCase() + '">' +
          '<td style="font-weight:600;white-space:nowrap;">' + (r.ref || '') + '</td>' +
          '<td>' + (r.name || '') + '</td>' +
          '<td style="white-space:nowrap;">' + (r.enrollment_no || '') + '</td>' +
          '<td>' + (r.bar_association || '') + '</td>' +
          '<td style="white-space:nowrap;">' + (r.mobile || '') + '</td>' +
          '<td style="font-size:12px;">' + events + '</td>' +
          '<td style="text-align:right;font-weight:600;">&#8377;' + (r.total_amount || 0).toLocaleString('en-IN') + '</td>' +
          '<td style="font-size:12px;color:var(--muted);">' + (r.utr_number || '&mdash;') + '</td>' +
          '<td><span class="r-badge ' + badgeCls + '">' + badgeTxt + '</span></td>' +
          '</tr>';
      }).join('');

      document.getElementById('reportContent').innerHTML =
        '<div class="report-stats">' +
          '<div class="report-stat"><div class="report-stat-num">' + total + '</div><div class="report-stat-label">Total Registrations</div></div>' +
          '<div class="report-stat"><div class="report-stat-num">' + submitted + '</div><div class="report-stat-label">UTR Submitted</div></div>' +
          '<div class="report-stat"><div class="report-stat-num">' + pending + '</div><div class="report-stat-label">Pending Payment</div></div>' +
          '<div class="report-stat"><div class="report-stat-num">&#8377;' + totalAmt.toLocaleString('en-IN') + '</div><div class="report-stat-label">Amount Collected</div></div>' +
        '</div>' +
        (catBadges ? '<div class="report-cats">' + catBadges + '</div>' : '') +
        '<div class="report-toolbar">' +
          '<input class="report-search" id="reportSearch" type="text" placeholder="Search name, ref, enrollment&hellip;" />' +
          '<select class="report-filter" id="reportFilter">' +
            '<option value="">All Statuses</option>' +
            '<option value="utr_submitted">UTR Submitted</option>' +
            '<option value="pending">Pending</option>' +
          '</select>' +
          '<button class="admin-submit-btn" id="exportCsvBtn" style="padding:8px 16px;font-size:13px;white-space:nowrap;">&#11015; Export CSV</button>' +
        '</div>' +
        '<div class="report-table-wrap">' +
          '<table class="report-table">' +
            '<thead><tr>' +
              '<th>Ref No</th><th>Name</th><th>Enrollment No</th><th>Bar Association</th>' +
              '<th>Mobile</th><th>Events</th><th>Amount</th><th>UTR No</th><th>Status</th>' +
            '</tr></thead>' +
            '<tbody id="reportTbody">' + (tableRows || '<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:24px;">No registrations yet.</td></tr>') + '</tbody>' +
          '</table>' +
        '</div>';

      // Search & filter
      var tbody = document.getElementById('reportTbody');
      function applyFilter() {
        var q      = (document.getElementById('reportSearch').value || '').toLowerCase();
        var status = document.getElementById('reportFilter').value;
        tbody.querySelectorAll('tr').forEach(function (tr) {
          var matchQ = !q      || (tr.dataset.search || '').includes(q);
          var matchS = !status || tr.dataset.status === status;
          tr.style.display = (matchQ && matchS) ? '' : 'none';
        });
      }
      document.getElementById('reportSearch').addEventListener('input', applyFilter);
      document.getElementById('reportFilter').addEventListener('change', applyFilter);
      document.getElementById('exportCsvBtn').addEventListener('click', function () { exportCSV(rows); });
    }

    function exportCSV(rows) {
      var headers = ['Ref No','Name','Enrollment No','Bar Association','Mobile','Email','Events','Partners','Total Amount','UTR Number','Payment Status'];
      var lines = rows.map(function (r) {
        var events   = (r.events || []).map(function (e) { return e.label; }).join(' | ');
        var partners = Object.entries(r.partners || {}).map(function (_ref3) {
          var id = _ref3[0], p = _ref3[1];
          return id + ': ' + (p.name || '');
        }).join(' | ');
        return [r.ref, r.name, r.enrollment_no, r.bar_association, r.mobile, r.email || '',
          events, partners, r.total_amount, r.utr_number || '', r.payment_status]
          .map(function (v) { return '"' + String(v || '').replace(/"/g, '""') + '"'; }).join(',');
      });
      var csv  = [headers.join(',')].concat(lines).join('\n');
      var blob = new Blob([csv], { type: 'text/csv' });
      var url  = URL.createObjectURL(blob);
      var a    = document.createElement('a');
      a.href     = url;
      a.download = 'tournament-registrations-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
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

      try {
        const res  = await fetch(AUTH_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ username: user, password: pass }),
        });
        const data = await res.json();

        if (data.success) {
          localStorage.setItem(STORE_KEY, '1');
          hideModal();
          injectAdminNav();
          injectAddMemberBtn();
        } else {
          errEl.textContent = data.message || 'Invalid username or password.';
          btn.disabled    = false;
          btn.textContent = 'Login';
        }
      } catch (_) {
        errEl.textContent = 'Network error. Please try again.';
        btn.disabled    = false;
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

  // ── Contact form — proxied via Supabase Edge Function ──────
  const CONTACT_URL = 'https://tiwazbntxvyvwfjzcwrv.supabase.co/functions/v1/contact-form';

  const contactForm = document.getElementById('contactForm');
  const formMsg     = document.getElementById('formMsg');

  contactForm?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = contactForm.querySelector('button[type="submit"]');
    btn.disabled    = true;
    btn.textContent = 'Sending…';
    formMsg.textContent = '';
    formMsg.style.color  = '';

    try {
      const res  = await fetch(CONTACT_URL, {
        method:  'POST',
        headers: { 'Accept': 'application/json' },
        body:    new FormData(contactForm),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        formMsg.textContent = 'Thank you for your message. We will get back to you shortly.';
        formMsg.style.color = '#4caf50';
        contactForm.reset();
      } else {
        formMsg.textContent = data.message || 'Something went wrong. Please try again or email us at bbabza@gmail.com.';
        formMsg.style.color = '#c0392b';
      }
    } catch (_) {
      formMsg.textContent = 'Network error. Please check your connection and try again.';
      formMsg.style.color = '#c0392b';
    }

    btn.disabled    = false;
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
