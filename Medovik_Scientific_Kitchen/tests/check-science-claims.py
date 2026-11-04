#!/usr/bin/env python3
"""Claim traceability/completeness gate. Not a scientific peer-review substitute."""
from pathlib import Path
import json,sys
root=Path(__file__).resolve().parent.parent
fixture=root/'tests/fixtures/science-claims.json'
if not fixture.exists():raise SystemExit('FAIL: science claim ledger missing')
rows=json.loads(fixture.read_text(encoding='utf-8'))
needed={'mass-balance','geometry','egg-thermal-mixing','honey-sugar-chemistry','bicarbonate','moisture-migration','filling-sweetness-density','food-safety'}
assert {r['claimId'] for r in rows}==needed
for r in rows:
    for f in ('claimId','sourceCodePath','displayedClaim','kind','primarySourceUri','checkedDate','scope','limitations','decision','testId'):
        assert f in r,(r.get('claimId'),f)
    assert (root/r['sourceCodePath']).exists(),r['sourceCodePath']
    assert r['kind'] in ('LAW','LITERATURE','MODEL','EDITORIAL','UNVERIFIED')
    assert r['decision'] in ('RETAIN','QUALIFY','CORRECT','UNRESOLVED')
    if r['decision']=='RETAIN': assert r['primarySourceUri'] or r.get('derivation'),r['claimId']
    if r['primarySourceUri']: assert r['primarySourceUri'].startswith('https://'),r['claimId']
print(f'PASS: {len(rows)} claims traced; reviewer still must check whether sources support the exact claims.')
