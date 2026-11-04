'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { scanStandaloneHtml } = require('../../scripts/check-standalone');
const { checkConstants } = require('../../scripts/check-constants');
const { loadMedovik } = require('../harness/load-medovik');

test('يرصد طلبات الشبكة في النسخة المستقلة ويتجاهل روابط المراجع النصية', () => {
  assert.ok(scanStandaloneHtml('<script>fetch(x)</script>').length > 0);
  assert.ok(scanStandaloneHtml('<script>new XMLHttpRequest()</script>').length > 0);
  assert.ok(scanStandaloneHtml('<script src="a.js"></script>').length > 0);
  assert.ok(scanStandaloneHtml('<link rel="stylesheet" href="https://example.com/a.css">').length > 0);
  assert.deepEqual(
    scanStandaloneHtml('<script>const ref = "https://www.fao.org/4/Y4358E/y4358e07.htm"; const a = 1;</script>'),
    []
  );
});

test('بوابة الإصدار تفشل على PROPOSED و OWNER_DECISION وتمر على APPROVED و NUMERICAL', () => {
  assert.equal(checkConstants({ A: { status: 'PROPOSED' } }, { release: true }).ok, false);
  assert.equal(checkConstants({ A: { status: 'OWNER_DECISION' } }, { release: true }).ok, false);
  assert.equal(
    checkConstants({ A: { status: 'APPROVED' }, B: { status: 'NUMERICAL' } }, { release: true }).ok,
    true
  );
  assert.equal(checkConstants({ A: { status: 'PROPOSED' } }, { release: false }).ok, true);
});

test('MEDOVIK_ENGINEERING_CONSTANTS محمّل ومجمّد في سياق البناء', () => {
  const ctx = loadMedovik();
  assert.ok(ctx.MEDOVIK_ENGINEERING_CONSTANTS && typeof ctx.MEDOVIK_ENGINEERING_CONSTANTS === 'object');
  assert.equal(Object.isFrozen(ctx.MEDOVIK_ENGINEERING_CONSTANTS), true);
});

test('النسخة المستقلة النهائية Medovik_Standalone.html تُحمّل وتركب .app-shell دون أخطاء', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  const { ROOT_DIR } = require('../harness/load-medovik');
  const { createMiniDocument } = require('../helpers/mini-dom');
  const htmlPath = path.join(ROOT_DIR, 'Medovik_Standalone.html');
  assert.ok(fs.existsSync(htmlPath), 'الملف المستقل النهائي يجب أن يكون موجودًا');
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert.ok(html.length > 1000000, 'حجم الملف يجب أن يتجاوز 1 ميغابايت');

  const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
  const scripts = [];
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    scripts.push(match[1]);
  }
  assert.ok(scripts.length >= 25, 'يجب أن يحوي 25 سكربتًا مدمجًا على الأقل');

  const document = createMiniDocument();
  const ctx = vm.createContext({
    console,
    setTimeout,
    clearTimeout,
    setInterval: (fn, ms) => {
      const h = setInterval(fn, ms);
      if (h && typeof h.unref === 'function') h.unref();
      return h;
    },
    clearInterval,
    requestAnimationFrame: (cb) => { cb(); return 1; },
    scrollTo: () => {},
    localStorage: {
      data: new Map(),
      getItem(k) { return this.data.get(String(k)) || null; },
      setItem(k, v) { this.data.set(String(k), String(v)); },
      removeItem(k) { this.data.delete(String(k)); },
      clear() { this.data.clear(); }
    },
    document
  });
  ctx.window = ctx;
  ctx.global = ctx;
  ctx.self = ctx;

  for (let i = 0; i < scripts.length; i += 1) {
    vm.runInContext(scripts[i], ctx, { filename: `standalone-script-${i + 1}.js` });
  }
  const appShell = document.querySelector('.app-shell');
  assert.ok(appShell, 'يجب أن يركب .app-shell داخل DOM بنجاح');
});
