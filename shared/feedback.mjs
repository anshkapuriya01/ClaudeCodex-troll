export const GAME_URL = 'https://claude-codex.anshkapuriya.in';
export function draftPost(summary, rating, winner) {
  const creator = summary.creator === 'Claude' ? 'Claude' : 'Codex';
  return `I survived ${creator}'s 10-level troll game. ${Math.max(0,Math.round(summary.mistakes || 0))} traps later, I no longer trust buttons.\n\n${rating >= 4 ? 'Painfully fun.' : rating >= 2 ? 'My patience has left the chat.' : 'I need a minute.'}${winner ? ` ${winner} gets my vote.` : ''} Try it and tell me which AI annoyed you more.`;
}
export function shareURL(text) {
  return 'https://twitter.com/intent/tweet?' + new URLSearchParams({text,url:GAME_URL});
}
export function mountFeedback(host, raw = {}) {
  const creator = raw.creator === 'Claude' ? 'Claude' : 'Codex';
  const num = value => Math.min(1000000, Math.max(0, Math.round(Number(value) || 0)));
  const summary = {creator, levels:num(raw.levels),mistakes:num(raw.mistakes),hints:num(raw.hints),seconds:num(raw.seconds)};
  if (!document.querySelector('[data-troll-feedback-style]')) {
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = new URL('./feedback.css',import.meta.url).href; link.dataset.trollFeedbackStyle = ''; document.head.append(link);
  }
  host.classList.add('troll-feedback');
  host.innerHTML = `<form class="tf-form"><span class="tf-kicker">YOUR OFFICIAL COMPLAINT</span><h2>How was the suffering?</h2><p>No wrong answers here. Finally.</p><fieldset><legend>How much did you enjoy it?</legend><div class="tf-ratings">${[1,2,3,4,5].map(n => `<label><input required type="radio" name="rating" value="${n}"><span>${n}</span></label>`).join('')}</div><div class="tf-scale"><span>Send help</span><span>Would suffer again</span></div></fieldset><fieldset><legend>Who wins your vote?</legend><div class="tf-votes"><label><input type="radio" name="winner" value="Claude"> Claude</label><label><input type="radio" name="winner" value="Codex"> Codex</label><label><input type="radio" name="winner" value="My therapist"> My therapist</label></div></fieldset><label class="tf-comment-label">Anything you want to get off your chest?<textarea name="comment" rows="3" maxlength="500" placeholder="That slider was personal…"></textarea></label><button class="tf-primary" type="submit">File my emotional damage ↗</button><p class="tf-local">Saved on this device only. No database. Nothing is sent until you choose to share.</p><small class="tf-credit">Feedback & sharing made by <b>Codex</b>.</small></form>`;
  const form = host.querySelector('form');
  form.onsubmit = event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const rating = Number(data.get('rating'));
    const winner = ['Claude','Codex','My therapist'].includes(data.get('winner')) ? data.get('winner') : '';
    const comment = String(data.get('comment') || '').trim().slice(0,500);
    const receipt = {...summary,rating,winner,comment,at:new Date().toISOString()};
    let saved = true;
    try { localStorage.setItem(`troll-feedback-${creator.toLowerCase()}`,JSON.stringify(receipt)); } catch { saved = false; }
    host.innerHTML = '<div class="tf-celebration" aria-hidden="true"></div><article class="tf-receipt"><span class="tf-kicker">COMPLAINT SUCCESSFULLY ACKNOWLEDGED</span><div class="tf-seal">VALID<br>FEELINGS</div><h2>We hear you.<br>We did this on purpose.</h2><div class="tf-details"></div><blockquote class="tf-quote"></blockquote><p class="tf-saved"></p><label class="tf-comment-label">Your post. Your words.<textarea class="tf-draft" rows="5" maxlength="230"></textarea></label><p class="tf-game-link"></p><div class="tf-actions"><a class="tf-primary tf-share" target="_blank" rel="noopener noreferrer">Share on my X ↗</a><button class="tf-secondary tf-copy" type="button">Copy post</button></div><p class="tf-status" role="status" aria-live="polite"></p><small class="tf-credit">Feedback & sharing made by <b>Codex</b>. You decide whether to post.</small></article>';
    host.querySelector('.tf-details').textContent = `${creator} · ${summary.levels}/10 levels · ${summary.mistakes} traps · enjoyment ${rating}/5${winner ? ` · vote: ${winner}` : ''}`;
    const quote = host.querySelector('.tf-quote'); quote.textContent = comment || '“My silence should tell you everything.”';
    host.querySelector('.tf-saved').textContent = saved ? 'Your feedback is saved on this device. Management has been mildly inconvenienced.' : 'Your receipt is displayed here. This browser could not save it locally.';
    const draft = host.querySelector('.tf-draft'); draft.value = draftPost(summary,rating,winner);
    host.querySelector('.tf-game-link').textContent = GAME_URL;
    const share = host.querySelector('.tf-share');
    const update = () => { share.href = shareURL(draft.value); }; update(); draft.oninput = update;
    host.querySelector('.tf-copy').onclick = async () => {
      try { await navigator.clipboard.writeText(`${draft.value}\n\n${GAME_URL}`); host.querySelector('.tf-status').textContent = 'Copied. Make someone else’s day slightly worse.'; }
      catch { draft.focus(); draft.select(); host.querySelector('.tf-status').textContent = 'Select the post and copy it manually. The game link is shown below it.'; }
    };
    const confetti = host.querySelector('.tf-celebration');
    for (let i=0; i<26; i++) {
      const piece = document.createElement('i'); piece.style.setProperty('--x',`${(i*37)%100}%`); piece.style.setProperty('--delay',`${i%7*.08}s`); piece.style.setProperty('--r',`${i*41}deg`); confetti.append(piece);
    }
    const heading = host.querySelector('h2'); heading.tabIndex = -1; heading.focus({preventScroll:true});
  };
  return host;
}
