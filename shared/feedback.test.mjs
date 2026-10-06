import assert from 'node:assert/strict';
import {draftPost, shareURL, GAME_URL} from './feedback.mjs';
for (const creator of ['Claude','Codex']) {
 const text=draftPost({creator,mistakes:12},5,creator);
 assert.ok(text.includes(creator)); assert.ok(text.includes('12 traps')); assert.ok(text.length<=230);
 const url=new URL(shareURL(text)); assert.equal(url.searchParams.get('text'),text); assert.equal(url.searchParams.get('url'),GAME_URL);
}
assert.ok(draftPost({creator:'<script>',mistakes:-2},1,'').includes("Codex's"));
assert.equal(new URL(shareURL('hello & goodbye # ☺')).searchParams.get('text'),'hello & goodbye # ☺');
console.log('Feedback draft and sharing checks passed.');
