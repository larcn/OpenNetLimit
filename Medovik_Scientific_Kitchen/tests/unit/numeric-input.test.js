'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { loadMedovik } = require('../harness/load-medovik');

const cases = [
  ['82', 82],
  ['82.5', 82.5],
  ['82,5', 82.5],
  ['٨٢٫٥', 82.5],
  ['۸۲٫۵', 82.5],
  ['٨٢.٥', 82.5],
  [' 82 ', 82],
  ['.5', 0.5],
  ['5.', 5],
  ['٠', 0],
  ['١٬٢٣٤', 1234],
  ['', null],
  ['   ', null],
  ['٨٢٫٥٫٢', null],
  ['1.234.5', null],
  ['12 جم', null],
  ['-5', null],
  ['abc', null],
  ['1e3', null],
  [undefined, null],
  [null, null],
  [82, null]
];

const ctx = loadMedovik();

for (const [input, expected] of cases) {
  test(`parseLocalizedDecimal(${JSON.stringify(input)}) = ${expected}`, () => {
    assert.ok(ctx.MedovikNumericInput, 'Expected global.MedovikNumericInput to be defined');
    assert.equal(ctx.MedovikNumericInput.parseLocalizedDecimal(input), expected);
  });
}

test('دالة finiteNumber في app-v6.js تطبّع الأرقام العربية-الهندية والفواصل العشرية عبر MedovikNumericInput', () => {
  const { loadAppWithMiniDom } = require('../helpers/mini-dom');
  const { ctx } = loadAppWithMiniDom();
  const fn = ctx.MedovikApp.finiteNumber;
  assert.equal(typeof fn, 'function');
  assert.equal(fn('١٥٠', 0), 150);
  assert.equal(fn('82,5', 0), 82.5);
  assert.equal(fn('٨٢٫٥', 0), 82.5);
  assert.equal(fn('غير صالح', 10), 10);
  assert.equal(fn('', 10), 10);
  assert.equal(fn(25, 0), 25);
});

