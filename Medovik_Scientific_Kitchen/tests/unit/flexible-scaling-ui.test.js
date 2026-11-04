'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { loadAppWithMiniDom } = require('../helpers/mini-dom');

test('Task 21: Setup step UI renders 5 dough scaling modes and adapts input fields', () => {
  const { ctx, document } = loadAppWithMiniDom();

  ctx.SessionStore.setActiveStep('setup');
  let bodyText = document.body.textContent;
  assert.match(bodyText, /أبعاد العجين/);
  assert.match(bodyText, /مسار القيادة والتحجيم/);

  // Find the scaleMode select
  const selects = document.querySelectorAll('select');
  const scaleSelect = Array.from(selects).find(s =>
    Array.from(s.options || s.children || []).some(opt => opt.value === 'rawThickness' || opt.value === 'totalDoughWeight')
  );
  assert.ok(scaleSelect, 'scaleMode select must be present');

  const options = Array.from(scaleSelect.options || scaleSelect.children || []).map(o => o.value);
  assert.ok(options.includes('volume'));
  assert.ok(options.includes('rawThickness'));
  assert.ok(options.includes('manualBall'));
  assert.ok(options.includes('totalDoughWeight'));
  assert.ok(options.includes('flourBasis'));

  // Switch to totalDoughWeight mode
  ctx.SessionStore.updateProductSpec({ scaleMode: 'totalDoughWeight', targetTotalDoughWeight: 1200 });
  bodyText = document.body.textContent;
  assert.match(bodyText, /وزن العجين المطلوب|وزن العجين الكلي/);
  assert.match(bodyText, /وزن الوصفة الأصلية/);

  // Click the quick button to set original formula weight
  const buttons = document.querySelectorAll('button');
  const origBtn = Array.from(buttons).find(b => b.textContent.includes('وزن الوصفة الأصلية'));
  assert.ok(origBtn, 'Original recipe weight button should exist');
  origBtn.click();
  const currentSpec = ctx.SessionStore.resolveProductSpec();
  assert.ok(currentSpec.targetTotalDoughWeight > 500, `Weight should be set to recipe weight, got ${currentSpec.targetTotalDoughWeight}`);

  // Switch to rawThickness mode
  ctx.SessionStore.updateProductSpec({ scaleMode: 'rawThickness', rawSheetThicknessMm: 1.5 });
  bodyText = document.body.textContent;
  assert.match(bodyText, /سماكة الفرد الخام/);
  assert.match(bodyText, /السمك المتوقع بعد الخبز/);
});

test('Task 21: Filling step UI renders Cream Reconstitution card for whipping cream formulas', () => {
  const { ctx, document } = loadAppWithMiniDom();

  ctx.SessionStore.setFilling('classic_sourcream_frosting');
  ctx.SessionStore.setActiveStep('filling');

  let bodyText = document.body.textContent;
  assert.match(bodyText, /بديل الكريمة البودر/);

  // Enable powder mode in step data
  ctx.SessionStore.setStepData('creamPrep.v1', {
    mode: 'powder',
    liquidType: 'milk',
    liquidPerPartPowder: 2.0
  });

  bodyText = document.body.textContent;
  assert.match(bodyText, /بودر الكريمة/);
  assert.match(bodyText, /حليب بارد/);
});
