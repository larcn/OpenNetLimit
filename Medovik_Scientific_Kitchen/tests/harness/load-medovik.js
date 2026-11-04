'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const DOM_ONLY_FILES = new Set(['app-v6.js']);

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem(key) {
      const k = String(key);
      return store.has(k) ? store.get(k) : null;
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    removeItem(key) {
      store.delete(String(key));
    },
    clear() {
      store.clear();
    }
  };
}

function getBuildScriptPaths() {
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
  const matches = [...indexHtml.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)];
  return matches.map((m) => m[1]).filter((rel) => !DOM_ONLY_FILES.has(rel));
}

function loadMedovik(options = {}) {
  const hasExplicitStorage = Object.prototype.hasOwnProperty.call(options, 'storage');
  const localStorage = hasExplicitStorage ? options.storage : createMemoryStorage();
  const ctx = vm.createContext({
    console,
    setTimeout,
    clearTimeout,
    localStorage
  });
  ctx.window = ctx;
  ctx.global = ctx;
  ctx.self = ctx;

  for (const relPath of getBuildScriptPaths()) {
    const fullPath = path.join(ROOT_DIR, relPath);
    const source = fs.readFileSync(fullPath, 'utf8');
    new vm.Script(source, { filename: relPath }).runInContext(ctx);
  }
  return ctx;
}

function evalIn(ctx, expression) {
  return vm.runInContext(expression, ctx);
}

module.exports = {
  ROOT_DIR,
  getBuildScriptPaths,
  createMemoryStorage,
  loadMedovik,
  evalIn
};
