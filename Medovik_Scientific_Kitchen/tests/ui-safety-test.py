import asyncio,runpy
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
BUNDLE=runpy.run_path(str(ROOT/'tests/browser-smoke.py'))['build_bundle']
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  page=await browser.new_page(viewport={'width':390,'height':844})
  await page.set_content(BUNDLE(),wait_until='load')
  await page.evaluate("SessionStore.updateProductSpec({d1:26});window.confirm=()=>false;")
  await page.wait_for_timeout(120)
  await page.get_by_role('button',name='جلسة جديدة').click()
  await page.wait_for_timeout(120)
  assert await page.evaluate('SessionStore.resolveProductSpec().d1')==26,'Cancel must retain unsaved session data'
  await page.evaluate("window.confirm=()=>true;")
  await page.get_by_role('button',name='جلسة جديدة').click()
  await page.wait_for_timeout(140)
  assert await page.evaluate('SessionStore.resolveProductSpec().d1')!=26,'Confirm should reset session'
  await browser.close()
 print('PASS session reset cancel and confirm')
if __name__=='__main__':asyncio.run(main())
