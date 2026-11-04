#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node tests/run-node-tests.js
python tests/static-audit.py
python tests/browser-smoke.py

node tests/check-source-baseline.js
python tests/science-reference-check.py
python tests/science-sensitivity.py
python tests/check-science-claims.py
python tests/validate-competitor-benchmark.py
python tests/browser-journey.py

node tests/source-link-test.js
python tests/compact-protocol-test.py
