'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert');
const { loadMedovik, ROOT_DIR } = require('../harness/load-medovik');

function createMiniDocument() {
  function makeElement(tag) {
    const attrs = {};
    const dataset = {};
    const listeners = {};
    const children = [];
    let textVal = '';

    const node = {
      tagName: String(tag || 'div').toUpperCase(),
      className: '',
      style: {},
      id: '',
      hidden: false,
      value: '',
      checked: false,
      selected: false,
      disabled: false,
      scrollTop: 0,
      parentNode: null,
      children,
      classList: {
        add(...tokens) {
          const set = new Set(String(node.className || '').split(/\s+/).filter(Boolean));
          tokens.forEach(t => { if (t) set.add(t); });
          node.className = Array.from(set).join(' ');
        },
        remove(...tokens) {
          const set = new Set(String(node.className || '').split(/\s+/).filter(Boolean));
          tokens.forEach(t => set.delete(t));
          node.className = Array.from(set).join(' ');
        },
        toggle(token, force) {
          const set = new Set(String(node.className || '').split(/\s+/).filter(Boolean));
          const shouldHave = force !== undefined ? Boolean(force) : !set.has(token);
          if (shouldHave) set.add(token); else set.delete(token);
          node.className = Array.from(set).join(' ');
          return shouldHave;
        },
        contains(token) {
          return String(node.className || '').split(/\s+/).includes(token);
        }
      },
      get firstChild() {
        return children[0] || null;
      },
      get textContent() {
        if (children.length === 0) return textVal;
        return children.map(c => c.textContent || '').join('');
      },
      set textContent(v) {
        children.length = 0;
        textVal = String(v ?? '');
      },
      dataset: new Proxy(dataset, {
        set(target, prop, val) {
          target[prop] = String(val);
          const kebab = 'data-' + String(prop).replace(/[A-Z]/g, m => '-' + m.toLowerCase());
          attrs[kebab] = String(val);
          return true;
        }
      }),
      setAttribute(k, v) {
        attrs[k] = String(v);
        if (k === 'id') node.id = String(v);
        if (k === 'class') node.className = String(v);
      },
      getAttribute(k) {
        if (k === 'id' && node.id) return node.id;
        if (k === 'class' && node.className) return node.className;
        return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null;
      },
      addEventListener(type, fn) {
        listeners[type] = listeners[type] || [];
        listeners[type].push(fn);
      },
      appendChild(child) {
        if (child && typeof child === 'object') {
          child.parentNode = node;
          children.push(child);
        }
        return child;
      },
      removeChild(child) {
        const idx = children.indexOf(child);
        if (idx >= 0) {
          children.splice(idx, 1);
          child.parentNode = null;
        }
        return child;
      },
      replaceWith(nextNode) {
        if (!node.parentNode) return;
        const idx = node.parentNode.children.indexOf(node);
        if (idx >= 0) {
          nextNode.parentNode = node.parentNode;
          node.parentNode.children[idx] = nextNode;
          node.parentNode = null;
        }
      },
      querySelector(sel) {
        return findFirst(node, sel);
      },
      querySelectorAll(sel) {
        const out = [];
        collectAll(node, sel, out);
        return out;
      }
    };
    return node;
  }

  function matches(node, sel) {
    if (!node || !node.tagName || node.tagName === '#TEXT') return false;
    if (sel.startsWith('#')) return node.id === sel.slice(1);
    if (sel.startsWith('.')) {
      const cls = sel.slice(1);
      return String(node.className || '').split(/\s+/).includes(cls);
    }
    const attrMatch = sel.match(/^\[([a-zA-Z0-9_-]+)(?:="([^"]*)")?\]$/);
    if (attrMatch) {
      const val = node.getAttribute(attrMatch[1]);
      if (val === null) return false;
      return attrMatch[2] === undefined ? true : val === attrMatch[2];
    }
    return node.tagName.toLowerCase() === sel.toLowerCase();
  }

  function findFirst(root, sel) {
    for (const child of root.children || []) {
      if (matches(child, sel)) return child;
      const hit = findFirst(child, sel);
      if (hit) return hit;
    }
    return null;
  }

  function collectAll(root, sel, out) {
    for (const child of root.children || []) {
      if (matches(child, sel)) out.push(child);
      collectAll(child, sel, out);
    }
  }

  const body = makeElement('body');
  const appMount = makeElement('div');
  appMount.id = 'app';
  body.appendChild(appMount);

  return {
    readyState: 'complete',
    body,
    activeElement: body,
    createElement: makeElement,
    createTextNode(str) {
      return { tagName: '#TEXT', textContent: String(str ?? ''), children: [] };
    },
    getElementById(id) {
      return findFirst(body, `#${id}`);
    },
    querySelector(sel) {
      return findFirst(body, sel);
    },
    querySelectorAll(sel) {
      const out = [];
      collectAll(body, sel, out);
      return out;
    },
    addEventListener() {}
  };
}

function loadAppWithMiniDom() {
  const document = createMiniDocument();
  const ctx = loadMedovik();
  ctx.document = document;
  ctx.requestAnimationFrame = function(cb) {
    cb();
    return 1;
  };
  ctx.scrollTo = function() {};
  const appCode = fs.readFileSync(path.join(ROOT_DIR, 'app-v6.js'), 'utf8');
  vm.runInContext(appCode, ctx, { filename: 'app-v6.js' });
  return { ctx, document };
}

test('واجهة المقارنة واللوحات الجديدة تعرض الفروق والتحذيرات والماء الكلي وحمل الترطيب و«غير متاح»', () => {
  const { ctx, document } = loadAppWithMiniDom();

  // 1. Setup step has total water panel and relative rank
  let bodyText = document.body.textContent;
  assert.match(bodyText, /الماء الكلي/);
  assert.match(bodyText, /ترتيب نسبي داخل مكتبتك — ليس لزوجة/);

  // 2. Assembly step has hydration load card
  ctx.SessionStore.setActiveStep('assembly');
  bodyText = document.body.textContent;
  assert.match(bodyText, /حمل الترطيب/);
  assert.match(bodyText, /تقدير يعتمد على الكثافة التصميمية وسماكات التغليف/);

  // 3. Comparison tool with 2 different-family doughs + unknown-ingredient custom dough
  ctx.RecipeLabStore.setKindCompareIds('dough', [
    'builtin:dough:ayaHabib',
    'builtin:dough:tetyanaClassic'
  ]);
  ctx.MedovikApp.openDrawer('recipe-comparison', 'مقارنة الوصفات');
  const drawerBody = document.querySelector('[data-drawer-body]');
  assert.ok(drawerBody);
  const compText = drawerBody.textContent;
  assert.match(compText, /الفرق \(المطلق \/ النسبي\)/);
  assert.match(compText, /الأعلى/);
  assert.match(compText, /الأدنى/);
  assert.match(compText, /تنبيه اختلاف عائلة العملية/);

  // Check data-focus-key exists on comparison checkbox
  const focusCheckbox = drawerBody.querySelector('[data-focus-key="cmp:dough:builtin:dough:ayaHabib"]');
  assert.ok(focusCheckbox, 'Expected checkbox to carry data-focus-key');

  // 4. Custom recipe with unknown ingredient shows «غير متاح» instead of 0
  ctx.RecipeLabStore.createDraft({ kind: 'dough' });
  ctx.RecipeLabStore.updateDraft({ name: 'وصفة مجهولة' });
  ctx.RecipeLabStore.setDraftItems([{ ingredientId: 'unknown-ingredient-xyz', weight: 100 }]);
  const savedUnknown = ctx.RecipeLabStore.saveDraft();
  ctx.RecipeLabStore.setKindCompareIds('dough', ['builtin:dough:ayaHabib', savedUnknown.id]);
  ctx.MedovikApp.openDrawer('recipe-comparison', 'مقارنة الوصفات');
  assert.match(document.querySelector('[data-drawer-body]').textContent, /غير متاح/);
});
