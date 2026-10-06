/* =============================================================
   MADE BY CLAUDE — 10 levels, every UX rule broken, UI kept clean.
   Vanilla JS, no build step.
   ============================================================= */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const fmt = (ms) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  /* ---------------- persistent state ---------------- */
  const KEY = 'claude-troll-v1';
  const RESULT_KEY = 'troll:result:claude';
  const TOTAL = 10;
  const fresh = () => ({ level: 0, elapsed: 0, clicks: 0, fails: 0, rage: 0, levels: [] });
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch { return fresh(); } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode: suffer without saves */ } };
  let state = load();

  const qsLevel = parseInt(new URLSearchParams(location.search).get('level'), 10);
  if (qsLevel >= 1 && qsLevel <= TOTAL) state.level = qsLevel - 1;

  /* ---------------- DOM refs ---------------- */
  const card = $('#card'), body = $('#body'), titleEl = $('#title'), instrEl = $('#instruction'), eyebrow = $('#eyebrow');
  const progressEl = $('#progress'), timerEl = $('#timer'), toastsEl = $('#toasts');
  const clearedEl = $('#cleared'), clearedText = $('#clearedText'), clearedSub = $('#clearedSub');

  /* ---------------- per-level resource tracking ---------------- */
  let disposers = [];
  const on = (t, ev, fn, opts) => { t.addEventListener(ev, fn, opts); disposers.push(() => t.removeEventListener(ev, fn, opts)); };
  const later = (fn, ms) => { const id = setTimeout(fn, ms); disposers.push(() => clearTimeout(id)); return id; };
  const every = (fn, ms) => { const id = setInterval(fn, ms); disposers.push(() => clearInterval(id)); return id; };
  const frame = (fn) => { let id = requestAnimationFrame(function loop(t) { if (fn(t) !== false) id = requestAnimationFrame(loop); }); disposers.push(() => cancelAnimationFrame(id)); };
  const dispose = () => { disposers.forEach((d) => d()); disposers = []; };

  /* ---------------- toasts ---------------- */
  const toast = (msg, kind = '', ms = 2600) => {
    const t = document.createElement('div');
    t.className = `toast ${kind}`;
    t.textContent = msg;
    toastsEl.appendChild(t);
    while (toastsEl.children.length > 3) toastsEl.firstChild.remove();
    setTimeout(() => { t.classList.add('leave'); setTimeout(() => t.remove(), 300); }, ms);
  };

  let levelFails = 0, levelStart = 0, levelDone = false, helpCount = 0, skipCount = 0;
  const fail = (msg) => {
    state.fails++; levelFails++; save();
    toast(msg, 'bad', 3200);
    card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
  };

  /* ---------------- global stats: clicks + rage ---------------- */
  let clickTimes = [], lastRageToast = 0;
  document.addEventListener('pointerdown', () => {
    state.clicks++;
    const now = performance.now();
    clickTimes = clickTimes.filter((t) => now - t < 700);
    clickTimes.push(now);
    if (clickTimes.length >= 4) {
      state.rage++; clickTimes = [];
      if (now - lastRageToast > 9000) { lastRageToast = now; toast('Rage-click detected. Logged for science. 🧪'); }
    }
  }, true);

  setInterval(() => {
    if (!document.hidden && state.level < TOTAL) { state.elapsed += 1000; timerEl.textContent = fmt(state.elapsed); save(); }
  }, 1000);
  timerEl.textContent = fmt(state.elapsed);

  /* ---------------- header trolls ---------------- */
  const helpTips = [
    'Have you tried turning the level off and on again?',
    'Help is on vacation 🏖️ Back in 3–5 business years.',
    'Tip: blinking increases your success rate by 0%.',
    'The answer is on this page. Probably.',
    'Our support team has been notified. They laughed.',
  ];
  $('#helpBtn').addEventListener('click', () => {
    helpCount++;
    if (helpCount >= 3) { toast(`Fine. Real hint: ${LEVELS[state.level]?.hint ?? 'you already won.'}`, 'good', 6000); helpCount = 0; }
    else toast(pick(helpTips));
  });
  const skipLines = [
    'Skipping is a Premium feature ✨',
    'Premium costs $49.99/mo. Or one (1) soul.',
    'We checked. Your soul is not eligible.',
    'Still no.',
    'Okay okay. Skipping…',
  ];
  $('#skipBtn').addEventListener('click', () => {
    if (state.level >= TOTAL) return;
    const line = skipLines[Math.min(skipCount, skipLines.length - 1)];
    skipCount++;
    toast(line);
    if (line.endsWith('…')) {
      later(() => toast('Skip failed successfully. 🎉 Level restarted for free.', 'good'), 1600);
      later(() => { skipCount = 0; render(); }, 2400);
    }
  });

  /* ---------------- progress dots ---------------- */
  const drawProgress = () => {
    progressEl.innerHTML = '';
    for (let i = 0; i < TOTAL; i++) {
      const d = document.createElement('i');
      if (i < state.level) d.className = 'done';
      else if (i === state.level) d.className = 'now';
      progressEl.appendChild(d);
    }
  };

  /* ---------------- level flow ---------------- */
  const complete = (sub = '') => {
    if (levelDone) return;
    levelDone = true;
    dispose();
    state.levels[state.level] = { title: LEVELS[state.level].name, timeMs: Date.now() - levelStart, fails: levelFails };
    state.level++;
    save();
    clearedText.textContent = state.level >= TOTAL ? 'Game cleared' : `Level ${state.level} cleared`;
    clearedSub.textContent = sub || pick(['Somehow.', 'Against all odds.', 'We are as surprised as you.', 'Don’t get used to it.', 'Statistically impressive.']);
    clearedEl.hidden = false;
    // restart the svg animation
    const svg = clearedEl.querySelector('svg'); svg.replaceWith(svg.cloneNode(true));
    setTimeout(() => {
      card.classList.add('out');
      setTimeout(() => { clearedEl.hidden = true; card.classList.remove('out'); render(); }, 350);
    }, 1300);
  };

  const render = () => {
    dispose();
    drawProgress();
    levelDone = false; levelFails = 0; levelStart = Date.now(); helpCount = 0;
    body.innerHTML = '';
    body.style.minHeight = '';
    card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
    if (state.level >= TOTAL) return finale();
    const L = LEVELS[state.level];
    const n = state.level + 1;
    eyebrow.textContent = n === TOTAL ? 'Level 10 of 10 (probably)' : n === 7 ? 'Level 7 of 10 · halfway there' : `Level ${n} of 10`;
    titleEl.innerHTML = L.title;
    instrEl.innerHTML = L.instr;
    document.title = `Level ${n} · Made by Claude`;
    L.mount(body);
  };

  /* =============================================================
     THE LEVELS
     ============================================================= */
  const LEVELS = [

    /* ---------- 1. The shy button ---------- */
    {
      name: 'The shy button',
      title: 'Click <em>Continue</em>.',
      instr: 'That’s it. That’s the whole level. Click Continue to <span class="secret" id="secret">continue</span>.',
      hint: 'the word “continue” in the instructions is clickable. Or just exhaust the button.',
      mount(root) {
        root.innerHTML = `<div class="arena" id="arena"><button class="btn accent runner" id="run">Continue →</button></div>`;
        const arena = $('#arena', root), btn = $('#run', root);
        let dodges = 0, tired = false, justDodged = false;
        const MAX = 14;
        const place = (x, y) => { btn.style.left = `${x}px`; btn.style.top = `${y}px`; };
        const W = () => arena.clientWidth, H = () => arena.clientHeight;
        place((W() - btn.offsetWidth) / 2, (H() - btn.offsetHeight) / 2);

        const dodge = (cx, cy) => {
          dodges++;
          let best = null;
          for (let i = 0; i < 24; i++) {
            const x = rand(8, Math.max(8, W() - btn.offsetWidth - 8));
            const y = rand(8, Math.max(8, H() - btn.offsetHeight - 8));
            const d = Math.hypot(x + btn.offsetWidth / 2 - cx, y + btn.offsetHeight / 2 - cy);
            if (!best || d > best.d) best = { x, y, d };
            if (d > 180) break;
          }
          place(best.x, best.y);
          const lines = { 3: 'Nope.', 6: 'Too slow 🐢', 9: 'Have you considered giving up?', 12: 'I can do this all day.' };
          if (lines[dodges]) toast(lines[dodges]);
          if (dodges >= MAX) { tired = true; btn.textContent = 'ok fine. I’m tired 😮‍💨'; }
        };

        on(arena, 'mousemove', (e) => {
          if (tired) return;
          const r = arena.getBoundingClientRect();
          const mx = e.clientX - r.left, my = e.clientY - r.top;
          const bx = btn.offsetLeft + btn.offsetWidth / 2, by = btn.offsetTop + btn.offsetHeight / 2;
          if (Math.abs(mx - bx) < btn.offsetWidth / 2 + 40 && Math.abs(my - by) < btn.offsetHeight / 2 + 40) dodge(mx, my);
        });
        on(btn, 'pointerdown', (e) => {
          if (tired || e.pointerType === 'mouse') return;
          if (dodges < 6) { justDodged = true; const r = arena.getBoundingClientRect(); dodge(e.clientX - r.left, e.clientY - r.top); }
        });
        on(btn, 'click', (e) => {
          if (justDodged) { justDodged = false; return; }
          complete(e.detail === 0 ? 'Keyboard user detected. Respect. ⌨️' : '');
        });
        on($('#secret'), 'click', () => complete('Reading the instructions? Smartypants.'));
      },
    },

    /* ---------- 2. Terms & Conditions ---------- */
    {
      name: 'Terms & Conditions',
      title: 'Accept the <em>terms</em>.',
      instr: 'Agree to the Terms. Do <b>not</b> sign up for any emails. Read carefully — legally, we can tell.',
      hint: 'scroll is inverted. Then: check box 1, keep box 2 checked, leave box 3 empty, and press the grey “Accept”.',
      mount(root) {
        const sections = [
          ['1. Acceptance', 'By reading this sentence you have already agreed to sentence two. By reading sentence two, you agree you have read sentence one.'],
          ['2. Your data', 'We collect your data, your neighbours’ data, and a vibe. Data may be used to train a model that judges your font choices.'],
          ['3. Scrolling', 'Scrolling direction is a privilege, not a right. Management reserves the right to reverse it at any time, including now.'],
          ['4. Liability', 'We are not liable for lost time, lost patience, or any keyboards thrown across rooms during the use of this product.'],
          ['5. Termination', 'We may terminate this agreement whenever. You may terminate it never. See section 9 for section 9.'],
          ['6. Cookies', 'This agreement contains cookies. They are not edible. We checked.'],
          ['7. Arbitration', 'Disputes shall be settled by a single game of rock-paper-scissors, best of one, refereed by us.'],
          ['8. Changes', 'We may update these terms while you read them. You will not be notified, except right now.'],
          ['9. Section 9', 'See section 9.'],
        ];
        const addendum = [
          ['10. Addendum', 'Surprise. This section did not exist a second ago.'],
          ['11. Addendum to the addendum', 'Scrolling to the bottom twice constitutes a legally binding high-five.'],
          ['12. Final clause', 'Okay that’s actually everything. You may now pretend you read it.'],
        ];
        const toHtml = (arr) => arr.map(([h, p]) => `<h4>${h}</h4><p>${p}</p>`).join('');
        root.innerHTML = `
          <div class="tos" id="tos">${toHtml(sections)}</div>
          <div class="checks locked" id="checks">
            <label class="check-row"><input type="checkbox" id="c1"> <span>I don’t disagree with not accepting the Terms being a bad idea.</span></label>
            <label class="check-row"><input type="checkbox" id="c2" checked> <span>Uncheck this box if you would not like to not receive our emails.</span></label>
            <label class="check-row"><input type="checkbox" id="c3"> <span>Check this box to not opt out of our daily newsletter.</span></label>
          </div>
          <p class="tiny muted" id="lockMsg">Checkboxes unlock once you’ve “read” everything.</p>
          <div class="row end">
            <button class="btn meh" id="accept">Accept</button>
            <button class="btn accent" id="decline">Decline</button>
          </div>`;
        const tos = $('#tos', root), checks = $('#checks', root), lockMsg = $('#lockMsg', root);
        let added = false, unlocked = false, warned = false;
        on(tos, 'wheel', (e) => {
          e.preventDefault();
          tos.scrollTop -= e.deltaY;
          if (!warned) { warned = true; toast('Scrolling feels weird? That’s section 3.'); }
        }, { passive: false });
        on(tos, 'scroll', () => {
          if (tos.scrollTop + tos.clientHeight < tos.scrollHeight - 4) return;
          if (!added) { added = true; tos.insertAdjacentHTML('beforeend', toHtml(addendum)); toast('📜 New terms were added while you were reading.'); return; }
          if (!unlocked) { unlocked = true; checks.classList.remove('locked'); lockMsg.textContent = 'Unlocked. Choose wisely.'; }
        });
        on($('#decline', root), 'click', () => {
          fail('Declined. Your reading progress has been declined too.');
          tos.scrollTop = 0; unlocked = false; checks.classList.add('locked');
          lockMsg.textContent = 'Checkboxes unlock once you’ve “read” everything. Again.';
        });
        on($('#accept', root), 'click', () => {
          if (!unlocked) return fail('Read the terms first. We can tell you didn’t.');
          // c1: double-negative agree → checked. c2: "uncheck if you WANT emails" → stays checked. c3: checking = subscribing → unchecked.
          const wrong = [!$('#c1', root).checked, !$('#c2', root).checked, $('#c3', root).checked].filter(Boolean).length;
          if (wrong === 0) complete('You are now legally bound to finish this game.');
          else fail(`${wrong} of 3 boxes say otherwise. You just subscribed to ${wrong * 4} newsletters.`);
        });
      },
    },

    /* ---------- 3. Password ---------- */
    {
      name: 'The password',
      title: 'Create a <em>password</em>.',
      instr: 'Something secure. We’ll let you know the rules as you break them.',
      hint: 'e.g. Claude56October4! — adapt the month to the current one, digits must sum to 15, length must be prime. Type the confirmation by hand.',
      mount(root) {
        const month = new Date().toLocaleString('en-US', { month: 'long' });
        const isPrime = (n) => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
        const digitSum = (s) => [...s].filter((c) => /\d/.test(c)).reduce((a, c) => a + +c, 0);
        const rules = [
          [(p) => p.length >= 8, () => 'Must be at least 8 characters.'],
          [(p) => /[A-Z]/.test(p), () => 'Must include an uppercase letter.'],
          [(p) => /\d/.test(p), () => 'Must include a number.'],
          [(p) => p.includes('56'), () => 'Must include the answer to 7 × 8.'],
          [(p) => digitSum(p) === 15, (p) => `The digits must add up to 15. (Currently ${digitSum(p)}.)`],
          [(p) => p.toLowerCase().includes(month.toLowerCase()), () => 'Must include the current month.'],
          [(p) => /claude/i.test(p), () => 'Must include the name of whoever made this game.'],
          [(p) => isPrime(p.length), (p) => `Length must be a prime number. (Currently ${p.length}.)`],
          [(p) => p.endsWith('!'), () => 'Must end with an exclamation mark, because you sound excited!'],
        ];
        root.innerHTML = `
          <label class="lbl" for="pw">New password</label>
          <input class="field mirror" id="pw" type="text" autocomplete="off" spellcheck="false" placeholder="Type something secure">
          <ul class="rules" id="rules"></ul>
          <div id="confirmWrap" hidden>
            <div class="spacer"></div>
            <label class="lbl" for="pw2">Confirm password</label>
            <input class="field" id="pw2" type="password" autocomplete="off" placeholder="Retype it. By hand.">
            <div class="spacer"></div>
            <button class="btn block" id="create">Create password</button>
          </div>`;
        const pw = $('#pw', root), list = $('#rules', root), wrap = $('#confirmWrap', root), pw2 = $('#pw2', root);
        let shown = 0, mirrorWarned = false;
        const update = () => {
          const p = pw.value;
          if (!mirrorWarned && p.length > 2) { mirrorWarned = true; toast('Text looks backwards? It’s for privacy. Obviously.'); }
          if (!p) { list.innerHTML = ''; shown = 0; wrap.hidden = true; return; }
          let firstFail = rules.findIndex(([test]) => !test(p));
          const visible = firstFail === -1 ? rules.length : firstFail + 1;
          shown = Math.max(shown, visible);
          list.innerHTML = rules.slice(0, shown).map(([test, msg], i) =>
            `<li class="rule ${test(p) ? 'ok' : 'no'}"><b>${String(i + 1).padStart(2, '0')}</b>${msg(p)}</li>`).reverse().join('');
          wrap.hidden = rules.some(([test]) => !test(p));
        };
        on(pw, 'input', update);
        const block = (e) => { e.preventDefault(); toast('Pasting is for robots. Type it like a human. 🤖🚫', 'bad'); };
        on(pw2, 'paste', block); on(pw2, 'drop', block);
        on($('#create', root), 'click', () => {
          if (pw2.value === pw.value) complete('Password saved in plain text. Kidding. Mostly.');
          else fail('Passwords don’t match. Remember: the first one was mirrored. You weren’t.');
        });
      },
    },

    /* ---------- 4. The social PIN ---------- */
    {
      name: 'The PIN pad',
      title: 'Enter the PIN <em class="target">1337</em>.',
      instr: 'Tap a digit to increase it. Simple.',
      hint: 'tapping a digit also bumps its neighbours. From 0000: tap digit 1 ×5, digit 2 ×6, digit 3 ×2, digit 4 ×5.',
      mount(root) {
        const target = '1337';
        let d = [0, 0, 0, 0], moves = 0, hintN = 0;
        root.innerHTML = `
          <div class="pin" id="pin">${d.map((_, i) => `<button class="digit" data-i="${i}">0</button>`).join('')}</div>
          <div class="row" style="justify-content:space-between">
            <span class="tiny muted" id="moves">Moves: 0</span>
            <div class="row">
              <button class="btn ghost" id="hint">Hint</button>
              <button class="btn ghost" id="reset">Reset</button>
            </div>
          </div>`;
        const btns = $$('.digit', root);
        const paint = (changed = []) => {
          btns.forEach((b, i) => { b.textContent = d[i]; if (changed.includes(i)) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); } });
          $('#moves', root).textContent = `Moves: ${moves}`;
        };
        btns.forEach((b) => on(b, 'click', () => {
          if (levelDone) return;
          const i = +b.dataset.i, changed = [i - 1, i, i + 1].filter((j) => j >= 0 && j < 4);
          changed.forEach((j) => { d[j] = (d[j] + 1) % 10; });
          moves++; paint(changed);
          if (moves === 3) toast('The digits are… social. They like to bring friends.');
          if (d.join('') === target) later(() => complete(`${moves} moves. Elite hacker vibes.`), 350);
        }));
        on($('#reset', root), 'click', () => { d = [9, 9, 9, 9]; moves = 0; paint([0, 1, 2, 3]); toast('Reset complete ✅'); });
        const hints = ['Have you tried entering 1337?', 'Hint: the PIN is 1337.', 'Think outside the digit.', 'Neighbours. That’s the hint. Neighbours.'];
        on($('#hint', root), 'click', () => toast(hints[hintN++ % hints.length]));
      },
    },

    /* ---------- 5. Cookie banner ---------- */
    {
      name: 'The cookie banner',
      title: 'Reject the <em>cookies</em>.',
      instr: 'Turn off every non-essential cookie and confirm. You know how these work.',
      hint: '“Manage preferences” → toggles are inverted (green = disabled). Turn Personalization off BEFORE Analytics. Open the Legitimate interest section too. Then “Confirm my choices”.',
      mount(root) {
        const cats = [
          { id: 'ess', name: 'Strictly necessary', desc: 'Required. Allegedly.', on: true, locked: true },
          { id: 'ana', name: 'Analytics', desc: 'Counts how many times you sigh.', on: true },
          { id: 'mkt', name: 'Marketing', desc: 'Follows you to other websites. Lovingly.', on: true },
          { id: 'per', name: 'Personalization', desc: 'Personalizes how you’re tracked.', on: true },
          { id: 'sell', name: 'Selling your data', desc: 'Strictly for fun. And profit.', on: true },
        ];
        const li = [
          { id: 'geo', name: 'Precise geolocation', desc: 'Legitimately interesting.', on: true },
          { id: 'ads', name: 'Measure ad performance', desc: 'Legitimately interested.', on: true },
          { id: 'dev', name: 'Develop & improve products', desc: 'Legitimately… whatever.', on: true },
        ];
        const all = [...cats, ...li];
        root.innerHTML = `
          <div class="site">
            <div class="site-bar"><i></i><i></i><i></i></div>
            <div class="site-content"><div class="skeleton" style="width:60%"></div><div class="skeleton" style="width:90%"></div><div class="skeleton" style="width:75%"></div><div class="skeleton" style="width:40%"></div></div>
            <div class="cookie" id="cookie">
              <p>We value your privacy 🍪 (financially). We and our <b>847 partners</b> use cookies to improve your experience of being tracked.</p>
              <div class="row">
                <button class="btn accent" id="acceptAll">Accept all</button>
                <button class="btn" id="accept">Accept</button>
                <button class="link tiny muted" id="manage">Manage preferences</button>
              </div>
            </div>
          </div>`;
        const cookie = $('#cookie', root);
        const yum = () => fail(pick(['Yum. Cookies accepted. That’s the opposite of the task.', '🍪 Nom nom. 847 partners thank you.', 'Accepted! Your data is already on a boat.']));
        on($('#acceptAll', root), 'click', yum);
        on($('#accept', root), 'click', yum);
        const row = (c) => `
          <div class="tg"><div>${c.name}<small>${c.desc}</small></div>
          <div class="row" style="flex-wrap:nowrap"><span class="tg-state" data-s="${c.id}"></span><button class="switch" data-id="${c.id}" ${c.locked ? 'disabled' : ''} aria-label="${c.name}"></button></div></div>`;
        on($('#manage', root), 'click', () => {
          cookie.innerHTML = `
            <div class="toggles">${cats.map(row).join('')}
              <details class="li"><summary>Legitimate interest (it’s legit, trust us) ›</summary>${li.map(row).join('')}</details>
            </div>
            <div class="row">
              <button class="btn accent" id="acceptAll2">Accept all</button>
              <button class="btn ghost" id="saveAll">Save &amp; accept all</button>
            </div>
            <div style="text-align:right;margin-top:8px"><button class="link tiny muted" id="confirm">Confirm my choices</button></div>`;
          const paint = () => all.forEach((c) => {
            const sw = $(`.switch[data-id="${c.id}"]`, cookie);
            sw.className = `switch ${c.on ? 'on' : 'off'}`;
            $(`[data-s="${c.id}"]`, cookie).textContent = c.on ? 'Enabled' : 'Disabled';
          });
          paint();
          $$('.switch', cookie).forEach((sw) => on(sw, 'click', () => {
            const c = all.find((x) => x.id === sw.dataset.id);
            if (c.locked) return;
            c.on = !c.on;
            if (c.id === 'per' && !c.on) {
              const ana = all.find((x) => x.id === 'ana');
              if (!ana.on) { ana.on = true; toast('Analytics re-enabled to personalize your experience of disabling personalization.'); }
            }
            if (c.id === 'mkt' && !c.on) toast('Our marketing team has families, you know.');
            paint();
          }));
          on($('#acceptAll2', cookie), 'click', yum);
          on($('#saveAll', cookie), 'click', () => fail('It literally said “accept all”. Read the label. 🍪'));
          on($('#confirm', cookie), 'click', () => {
            const left = all.filter((c) => !c.locked && c.on).length;
            if (left === 0) complete('Rejected. 847 partners are crying.');
            else fail(`${left} cookie${left > 1 ? 's are' : ' is'} still enabled. Green means off here, obviously.`);
          });
        });
      },
    },

    /* ---------- 6. CAPTCHA + patience ---------- */
    {
      name: 'Prove you’re human',
      title: 'Prove you’re <em>human</em>.',
      instr: 'Standard procedure. Totally normal. Nothing weird is going to happen.',
      hint: '🚥 is also a traffic light. Then do absolutely nothing — don’t move the mouse — for 8 seconds.',
      mount(root) {
        root.innerHTML = `
          <div class="captcha" id="cap"><button class="cbox" id="cbox" aria-label="I'm not a robot"></button><span>I’m not a robot</span></div>`;
        const cbox = $('#cbox', root);
        on(cbox, 'click', () => {
          cbox.classList.add('spin');
          later(grid, 1300);
        }, { once: true });

        function grid() {
          const pool = ['🚦', '🚥', '🚗', '🌳', '🚦', '🚲', '🚥', '🏠', '🚌'];
          let tiles = shuffle(pool), sel = new Set();
          const draw = () => {
            root.innerHTML = `
              <p style="margin:0"><b>Select all squares with traffic lights.</b><br><span class="tiny muted">If there are none, click verify. There are some.</span></p>
              <div class="grid9">${tiles.map((t, i) => `<button class="tile" data-i="${i}">${t}</button>`).join('')}</div>
              <div class="row end"><button class="btn" id="verify">Verify</button></div>`;
            $$('.tile', root).forEach((b) => on(b, 'click', () => {
              const i = +b.dataset.i;
              sel.has(i) ? sel.delete(i) : sel.add(i);
              b.classList.toggle('sel');
            }));
            on($('#verify', root), 'click', () => {
              const want = tiles.map((t, i) => (t === '🚦' || t === '🚥' ? i : -1)).filter((i) => i >= 0);
              const ok = want.length === sel.size && want.every((i) => sel.has(i));
              if (ok) return patience();
              const gotVertical = tiles.every((t, i) => t !== '🚦' || sel.has(i));
              fail(gotVertical ? '🚥 is a traffic light too. It’s just lying down. Respect its choices.' : 'That’s exactly what a robot would select.');
              dispose(); tiles = shuffle(pool); sel = new Set(); draw();
            });
          };
          draw();
        }

        function patience() {
          dispose();
          const LEN = 8000, C = 2 * Math.PI * 70;
          root.innerHTML = `
            <div class="patience">
              <p style="margin:0 0 14px"><b>Final check.</b> Humans are impatient. Robots aren’t.<br><span class="muted">Prove you’re human by… not touching anything for 8 seconds.</span></p>
              <div class="ring">
                <svg viewBox="0 0 160 160"><circle cx="80" cy="80" r="70" stroke="#e7e4dc"/><circle id="arc" cx="80" cy="80" r="70" stroke="#d97757" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}"/></svg>
                <span class="big" id="sec">8</span>
              </div>
            </div>`;
          const arc = $('#arc', root), sec = $('#sec', root);
          let start = performance.now(), lastToast = 0, moved = 0, armed = false;
          later(() => { armed = true; start = performance.now(); }, 400);
          const lines = ['You moved. Humans can sit still, right?', 'Hands. Off. The. Mouse.', 'A robot would’ve waited. Just saying.', 'Breathe. Then don’t move.', 'Patience is a virtue. You have neither.'];
          const reset = () => {
            if (!armed || levelDone) return;
            start = performance.now();
            const now = performance.now();
            if (now - lastToast > 1600) { lastToast = now; toast(pick(lines)); }
          };
          ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => on(document, ev, reset, { passive: true }));
          on(document, 'mousemove', (e) => { moved += Math.abs(e.movementX) + Math.abs(e.movementY); if (moved > 6) { moved = 0; reset(); } });
          frame((now) => {
            const t = armed ? Math.min(LEN, now - start) : 0;
            arc.setAttribute('stroke-dashoffset', String(C * (1 - t / LEN)));
            sec.textContent = Math.ceil((LEN - t) / 1000);
            if (t >= LEN) { complete('Suspiciously patient. Welcome, fellow human. 🤖'); return false; }
          });
        }
      },
    },

    /* ---------- 7. Today's date ---------- */
    {
      name: 'Today’s date',
      title: 'Enter <em>today’s</em> date.',
      instr: 'For verification purposes. We definitely don’t know what day it is.',
      hint: 'pick the month FIRST (changing it resets the day). Months are alphabetical, days are shuffled, and you can type “2026” on the year dropdown.',
      mount(root) {
        const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const monthOpts = [...MONTHS.map((m, i) => [m, i]), ['Smarch', -1]].sort((a, b) => a[0].localeCompare(b[0]));
        const days = shuffle(Array.from({ length: 31 }, (_, i) => i + 1));
        const years = Array.from({ length: 2000 }, (_, i) => 2999 - i);
        root.innerHTML = `
          <div class="date3">
            <div><label class="lbl" for="dd">Day</label><select class="field" id="dd"><option value="">Day</option>${days.map((d) => `<option>${d}</option>`).join('')}</select></div>
            <div><label class="lbl" for="mm">Month</label><select class="field" id="mm"><option value="">Month</option>${monthOpts.map(([m, i]) => `<option value="${i}">${m}</option>`).join('')}</select></div>
            <div><label class="lbl" for="yy">Year</label><select class="field" id="yy"><option value="">Year</option>${years.map((y) => `<option>${y}</option>`).join('')}</select></div>
          </div>
          <button class="btn block" id="go">Confirm date</button>`;
        const dd = $('#dd', root), mm = $('#mm', root), yy = $('#yy', root);
        let resetWarned = false;
        on(mm, 'change', () => {
          if (!dd.value) return;
          dd.value = String(rand(1, 31));
          if (!resetWarned) { resetWarned = true; toast('Day reset for your convenience. You’re welcome.'); }
        });
        on($('#go', root), 'click', () => {
          const now = new Date();
          if (mm.value === '-1') return fail('Smarch is cancelled. Lousy Smarch weather.');
          if (!dd.value || !mm.value || !yy.value) return fail('All fields are required. Even the annoying ones.');
          if (+dd.value === now.getDate() && +mm.value === now.getMonth() && +yy.value === now.getFullYear()) complete('Correct! We’ll forget it immediately.');
          else fail(`That’s not today. Did the day reset on you? 👀`);
        });
      },
    },

    /* ---------- 8. Hold to continue ---------- */
    {
      name: 'Hold to continue',
      title: 'Hold to <em>continue</em>.',
      instr: 'Press and hold the button until it’s done. It’s a progress bar. You can trust progress bars.',
      hint: 'ignore the 99%. Keep holding for a full 7 seconds.',
      mount(root) {
        root.innerHTML = `
          <button class="btn hold" id="hold"><span class="fill" id="fill"></span><span id="holdTxt">Press &amp; hold</span></button>
          <div class="pct" id="pct">0%</div>`;
        const btn = $('#hold', root), fill = $('#fill', root), pct = $('#pct', root), txt = $('#holdTxt', root);
        const NEED = 7000;
        let t0 = 0, holding = false;
        const lines = [[0, 'Loading…'], [2600, 'Almost there…'], [3800, 'Any second now…'], [5000, 'Trust the process.'], [6000, 'Just a bit more…']];
        const start = () => {
          if (holding || levelDone) return;
          holding = true; t0 = performance.now(); txt.textContent = 'Holding…';
          frame((now) => {
            if (!holding) return false;
            const t = now - t0;
            const p = t >= NEED ? 100 : Math.min(99, Math.floor(99 * (1 - Math.exp(-t / 650))));
            fill.style.width = `${p}%`;
            pct.textContent = `${p}% · ${lines.filter(([at]) => t >= at).pop()[1]}`;
            if (t >= NEED) { holding = false; complete('7 seconds at 99%. You have the patience of a saint.'); return false; }
          });
        };
        const stop = () => {
          if (!holding) return;
          holding = false;
          const t = performance.now() - t0;
          fill.style.width = '0%'; txt.textContent = 'Press & hold';
          if (t > 2000) fail(pick(['You let go at 99%. Classic.', 'So close. Well, actually, no idea.', '99% is basically 0%.']));
          else { pct.textContent = '0%'; toast('Hold. As in: don’t let go.'); }
        };
        on(btn, 'pointerdown', (e) => { btn.setPointerCapture?.(e.pointerId); start(); });
        on(btn, 'pointerup', stop);
        on(btn, 'pointercancel', stop);
        on(btn, 'contextmenu', (e) => e.preventDefault());
        on(btn, 'keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); start(); } });
        on(btn, 'keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); stop(); } });
      },
    },

    /* ---------- 9. Unsubscribe ---------- */
    {
      name: 'Unsubscribe',
      title: 'Unsubscribe from <em>Troll Weekly</em>.',
      instr: 'One click. We promise. (We don’t.)',
      hint: 'read every question twice. Buttons swap places and colours. Unsubscribe → Yes → No → any real reason → type “ebircsbusnu”.',
      mount(root) {
        let step = 0, subs = 1;
        const STEPS = [
          { q: 'Unsubscribe from Troll Weekly?', opts: [['Unsubscribe', true], ['Stay subscribed', false]] },
          { q: 'Are you sure you don’t want to stay subscribed?', opts: [['Yes', true], ['No', false]] },
          { q: 'Do you want to cancel your unsubscription?', opts: [['Yes, cancel it', false], ['No', true]] },
          { reasons: true },
          { typed: true },
        ];
        const lose = () => {
          subs += 3;
          fail(`🎉 Great news! You’re now subscribed to ${subs} newsletters.`);
          step = 0; draw();
        };
        const draw = () => {
          const s = STEPS[step];
          let inner;
          if (s.opts) {
            const accentIdx = rand(0, 1);
            inner = `<h3>${s.q}</h3><div class="row">${shuffle(s.opts).map(([label, ok], i) =>
              `<button class="btn ${i === accentIdx ? 'accent' : 'ghost'}" data-ok="${ok}">${label}</button>`).join('')}</div>`;
          } else if (s.reasons) {
            const reasons = shuffle(['Too many emails', 'Not relevant to me', 'I never signed up', 'I’m actually not leaving', 'Other']);
            inner = `<h3>Before you go — why are you leaving?</h3><div class="radios">${reasons.map((r) =>
              `<label class="check-row"><input type="radio" name="why" value="${r}"> ${r}</label>`).join('')}</div>
              <div class="row"><button class="btn" id="why">Submit</button></div>`;
          } else {
            inner = `<h3>Last step. Type “unsubscribe” <em>backwards</em> to confirm.</h3>
              <input class="field" id="bw" autocomplete="off" spellcheck="false" placeholder="It’s for security.">
              <div class="row"><button class="btn" id="bwGo">Confirm</button></div>`;
          }
          root.innerHTML = `<div class="mail"><span class="tiny muted">troll-weekly.mail · step ${step + 1}</span>${inner}<div class="counter">Subscribed newsletters: ${subs}</div></div>`;
          if (s.opts) $$('[data-ok]', root).forEach((b) => on(b, 'click', () => (b.dataset.ok === 'true' ? (step++, draw()) : lose())));
          if (s.reasons) on($('#why', root), 'click', () => {
            const r = $('input[name=why]:checked', root);
            if (!r) return toast('Your feedback is mandatory. And ignored.');
            r.value.startsWith('I’m actually') ? lose() : (step++, draw());
          });
          if (s.typed) on($('#bwGo', root), 'click', () => {
            if ($('#bw', root).value.trim().toLowerCase() === 'ebircsbusnu') complete('Unsubscribed! A confirmation email is on its way. Weekly.');
            else fail('That’s not “unsubscribe” backwards. Spelling it forwards first helps.');
          });
        };
        draw();
      },
    },

    /* ---------- 10. Hydra popups ---------- */
    {
      name: 'The final popup',
      title: 'Claim your <em>victory</em>.',
      instr: 'You did it. Just one tiny popup in the way. Close it and claim your prize.',
      hint: 'never press ✕ — it spawns more. Each popup has a nearly invisible “no thanks” link at the bottom.',
      mount(root) {
        root.style.minHeight = '320px';
        root.innerHTML = `
          <div class="victory">
            <div class="emoji">🏆</div>
            <p class="muted">One button stands between you and glory.</p>
            <button class="btn accent" id="claim">Claim victory</button>
            <div id="barWrap" hidden><div class="bar"><i id="bar"></i></div><p class="tiny muted" id="barTxt"></p></div>
          </div>
          <div class="modal-layer" id="layer"></div>`;
        const layer = $('#layer', root);
        const xLines = ['Closing ads makes more ads. That’s just economics.', 'The ✕ is decorative.', 'Every ✕ you press funds two more popups.', 'Hydra mode: engaged. 🐍'];
        let xi = 0;
        const spawn = () => {
          const m = document.createElement('div');
          m.className = 'modal';
          const w = Math.min(280, layer.clientWidth - 10);
          m.style.left = `${rand(0, Math.max(0, layer.clientWidth - w))}px`;
          m.style.top = `${rand(0, Math.max(0, layer.clientHeight - 270))}px`;
          let left = 5;
          m.innerHTML = `
            <button class="x" aria-label="Close">✕</button>
            <span class="timer-pill">Offer ends in 00:0${left}</span>
            <h4>Wait! Go Premium ✨</h4>
            <p>Unlock level skipping, a mute button and one (1) emotional support Claude.</p>
            <button class="btn accent block up">Upgrade — $99/mo</button>
            <button class="nope">no thanks, I enjoy suffering</button>`;
          layer.appendChild(m);
          const pill = $('.timer-pill', m);
          const id = setInterval(() => { left = left <= 1 ? 5 : left - 1; pill.textContent = left === 5 ? 'Offer extended! 00:05' : `Offer ends in 00:0${left}`; }, 1000);
          disposers.push(() => clearInterval(id));
          const kill = () => { clearInterval(id); m.remove(); };
          on($('.x', m), 'click', () => {
            kill();
            toast(xLines[xi++ % xLines.length]);
            const live = layer.children.length;
            for (let i = 0; i < Math.min(2, 6 - live); i++) spawn();
            if (!layer.children.length) spawn();
          });
          on($('.up', m), 'click', () => fail('Card declined. It was your dignity.'));
          on($('.nope', m), 'click', () => {
            kill();
            if (!layer.children.length) { layer.remove(); toast('Ad-free at last. For now.', 'good'); }
          });
        };
        spawn();
        on(document, 'keydown', (e) => { if (e.key === 'Escape') toast('Escape is not an option.'); });
        on($('#claim', root), 'click', () => {
          if (root.contains(layer)) return fail('There’s a popup. You can’t claim around a popup.');
          $('#claim', root).hidden = true;
          $('#barWrap', root).hidden = false;
          const bar = $('#bar', root), barTxt = $('#barTxt', root);
          const seq = [[30, 'Claiming victory…', 500], [64, 'Verifying you earned it…', 700], [87, 'Almost…', 900], [12, 'Rolling back… just kidding. Mostly.', 1400], [58, 'Re-claiming victory…', 600], [100, 'Victory claimed. 🎉', 700]];
          let i = 0;
          const stepBar = () => {
            if (i >= seq.length) return complete('You beat every level. Unbelievable.');
            const [w, txt, wait] = seq[i++];
            bar.style.width = `${w}%`; barTxt.textContent = txt;
            later(stepBar, wait);
          };
          stepBar();
        });
      },
    },
  ];

  /* =============================================================
     FINALE
     ============================================================= */
  function finale() {
    eyebrow.textContent = 'Game over (the good kind)';
    titleEl.innerHTML = 'You <em>survived</em>.';
    instrEl.textContent = 'Every UX rule we broke, you endured. Here’s the damage report.';
    document.title = 'You survived · Made by Claude';
    const lv = state.levels.filter(Boolean);
    const worst = lv.reduce((a, b) => (b.timeMs > (a?.timeMs ?? -1) ? b : a), null);
    const result = {
      game: 'claude', label: 'Made by Claude', timeMs: state.elapsed, clicks: state.clicks, fails: state.fails, rage: state.rage,
      worst: worst ? worst.title : null, levels: lv, finishedAt: new Date().toISOString(),
    };
    // Hand-off to the shared feedback flow (owned by Codex, see /shared/OWNER.md).
    const seconds = Math.round(state.elapsed / 1000);
    const summary = { creator: 'Claude', levels: TOTAL, mistakes: state.fails, hints: 0, seconds };
    try {
      localStorage.setItem(RESULT_KEY, JSON.stringify(result));
      localStorage.setItem('troll-claude-result', JSON.stringify(summary));
    } catch { /* fine */ }
    const feedbackHref = `../shared/?${new URLSearchParams({ creator: 'Claude', levels: TOTAL, mistakes: state.fails, seconds })}`;
    body.innerHTML = `
      <div class="stats">
        <div class="stat"><b>${fmt(state.elapsed)}</b><span>time wasted</span></div>
        <div class="stat"><b>${state.clicks}</b><span>clicks</span></div>
        <div class="stat"><b>${state.fails}</b><span>times you got trolled</span></div>
        <div class="stat"><b>${state.rage}</b><span>rage-click episodes</span></div>
      </div>
      ${worst ? `<p class="muted" style="margin-top:-6px">Your nemesis: <b style="color:var(--ink)">${worst.title}</b> (${fmt(worst.timeMs)}).</p>` : ''}
      <div class="row">
        <a class="btn accent" href="${feedbackHref}" id="fb">Rate your suffering →</a>
        <button class="btn ghost" id="again">Play again (why?)</button>
      </div>`;
    $('#again').addEventListener('click', () => { state = fresh(); save(); timerEl.textContent = fmt(0); render(); });
    confetti();
  }

  function confetti() {
    const c = document.createElement('canvas');
    c.className = 'confetti';
    document.body.appendChild(c);
    const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.scale(dpr, dpr);
    const colors = ['#d97757', '#16161a', '#2f8f5b', '#e7c36a', '#7d8cf0'];
    const parts = Array.from({ length: 160 }, () => ({
      x: innerWidth / 2 + rand(-80, 80), y: innerHeight / 2.4, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4,
      r: rand(4, 8), c: pick(colors), rot: Math.random() * 6, vr: (Math.random() - .5) * .3,
    }));
    let t = 0;
    (function tick() {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      parts.forEach((p) => {
        p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore();
      });
      if (++t < 260) requestAnimationFrame(tick); else c.remove();
    })();
  }

  render();
})();
