"""Deterministic responsive/regression observations, not a human UX acceptance test."""
from pathlib import Path
import asyncio,runpy,json
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
BUNDLE=runpy.run_path(str(ROOT/'tests/browser-smoke.py'))['build_bundle']
OUT=ROOT.parent/'evidence'

async def main():
 cases=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'],headless=True)
  for width,height in [(375,812),(390,844),(768,1024),(1366,860)]:
   page=await browser.new_page(viewport={'width':width,'height':height},reduced_motion='reduce')
   errors=[]
   page.on('pageerror',lambda ex:errors.append(str(ex)))
   await page.set_content(BUNDLE(),wait_until='load');await page.wait_for_timeout(140)
   if width==375:
    await page.keyboard.press('Tab')
    assert await page.evaluate("document.activeElement?.classList.contains('skip-link')"),'keyboard skip target must be first'
   for step in ['setup','dough-protocol','baking','filling','assembly','review','troubleshooting','science']:
    await page.evaluate('(s)=>SessionStore.setActiveStep(s)',step)
    await page.wait_for_timeout(100)
    state=await page.evaluate("""() => ({scrollWidth:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,h:document.documentElement.scrollHeight,progress:document.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow'),title:document.querySelector('h1')?.innerText})""")
    assert state['scrollWidth']<=state['viewport'], (width,step,'overflow',state)
    assert state['title'] and (state['progress'] if step not in ('troubleshooting','science') else True),(width,step,'missing title or production progress')
    cases.append({'viewport':width,'step':step,'scrollHeight':state['h'],'horizontalOverflowPx':state['scrollWidth']-state['viewport'],'progress':state['progress']})
   # Verify key mobile hit targets / controls
   if width<=768:
    sizes=await page.locator('.mobile-stage,.journey-dock button,.topbar-actions button').evaluate_all("ns => ns.map(n=>({label:n.getAttribute('aria-label')||n.innerText,h:Math.round(n.getBoundingClientRect().height),w:Math.round(n.getBoundingClientRect().width)}))")
    assert all(x['h']>=44 and x['w']>=44 for x in sizes),(width,'undersized control',[x for x in sizes if x['h']<44 or x['w']<44])
   assert not errors,(width,errors)
   await page.close()
  await browser.close()
 (OUT/'responsive-32-cases.json').write_text(json.dumps({'results':cases,'total':len(cases),'allPassed':True},ensure_ascii=False,indent=2),encoding='utf-8')
 print(f'PASS {len(cases)} responsive step × viewport observations; no page errors, overflow, keyboard or touch target failures')

if __name__=='__main__':asyncio.run(main())
