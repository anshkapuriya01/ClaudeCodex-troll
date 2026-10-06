/* Home screen — redesigned by Claude */
(() => {
  'use strict';
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Count-up for the "UX rules broken" pill */
  const broken = document.getElementById('broken');
  if (reduced) broken.textContent = '20';
  else {
    let n = 0;
    const id = setInterval(() => { broken.textContent = String(++n); if (n >= 20) clearInterval(id); }, 70);
  }

  /* Your record on each side, from what each game stores in this browser */
  const records = {
    claude: () => {
      const done = read('troll-claude-result');
      if (done) return `<b>Survived</b> · ${mmss(done.seconds || 0)} · trolled ${done.mistakes || 0}×`;
      const p = read('claude-troll-v1');
      if (p && p.level > 0 && p.level < 10) return `<b>In progress</b> · level ${p.level + 1} of 10`;
      return null;
    },
    codex: () => {
      const done = read('troll-codex-result');
      if (done) return `<b>Survived</b> · ${mmss(done.seconds || 0)} · trolled ${done.mistakes || 0}×`;
      const p = read('codex-troll-progress-v1');
      if (p && p.level > 0 && !p.complete) return `<b>In progress</b> · level ${p.level + 1} of 10`;
      return null;
    },
  };
  document.querySelectorAll('[data-record]').forEach((el) => {
    const html = records[el.dataset.record]();
    if (html) el.innerHTML = html;
  });

  /* The illustration leans toward whichever side you're considering */
  const arena = document.getElementById('arena');
  document.querySelectorAll('.fighter').forEach((f) => {
    const lean = () => { arena.dataset.lean = f.dataset.side; };
    const unlean = () => { delete arena.dataset.lean; };
    f.addEventListener('mouseenter', lean);
    f.addEventListener('focus', lean);
    f.addEventListener('mouseleave', unlean);
    f.addEventListener('blur', unlean);
  });

  /* Can't decide? Let fate (Math.random) pick */
  const dice = document.getElementById('dice');
  dice.addEventListener('click', () => {
    if (dice.classList.contains('rolling')) return;
    dice.classList.add('rolling');
    const fighters = [...document.querySelectorAll('.fighter')];
    let i = 0;
    const flips = 7 + Math.floor(Math.random() * 2);
    const tick = () => {
      const f = fighters[i % 2];
      fighters.forEach((x) => x.classList.toggle('picked', x === f));
      arena.dataset.lean = f.dataset.side;
      if (++i < flips) setTimeout(tick, 90 + i * 25);
      else setTimeout(() => { location.href = f.getAttribute('href'); }, 700);
    };
    tick();
  });
  // Coming back via the back button: clear any leftover pick state
  addEventListener('pageshow', () => {
    dice.classList.remove('rolling');
    document.querySelectorAll('.fighter').forEach((x) => x.classList.remove('picked'));
    delete arena.dataset.lean;
  });

  /* The cookie banner for a site with no cookies. Both buttons agree with you. */
  const cookie = document.getElementById('cookie');
  let dismissed = false;
  try { dismissed = localStorage.getItem('home-cookie-ack') === '1'; } catch { /* no storage, no memory */ }
  if (!dismissed) setTimeout(() => { cookie.hidden = false; }, 1800);
  cookie.querySelectorAll('[data-cookie]').forEach((b) => b.addEventListener('click', () => {
    cookie.querySelector('p').textContent = 'Noted. In localStorage. Not a cookie. Technically.';
    cookie.querySelector('.cookie-actions').remove();
    try { localStorage.setItem('home-cookie-ack', '1'); } catch { /* fine */ }
    setTimeout(() => { cookie.hidden = true; }, 1600);
  }));
})();
