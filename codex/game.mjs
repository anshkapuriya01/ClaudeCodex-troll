import { levels, correctAnswer } from './rules.mjs';
const app = document.querySelector('#app');
const key = 'codex-troll-progress-v1';
const fresh = () => ({ level: 0, mistakes: 0, hints: 0, started: Date.now(), complete: false });
let progress;
try { progress = JSON.parse(localStorage.getItem(key)); } catch {}
if (!progress || !Number.isInteger(progress.level) || progress.level < 0 || progress.level > 9 || !Number.isFinite(progress.mistakes) || !Number.isFinite(progress.hints) || !Number.isFinite(progress.started)) progress = fresh();
let cleanup = () => {};
const save = () => { try { localStorage.setItem(key, JSON.stringify(progress)); } catch {} };
const $ = selector => app.querySelector(selector);
const button = (text, value, style = 'primary') => `<button class="${style}" data-answer="${value}">${text}</button>`;
function intro() {
  cleanup();
  app.innerHTML = `<section class="intro"><div><div class="eyebrow">Claude vs Codex · The troll-off</div><h1>Looks easy.<br><em>It isn't.</em></h1><p>Ten levels. One innocent browser tab.<br>A beautifully designed test of how much nonsense you can tolerate.</p><button class="primary" id="start">${progress.complete ? 'Suffer again' : progress.level ? 'Resume my bad decision' : 'Make a bad decision'} <span>↗</span></button><span class="small">Made by Codex. No downloads. No dignity guaranteed.</span></div><div class="art" aria-label="A mischievous face"><span class="art-label">PLEASE DON'T TAKE THIS PERSONALLY.</span><div class="face"><div class="eyes"><span class="eye"></span><span class="eye"></span></div><div class="mouth"></div></div><span class="cursor" aria-hidden="true">➚</span><div class="art-bottom"><span>10 LEVELS OF QUESTIONABLE DECISIONS</span><span>↗</span></div></div></section><div class="intro-strip"><span>01 <b>Read everything.</b></span><span>02 <b>Trust nothing.</b></span><span>03 <b>Try not to rage quit.</b></span></div>`;
  $('#start').onclick = () => { if (progress.complete) progress = fresh(); save(); render(); };
}
function fail(message = 'That was a perfectly reasonable choice. Wrong game.') {
  progress.mistakes++; save();
  $('#notice').textContent = message;
}
function attempt(value, state = {}) {
  if (!correctAnswer(progress.level, value, state)) return fail();
  cleanup();
  if (progress.level === 9) { progress.complete = true; save(); return finish(); }
  $('.stage').innerHTML = '<div class="success-stamp">Fine. You win this one.</div><p>Management is disappointed.</p><button class="primary" id="next">Continue the suffering ↗</button>';
  $('#notice').textContent = '';
  $('#next').onclick = () => { progress.level++; save(); render(); };
  $('#next').focus();
}
function render() {
  cleanup(); cleanup = () => {};
  const level = levels[progress.level];
  app.innerHTML = `<div class="game-top"><a href="./">← Question my choices</a><div class="steps" aria-label="Level ${progress.level + 1} of 10">${levels.map((_, i) => `<span class="step ${i < progress.level ? 'done' : i === progress.level ? 'current' : ''}"></span>`).join('')}</div><span>${String(progress.level + 1).padStart(2,'0')} / 10</span></div><section class="game-layout"><aside class="sidebar"><div class="level-number">${String(progress.level + 1).padStart(2,'0')}</div><h2>${level.title}</h2><p>${level.instruction}</p><div class="notice" id="notice" role="status" aria-live="polite"></div><button class="text-button" id="hint-button">Fine. Give me a hint ↗</button><p class="hint" id="hint" role="status"></p><span class="small">${progress.mistakes} questionable decision${progress.mistakes === 1 ? '' : 's'} so far.</span></aside><div class="stage stage-enter" aria-label="Level puzzle"></div></section>`;
  $('#hint-button').onclick = () => { if (!$('#hint').textContent) { progress.hints++; save(); } $('#hint').textContent = level.hint; };
  const stage = $('.stage');
  if (progress.level === 0) {
    stage.innerHTML = `<h3>Would you like to NOT begin?</h3><p>A legally meaningless question.</p><div class="choices">${button('Yes, absolutely','yes')}${button('No, thank you','no','secondary')}</div>`;
    stage.querySelectorAll('[data-answer]').forEach(el => el.onclick = () => el.dataset.answer === 'yes' ? fail('Excellent. Unfortunately, you’re still here.') : attempt('no'));
  }
  if (progress.level === 1) {
    stage.innerHTML = '<span class="small">SELECT THE WORD BLUE</span><div class="choices"><button class="secondary big" data-word="red" style="color:#2460c2">RED</button><button class="secondary big" data-word="blue" style="color:#b83930">BLUE</button><button class="secondary big" data-word="green" style="color:#aa6a05">GREEN</button></div><p>Reading comprehension. Now with sabotage.</p>';
    stage.querySelectorAll('[data-word]').forEach(el => el.onclick = () => attempt(el.dataset.word));
  }
  if (progress.level === 2) {
    stage.innerHTML = '<h3>Manners are mandatory.</h3><form id="password" style="width:100%;display:grid;justify-items:center;gap:20px"><label for="please" class="small">TYPE PLEASE</label><input id="please" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="30" aria-describedby="mirror"><span class="small" id="mirror">Our server received: nothing. Rude.</span><button class="primary">Validate my politeness ↗</button></form>';
    const input = $('#please');
    input.oninput = () => { $('#mirror').textContent = `Our server received: ${[...input.value].reverse().join('') || 'nothing. Rude.'}`; };
    $('#password').onsubmit = event => { event.preventDefault(); attempt(input.value.trim().toLowerCase()); };
  }
  if (progress.level === 3) {
    stage.innerHTML = `<h3>Your privacy. Our hobbies.</h3><div class="permissions">${['Read your imaginary diary','Sell your fictional soul','Borrow your last brain cell','Know what you did last summer','Send emotionally needy notifications','Make this everyone else’s problem'].map(text => `<label><input type="checkbox" checked>${text}</label>`).join('')}</div><button class="primary" id="preferences">Save my preferences</button><span class="small">These are fake. Your actual data is safe.</span>`;
    $('#preferences').onclick = () => attempt('', { selected: stage.querySelectorAll('input:checked').length });
  }
  if (progress.level === 4) {
    stage.innerHTML = '<span class="small">VOLUME · TARGET 37</span><output class="volume" id="volume">80</output><label class="small" for="slider">Right is left. Management approved this.</label><input id="slider" type="range" min="0" max="100" value="80"><div class="choices"><button class="secondary" id="minus" aria-label="Decrease volume">−</button><button class="secondary" id="plus" aria-label="Increase volume">+</button></div><button class="primary" id="set-volume">That’s definitely 37</button>';
    const slider = $('#slider'); const update = () => { $('#volume').textContent = slider.value; };
    slider.oninput = update;
    $('#minus').onclick = () => { slider.value = Number(slider.value) - 1; update(); };
    $('#plus').onclick = () => { slider.value = Number(slider.value) + 1; update(); };
    $('#set-volume').onclick = () => attempt('', { value: Number(slider.value) });
  }
  if (progress.level === 5) {
    stage.innerHTML = '<h3>Doing nothing is a skill.</h3><p>Four seconds. No clicking. No heroics.</p><button class="primary" id="temptation" style="background:var(--acid);color:var(--ink)">DO NOT PRESS THIS</button><div class="meter"><span id="wait-fill"></span></div><span class="small" id="wait-status">Trying very hard to do nothing…</span><div id="wait-result"></div>';
    let began = performance.now();
    $('#temptation').onclick = () => { began = performance.now(); $('#wait-result').innerHTML = ''; fail('You had one job. Your four seconds start again.'); };
    const timer = setInterval(() => {
      if (document.hidden) { began = performance.now(); $('#wait-result').innerHTML = ''; $('#wait-status').textContent = 'Four visible seconds, please.'; return; }
      const elapsed = performance.now() - began;
      $('#wait-fill').style.width = `${Math.min(100, elapsed / 40)}%`;
      if (elapsed >= 4000 && !$('#collect')) {
        $('#wait-status').textContent = 'An astonishing display of restraint.';
        $('#wait-result').innerHTML = '<button class="secondary" id="collect">Collect my nothing</button>';
        $('#collect').onclick = () => attempt('', { elapsed: performance.now() - began, clicked: false });
      }
    }, 80);
    cleanup = () => clearInterval(timer);
  }
  if (progress.level === 6) {
    stage.innerHTML = '<h3>Remember these numbers.</h3><div class="big" id="sequence">3 · 1 · 4 · 2</div><p id="memory-help">You have three seconds. No pressure. Lots of pressure.</p><div id="memory-buttons"></div>';
    let entered = '';
    const order = ['2','4','1','3'];
    const timer = setTimeout(() => {
      $('#sequence').textContent = 'Your turn.';
      $('#memory-help').textContent = 'The buttons have been helpfully rearranged.';
      $('#memory-buttons').innerHTML = `<div class="keypad">${order.map(n => button(n,n,'secondary')).join('')}</div>`;
      const shuffle = () => { order.push(order.shift()); $('#memory-buttons').querySelectorAll('button').forEach((el,i) => { el.textContent = order[i]; el.dataset.answer = order[i]; }); };
      $('#memory-buttons').querySelectorAll('button').forEach(el => el.onclick = () => {
        entered += el.dataset.answer;
        if (!'3142'.startsWith(entered)) { entered = ''; $('#sequence').textContent = 'Start again.'; fail('Buttons moved. Your memory didn’t. Try 3 → 1 → 4 → 2.'); }
        else if (entered.length === 4) attempt(entered);
        else $('#sequence').textContent = `${'● '.repeat(entered.length)}${'○ '.repeat(4-entered.length)}`;
        if (entered.length < 4) shuffle();
      });
    }, 3000);
    cleanup = () => clearTimeout(timer);
  }
  if (progress.level === 7) {
    stage.innerHTML = `<h3>Select the human.</h3><div class="captcha">${['⚙','⌘','▣','⏣','◈','⊞','⌨','◎','⏚'].map((glyph,i) => `<button aria-label="Robot ${i+1}" aria-pressed="false">${glyph}</button>`).join('')}</div><button class="text-button" id="human" style="padding:12px 24px">human</button><button class="primary" id="verify">Verify selected tiles</button>`;
    stage.querySelectorAll('.captcha button').forEach(el => el.onclick = () => { el.classList.toggle('selected'); el.setAttribute('aria-pressed', String(el.classList.contains('selected'))); });
    $('#verify').onclick = () => fail('All robots. Even the one with a promising personality. Read below the grid.');
    $('#human').onclick = () => attempt('human');
  }
  if (progress.level === 8) {
    stage.innerHTML = `<h3>Terms of your surrender.</h3><div class="terms" id="terms" tabindex="0" role="region" aria-label="Scrollable fictional terms"><p>By reading this sentence, you agree that reading the next sentence is technically an activity.</p>${Array.from({length:12},(_,i) => `<p><b>Clause ${i+1}.</b> The Department of Unnecessary Friction reserves the right to move buttons, reverse sliders, question your choices, and describe all of these features as improvements. You are entitled to one imaginary refund, payable in imaginary currency. No real agreement is being made.</p>`).join('')}<p><b>You made it.</b> A sensible person would disagree with all of this.</p></div><span class="small" id="terms-status">Please read all 12 completely pointless clauses.</span><div class="choices">${button('I agree','agree')}${button('I disagree','disagree','secondary')}</div>`;
    let bottom = false; const terms = $('#terms');
    const checkBottom = () => { bottom = terms.scrollTop + terms.clientHeight >= terms.scrollHeight - 8; $('#terms-status').textContent = bottom ? 'Congratulations. You can never get that time back.' : 'Please read all 12 completely pointless clauses.'; };
    terms.onscroll = checkBottom; checkBottom();
    stage.querySelectorAll('[data-answer]').forEach(el => el.onclick = () => { if (!bottom) return fail('The scrollbar inside the box would like your attention.'); if (el.dataset.answer === 'agree') return fail('You agreed to THAT? A sensible person would disagree.'); attempt(el.dataset.answer,{bottom}); });
  }
  if (progress.level === 9) {
    stage.innerHTML = '<h3>You’re one click away.</h3><p>A statement we intend to keep repeating.</p><button class="primary" id="finish-button">Finish the game ↗</button><div id="confirmation"></div>';
    let confirmations = 0;
    const draw = () => {
      $('#confirmation').innerHTML = `<div class="modal" role="group" aria-label="Finish confirmation"><span class="small">CONFIRMATION ${Math.min(confirmations+1,4)} OF AN UNREASONABLE AMOUNT</span><h3>${confirmations >= 3 ? 'Cancel to actually finish.' : ['Are you sure you’re sure?','Are you sure about being sure?','Final final confirmation.'][confirmations]}</h3><p>${confirmations >= 3 ? '“Confirm” will start this nonsense again. We warned you.' : 'This could have been an email.'}</p><div class="choices">${button('Confirm','confirm')}${button('Cancel','cancel','secondary')}</div></div>`;
      $('#confirmation').querySelectorAll('[data-answer]').forEach(el => el.onclick = () => {
        if (el.dataset.answer === 'cancel') { if (confirmations >= 3) attempt('cancel',{confirmations}); else { fail('Too early to cancel. Confirm three times first.'); } }
        else if (confirmations >= 3) { confirmations = 0; fail('Confirmed. We will now confirm your confirmation again.'); draw(); }
        else { confirmations++; draw(); }
      });
    };
    $('#finish-button').onclick = () => { $('#finish-button').disabled = true; draw(); };
  }
}
async function finish() {
  cleanup();
  const seconds = Math.max(0,Math.round((Date.now() - progress.started)/1000));
  const summary = {creator:'Codex',levels:10,mistakes:progress.mistakes,hints:progress.hints,seconds};
  try { localStorage.setItem('troll-codex-result',JSON.stringify(summary)); } catch {}
  app.innerHTML = `<section class="result"><div class="success-stamp" style="display:inline-block">CERTIFIED PATIENCE HAVER</div><h1>You won.<br><em>At what cost?</em></h1><p>Ten levels survived. Your browser is fine.<br>Your trust in buttons may never recover.</p><div class="stats"><div><strong>10/10</strong><span class="small">levels survived</span></div><div><strong>${progress.mistakes}</strong><span class="small">traps triggered</span></div><div><strong>${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}</strong><span class="small">time donated</span></div></div><div id="feedback-slot"><p>Checking the shared feedback room…</p></div><div class="choices"><a class="secondary" href="../made-by-claude/">Try Made by Claude ↗</a><button class="text-button" id="again">I have learned nothing. Play again.</button></div></section>`;
  $('#again').onclick = () => { progress = fresh(); save(); render(); };
  try {
    const { mountFeedback } = await import('../shared/feedback.mjs');
    if ($('#feedback-slot')) mountFeedback($('#feedback-slot'), summary);
  } catch {
    if ($('#feedback-slot')) $('#feedback-slot').innerHTML = '<p class="small">The shared feedback room is not available yet.</p>';
  }
}
document.querySelector('#reset').onclick = () => {
  if (!confirm('Reset your Codex progress and start all ten levels again?')) return;
  progress = fresh(); save(); intro();
};
if (progress.complete) finish(); else intro();
