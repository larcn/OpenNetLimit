'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ROOT_DIR, buildStandalone } = require('./build-standalone');

function stripJsComments(code) {
  return String(code || '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\\])\/\/.*$/gm, '$1');
}

function scanStandaloneHtml(html) {
  const source = String(html || '');
  const violations = [];

  if (/<script\b[^>]*\bsrc\s*=/i.test(source)) {
    violations.push('External <script src=...> tag found in standalone HTML');
  }

  if (/<link\b[^>]*\bhref\s*=\s*["']?\s*https?:/i.test(source)) {
    violations.push('External <link href="http..."> tag found in standalone HTML');
  }

  const styleBlocks = source.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) || [];
  for (const block of styleBlocks) {
    if (/@import\s+(?:url\()?["']?\s*https?:/i.test(block) || /url\(\s*["']?\s*https?:/i.test(block)) {
      violations.push('External network CSS url/@import found in <style> block');
    }
  }

  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(source)) !== null) {
    const body = stripJsComments(match[1]);
    if (/\bfetch\s*\(/.test(body)) {
      violations.push('Runtime fetch(...) call found inside <script> block');
    }
    if (/\bXMLHttpRequest\b/.test(body)) {
      violations.push('Runtime XMLHttpRequest reference found inside <script> block');
    }
  }

  return violations;
}

function runStandaloneCheck(options = {}) {
  const rootDir = options.rootDir || ROOT_DIR;
  const { outputFile, bytes } = buildStandalone({ rootDir });
  const html = fs.readFileSync(outputFile, 'utf8');
  const violations = scanStandaloneHtml(html);

  const sizeReportPath = path.join(rootDir, 'docs', 'build-size.json');
  fs.mkdirSync(path.dirname(sizeReportPath), { recursive: true });
  const report = {
    bytes,
    at: new Date().toISOString()
  };
  fs.writeFileSync(sizeReportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  return {
    ok: violations.length === 0,
    bytes,
    outputFile,
    sizeReportPath,
    violations
  };
}

if (require.main === module) {
  const res = runStandaloneCheck();
  if (!res.ok) {
    for (const v of res.violations) {
      console.error(`VIOLATION: ${v}`);
    }
    process.exit(1);
  }
  console.log(`Standalone check passed: ${res.bytes} bytes -> docs/build-size.json`);
}

module.exports = {
  scanStandaloneHtml,
  runStandaloneCheck
};
