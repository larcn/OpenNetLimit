#!/usr/bin/env python3
"""Validate actual automated verification artifacts; not a scientific truth oracle."""
from pathlib import Path
import json, sys
ROOT=Path(__file__).resolve().parent.parent
MATRIX=ROOT/'tests/acceptance-matrix.json'
MANDATORY={'SOURCE_INTEGRITY','CORE_MATH','RECIPE_PROTOCOLS','STORAGE','MOBILE_UX','TEMPERING_UI'}
ALLOWED={'PASS','FAIL','NOT_RUN','NOT_VERIFIED'}

def safe_file(relative):
    if not isinstance(relative,str) or not relative or Path(relative).is_absolute() or '..' in Path(relative).parts:
        raise ValueError(f'unsafe artifact: {relative!r}')
    p=(ROOT/relative).resolve()
    if not p.is_relative_to(ROOT): raise ValueError('Artifact outside workspace')
    return p

def verify():
    if not MATRIX.exists(): raise ValueError('acceptance matrix missing')
    cases=json.loads(MATRIX.read_text(encoding='utf8'))
    if not isinstance(cases,list): raise ValueError('acceptance matrix must be a list')
    seen=set();bad=[]
    for c in cases:
        ident=c.get('id');status=c.get('status');command=c.get('command')
        if ident in seen or not isinstance(ident,str): bad.append(f'duplicate/bad id {ident}')
        seen.add(ident)
        if status not in ALLOWED: bad.append(f'{ident}: status invalid')
        if not c.get('requirement') or not c.get('source'): bad.append(f'{ident}: missing requirement/source')
        if status=='PASS':
            if not command or not c.get('expected') or not c.get('observed') or not c.get('artifact'):
                bad.append(f'{ident}: PASS needs command expected observed artifact');continue
            try:
                p=safe_file(c['artifact']);exit_p=safe_file(c.get('exitArtifact',''))
                if not p.is_file() or not exit_p.is_file(): bad.append(f'{ident}: evidence missing');continue
                log=p.read_text(encoding='utf8',errors='replace')
                code=exit_p.read_text(encoding='utf8').strip()
                if code!='0': bad.append(f'{ident}: nonzero/unknown exit={code}');continue
                if c['observed'] not in log: bad.append(f'{ident}: expected observed marker not in log')
                if not c.get('runDate'): bad.append(f'{ident}: missing runDate')
            except Exception as e:bad.append(f'{ident}: invalid artifact: {e}')
        elif status=='NOT_VERIFIED':
            if not c.get('reason'): bad.append(f'{ident}: unverified must have reason')
    if not MANDATORY.issubset(seen):bad.append(f'missing required categories: {MANDATORY-seen}')
    if bad: raise ValueError('; '.join(bad))
    print(f'PASS: {len(cases)} acceptance rows validated; PASS does not imply scientific/field validation')
    for c in cases: print(c['id'],c['status'])

if __name__=='__main__':
    try: verify()
    except Exception as e: print('FAIL:',e,file=sys.stderr);sys.exit(1)
