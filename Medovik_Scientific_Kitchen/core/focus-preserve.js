(function(global) {
  'use strict';

  function getAttr(node, name) {
    if (!node || typeof node !== 'object') return null;
    if (typeof node.getAttribute === 'function') {
      const val = node.getAttribute(name);
      if (val !== null && val !== undefined && val !== '') return String(val);
    }
    if (name === 'data-focus-key' && node.dataset && node.dataset.focusKey) {
      return String(node.dataset.focusKey);
    }
    if (name === 'id' && node.id) {
      return String(node.id);
    }
    return null;
  }

  function walkFind(node, predicate) {
    if (!node || typeof node !== 'object') return null;
    if (predicate(node)) return node;
    const children = node.children;
    if (!children || typeof children.length !== 'number') return null;
    for (let i = 0; i < children.length; i += 1) {
      const found = walkFind(children[i], predicate);
      if (found) return found;
    }
    return null;
  }

  function findByKey(root, key) {
    const targetKey = key !== null && key !== undefined ? String(key) : '';
    if (!root || !targetKey) return null;

    const byFocusKey = walkFind(root, function(node) {
      return getAttr(node, 'data-focus-key') === targetKey;
    });
    if (byFocusKey) return byFocusKey;

    return walkFind(root, function(node) {
      return getAttr(node, 'id') === targetKey;
    });
  }

  function computeIndexPath(node, root) {
    if (!node || !root) return null;
    const path = [];
    let current = node;

    while (current && current !== root) {
      const parent = current.parentNode;
      if (!parent || !parent.children || typeof parent.children.length !== 'number') {
        return null;
      }
      const idx = Array.prototype.indexOf.call(parent.children, current);
      if (idx < 0) return null;
      path.unshift(idx);
      current = parent;
    }

    if (current !== root) return null;
    return path;
  }

  function resolveIndexPath(root, path) {
    if (!root || !Array.isArray(path)) return null;
    let current = root;
    for (let i = 0; i < path.length; i += 1) {
      const idx = path[i];
      if (!Number.isInteger(idx) || idx < 0 || !current || !current.children || idx >= current.children.length) {
        return null;
      }
      current = current.children[idx];
    }
    return current || null;
  }

  function captureFocusState(root, activeElement) {
    if (!root || !activeElement || activeElement === root) return null;
    const path = computeIndexPath(activeElement, root);
    if (path === null) return null;

    const key = getAttr(activeElement, 'data-focus-key') || getAttr(activeElement, 'id') || null;
    const selectionStart = typeof activeElement.selectionStart === 'number' ? activeElement.selectionStart : null;
    const selectionEnd = typeof activeElement.selectionEnd === 'number' ? activeElement.selectionEnd : null;

    return {
      key,
      path,
      selectionStart,
      selectionEnd
    };
  }

  function restoreFocusState(root, state) {
    if (!root || !state || typeof state !== 'object') return false;
    let target = null;

    if (state.key) {
      target = findByKey(root, state.key);
    }
    if (!target && Array.isArray(state.path) && state.path.length > 0) {
      target = resolveIndexPath(root, state.path);
    }
    if (!target || typeof target.focus !== 'function') {
      return false;
    }

    try {
      target.focus();
    } catch (_) {
      return false;
    }

    if (
      typeof target.setSelectionRange === 'function' &&
      typeof state.selectionStart === 'number' &&
      typeof state.selectionEnd === 'number'
    ) {
      try {
        target.setSelectionRange(state.selectionStart, state.selectionEnd);
      } catch (_) {
        /* Input type does not support selection range */
      }
    }

    return true;
  }

  const MedovikFocus = Object.freeze({
    findByKey,
    computeIndexPath,
    resolveIndexPath,
    captureFocusState,
    restoreFocusState
  });

  global.MedovikFocus = MedovikFocus;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MedovikFocus;
  }
})(typeof window !== 'undefined' ? window : globalThis);
