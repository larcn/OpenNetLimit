'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const SNAPSHOT_DIR = path.join(__dirname, '..', 'golden', '__snapshots__');

function normalizeForGolden(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return null;
    }
    const rounded = Number(value.toFixed(9));
    return Object.is(rounded, -0) ? 0 : rounded;
  }

  if (Array.isArray(value)) {
    return Array.from(value, item => (item === undefined ? null : normalizeForGolden(item)));
  }

  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      const prop = value[key];
      if (prop !== undefined && typeof prop !== 'function') {
        out[key] = normalizeForGolden(prop);
      }
    }
    return out;
  }

  return value;
}

function assertGolden(name, value) {
  const safeName = String(name || '').trim();
  if (!safeName) {
    throw new Error('assertGolden requires a non-empty snapshot name');
  }

  const snapshotPath = path.join(SNAPSHOT_DIR, `${safeName}.json`);
  const normalized = normalizeForGolden(value);

  if (process.env.UPDATE_GOLDEN === '1') {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
    fs.writeFileSync(snapshotPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
    return;
  }

  if (!fs.existsSync(snapshotPath)) {
    assert.fail(
      `Missing golden snapshot "${safeName}" at ${snapshotPath}. Re-run with UPDATE_GOLDEN=1 to create it.`
    );
  }

  const expected = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  assert.deepStrictEqual(normalized, expected);
}

module.exports = {
  SNAPSHOT_DIR,
  normalizeForGolden,
  assertGolden
};
