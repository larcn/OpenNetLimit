'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DEFAULT_OUTPUT = path.join(ROOT_DIR, 'Medovik_Standalone.html');
const LEGACY_OUTPUT = path.join(ROOT_DIR, 'Medovik_Standalone_Preview.html');

function inlineAssetsFromIndex(rootDir = ROOT_DIR) {
  const indexPath = path.join(rootDir, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  html = html.replace(
    /<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
    (_match, href) => {
      const cssPath = path.resolve(rootDir, href);
      const css = fs.readFileSync(cssPath, 'utf8').replace(/\r\n/g, '\n').trimEnd();
      return `<style>\n${css}\n  </style>`;
    }
  );

  html = html.replace(
    /<script\b[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi,
    (_match, src) => {
      const jsPath = path.resolve(rootDir, src);
      const rawJs = fs.readFileSync(jsPath, 'utf8').replace(/\r\n/g, '\n').trimEnd();
      const safeJs = rawJs.replace(/<\/script/gi, '<\\/script');
      return `<script>\n${safeJs}\n  </script>`;
    }
  );

  return html;
}

function buildStandalone(options = {}) {
  const rootDir = options.rootDir || ROOT_DIR;
  const outputFile = options.outputFile || DEFAULT_OUTPUT;
  const html = inlineAssetsFromIndex(rootDir);
  fs.writeFileSync(outputFile, html, 'utf8');
  if (outputFile !== LEGACY_OUTPUT && !options.noLegacy) {
    fs.writeFileSync(LEGACY_OUTPUT, html, 'utf8');
  }
  const bytes = Buffer.byteLength(html, 'utf8');
  return { outputFile, bytes };
}

if (require.main === module) {
  const result = buildStandalone();
  console.log(`Built ${path.relative(ROOT_DIR, result.outputFile)} (${result.bytes} bytes)`);
}

module.exports = {
  ROOT_DIR,
  DEFAULT_OUTPUT,
  inlineAssetsFromIndex,
  buildStandalone
};
