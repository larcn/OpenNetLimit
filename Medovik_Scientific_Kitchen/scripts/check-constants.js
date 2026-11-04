'use strict';

const ALLOWED_STATUSES = new Set(['PROPOSED', 'OWNER_DECISION', 'APPROVED', 'NUMERICAL']);
const BLOCKED_ON_RELEASE = new Set(['PROPOSED', 'OWNER_DECISION']);

function checkConstants(constants, options = {}) {
  const release = Boolean(options && options.release);
  const entries = constants && typeof constants === 'object' ? Object.entries(constants) : [];
  const violations = [];

  for (const [name, entry] of entries) {
    const status = entry && entry.status;
    if (!ALLOWED_STATUSES.has(status)) {
      violations.push(`${name}: invalid or missing status "${String(status)}"`);
      continue;
    }
    if (release && BLOCKED_ON_RELEASE.has(status)) {
      violations.push(`${name}: status "${status}" blocks release (${entry.reason || 'pending review'})`);
    }
  }

  return {
    ok: violations.length === 0,
    violations
  };
}

function formatConstantsTable(constants) {
  const entries = Object.entries(constants || {});
  if (entries.length === 0) {
    return '(MEDOVIK_ENGINEERING_CONSTANTS is currently empty)';
  }
  const lines = ['NAME | STATUS | UNIT | VALUE | REASON', '--- | --- | --- | --- | ---'];
  for (const [name, item] of entries) {
    lines.push(
      `${name} | ${item.status} | ${item.unit || '-'} | ${JSON.stringify(item.value)} | ${item.reason || ''}`
    );
  }
  return lines.join('\n');
}

if (require.main === module) {
  const release = process.argv.includes('--release');
  const constants = require('../core/engineering-constants');
  console.log(formatConstantsTable(constants));
  const result = checkConstants(constants, { release });
  if (!result.ok) {
    for (const v of result.violations) {
      console.error(`GATE FAIL: ${v}`);
    }
    process.exit(1);
  }
  console.log(`Constants check passed (release=${release}).`);
}

module.exports = {
  checkConstants,
  formatConstantsTable
};
