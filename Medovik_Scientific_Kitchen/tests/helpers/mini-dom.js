'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { loadMedovik, ROOT_DIR } = require('../harness/load-medovik');

function createMiniDocument() {
  const docListeners = {};

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
      name: '',
      type: '',
      hidden: false,
      value: '',
      checked: false,
      selected: false,
      disabled: false,
      scrollTop: 0,
      selectionStart: null,
      selectionEnd: null,
      parentNode: null,
      children,
      classList: {
        add(...tokens) {
          const set = new Set(String(node.className || '').split(/\s+/).filter(Boolean));
          tokens.forEach((t) => { if (t) set.add(t); });
          node.className = Array.from(set).join(' ');
        },
        remove(...tokens) {
          const set = new Set(String(node.className || '').split(/\s+/).filter(Boolean));
          tokens.forEach((t) => set.delete(t));
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
        return children.map((c) => c.textContent || '').join('');
      },
      set textContent(v) {
        children.length = 0;
        textVal = String(v ?? '');
      },
      dataset: new Proxy(dataset, {
        set(target, prop, val) {
          target[prop] = String(val);
          const kebab = 'data-' + String(prop).replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
          attrs[kebab] = String(val);
          return true;
        }
      }),
      setAttribute(k, v) {
        attrs[k] = String(v);
        if (k === 'id') node.id = String(v);
        if (k === 'class') node.className = String(v);
        if (k === 'name') node.name = String(v);
        if (k === 'type') node.type = String(v);
      },
      getAttribute(k) {
        if (k === 'id' && node.id) return node.id;
        if (k === 'class' && node.className) return node.className;
        if (k === 'name' && node.name) return node.name;
        if (k === 'type' && node.type) return node.type;
        return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null;
      },
      addEventListener(type, fn) {
        listeners[type] = listeners[type] || [];
        listeners[type].push(fn);
      },
      dispatchEvent(evt) {
        const eventObj = Object.assign({ preventDefault() {}, stopPropagation() {}, target: node }, evt || {});
        const arr = listeners[eventObj.type] || [];
        arr.forEach((fn) => fn.call(node, eventObj));
        return true;
      },
      click() {
        node.dispatchEvent({ type: 'click' });
      },
      focus() {
        doc.activeElement = node;
      },
      setSelectionRange(start, end) {
        node.selectionStart = start;
        node.selectionEnd = end;
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
    const attrMatch = sel.match(/^([a-zA-Z0-9_-]*)\[([a-zA-Z0-9_-]+)(?:="([^"]*)")?\]$/);
    if (attrMatch) {
      if (attrMatch[1] && node.tagName.toLowerCase() !== attrMatch[1].toLowerCase()) return false;
      const val = node.getAttribute(attrMatch[2]);
      if (val === null) return false;
      return attrMatch[3] === undefined ? true : val === attrMatch[3];
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

  const doc = {
    readyState: 'complete',
    visibilityState: 'visible',
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
    addEventListener(type, fn) {
      docListeners[type] = docListeners[type] || [];
      docListeners[type].push(fn);
    },
    dispatchEvent(evt) {
      const arr = docListeners[evt?.type] || [];
      arr.forEach((fn) => fn(evt));
    }
  };
  return doc;
}

function loadAppWithMiniDom(options = {}) {
  const document = createMiniDocument();
  const ctx = loadMedovik(options);
  ctx.document = document;
  ctx.requestAnimationFrame = function(cb) {
    cb();
    return 1;
  };
  ctx.setInterval = function(fn, ms) {
    const h = setInterval(fn, ms);
    if (h && typeof h.unref === 'function') h.unref();
    return h;
  };
  ctx.clearInterval = clearInterval;
  ctx.scrollTo = function() {};
  if (options.extraGlobals) {
    Object.assign(ctx, options.extraGlobals);
  }
  if (typeof options.beforeAppRun === 'function') {
    options.beforeAppRun(ctx, document);
  }
  const appCode = fs.readFileSync(path.join(ROOT_DIR, 'app-v6.js'), 'utf8');
  vm.runInContext(appCode, ctx, { filename: 'app-v6.js' });
  return { ctx, document };
}

module.exports = {
  createMiniDocument,
  loadAppWithMiniDom
};
