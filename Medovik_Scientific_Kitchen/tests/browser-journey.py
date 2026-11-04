#!/usr/bin/env python3
"""Real Chromium actions; action counts are only those observed here."""
from pathlib import Path
import argparse,asyncio,json,sys
import runpy
from playwright.async_api import async_playwright
import runpy
ROOT=Path(__file__).resolve().parent.parent
build_bundle=runpy.run_path(str(ROOT/"tests"/"browser-smoke.py"))["build_bundle"]


async def run():
    parser=argparse.ArgumentParser();parser.add_argument('--output',default=str(ROOT/'_audit_logs'/'journeys.json')); args=parser.parse_args()
    output=Path(args.output); output.parent.mkdir(parents=True,exist_ok=True)
    results=[]
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        for width,name in [(390,'normal-recipe'),(1366,'custom-filling'),(390,'save-reload'),(768,'tablet-protocol')]:
            page=await browser.new_page(viewport={'width':width,'height':844})
            page.set_default_timeout(8000); path=[]; errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            await page.evaluate('''() => {const db={};const store={getItem(k){return db[k]??null},setItem(k,v){db[k]=String(v)},removeItem(k){delete db[k]},key(i){return Object.keys(db)[i]||null},get length(){return Object.keys(db).length}};Object.defineProperty(window,'localStorage',{value:store,configurable:true});}''')
            await page.set_content(build_bundle(),wait_until='load');await page.wait_for_timeout(180)
            ok=True; detail='';masses=[]
            nav=page.locator('.mobile-rail button' if width<=768 else '.sidebar-step')
            try:
                if name in ('normal-recipe','save-reload'):
                    await nav.nth(0).click();await page.wait_for_timeout(300);path.append('open setup')
                    await page.locator('select.form-select').first.select_option('builtin:dough:ayaHabib');path.append('select recipe')
                    masses.append(await page.evaluate('SessionStore.resolveProductSpec().d1'))
                    await nav.nth(1).click();await page.wait_for_timeout(300);path.append('open dough')
                    assert await page.locator('.cook-brief').count()==1
                    assert await page.get_by_text('الخطوة الحالية',exact=False).count()>0
                    await nav.nth(3).click();await page.wait_for_timeout(300);path.append('open filling')
                    assert await page.locator('.cook-brief').count()==1
                    if name=='save-reload':
                        await page.locator('form.save-form [name="save-name"]').fill('Journey Saved Filling');path.append('enter saved title')
                        await page.locator('form.save-form button[type="submit"]').click();await page.wait_for_timeout(320);path.append('save filling')
                        assert await page.get_by_text('تم حفظ',exact=False).count()>0
                        assert any(r.get('name')=='Journey Saved Filling' for r in await page.evaluate('RecipeLabStore.listRecords("filling")'))
                        snapshot=await page.evaluate('''() => {const result={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);result[k]=localStorage.getItem(k)}return result}''')
                        await page.close()
                        page=await browser.new_page(viewport={'width':width,'height':844})
                        page.on('pageerror',lambda e:errors.append(str(e)))
                        await page.evaluate('''(snapshot) => {const db={...snapshot};const store={getItem(k){return db[k]??null},setItem(k,v){db[k]=String(v)},removeItem(k){delete db[k]},key(i){return Object.keys(db)[i]||null},get length(){return Object.keys(db).length}};Object.defineProperty(window,'localStorage',{value:store,configurable:true});}''',snapshot)
                        await page.set_content(build_bundle(),wait_until='load');path.append('restart with restored storage snapshot')
                        await page.wait_for_timeout(300)
                        assert any(r.get('name')=='Journey Saved Filling' for r in await page.evaluate('RecipeLabStore.listRecords("filling")'))
                elif name=='custom-filling':
                    await nav.nth(3).click();await page.wait_for_timeout(300);path.append('open filling')
                    await page.get_by_role('button',name='حشو حر').click();path.append('choose custom filling')
                    await page.wait_for_timeout(160)
                    assert await page.locator('.editor-shell').count()>=1
                    await page.get_by_role('button',name='حشو من المكتبة').click();path.append('restore reference filling')
                    await page.wait_for_timeout(160)
                    assert await page.locator('select.form-select').count()>=1
                else:
                    await nav.nth(2).click();await page.wait_for_timeout(300);path.append('open baking')
                    assert await page.locator('.cook-brief').count()==1
                    await page.get_by_role('button',name='عرض متقدم').click();path.append('advanced mode')
                    await page.get_by_role('button',name='وضع التنفيذ').click();path.append('cooking mode')
            except Exception as exc:
                ok=False;detail=f'{type(exc).__name__}: {exc!r}'
            metrics=await page.evaluate('''() => ({scrollHeight: document.documentElement.scrollHeight, viewport:innerHeight, documentWidth: document.documentElement.scrollWidth, clientWidth:document.documentElement.clientWidth})''')
            image_path=ROOT/'_audit_logs'/f'journey-{width}-{name}.png'
            await page.screenshot(path=str(image_path),full_page=True)
            results.append({'viewport':width,'recipe':'ayaHabib' if 'normal' in name or 'save' in name else None,
                'filling':'reference' if name!='custom-filling' else 'custom-then-reference','scenario':name,
                'actionPath':path,'actionCount':len(path),'scrollDistance':max(0,metrics['scrollHeight']-metrics['viewport']),
                'measuredAs':'available vertical scroll extent, NOT finger-scrolling trace',
                'errors':errors+([detail] if detail else []),'success':ok and not errors,'pageMetrics':metrics,
                'screenshot':str(image_path.relative_to(ROOT))})
            await page.close()
        await browser.close()
    output.write_text(json.dumps({'measuredAt':'2026-10-24','scenarios':results},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    for row in results: print(('PASS' if row['success'] else 'FAIL'),row['scenario'],'actions=',row['actionCount'],'scrollRange=',row['scrollDistance'],'errors=',row['errors'])
    return 0 if all(r['success'] for r in results) else 1

if __name__=='__main__': sys.exit(asyncio.run(run()))
