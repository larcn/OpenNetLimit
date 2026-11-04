'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert');
const { loadMedovik, createMemoryStorage } = require('../harness/load-medovik');

function fixture(version) {
  const filePath = path.join(__dirname, '..', 'fixtures', `session_v${version}.json`);
  return fs.readFileSync(filePath, 'utf8');
}

for (const v of [4, 5, 6]) {
  test(`جلسة v${v} تُحمَّل بصيغة v6 ولا يُحذف مفتاحها القديم`, () => {
    const storage = createMemoryStorage();
    storage.setItem(`medovik_session_v${v}`, fixture(v));
    const ctx = loadMedovik({ storage });
    ctx.SessionStore.init();
    assert.equal(ctx.SessionStore.get().schemaVersion, 6);
    assert.ok(storage.getItem('medovik_session_v6'));
    assert.notEqual(storage.getItem(`medovik_session_v${v}`), null);
  });
}

test('مفاتيح غير معروفة داخل execution.stepData تصمد لإعادة التحميل', () => {
  const storage = createMemoryStorage();
  const a = loadMedovik({ storage });
  a.SessionStore.init();
  a.SessionStore.setStepData('bench.v1', { probe: 1 });
  const b = loadMedovik({ storage });
  b.SessionStore.init();
  assert.deepEqual(b.SessionStore.getStepData('bench.v1', null), { probe: 1 });
});

test('تخزين غير متاح: لا استثناء وحالة الحفظ فاشلة', () => {
  const ctx = loadMedovik({ storage: null });
  ctx.SessionStore.init();
  assert.doesNotThrow(() => ctx.SessionStore.save());
  assert.equal(ctx.SessionStore.getLastPersistStatus().ok, false);
});
