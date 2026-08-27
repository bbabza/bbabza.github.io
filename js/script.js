/* Bezwada Bar Association — Main Script */

(function () {
  'use strict';

  // Root path prefix — set via data-root on <body> for subfolder pages
  const ROOT = document.body.getAttribute('data-root') || '';

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
  const tableRows    = document.querySelectorAll('#membersTable tbody tr');

  function filterMembers() {
    const query  = (searchInput?.value || '').toLowerCase().trim();
    const area   = (filterSelect?.value || '').toLowerCase();

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
