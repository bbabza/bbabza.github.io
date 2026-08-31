/* Bezwada Bar Association — Main Script */

(function () {
  'use strict';

  // Root path prefix — set via data-root on <body> for subfolder pages
  const ROOT = document.body.getAttribute('data-root') || '';

  // Supabase anon key — public by design, required as Bearer token for Edge Function calls
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpd2F6Ym50eHZ5dndmanpjd3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5MTUxOTYsImV4cCI6MjEwMzQ5MTE5Nn0.XQ-7AadKhw_b74fUxrfGlKMkASqkzbPUz8jrS12af6E';

  // ── Disable right-click ────────────────────────────────────
  document.addEventListener('contextmenu', e => e.preventDefault());

  // ── Admin authentication system ───────────────────────────
  (function initAdmin() {
    const STORE_KEY = 'bba_admin';
    const AUTH_URL = 'https://tiwazbntxvyvwfjzcwrv.supabase.co/functions/v1/admin-auth';

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
        <button class="admin-submit-btn admin-logout-btn" id="adminLogoutBtn" style="margin-top:4px;">Logout</button>
      `);
      overlay.querySelector('#adminLogoutBtn').addEventListener('click', handleLogout);
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
          s2.onload = function () { resolve(!!window._supabase); };
          s2.onerror = function () { resolve(false); };
          document.head.appendChild(s2);
        };
        s1.onerror = function () { resolve(false); };
        document.head.appendChild(s1);
      });
    }

    // ── Tournament report — inline on tournament page ──────────
    async function injectTournamentReport() {
      if (!document.getElementById('selectSection')) return; // not tournament page
      if (document.getElementById('adminTournamentReport')) return; // already present

      var section = document.createElement('section');
      section.id = 'adminTournamentReport';
      section.className = 'section section-light';
      section.innerHTML =
        '<div class="container">' +
        '<div class="section-header">' +
        '<span class="section-badge">Admin</span>' +
        '<h2 class="section-title">Registrations Report</h2>' +
        '<div class="divider"></div>' +
        '</div>' +
        '<div id="reportContent" style="text-align:center;padding:32px 0;color:var(--muted);">Loading&hellip;</div>' +
        '</div>';

      var footer = document.querySelector('.site-footer');
      footer.parentNode.insertBefore(section, footer);

      var ready = await ensureSupabase();
      var content = document.getElementById('reportContent');
      if (!ready) {
        content.innerHTML = '<p style="color:#c0392b">Could not connect to database.</p>';
        return;
      }

      var _q = await window._supabase
        .from('tournament_registrations')
        .select('*')
        .order('ref', { ascending: false });

      if (_q.error) {
        content.innerHTML = '<p style="color:#c0392b">Error: ' + _q.error.message + '</p>';
        return;
      }

      renderReport(_q.data || [], content);
    }

    function renderReport(rows, container) {
      var total = rows.length;
      var submitted = rows.filter(function (r) { return r.payment_status === 'utr_submitted'; }).length;
      var pending = rows.filter(function (r) { return r.payment_status === 'pending'; }).length;
      var totalAmt = rows
        .filter(function (r) { return r.payment_status === 'utr_submitted'; })
        .reduce(function (s, r) { return s + (r.total_amount || 0); }, 0);

      var catCount = {};
      rows.forEach(function (r) {
        (r.events || []).forEach(function (ev) {
          catCount[ev.label] = (catCount[ev.label] || 0) + 1;
        });
      });

      var catBadges = Object.entries(catCount).map(function (entry) {
        return '<span class="report-cat-badge">' + entry[0] + ': ' + entry[1] + '</span>';
      }).join('');

      var tableRows = rows.map(function (r) {
        var events = (r.events || []).map(function (e) { return e.label; }).join(', ');
        var badgeCls = r.payment_status === 'utr_submitted' ? 'r-badge--submitted' : 'r-badge--pending';
        var badgeTxt = r.payment_status === 'utr_submitted' ? 'UTR Submitted' : 'Pending';

        // Build partner cell — one line per doubles event
        var partnerLines = Object.entries(r.partners || {}).map(function (entry) {
          var evId = entry[0], p = entry[1];
          if (!p || !p.name) return '';
          var evObj = (r.events || []).find(function (e) { return e.id === evId; });
          var prefix = evObj ? evObj.label : evId;
          var detail = p.name + (p.enrollment_no ? ' (' + p.enrollment_no + ')' : '');
          return '<span style="display:block;white-space:nowrap;">' + prefix + ':<br>&nbsp;&nbsp;' + detail + '</span>';
        }).filter(Boolean);
        var partnerCell = partnerLines.length ? partnerLines.join('') : '&mdash;';

        var searchStr = [r.ref, r.name, r.enrollment_no, r.bar_association, r.mobile, events,
        Object.values(r.partners || {}).map(function (p) { return (p.name || '') + ' ' + (p.enrollment_no || ''); }).join(' ')
        ].join(' ').toLowerCase();

        return '<tr data-status="' + r.payment_status + '" data-search="' + searchStr + '">' +
          '<td style="font-weight:600;white-space:nowrap;">' + (r.ref || '') + '</td>' +
          '<td>' + (r.name || '') + '</td>' +
          '<td style="white-space:nowrap;">' + (r.enrollment_no || '') + '</td>' +
          '<td>' + (r.bar_association || '') + '</td>' +
          '<td style="white-space:nowrap;">' + (r.mobile || '') + '</td>' +
          '<td style="font-size:12px;">' + events + '</td>' +
          '<td style="font-size:12px;">' + partnerCell + '</td>' +
          '<td style="text-align:right;font-weight:600;">&#8377;' + (r.total_amount || 0).toLocaleString('en-IN') + '</td>' +
          '<td style="font-size:12px;color:var(--muted);">' + (r.utr_number || '&mdash;') + '</td>' +
          '<td><span class="r-badge ' + badgeCls + '">' + badgeTxt + '</span></td>' +
          '</tr>';
      }).join('');

      container.innerHTML =
        '<div class="report-stats">' +
        '<div class="report-stat"><div class="report-stat-num">' + total + '</div><div class="report-stat-label">Total Registrations</div></div>' +
        '<div class="report-stat"><div class="report-stat-num">' + submitted + '</div><div class="report-stat-label">UTR Submitted</div></div>' +
        '<div class="report-stat"><div class="report-stat-num">' + pending + '</div><div class="report-stat-label">Pending Payment</div></div>' +
        '<div class="report-stat"><div class="report-stat-num">&#8377;' + totalAmt.toLocaleString('en-IN') + '</div><div class="report-stat-label">Amount Collected</div></div>' +
        '</div>' +
        (catBadges ? '<div class="report-cats">' + catBadges + '</div>' : '') +
        '<div class="report-toolbar">' +
        '<input class="report-search" id="reportSearch" type="text" placeholder="Search name, ref, enrollment, partner&hellip;" />' +
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
        '<th>Mobile</th><th>Events</th><th>Partner(s)</th><th>Amount</th><th>UTR No</th><th>Status</th>' +
        '</tr></thead>' +
        '<tbody id="reportTbody">' + (tableRows || '<tr><td colspan="10" style="text-align:center;color:var(--muted);padding:24px;">No registrations yet.</td></tr>') + '</tbody>' +
        '</table>' +
        '</div>';

      var tbody = container.querySelector('#reportTbody');
      function applyFilter() {
        var q = (container.querySelector('#reportSearch').value || '').toLowerCase();
        var status = container.querySelector('#reportFilter').value;
        tbody.querySelectorAll('tr').forEach(function (tr) {
          var matchQ = !q || (tr.dataset.search || '').includes(q);
          var matchS = !status || tr.dataset.status === status;
          tr.style.display = (matchQ && matchS) ? '' : 'none';
        });
      }
      container.querySelector('#reportSearch').addEventListener('input', applyFilter);
      container.querySelector('#reportFilter').addEventListener('change', applyFilter);
      container.querySelector('#exportCsvBtn').addEventListener('click', function () { exportCSV(rows); });
    }

    function exportCSV(rows) {
      var headers = ['Ref No', 'Name', 'Enrollment No', 'Bar Association', 'Mobile', 'Email', 'Events', 'Partner Name', 'Partner Enrollment', 'Partner Bar Association', 'Total Amount', 'UTR Number', 'Payment Status'];
      var lines = rows.map(function (r) {
        var events = (r.events || []).map(function (e) { return e.label; }).join(' | ');
        var partnerEntries = Object.entries(r.partners || {});
        var pName = partnerEntries.map(function (e) { return e[1].name || ''; }).filter(Boolean).join(' | ');
        var pEnr = partnerEntries.map(function (e) { return e[1].enrollment_no || ''; }).filter(Boolean).join(' | ');
        var pBar = partnerEntries.map(function (e) { return e[1].bar_association || ''; }).filter(Boolean).join(' | ');
        return [r.ref, r.name, r.enrollment_no, r.bar_association, r.mobile, r.email || '',
          events, pName, pEnr, pBar, r.total_amount, r.utr_number || '', r.payment_status]
          .map(function (v) { return '"' + String(v || '').replace(/"/g, '""') + '"'; }).join(',');
      });
      var csv = [headers.join(',')].concat(lines).join('\n');
      var blob = new Blob([csv], { type: 'text/csv' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'tournament-registrations-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
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

      try {
        const res = await fetch(AUTH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ username: user, password: pass }),
        });
        const data = await res.json();

        if (data.success) {
          localStorage.setItem(STORE_KEY, '1');
          sessionStorage.setItem('bba_admin_pass', pass);
          hideModal();
          injectAdminNav();
          injectAddMemberBtn();
          injectSetPwdBtns();
          injectTournamentReport();
        } else {
          errEl.textContent = data.message || 'Invalid username or password.';
          btn.disabled = false;
          btn.textContent = 'Login';
        }
      } catch (_) {
        errEl.textContent = 'Network error. Please try again.';
        btn.disabled = false;
        btn.textContent = 'Login';
      }
    }

    function handleLogout() {
      localStorage.removeItem(STORE_KEY);
      sessionStorage.removeItem('bba_admin_pass');
      hideModal();
      removeAdminNav();
      document.getElementById('addMemberBtn')?.remove();
      document.getElementById('adminTournamentReport')?.remove();
      document.querySelectorAll('.member-admin-actions-td').forEach(function (td) { td.remove(); });
      document.querySelector('.admin-actions-th')?.remove();
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
          <div class="admin-form-group">
            <label for="m-mobile">Mobile Number</label>
            <input type="text" id="m-mobile" placeholder="10-digit mobile" maxlength="15" />
          </div>
          <div class="admin-form-group">
            <label for="m-address">Address</label>
            <textarea id="m-address" rows="2" placeholder="Office / home address"></textarea>
          </div>
          <div class="admin-form-group">
            <label for="m-password">Initial Password</label>
            <input type="password" id="m-password" placeholder="Set a login password for this member" />
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
      const mobile = document.getElementById('m-mobile')?.value.trim() || null;
      const address = document.getElementById('m-address')?.value.trim() || null;
      const password = document.getElementById('m-password')?.value || '';
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

      let password_hash = null;
      if (password) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
        password_hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      }

      const { data, error } = await window._supabase
        .from('members')
        .insert({ enrollment_no: enr, name, practice_area: area || null, enrolled_year: year, status, mobile, address, password_hash })
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
        tr.dataset.enr = data.enrollment_no;
        tr.innerHTML = `
          <td><div class="mem-avatar">&#128100;</div></td>
          <td>${data.enrollment_no}</td>
          <td><div class="mem-name">${data.name}</div></td>
          <td class="mem-practice">${data.practice_area || ''}</td>
          <td>${data.enrolled_year || ''}</td>
          <td><span class="badge badge-${data.status === 'Active' ? 'active' : 'inactive'}">${data.status}</span></td>
          <td></td>
          <td></td>
          <td>${data.mobile ? `<a href="tel:${data.mobile}" class="mem-phone-link">${data.mobile}</a>` : ''}</td>
          <td class="mem-address">${data.address || ''}</td>
          <td class="member-admin-actions-td"><button class="set-pwd-btn" title="Set Password" onclick="window.showMemberSetPwd('${data.enrollment_no.replace(/'/g, "\\'")}')">&#128273;</button> <button class="edit-member-btn" title="Edit Member" onclick="window.showMemberEditModal('${data.enrollment_no.replace(/'/g, "\\'")}')">&#9998;</button></td>`;
        tbody.insertBefore(tr, tbody.firstChild);
        const count = tbody.querySelectorAll('tr').length;
        const noteEl = document.querySelector('.table-note');
        if (noteEl) noteEl.textContent =
          `Showing ${count} member${count !== 1 ? 's' : ''} — Contact the Association office for enrollment inquiries.`;
      }

      hideModal();
    }

    const MEMBER_ADMIN_OPS_URL = 'https://tiwazbntxvyvwfjzcwrv.supabase.co/functions/v1/member-admin-ops';

    window.injectAdminMembersColHeader = function () {
      const headerRow = document.querySelector('#membersTable thead tr');
      if (headerRow && !headerRow.querySelector('.admin-actions-th')) {
        const th = document.createElement('th');
        th.className = 'admin-actions-th';
        th.textContent = 'Actions';
        headerRow.appendChild(th);
      }
    };

    function injectSetPwdBtns() {
      if (!document.getElementById('membersTable')) return;
      window.injectAdminMembersColHeader();
      document.querySelectorAll('#membersTable tbody tr').forEach(function (tr) {
        if (tr.querySelector('.member-admin-actions-td')) return;
        var enr = tr.dataset.enr || (tr.cells[1] && tr.cells[1].textContent.trim());
        if (!enr) return;
        var td = document.createElement('td');
        td.className = 'member-admin-actions-td';
        td.innerHTML = '<button class="set-pwd-btn" title="Set Password" onclick="window.showMemberSetPwd(\'' + enr.replace(/'/g, "\\'") + '\')">&#128273;</button>' +
          ' <button class="edit-member-btn" title="Edit Member" onclick="window.showMemberEditModal(\'' + enr.replace(/'/g, "\\'") + '\')">&#9998;</button>';
        tr.appendChild(td);
      });
    }

    window.showMemberSetPwd = function (enrollmentNo) {
      if (!isLoggedIn()) return;
      var overlay = buildModal(
        '<button class="admin-modal-close" aria-label="Close">&times;</button>' +
        '<div class="admin-modal-header"><span class="admin-modal-icon">&#128273;</span><h3>Set Member Password</h3></div>' +
        '<p style="font-size:13px;color:rgba(255,255,255,.7);margin-bottom:16px;">Member: <strong>' + enrollmentNo + '</strong></p>' +
        '<form id="setPwdForm" autocomplete="off">' +
        '<div class="admin-form-group"><label for="adminVerifyPass">Admin Password</label>' +
        '<input type="password" id="adminVerifyPass" placeholder="Your admin password" /></div>' +
        '<div class="admin-form-group"><label for="memberNewPass">New Password for Member</label>' +
        '<input type="password" id="memberNewPass" placeholder="Min. 6 characters" /></div>' +
        '<p class="admin-error" id="setPwdError"></p>' +
        '<button type="submit" class="admin-submit-btn">Set Password</button>' +
        '</form>'
      );
      overlay.querySelector('#setPwdForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        var adminPass = document.getElementById('adminVerifyPass').value;
        var newPass = document.getElementById('memberNewPass').value;
        var errEl = document.getElementById('setPwdError');
        var btn = e.target.querySelector('button[type="submit"]');
        errEl.textContent = '';
        if (!adminPass || !newPass || newPass.length < 6) {
          errEl.textContent = 'Please fill in both fields. Password must be at least 6 characters.';
          return;
        }
        btn.disabled = true; btn.textContent = 'Setting…';
        try {
          var res = await fetch(MEMBER_ADMIN_OPS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY },
            body: JSON.stringify({ admin_password: adminPass, operation: 'set_password', enrollment_no: enrollmentNo, new_password: newPass }),
          });
          var data = await res.json();
          if (data.success) { hideModal(); }
          else { errEl.textContent = data.message || 'Failed to set password.'; btn.disabled = false; btn.textContent = 'Set Password'; }
        } catch (_) {
          errEl.textContent = 'Network error. Please try again.'; btn.disabled = false; btn.textContent = 'Set Password';
        }
      });
      document.getElementById('adminVerifyPass').focus();
    };

    window.showMemberEditModal = async function (enrollmentNo) {
      if (!isLoggedIn()) return;
      var overlay = buildModal(
        '<button class="admin-modal-close" aria-label="Close">&times;</button>' +
        '<div class="admin-modal-header"><span class="admin-modal-icon">&#9998;</span><h3>Edit Member</h3></div>' +
        '<p style="text-align:center;padding:20px;color:rgba(255,255,255,.7);">Loading&hellip;</p>'
      );

      var m = null;
      if (window._supabase) {
        var result = await window._supabase
          .from('members')
          .select('enrollment_no, name, practice_area, enrolled_year, status, mobile, address, description, is_bar_council_member, is_office_bearer, office_bearer_position')
          .eq('enrollment_no', enrollmentNo)
          .single();
        m = result.data;
      }

      var modal = overlay.querySelector('.admin-modal');
      if (!m) {
        modal.innerHTML = '<button class="admin-modal-close" aria-label="Close">&times;</button>' +
          '<div class="admin-modal-header"><span class="admin-modal-icon">&#9888;</span><h3>Error</h3></div>' +
          '<p style="color:rgba(255,255,255,.7);padding:12px 0;">Could not load member data.</p>';
        modal.querySelector('.admin-modal-close').addEventListener('click', hideModal);
        return;
      }

      var adminPass = sessionStorage.getItem('bba_admin_pass') || '';
      var esc = function (s) { return (s || '').replace(/"/g, '&quot;'); };

      modal.innerHTML =
        '<button class="admin-modal-close" aria-label="Close">&times;</button>' +
        '<div class="admin-modal-header"><span class="admin-modal-icon">&#9998;</span><h3>Edit Member</h3></div>' +
        '<p style="font-size:12px;color:rgba(255,255,255,.6);margin-bottom:12px;">Enrollment: ' + enrollmentNo + '</p>' +
        '<form id="editMemberForm" autocomplete="off">' +
        '<div class="admin-form-group"><label for="em-name">Full Name *</label>' +
        '<input type="text" id="em-name" value="' + esc(m.name) + '" required /></div>' +
        '<div class="admin-form-group"><label for="em-area">Practice Area</label>' +
        '<input type="text" id="em-area" value="' + esc(m.practice_area) + '" /></div>' +
        '<div class="admin-form-group"><label for="em-year">Enrolled Year *</label>' +
        '<input type="number" id="em-year" value="' + (m.enrolled_year || '') + '" min="1900" max="2099" required /></div>' +
        '<div class="admin-form-group"><label for="em-status">Status</label>' +
        '<select id="em-status"><option value="Active"' + (m.status === 'Active' ? ' selected' : '') + '>Active</option>' +
        '<option value="Inactive"' + (m.status === 'Inactive' ? ' selected' : '') + '>Inactive</option></select></div>' +
        '<div class="admin-form-group"><label for="em-mobile">Mobile</label>' +
        '<input type="text" id="em-mobile" value="' + esc(m.mobile) + '" maxlength="15" /></div>' +
        '<div class="admin-form-group"><label for="em-address">Address</label>' +
        '<textarea id="em-address" rows="2">' + (m.address || '') + '</textarea></div>' +
        '<div class="admin-form-group"><label for="em-desc">Description</label>' +
        '<textarea id="em-desc" rows="2">' + (m.description || '') + '</textarea></div>' +
        '<div class="admin-form-group"><label for="em-bc">Bar Council Member?</label>' +
        '<select id="em-bc"><option value="false"' + (!m.is_bar_council_member ? ' selected' : '') + '>No</option>' +
        '<option value="true"' + (m.is_bar_council_member ? ' selected' : '') + '>Yes</option></select></div>' +
        '<div class="admin-form-group"><label for="em-ob">Office Bearer?</label>' +
        '<select id="em-ob"><option value="false"' + (!m.is_office_bearer ? ' selected' : '') + '>No</option>' +
        '<option value="true"' + (m.is_office_bearer ? ' selected' : '') + '>Yes</option></select></div>' +
        '<div class="admin-form-group" id="em-obp-group" style="' + (!m.is_office_bearer ? 'display:none;' : '') + '">' +
        '<label for="em-obp">Office Bearer Position</label>' +
        '<input type="text" id="em-obp" value="' + esc(m.office_bearer_position) + '" placeholder="e.g. President, Secretary" /></div>' +
        (adminPass ? '' :
          '<div class="admin-form-group"><label for="em-adminpass">Admin Password</label>' +
          '<input type="password" id="em-adminpass" placeholder="Required to save changes" /></div>') +
        '<p class="admin-error" id="editMemberError"></p>' +
        '<button type="submit" class="admin-submit-btn">Save Changes</button>' +
        '</form>';

      modal.querySelector('.admin-modal-close').addEventListener('click', hideModal);
      modal.classList.add('admin-modal--wide');

      document.getElementById('em-ob').addEventListener('change', function () {
        document.getElementById('em-obp-group').style.display = this.value === 'true' ? '' : 'none';
      });

      document.getElementById('editMemberForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        var errEl = document.getElementById('editMemberError');
        var btn = e.target.querySelector('button[type="submit"]');
        errEl.textContent = '';
        var pass = adminPass || (document.getElementById('em-adminpass')?.value || '');
        if (!pass) { errEl.textContent = 'Admin password is required.'; return; }
        btn.disabled = true; btn.textContent = 'Saving…';
        var isOB = document.getElementById('em-ob').value === 'true';
        var updates = {
          name:                   document.getElementById('em-name').value.trim(),
          practice_area:          document.getElementById('em-area').value.trim() || null,
          enrolled_year:          parseInt(document.getElementById('em-year').value) || null,
          status:                 document.getElementById('em-status').value,
          mobile:                 document.getElementById('em-mobile').value.trim() || null,
          address:                document.getElementById('em-address').value.trim() || null,
          description:            document.getElementById('em-desc').value.trim() || null,
          is_bar_council_member:  document.getElementById('em-bc').value === 'true',
          is_office_bearer:       isOB,
          office_bearer_position: isOB ? (document.getElementById('em-obp').value.trim() || null) : null,
        };
        try {
          var res = await fetch(MEMBER_ADMIN_OPS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY },
            body: JSON.stringify({ admin_password: pass, operation: 'update_member', enrollment_no: enrollmentNo, updates }),
          });
          var data = await res.json();
          if (data.success) {
            var tr = document.querySelector('#membersTable tbody tr[data-enr="' + enrollmentNo + '"]');
            if (tr) {
              tr.cells[2].querySelector('.mem-name').textContent = updates.name;
              tr.querySelector('.mem-practice').textContent = updates.practice_area || '';
              tr.cells[4].textContent = updates.enrolled_year || '';
              tr.cells[5].innerHTML = '<span class="badge badge-' + (updates.status === 'Active' ? 'active' : 'inactive') + '">' + updates.status + '</span>';
              tr.cells[6].innerHTML = updates.is_bar_council_member ? '&#10003;' : '';
              tr.cells[7].textContent = updates.is_office_bearer ? (updates.office_bearer_position || 'Yes') : '';
              tr.cells[8].innerHTML = updates.mobile ? '<a href="tel:' + updates.mobile + '" class="mem-phone-link">' + updates.mobile + '</a>' : '';
              tr.cells[9].textContent = updates.address || '';
            }
            hideModal();
          } else {
            errEl.textContent = data.message || 'Update failed.';
            btn.disabled = false; btn.textContent = 'Save Changes';
          }
        } catch (_) {
          errEl.textContent = 'Network error. Please try again.';
          btn.disabled = false; btn.textContent = 'Save Changes';
        }
      });
    };

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') hideModal();
    });

    injectFooterTrigger();
    if (isLoggedIn()) {
      injectAdminNav();
      injectAddMemberBtn();
      injectSetPwdBtns();
      injectTournamentReport();
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
      const practiceEl = row.querySelector('.mem-practice');
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
  const formMsg = document.getElementById('formMsg');

  contactForm?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = contactForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    formMsg.textContent = '';
    formMsg.style.color = '';

    try {
      const res = await fetch(CONTACT_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        },
        body: new FormData(contactForm),
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

  // ── Member login & profile ────────────────────────────────
  (function initMemberAuth() {
    const MEMBER_KEY = 'bba_member';
    const MEMBER_AUTH_URL = 'https://tiwazbntxvyvwfjzcwrv.supabase.co/functions/v1/member-auth';
    const MEMBER_UPDATE_URL = 'https://tiwazbntxvyvwfjzcwrv.supabase.co/functions/v1/member-update';
    const MEMBER_RESET_URL = 'https://tiwazbntxvyvwfjzcwrv.supabase.co/functions/v1/member-reset-password';

    // ── Fill in your Firebase project config ──────────────────
    const FIREBASE_CONFIG = {
      apiKey: "AIzaSyDukICqIkHk9vjs5bXqsXdHvhnd3dvJuh4",
      authDomain: "bbabza-a26f8.firebaseapp.com",
      projectId: "bbabza-a26f8",
      storageBucket: "bbabza-a26f8.firebasestorage.app",
      messagingSenderId: "375899370376",
      appId: "1:375899370376:web:87f756905fa053da89803d",
      measurementId: "G-FTM49QZTC7"
    };
    const COUNTRY_CODE = '+91'; // India — change if needed

    let _firebaseLoaded = false;
    let _confirmationResult = null;
    let _verifiedIdToken = null;
    let _appVerifier = null;

    function getSession() {
      try { return JSON.parse(localStorage.getItem(MEMBER_KEY) || 'null'); } catch { return null; }
    }
    function isMemberLoggedIn() { return !!getSession()?.token; }

    function buildMemberModal(innerHtml) {
      document.getElementById('memberModal')?.remove();
      const overlay = document.createElement('div');
      overlay.id = 'memberModal';
      overlay.className = 'admin-modal-overlay';
      overlay.innerHTML = '<div class="admin-modal">' + innerHtml + '</div>';
      document.body.appendChild(overlay);
      overlay.addEventListener('click', function (e) { if (e.target === overlay) hideMemberModal(); });
      overlay.querySelector('.admin-modal-close')?.addEventListener('click', hideMemberModal);
      requestAnimationFrame(function () { overlay.classList.add('open'); });
      return overlay;
    }

    function hideMemberModal() {
      const overlay = document.getElementById('memberModal');
      overlay?.classList.remove('open');
      setTimeout(function () { overlay?.remove(); }, 280);
    }

    const PERSON_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>';

    function getInitials(name) {
      const parts = (name || '').trim().split(/\s+/);
      return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
    }

    function avatarHtml(session) {
      if (!session) return PERSON_ICON;
      const m = session.member || {};
      if (m.photo_url) return '<img src="' + m.photo_url + '" alt="' + (m.name || '') + '" />';
      return '<span class="mem-nav-initials">' + getInitials(m.name) + '</span>';
    }

    function injectMemberNav() {
      const navUl = document.querySelector('.main-nav ul');
      if (!navUl || navUl.querySelector('.member-nav-item')) return;
      const contactLi = navUl.querySelector('li:last-child');
      const li = document.createElement('li');
      li.className = 'member-nav-item';
      const session = getSession();
      const title = session ? 'My Profile — ' + (session.name || '') : 'Member Login';
      li.innerHTML = '<a href="#" class="member-nav-link" id="memberNavLink" title="' + title + '"><div class="member-nav-avatar">' + avatarHtml(session) + '</div></a>';
      navUl.appendChild(li);
      document.getElementById('memberNavLink').addEventListener('click', function (e) {
        e.preventDefault();
        isMemberLoggedIn() ? showProfileModal() : showLoginModal();
      });
    }

    function removeMemberNav() {
      document.querySelectorAll('.member-nav-item').forEach(function (el) { el.remove(); });
    }

    function showLoginModal() {
      const overlay = buildMemberModal(
        '<button class="admin-modal-close" aria-label="Close">&times;</button>' +
        '<div class="admin-modal-header"><span class="admin-modal-icon">&#128100;</span><h3>Member Login</h3></div>' +
        '<form id="memberLoginForm" autocomplete="off">' +
        '<div class="admin-form-group"><label for="mLoginEnr">Bar Enrollment No.</label>' +
        '<input type="text" id="mLoginEnr" placeholder="e.g. AP/001/2005" autocomplete="username" /></div>' +
        '<div class="admin-form-group"><label for="mLoginPass">Password</label>' +
        '<input type="password" id="mLoginPass" autocomplete="current-password" placeholder="Your password" /></div>' +
        '<p class="admin-error" id="memberLoginError"></p>' +
        '<button type="submit" class="admin-submit-btn">Login</button>' +
        '<p style="text-align:center;margin-top:12px;"><a href="#" id="forgotPwdLink" class="forgot-pwd-link">Forgot Password?</a></p>' +
        '</form>'
      );
      overlay.querySelector('#memberLoginForm').addEventListener('submit', handleMemberLogin);
      overlay.querySelector('#forgotPwdLink').addEventListener('click', function (e) { e.preventDefault(); showForgotStep1(); });
      document.getElementById('mLoginEnr').focus();
    }

    async function handleMemberLogin(e) {
      e.preventDefault();
      const enr = document.getElementById('mLoginEnr').value.trim();
      const pass = document.getElementById('mLoginPass').value;
      const errEl = document.getElementById('memberLoginError');
      const btn = e.target.querySelector('button[type="submit"]');
      errEl.textContent = '';
      btn.disabled = true; btn.textContent = 'Logging in…';
      try {
        const res = await fetch(MEMBER_AUTH_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY },
          body: JSON.stringify({ enrollment_no: enr, password: pass }),
        });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem(MEMBER_KEY, JSON.stringify({ token: data.token, name: data.member.name, enrollment_no: data.member.enrollment_no, member: data.member }));
          hideMemberModal();
          removeMemberNav();
          injectMemberNav();
        } else {
          errEl.textContent = data.message || 'Invalid enrollment number or password.';
          btn.disabled = false; btn.textContent = 'Login';
        }
      } catch (_) {
        errEl.textContent = 'Network error. Please try again.';
        btn.disabled = false; btn.textContent = 'Login';
      }
    }

    function showProfileModal() {
      const session = getSession();
      if (!session) return;
      const m = session.member || {};
      let pendingPhotoBase64 = null;

      const overlay = buildMemberModal(
        '<button class="admin-modal-close" aria-label="Close">&times;</button>' +
        '<div class="admin-modal-header"><span class="admin-modal-icon">&#128100;</span><h3>My Profile</h3></div>' +
        '<div class="member-profile-photo-row">' +
        '<div class="member-avatar-lg" id="mProfAvatarPreview">' +
        (m.photo_url ? '<img src="' + m.photo_url + '" alt="Photo" />' : '&#128100;') +
        '</div>' +
        '<label class="member-photo-label">Change Photo' +
        '<input type="file" id="mProfPhotoInput" accept="image/*" style="display:none;" /></label>' +
        '</div>' +
        '<form id="memberProfileForm" autocomplete="off">' +
        '<div class="admin-form-group"><label>Enrollment No.</label>' +
        '<input type="text" value="' + (m.enrollment_no || '') + '" disabled style="opacity:.55;" /></div>' +
        '<div class="admin-form-group"><label for="mProfName">Full Name</label>' +
        '<input type="text" id="mProfName" value="' + (m.name || '') + '" required /></div>' +
        '<div class="admin-form-group"><label for="mProfMobile">Mobile Number</label>' +
        '<input type="text" id="mProfMobile" value="' + (m.mobile || '') + '" placeholder="10-digit mobile" maxlength="15" /></div>' +
        '<div class="admin-form-group"><label for="mProfAddress">Address</label>' +
        '<textarea id="mProfAddress" rows="2" placeholder="Office / home address">' + (m.address || '') + '</textarea></div>' +
        '<div class="admin-form-group"><label for="mProfDesc">About / Description</label>' +
        '<textarea id="mProfDesc" rows="2" placeholder="Brief bio or specialisation">' + (m.description || '') + '</textarea></div>' +
        '<details style="margin-bottom:12px;"><summary style="font-size:13px;font-weight:700;color:rgba(255,255,255,.8);cursor:pointer;">Change Password</summary>' +
        '<div style="padding-top:10px;">' +
        '<div class="admin-form-group"><label for="mProfNewPass">New Password</label>' +
        '<input type="password" id="mProfNewPass" placeholder="Leave blank to keep current" /></div>' +
        '<div class="admin-form-group"><label for="mProfConfPass">Confirm Password</label>' +
        '<input type="password" id="mProfConfPass" placeholder="Confirm new password" /></div>' +
        '</div></details>' +
        '<p class="admin-error" id="memberProfileError"></p>' +
        '<div style="display:flex;gap:10px;">' +
        '<button type="submit" class="admin-submit-btn" style="flex:1;">Save Changes</button>' +
        '<button type="button" id="memberLogoutBtn" class="admin-submit-btn" style="background:rgba(255,255,255,.15);">Logout</button>' +
        '</div></form>'
      );
      overlay.querySelector('.admin-modal').classList.add('admin-modal--wide');
      overlay.querySelector('#memberProfileForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        const errEl = document.getElementById('memberProfileError');
        const btn = e.target.querySelector('button[type="submit"]');
        errEl.textContent = '';
        const newPass = document.getElementById('mProfNewPass').value;
        const confPass = document.getElementById('mProfConfPass').value;
        if (newPass && newPass !== confPass) { errEl.textContent = 'Passwords do not match.'; return; }
        if (newPass && newPass.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; return; }
        btn.disabled = true; btn.textContent = 'Saving…';
        const updates = {
          name: document.getElementById('mProfName').value.trim(),
          mobile: document.getElementById('mProfMobile').value.trim(),
          address: document.getElementById('mProfAddress').value.trim(),
          description: document.getElementById('mProfDesc').value.trim(),
        };
        if (pendingPhotoBase64) updates.photo_base64 = pendingPhotoBase64;
        try {
          const body = { token: session.token, updates };
          if (newPass) body.new_password = newPass;
          const res = await fetch(MEMBER_UPDATE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY },
            body: JSON.stringify(body),
          });
          const data = await res.json();
          if (data.success) {
            const updated = Object.assign({}, session.member, updates);
            if (data.photo_url) updated.photo_url = data.photo_url;
            delete updated.photo_base64;
            localStorage.setItem(MEMBER_KEY, JSON.stringify({ token: session.token, name: updates.name, enrollment_no: session.enrollment_no, member: updated }));
            hideMemberModal();
            removeMemberNav();
            injectMemberNav();
          } else {
            errEl.textContent = data.message || 'Update failed. Please try again.';
            btn.disabled = false; btn.textContent = 'Save Changes';
          }
        } catch (_) {
          errEl.textContent = 'Network error. Please try again.';
          btn.disabled = false; btn.textContent = 'Save Changes';
        }
      });
      overlay.querySelector('#memberLogoutBtn').addEventListener('click', function () {
        localStorage.removeItem(MEMBER_KEY);
        hideMemberModal();
        removeMemberNav();
        injectMemberNav();
      });
      overlay.querySelector('#mProfPhotoInput').addEventListener('change', function () {
        const file = this.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (ev) {
          pendingPhotoBase64 = ev.target.result;
          document.getElementById('mProfAvatarPreview').innerHTML = '<img src="' + ev.target.result + '" alt="Preview" />';
        };
        reader.readAsDataURL(file);
      });
      document.getElementById('mProfName').focus();
    }

    // ── Forgot Password flow ──────────────────────────────────

    function updateMemberModalContent(html) {
      const modal = document.querySelector('#memberModal .admin-modal');
      if (!modal) return;
      modal.innerHTML = html;
      modal.querySelector('.admin-modal-close')?.addEventListener('click', hideMemberModal);
    }

    function loadFirebaseSDK() {
      if (_firebaseLoaded) return Promise.resolve();
      return new Promise(function (resolve, reject) {
        function loadScript(src) {
          return new Promise(function (res, rej) {
            const s = document.createElement('script');
            s.src = src; s.onload = res; s.onerror = rej;
            document.head.appendChild(s);
          });
        }
        loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
          .then(function () { return loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js'); })
          .then(function () {
            if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
            _firebaseLoaded = true;
            resolve();
          })
          .catch(reject);
      });
    }

    function showForgotStep1() {
      updateMemberModalContent(
        '<button class="admin-modal-close" aria-label="Close">&times;</button>' +
        '<div class="admin-modal-header"><span class="admin-modal-icon">&#128272;</span><h3>Reset Password</h3></div>' +
        '<p style="font-size:13px;color:rgba(255,255,255,.75);margin-bottom:16px;">Enter your registered mobile number. An OTP will be sent to your phone.</p>' +
        '<div class="admin-form-group"><label for="mForgotMobile">Registered Mobile Number</label>' +
        '<input type="tel" id="mForgotMobile" placeholder="10-digit mobile number" maxlength="10" inputmode="numeric" /></div>' +
        '<div id="recaptcha-container"></div>' +
        '<p class="admin-error" id="forgotStep1Error"></p>' +
        '<button id="forgotSendOtpBtn" class="admin-submit-btn" style="width:100%;">Send OTP</button>' +
        '<p style="text-align:center;margin-top:12px;"><a href="#" id="backToLoginLink" class="forgot-pwd-link">← Back to Login</a></p>'
      );
      document.getElementById('forgotSendOtpBtn').addEventListener('click', handleSendOtp);
      document.getElementById('backToLoginLink').addEventListener('click', function (e) { e.preventDefault(); showLoginModal(); });
      document.getElementById('mForgotMobile').focus();
    }

    async function handleSendOtp() {
      const mobileInput = document.getElementById('mForgotMobile');
      const errEl = document.getElementById('forgotStep1Error');
      const btn = document.getElementById('forgotSendOtpBtn');
      const mobile = (mobileInput?.value || '').replace(/\D/g, '').slice(-10);
      errEl.textContent = '';
      if (mobile.length !== 10) { errEl.textContent = 'Please enter a valid 10-digit mobile number.'; return; }

      btn.disabled = true; btn.textContent = 'Checking…';
      try {
        const chkRes = await fetch(MEMBER_RESET_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operation: 'check_mobile', mobile }),
        });
        const chkData = await chkRes.json();
        if (!chkData.success || !chkData.exists) {
          errEl.textContent = 'This mobile number is not registered. Please contact the association.';
          btn.disabled = false; btn.textContent = 'Send OTP';
          return;
        }

        btn.textContent = 'Loading…';
        await loadFirebaseSDK();

        const phoneE164 = COUNTRY_CODE + mobile;
        if (!_appVerifier) {
          _appVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
            size: 'invisible',
            callback: function () { },
          });
        }
        _confirmationResult = await firebase.auth().signInWithPhoneNumber(phoneE164, _appVerifier);
        showForgotStep2(mobile);
      } catch (err) {
        errEl.textContent = 'Failed to send OTP: ' + (err.message || 'Please try again.');
        btn.disabled = false; btn.textContent = 'Send OTP';
        if (_appVerifier) { try { _appVerifier.clear(); } catch (_e) { } _appVerifier = null; }
      }
    }

    function showForgotStep2(mobile) {
      updateMemberModalContent(
        '<button class="admin-modal-close" aria-label="Close">&times;</button>' +
        '<div class="admin-modal-header"><span class="admin-modal-icon">&#128273;</span><h3>Enter OTP</h3></div>' +
        '<p style="font-size:13px;color:rgba(255,255,255,.75);margin-bottom:16px;">OTP sent to ' + COUNTRY_CODE + mobile + '. Enter the 6-digit code below.</p>' +
        '<div class="admin-form-group"><label for="mForgotOtp">OTP Code</label>' +
        '<input type="text" id="mForgotOtp" placeholder="6-digit OTP" maxlength="6" inputmode="numeric" /></div>' +
        '<p class="admin-error" id="forgotStep2Error"></p>' +
        '<button id="forgotVerifyOtpBtn" class="admin-submit-btn" style="width:100%;">Verify OTP</button>' +
        '<p style="text-align:center;margin-top:12px;"><a href="#" id="resendOtpLink" class="forgot-pwd-link">Resend OTP</a></p>'
      );
      document.getElementById('forgotVerifyOtpBtn').addEventListener('click', handleVerifyOtp);
      document.getElementById('resendOtpLink').addEventListener('click', function (e) {
        e.preventDefault();
        _confirmationResult = null;
        if (_appVerifier) { try { _appVerifier.clear(); } catch (_e) { } _appVerifier = null; }
        showForgotStep1();
      });
      document.getElementById('mForgotOtp').focus();
    }

    async function handleVerifyOtp() {
      const otpInput = document.getElementById('mForgotOtp');
      const errEl = document.getElementById('forgotStep2Error');
      const btn = document.getElementById('forgotVerifyOtpBtn');
      const code = (otpInput?.value || '').trim();
      errEl.textContent = '';
      if (!code || code.length < 4) { errEl.textContent = 'Please enter the OTP.'; return; }
      if (!_confirmationResult) { errEl.textContent = 'Session expired. Please start again.'; return; }

      btn.disabled = true; btn.textContent = 'Verifying…';
      try {
        const result = await _confirmationResult.confirm(code);
        _verifiedIdToken = await result.user.getIdToken();
        showForgotStep3();
      } catch (_err) {
        errEl.textContent = 'Invalid OTP. Please check and try again.';
        btn.disabled = false; btn.textContent = 'Verify OTP';
      }
    }

    function showForgotStep3() {
      updateMemberModalContent(
        '<button class="admin-modal-close" aria-label="Close">&times;</button>' +
        '<div class="admin-modal-header"><span class="admin-modal-icon">&#128274;</span><h3>Set New Password</h3></div>' +
        '<p style="font-size:13px;color:rgba(255,255,255,.75);margin-bottom:16px;">OTP verified. Enter your new password below.</p>' +
        '<div class="admin-form-group"><label for="mNewPassword">New Password</label>' +
        '<input type="password" id="mNewPassword" placeholder="Minimum 6 characters" /></div>' +
        '<div class="admin-form-group"><label for="mNewPasswordConf">Confirm Password</label>' +
        '<input type="password" id="mNewPasswordConf" placeholder="Repeat new password" /></div>' +
        '<p class="admin-error" id="forgotStep3Error"></p>' +
        '<button id="forgotResetBtn" class="admin-submit-btn" style="width:100%;">Reset Password</button>'
      );
      document.getElementById('forgotResetBtn').addEventListener('click', handleResetPassword);
      document.getElementById('mNewPassword').focus();
    }

    async function handleResetPassword() {
      const errEl = document.getElementById('forgotStep3Error');
      const btn = document.getElementById('forgotResetBtn');
      const newPass = document.getElementById('mNewPassword').value;
      const confPass = document.getElementById('mNewPasswordConf').value;
      errEl.textContent = '';
      if (newPass.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; return; }
      if (newPass !== confPass) { errEl.textContent = 'Passwords do not match.'; return; }
      if (!_verifiedIdToken) { errEl.textContent = 'Verification expired. Please start again.'; return; }

      btn.disabled = true; btn.textContent = 'Resetting…';
      try {
        const res = await fetch(MEMBER_RESET_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operation: 'reset', firebase_id_token: _verifiedIdToken, new_password: newPass }),
        });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem(MEMBER_KEY, JSON.stringify({ token: data.token, name: data.member.name, enrollment_no: data.member.enrollment_no, member: data.member }));
          _verifiedIdToken = null;
          _confirmationResult = null;
          hideMemberModal();
          removeMemberNav();
          injectMemberNav();
        } else {
          errEl.textContent = data.message || 'Reset failed. Please try again.';
          btn.disabled = false; btn.textContent = 'Reset Password';
        }
      } catch (_) {
        errEl.textContent = 'Network error. Please try again.';
        btn.disabled = false; btn.textContent = 'Reset Password';
      }
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') hideMemberModal();
    });

    injectMemberNav();
  })();

})();
