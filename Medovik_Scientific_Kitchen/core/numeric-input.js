(function(global) {
  'use strict';

  function parseLocalizedDecimal(text) {
    if (typeof text !== 'string') return null;

    let normalized = text.trim();
    if (!normalized) return null;

    normalized = normalized
      .replace(/[\u0660-\u0669]/g, function(ch) {
        return String(ch.charCodeAt(0) - 0x0660);
      })
      .replace(/[\u06F0-\u06F9]/g, function(ch) {
        return String(ch.charCodeAt(0) - 0x06F0);
      })
      .replace(/[,\u066B]/g, '.')
      .replace(/[\u066C\s]+/g, '');

    if (!/^(\d+\.?\d*|\.\d+)$/.test(normalized)) {
      return null;
    }

    const value = Number(normalized);
    return Number.isFinite(value) ? value : null;
  }

  const MedovikNumericInput = Object.freeze({
    parseLocalizedDecimal
  });

  global.MedovikNumericInput = MedovikNumericInput;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MedovikNumericInput;
  }
})(typeof window !== 'undefined' ? window : globalThis);
