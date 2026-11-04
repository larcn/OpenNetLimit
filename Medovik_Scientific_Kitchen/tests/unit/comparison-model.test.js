'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { loadMedovik } = require('../harness/load-medovik');

test('(أ) قيمتان 10 و12 بمنزلة عشرية واحدة: علامتا min/max وdelta.abs=2 وrelPct=20 وhigherId للثاني', () => {
  const ctx = loadMedovik();
  assert.ok(ctx.MedovikComparison, 'Expected global.MedovikComparison');

  const row = ctx.MedovikComparison.buildMetricRow({
    key: 'hydrationPct',
    label: 'الرطوبة',
    unit: '%',
    decimals: 1,
    values: [
      { id: 'r1', name: 'وصفة أ', value: 10 },
      { id: 'r2', name: 'وصفة ب', value: 12 }
    ]
  });

  assert.equal(row.cells[0].mark, 'min');
  assert.equal(row.cells[1].mark, 'max');
  assert.ok(row.delta);
  assert.equal(row.delta.abs, 2);
  assert.equal(row.delta.relPct, 20);
  assert.equal(row.delta.higherId, 'r2');
  assert.match(row.delta.sentence, /وصفة ب أعلى في الرطوبة بمقدار 2 %/);
});

test('(ب) 10.04 و10.00 بمنزلة واحدة تعيد tie وhigherId=null وجملة متساويتان تقريبًا', () => {
  const ctx = loadMedovik();
  const row = ctx.MedovikComparison.buildMetricRow({
    key: 'hydrationPct',
    label: 'الرطوبة',
    unit: '%',
    decimals: 1,
    values: [
      { id: 'r1', name: 'وصفة أ', value: 10.04 },
      { id: 'r2', name: 'وصفة ب', value: 10.0 }
    ]
  });

  assert.equal(row.cells[0].mark, 'tie');
  assert.equal(row.cells[1].mark, 'tie');
  assert.ok(row.delta);
  assert.equal(row.delta.higherId, null);
  assert.match(row.delta.sentence, /متساويتان تقريبًا/);
});

test('(ج) [10, null] أو قيم غير صالحة لا تنتج علامات ولا delta ولا استثناء', () => {
  const ctx = loadMedovik();
  const row = ctx.MedovikComparison.buildMetricRow({
    key: 'hydrationPct',
    label: 'الرطوبة',
    unit: '%',
    decimals: 1,
    values: [
      { id: 'r1', name: 'وصفة أ', value: 10 },
      { id: 'r2', name: 'وصفة ب', value: null }
    ]
  });

  assert.equal(row.cells[0].mark, null);
  assert.equal(row.cells[1].mark, null);
  assert.equal(row.cells[1].value, null);
  assert.equal(row.delta, null);
});

test('(د) ثلاث قيم تنتج max وmin ولا تنتج delta؛ والأصغر=0 يجعل relPct=null لوصفتين', () => {
  const ctx = loadMedovik();
  const row3 = ctx.MedovikComparison.buildMetricRow({
    key: 'fatPct',
    label: 'الدهن',
    unit: '%',
    decimals: 1,
    values: [
      { id: 'r1', name: 'أ', value: 10 },
      { id: 'r2', name: 'ب', value: 15 },
      { id: 'r3', name: 'ج', value: 20 }
    ]
  });

  assert.equal(row3.cells[0].mark, 'min');
  assert.equal(row3.cells[1].mark, null);
  assert.equal(row3.cells[2].mark, 'max');
  assert.equal(row3.delta, null);

  const rowZero = ctx.MedovikComparison.buildMetricRow({
    key: 'sugarPct',
    label: 'السكر',
    unit: '%',
    decimals: 1,
    values: [
      { id: 'r1', name: 'أ', value: 0 },
      { id: 'r2', name: 'ب', value: 5 }
    ]
  });
  assert.equal(rowZero.delta.relPct, null);
});

