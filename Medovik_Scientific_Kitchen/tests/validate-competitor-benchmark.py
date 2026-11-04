#!/usr/bin/env python3
"""Completeness validator; it cannot authenticate external product claims."""
from pathlib import Path
import json,sys
p=Path(__file__).resolve().parent/'fixtures/competitor-benchmark.json'
if not p.exists(): raise SystemExit('FAIL: benchmark fixture missing')
data=json.loads(p.read_text(encoding='utf-8'))
expected={'Paprika Recipe Manager 3','SideChef','Samsung Food'}
scenarios={'select','rescale','instructions','next-previous','save','revisit'}
rows=data.get('rows',[])
for product in expected:
    actual={r.get('scenarioId') for r in rows if r.get('product')==product}
    if actual!=scenarios:raise SystemExit(f'FAIL: incomplete scenarios for {product}: {actual}')
for r in rows:
    for field in ('product','scenarioId','evidenceType','url','capturedAt','accessible','stepsObserved','unknowns','status'):
        if field not in r:raise SystemExit(f'FAIL: {field} missing for {r}')
    if r['evidenceType'] not in {'DIRECT_INTERACTION','OFFICIAL_DOCUMENTATION','PUBLIC_SCREENSHOT'}:raise SystemExit('FAIL: invalid evidence type')
    if not str(r['url']).startswith('https://'):raise SystemExit('FAIL: source URL missing')
    if r['evidenceType']!='DIRECT_INTERACTION' and (r['stepsObserved'] or r.get('interactionCount') is not None):raise SystemExit('FAIL: fabricated interaction counts')
    if r['status'] not in {'DOCUMENTED','NOT_VERIFIED','ACCESS_BLOCKED'}:raise SystemExit('FAIL: status invalid')
print(f'PASS: {len(rows)} competitor evidence rows complete; external interactions remain untested')
