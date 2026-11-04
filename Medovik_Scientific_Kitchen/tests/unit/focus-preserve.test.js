'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { loadMedovik } = require('../harness/load-medovik');

function makeNode({ id = '', focusKey = null, focusable = false, selectable = false, selectionStart = null, selectionEnd = null } = {}, children = []) {
  const attrs = {};
  if (id) attrs.id = id;
  if (focusKey) attrs['data-focus-key'] = focusKey;

  const node = {
    id: id || undefined,
    parentNode: null,
    children,
    focused: false,
    restoredSelection: null,
    selectionStart,
    selectionEnd,
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
    }
  };

  if (focusable) {
    node.focus = function() {
      node.focused = true;
    };
  }

  if (selectable) {
    node.setSelectionRange = function(start, end) {
      node.restoredSelection = [start, end];
      node.selectionStart = start;
      node.selectionEnd = end;
    };
  }

  for (const child of children) {
    child.parentNode = node;
  }

  return node;
}

test('(أ) يلتقط التركيز بـ data-focus-key ويستعيد focus ومدى التحديد على شجرة معاد بناؤها', () => {
  const ctx = loadMedovik();
  assert.ok(ctx.MedovikFocus, 'Expected global.MedovikFocus to be defined');

  const inputOld = makeNode({
    focusKey: 'bench:strained:raw',
    focusable: true,
    selectable: true,
    selectionStart: 2,
    selectionEnd: 5
  });
  const rootOld = makeNode({}, [makeNode({}, [inputOld])]);

  const state = ctx.MedovikFocus.captureFocusState(rootOld, inputOld);
  assert.ok(state);
  assert.equal(state.key, 'bench:strained:raw');
  assert.equal(state.selectionStart, 2);
  assert.equal(state.selectionEnd, 5);

  const inputNew = makeNode({
    focusKey: 'bench:strained:raw',
    focusable: true,
    selectable: true
  });
  // Place inputNew in a different index in the rebuilt tree to prove key lookup wins
  const rootNew = makeNode({}, [makeNode(), makeNode({}, [makeNode(), inputNew])]);

  const ok = ctx.MedovikFocus.restoreFocusState(rootNew, state);
  assert.equal(ok, true);
  assert.equal(inputNew.focused, true);
  assert.deepEqual(inputNew.restoredSelection, [2, 5]);
});

test('(ب) يسقط إلى المسار الرقمي عند غياب المفتاح مع بنية متطابقة', () => {
  const ctx = loadMedovik();
  const targetOld = makeNode({ focusable: true, selectable: true, selectionStart: 1, selectionEnd: 1 });
  const rootOld = makeNode({}, [makeNode(), makeNode({}, [makeNode(), targetOld])]);

  const state = ctx.MedovikFocus.captureFocusState(rootOld, targetOld);
  assert.equal(state.key, null);
  assert.deepEqual(Array.from(state.path), [1, 1]);

  const targetNew = makeNode({ focusable: true, selectable: true });
  const rootNew = makeNode({}, [makeNode(), makeNode({}, [makeNode(), targetNew])]);

  const ok = ctx.MedovikFocus.restoreFocusState(rootNew, state);
  assert.equal(ok, true);
  assert.equal(targetNew.focused, true);
  assert.deepEqual(targetNew.restoredSelection, [1, 1]);
});

test('(ج) يعيد false دون استثناء عند تغيّر البنية بحيث يبطل المسار', () => {
  const ctx = loadMedovik();
  const targetOld = makeNode({ focusable: true });
  const rootOld = makeNode({}, [makeNode({}, [targetOld])]);

  const state = ctx.MedovikFocus.captureFocusState(rootOld, targetOld);
  const rootChanged = makeNode({}, []);

  let ok;
  assert.doesNotThrow(() => {
    ok = ctx.MedovikFocus.restoreFocusState(rootChanged, state);
  });
  assert.equal(ok, false);
});

test('(د) يعيد null إذا كان العنصر النشط خارج root أو فارغًا', () => {
  const ctx = loadMedovik();
  const root = makeNode({}, [makeNode({ focusable: true })]);
  const detached = makeNode({ focusKey: 'outside', focusable: true });

  assert.equal(ctx.MedovikFocus.captureFocusState(root, detached), null);
  assert.equal(ctx.MedovikFocus.captureFocusState(root, null), null);
});

test('(هـ) عنصر بلا setSelectionRange (مربع اختيار) يستعيد focus فقط دون استثناء', () => {
  const ctx = loadMedovik();
  const checkboxOld = makeNode({ focusKey: 'cmp:dough:ayaHabib', focusable: true, selectable: false });
  const rootOld = makeNode({}, [checkboxOld]);

  const state = ctx.MedovikFocus.captureFocusState(rootOld, checkboxOld);
  const checkboxNew = makeNode({ focusKey: 'cmp:dough:ayaHabib', focusable: true, selectable: false });
  const rootNew = makeNode({}, [checkboxNew]);

  const ok = ctx.MedovikFocus.restoreFocusState(rootNew, state);
  assert.equal(ok, true);
  assert.equal(checkboxNew.focused, true);
  assert.equal(checkboxNew.restoredSelection, null);
});