test('(هـ) buildComparisonModel يرصد crossFamily عند اختلاف العائلات غير الفارغة فقط', () => {
  const ctx = loadMedovik();
  const specs = [{ key: 'hydrationPct', label: 'الرطوبة', unit: '%', decimals: 1 }];

  const diff = ctx.MedovikComparison.buildComparisonModel({
    kind: 'dough',
    metricSpecs: specs,
    analyses: [
      { id: 'a', name: 'أ', familyId: 'CUSTARD', metrics: { hydrationPct: 30 } },
      { id: 'b', name: 'ب', familyId: 'CREAMING', metrics: { hydrationPct: 35 } }
    ]
  });
  assert.equal(diff.crossFamily, true);
  assert.deepEqual(Array.from(diff.familyIds), ['CUSTARD', 'CREAMING']);

  const same = ctx.MedovikComparison.buildComparisonModel({
    kind: 'dough',
    metricSpecs: specs,
    analyses: [
      { id: 'a', name: 'أ', familyId: 'CUSTARD', metrics: { hydrationPct: 30 } },
      { id: 'b', name: 'ب', familyId: 'CUSTARD', metrics: { hydrationPct: 35 } }
    ]
  });
  assert.equal(same.crossFamily, false);

  const emptyFam = ctx.MedovikComparison.buildComparisonModel({
    kind: 'filling',
    metricSpecs: specs,
    analyses: [
      { id: 'a', name: 'أ', familyId: null, metrics: { hydrationPct: null } },
      { id: 'b', name: 'ب', familyId: null, metrics: { hydrationPct: 35 } }
    ]
  });
  assert.equal(emptyFam.crossFamily, false);
  assert.equal(emptyFam.rows[0].cells[0].value, null);
});

test('(و) rankInLibrary يحسب الرتبة النسبية والنطاق وحالات نقص الأقران وغياب القيمة', () => {
  const ctx = loadMedovik();

  const sameKind = ctx.MedovikComparison.rankInLibrary({
    label: 'مواد صلبة/ماء',
    value: 3,
    familyId: null,
    peers: [
      { id: 'p1', value: 1, familyId: null },
      { id: 'p2', value: 2, familyId: null },
      { id: 'p3', value: 4, familyId: null },
      { id: 'p4', value: null, familyId: null }
    ]
  });
  assert.equal(sameKind.status, 'RANKED');
  assert.equal(sameKind.lowerCount, 2);
  assert.equal(sameKind.peerCount, 3);
  assert.equal(sameKind.scope, 'same-kind');

  const sameFam = ctx.MedovikComparison.rankInLibrary({
    label: 'مواد صلبة/ماء',
    value: 1.2,
    familyId: 'whipped-dairy',
    peers: [
      { id: 'p1', value: 0.9, familyId: 'whipped-dairy' },
      { id: 'p2', value: 1.5, familyId: 'whipped-dairy' },
      { id: 'p3', value: 2.2, familyId: 'butter-condensed' }
    ]
  });
  assert.equal(sameFam.status, 'RANKED');
  assert.equal(sameFam.scope, 'same-family');
  assert.equal(sameFam.lowerCount, 1);
  assert.equal(sameFam.peerCount, 2);

  const tooFew = ctx.MedovikComparison.rankInLibrary({
    label: 'مواد صلبة/ماء',
    value: 1.2,
    familyId: null,
    peers: [{ id: 'p1', value: 0.9, familyId: null }]
  });
  assert.equal(tooFew.status, 'INSUFFICIENT_PEERS');

  const noVal = ctx.MedovikComparison.rankInLibrary({
    label: 'مواد صلبة/ماء',
    value: null,
    familyId: 'whipped-dairy',
    peers: [
      { id: 'p1', value: 0.9, familyId: 'whipped-dairy' },
      { id: 'p2', value: 1.5, familyId: 'whipped-dairy' }
    ]
  });
  assert.equal(noVal.status, 'NO_VALUE');
});
