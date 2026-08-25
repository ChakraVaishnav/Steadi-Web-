/* ==========================================================================
   Steadi — landing page behaviour
   ========================================================================== */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- reveal on scroll ---------- */
  const revealEls = document.querySelectorAll('[data-reveal]');
  const io = new IntersectionObserver((entries) => {
    let batch = 0;
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target;
      el.style.transitionDelay = `${Math.min(batch * 80, 320)}ms`;
      el.classList.add('revealed');
      io.unobserve(el);
      batch++;
    }
  }, { threshold: 0.14, rootMargin: '0px 0px -40px 0px' });
  revealEls.forEach((el) => io.observe(el));

  /* ---------- mobile menu ---------- */
  const menuBtn = document.getElementById('menuBtn');
  const navLinks = document.getElementById('navLinks');
  const closeMenu = () => {
    menuBtn.classList.remove('open');
    navLinks.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
  };
  menuBtn.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    menuBtn.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  navLinks.addEventListener('click', (e) => {
    if (e.target.closest('a')) closeMenu();
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 720) closeMenu();
  });

  /* ---------- hero cursor glow ---------- */
  const hero = document.querySelector('.hero');
  if (hero && !reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty('--mx', `${e.clientX - r.left}px`);
      hero.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  }

  /* ---------- phone mockup: live plank simulation ---------- */
  const screen = document.getElementById('phoneScreen');
  const timerEl = document.getElementById('mockTimer');
  const cueEl = document.getElementById('cuePill');

  if (screen && timerEl && cueEl) {
    // visible-state tracking so the sim idles off-screen
    let visible = true;
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0.15 })
      .observe(screen);

    const CUES = {
      perfect: 'PERFECT FORM — HOLD IT',
      sag: 'SAGGING — HIPS UP',
      pike: 'PIKING — HIPS DOWN',
    };
    const SEQUENCE = [
      { state: 'perfect', dur: 4200 },
      { state: 'sag',     dur: 2600 },
      { state: 'perfect', dur: 3600 },
      { state: 'pike',    dur: 2600 },
      { state: 'perfect', dur: 5000 },
    ];

    const setState = (name) => {
      screen.dataset.state = name;
      cueEl.textContent = CUES[name];
    };

    const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    if (reduceMotion) {
      setState('perfect');
      timerEl.textContent = '0:47';
    } else {
      let step = 0;
      let elapsed = 0;
      setState('perfect');

      setInterval(() => {
        elapsed++;
        if (visible) timerEl.textContent = fmt(elapsed);
      }, 1000);

      const advance = () => {
        if (visible) {
          step = (step + 1) % SEQUENCE.length;
          setState(SEQUENCE[step].state);
        }
        setTimeout(advance, SEQUENCE[step].dur);
      };
      setTimeout(advance, SEQUENCE[0].dur);
    }
  }

  /* ---------- interactive spirit level ---------- */
  const levelDemo = document.getElementById('levelDemo');
  const levelTrack = document.getElementById('levelTrack');
  const levelBubble = document.getElementById('levelBubble');
  const levelStatus = document.getElementById('levelStatus');
  const levelDeg = document.getElementById('levelDeg');

  if (levelDemo && levelTrack && levelBubble && !reduceMotion) {
    const LOCK_ZONE = 0.06;
    const MAX_TILT = 11; // degrees shown on readout
    let target = 0;
    let current = 0;
    let rafId = null;

    const render = () => {
      current += (target - current) * 0.14;
      if (Math.abs(target - current) < 0.05) current = target;

      const maxPx = levelTrack.clientWidth / 2 - 22;
      levelBubble.style.transform = `translateX(${(current * maxPx).toFixed(2)}px)`;

      const locked = Math.abs(current) < LOCK_ZONE;
      const pos = Math.max(-1, Math.min(1, current));
      levelBubble.classList.toggle('drift', !locked);
      levelStatus.classList.toggle('drift', !locked);
      levelStatus.textContent = locked
        ? 'LOCKED · DEAD CENTER'
        : `DRIFTING ${pos < 0 ? 'LEFT' : 'RIGHT'} — STEADY…`;
      levelDeg.textContent = `${(pos * MAX_TILT).toFixed(1)}°`;

      if (current !== target || Math.abs(current) >= LOCK_ZONE) {
        rafId = requestAnimationFrame(render);
      } else {
        rafId = null;
      }
    };

    const kick = () => { if (rafId === null) rafId = requestAnimationFrame(render); };

    const onMove = (e) => {
      const r = levelTrack.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const pos = Math.max(-1, Math.min(1, ((clientX - r.left) / r.width) * 2 - 1));
      target = Math.abs(pos) < LOCK_ZONE ? 0 : pos;
      kick();
    };

    levelDemo.addEventListener('pointermove', onMove);
    levelDemo.addEventListener('pointerleave', () => { target = 0; kick(); });
    levelTrack.addEventListener('touchmove', onMove, { passive: true });
  }

  /* ---------- copy checksum ---------- */
  const copyBtn = document.getElementById('copyHash');
  const fullHash = document.getElementById('fullHash');
  if (copyBtn && fullHash) {
    copyBtn.addEventListener('click', async () => {
      const text = fullHash.textContent.trim();
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      copyBtn.textContent = 'Copied ✓';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1600);
    });
  }

  /* ---------- live APK size (falls back to hardcoded value offline) ---------- */
  document.querySelectorAll('[data-apk-size]').forEach(async (el) => {
    try {
      const res = await fetch('assets/apk/steadi-v1.0.apk', { method: 'HEAD' });
      if (!res.ok) return;
      const mb = parseInt(res.headers.get('content-length'), 10) / (1024 * 1024);
      if (!Number.isFinite(mb)) return;
      const label = `${Math.round(mb)} MB`;
      if (/v1\.0/.test(el.textContent)) {
        el.textContent = el.textContent.replace(/[\d.]+\s*MB/, label);
      } else {
        el.textContent = label;
      }
    } catch { /* file:// or blocked — hardcoded value stays */ }
  });
})();
