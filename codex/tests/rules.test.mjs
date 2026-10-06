import assert from 'node:assert/strict';
import { levels, correctAnswer } from '../rules.mjs';

assert.equal(levels.length, 10);
for (const level of levels) {
  for (const key of ['title', 'instruction', 'hint']) {
    assert.equal(typeof level[key], 'string');
    assert.ok(level[key].trim(), `${key} must not be empty`);
  }
}

const cases = [
  [0, 'no', {}, 'yes', {}],
  [1, 'blue', {}, 'red', {}],
  [2, 'esaelp', {}, 'please', {}],
  [3, '', { selected: 0 }, '', { selected: 1 }],
  [4, '', { value: 37 }, '', { value: 36 }],
  [5, '', { elapsed: 4000, clicked: false }, '', { elapsed: 3999, clicked: false }],
  [6, '3142', {}, '1234', {}],
  [7, 'human', {}, 'robot', {}],
  [8, 'disagree', { bottom: true }, 'disagree', { bottom: false }],
  [9, 'cancel', { confirmations: 3 }, 'cancel', { confirmations: 2 }],
];
for (const [level, answer, state, wrongAnswer, wrongState] of cases) {
  assert.equal(correctAnswer(level, answer, state), true, `level ${level + 1} accepts solution`);
  assert.equal(correctAnswer(level, wrongAnswer, wrongState), false, `level ${level + 1} rejects wrong solution`);
}
assert.equal(correctAnswer(5, '', { elapsed: 5000, clicked: true }), false);
assert.equal(correctAnswer(8, 'agree', { bottom: true }), false);
assert.equal(correctAnswer(9, 'finish', { confirmations: 3 }), false);
assert.equal(correctAnswer(-1, 'no'), false);
assert.equal(correctAnswer(10, 'cancel'), false);
for (const level of [3, 4, 5, 8, 9]) assert.equal(correctAnswer(level, 'disagree'), false);
console.log('All 10 levels and metadata checks passed.');
