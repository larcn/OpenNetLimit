"""Reference tools must not masquerade as mandatory cooking steps."""
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
  await page.locator('.mobile-rail button').nth(3).click()
  await page.wait_for_timeout(130)
  assert await page.get_by_role('progressbar').get_attribute('aria-valuemax')=='6', 'production workflow has six stages'
  await page.locator('.mobile-rail button').nth(5).click()
  await page.wait_for_timeout(120)
  assert await page.locator('.journey-dock-next').count()==0, 'review ends core workflow; references are optional'
  await page.locator('.mobile-rail button').nth(7).click()
  await page.wait_for_timeout(150)
  assert await page.get_by_role('progressbar').count()==0, 'science reference must not be progressbar'
  assert await page.locator('.journey-dock').get_by_role('button',name='العودة إلى العمل').count()==1, 'return to work from reference'
  await page.locator('.journey-dock').get_by_role('button',name='العودة إلى العمل').click()
  await page.wait_for_timeout(130)
  assert await page.evaluate('SessionStore.getActiveStep()')=='review','return to last production phase'
  await browser.close()
 print('PASS six-step core flow and two optional scientific reference areas')
if __name__=='__main__':asyncio.run(main())
