#!/usr/bin/env bash
set -u
cd "$(dirname "$0")/.."
mkdir -p _audit_logs/gates
run() {
  local id="$1"; shift
  "$@" > "_audit_logs/gates/${id}.log" 2>&1
  local code=$?
  printf '%s\n' "$code" > "_audit_logs/gates/${id}.exit"
  printf '%s: %s\n' "$id" "$code"
}
run node node tests/run-node-tests.js
run static python tests/static-audit.py
run baseline node tests/check-source-baseline.js
run reference python tests/science-reference-check.py
run sensitivity python tests/science-sensitivity.py
run scienceclaims python tests/check-science-claims.py
run competitor python tests/validate-competitor-benchmark.py
run browser python tests/browser-smoke.py
run journeys python tests/browser-journey.py
run compact python tests/compact-protocol-test.py
run sourcelinks node tests/source-link-test.js
python - <<'PY'
from pathlib import Path
p=Path('_audit_logs/gates')
for f in sorted(p.glob('*.exit')):
 if f.read_text().strip()!='0': raise SystemExit('FAIL '+str(f))
print('PASS: all collected gate commands exit 0')
PY
