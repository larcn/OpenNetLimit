'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { loadMedovik } = require('../harness/load-medovik');

const close = (a, b, t = 1e-6) => assert.ok(Math.abs(a - b) <= t, `${a} vs ${b}`);

test('2×2 بلا تقييد: [[2,1],[1,3]] x = [5,10] ← [1,3]', () => {
  const ctx = loadMedovik();
  const S = ctx.MedovikBoundedSolver.solveBoundedVectors;
  const r = S({
    rows: [
      { a: [2, 1], b: 5, w: 1 },
      { a: [1, 3], b: 10, w: 1 }
    ],
    lower: [0, 0],
    upper: [10, 10],
    x0: [0, 0]
  });
  close(r.x[0], 1);
  close(r.x[1], 3);
  assert.deepEqual(Array.from(r.pattern), ['free', 'free']);
});

test('حدّ علوي نشط وأولوية بالوزن: x2 <= 2 ← [1.5, 2] ونمط free/upper', () => {
  const ctx = loadMedovik();
  const S = ctx.MedovikBoundedSolver.solveBoundedVectors;
  const r = S({
    rows: [
      { a: [2, 1], b: 5, w: 1e8 },
      { a: [1, 3], b: 10, w: 1 }
    ],
    lower: [0, 0],
    upper: [10, 2],
    x0: [0, 0]
  });
  close(r.x[0], 1.5);
  close(r.x[1], 2);
  assert.deepEqual(Array.from(r.pattern), ['free', 'upper']);
});

test('قيد ناقص التحديد: x1 + x2 = 2 و x0 = [1,0] ← [1.5, 0.5]', () => {
  const ctx = loadMedovik();
  const S = ctx.MedovikBoundedSolver.solveBoundedVectors;
  const r = S({
    rows: [{ a: [1, 1], b: 2, w: 1 }],
    lower: [0, 0],
    upper: [10, 10],
    x0: [1, 0]
  });
  close(r.x[0], 1.5);
  close(r.x[1], 0.5);
});

test('حدود لانهائية مقبولة', () => {
  const ctx = loadMedovik();
  const S = ctx.MedovikBoundedSolver.solveBoundedVectors;
  const r = S({
    rows: [
      { a: [2, 1], b: 5, w: 1 },
      { a: [1, 3], b: 10, w: 1 }
    ],
    lower: [0, 0],
    upper: [Infinity, Infinity],
    x0: [0, 0]
  });
  close(r.x[0], 1);
  close(r.x[1], 3);
});

test('أخطاء: خمسة متغيرات، وحدود متناقضة', () => {
  const ctx = loadMedovik();
  const S = ctx.MedovikBoundedSolver.solveBoundedVectors;
  assert.throws(
    () => S({ rows: [], lower: [0, 0, 0, 0, 0], upper: [1, 1, 1, 1, 1], x0: [0, 0, 0, 0, 0] }),
    ctx.RangeError
  );
  assert.throws(
    () => S({ rows: [], lower: [2], upper: [1], x0: [0] }),
    /infeasible-bounds/
  );
});

test('حالة معتلّة من المشروع: hiba عند +5% تُحلّ مباشرة فتطابق Cramer', () => {
  const ctx = loadMedovik();
  const S = ctx.MedovikBoundedSolver.solveBoundedVectors;
  const a1 = [25.23, 0.008];
  const b1 = 26.771499999999996;
  const a2 = [21.158869627166943, -0.030226956610238498];
  const b2 = 21.158869627166894;
  const det = a1[0] * a2[1] - a1[1] * a2[0];
  const fx = (b1 * a2[1] - a1[1] * b2) / det;
  const dx = (a1[0] * b2 - b1 * a2[0]) / det;
  const r = S({
    rows: [
      { a: a1, b: b1, w: 1e8 },
      { a: a2, b: b2, w: 1 }
    ],
    lower: [0, 0],
    upper: [Infinity, Infinity],
    x0: [1, 0]
  });
  assert.ok(Math.abs(r.x[0] - fx) <= 1e-9);
  assert.ok(Math.abs(r.x[1] - dx) <= 1e-9);
  assert.ok(Math.abs(fx - 1.05) < 1e-9 && Math.abs(dx - 35) < 1e-9);
});

test('حتمية: استدعاءان متطابقان يعيدان النتيجة نفسها حرفيًا', () => {
  const ctx = loadMedovik();
  const S = ctx.MedovikBoundedSolver.solveBoundedVectors;
  const input = {
    rows: [
      { a: [2, 1], b: 5, w: 1e8 },
      { a: [1, 3], b: 10, w: 1 }
    ],
    lower: [0, 0],
    upper: [10, 2],
    x0: [0, 0]
  };
  assert.deepEqual(S(input), S(input));
});
