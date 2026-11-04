#!/usr/bin/env python3
from pathlib import Path
from html.parser import HTMLParser
import json, subprocess, datetime, re, sys

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / 'static-audit-results.json'

class IndexParser(HTMLParser):
    def __init__(self):
        super().__init__(); self.scripts=[]; self.styles=[]; self.ids=[]
    def handle_starttag(self, tag, attrs):
        data=dict(attrs)
        if tag=='script' and data.get('src'): self.scripts.append(data['src'])
        if tag=='link' and data.get('rel')=='stylesheet' and data.get('href'): self.styles.append(data['href'])
        if data.get('id'): self.ids.append(data['id'])

results=[]
def check(name, ok, detail=None):
    results.append({'name':name,'ok':bool(ok),'detail':detail})

html=(ROOT/'index.html').read_text(encoding='utf-8')
p=IndexParser(); p.feed(html)
refs=p.scripts+p.styles
missing=[ref for ref in refs if not (ROOT/ref).is_file()]
check('All index assets exist', not missing, missing)
dups=sorted({x for x in p.ids if p.ids.count(x)>1})
check('No duplicate static HTML ids', not dups, dups)

js=sorted(ROOT.rglob('*.js'))
syntax=[]
for file in js:
    proc=subprocess.run(['node','--check',str(file)],capture_output=True,text=True)
    if proc.returncode: syntax.append({'file':str(file.relative_to(ROOT)),'error':proc.stderr})
check('All JavaScript files pass node --check', not syntax, syntax)

production_text='\n'.join(f.read_text(encoding='utf-8',errors='replace') for f in ROOT.rglob('*') if f.is_file() and f.suffix in {'.js','.html','.css'} and 'tests' not in f.parts and 'AUDIT_TRAIL' not in f.parts)
check('No legacy app-v5 or v5-styles references in production', not re.search(r'app-v5\.js|v5-styles\.css',production_text))
check('No TODO or FIXME markers in production code', not any(re.search(r'\b(?:TODO|FIXME)\b', f.read_text(encoding='utf-8',errors='replace'), re.I) for f in ROOT.rglob('*.js') if 'tests' not in f.parts))
check('No executable javascript: URL appears in index.html', not re.search(r'(?:href|src)\s*=\s*[\"\']\s*javascript:', html, re.I))
check('Main workflow contains assembly and review', all(term in (ROOT/'app-v6.js').read_text(encoding='utf-8') for term in ["'assembly'","'review'"]))
check('Normal UI omits audit confidence phrases', not re.search(r'الثقة العلمية المستقلة|اكتمال بيانات المصدر', (ROOT/'app-v6.js').read_text(encoding='utf-8')+(ROOT/'app-tools.js').read_text(encoding='utf-8')))

report={'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'total':len(results),'passed':sum(r['ok'] for r in results),'failed':sum(not r['ok'] for r in results),'results':results}
OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'total':report['total'],'passed':report['passed'],'failed':report['failed']},ensure_ascii=False))
if report['failed']:
    for r in results:
        if not r['ok']: print('FAIL',r['name'],r['detail'],file=sys.stderr)
    sys.exit(1)
