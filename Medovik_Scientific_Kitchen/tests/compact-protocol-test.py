#!/usr/bin/env python3
"""Proof that cooking mode reduces active-protocol overload without losing detail."""
import asyncio, runpy
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
bundle=runpy.run_path(str(ROOT/'tests/browser-smoke.py'))['build_bundle']()

async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'],headless=True)
  page=await browser.new_page(viewport={'width':390,'height':844})
  await page.evaluate('''() => {const d={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return d[k]||null},setItem(k,v){d[k]=String(v)},removeItem(k){delete d[k]},key(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}});}''')
  await page.set_content(bundle,wait_until='load')
  await page.locator('.mobile-rail button').nth(3).click()
  await page.wait_for_timeout(200)
  before=await page.locator('.protocol-stack .protocol-block').count()
  assert before>=2, f'Cannot inspect multi-step filling protocol: {before}'
  folded=await page.locator('.protocol-stack details.protocol-step-fold:not([open])').count()
  assert folded>=1, f'Expected folded later steps in cook mode, found {folded}'
  assert await page.locator('.protocol-stack .protocol-step-active').count()==1, 'Need one fully visible active step'
  cook_height=await page.evaluate('document.documentElement.scrollHeight')
  await page.screenshot(path=str(ROOT/'_audit_logs'/'resume-390-filling-compact.png'),full_page=True)
  active=page.locator('.protocol-stack .protocol-step-active').first
  assert await active.locator('input[type=checkbox]').is_visible(), 'Active step checkbox must stay visible'
  await active.locator('input[type=checkbox]').check()
  await page.wait_for_timeout(250)
  assert await page.locator('.protocol-stack .protocol-step-active').count()==1, 'Active step updates on completion'
  await page.get_by_role('button',name='عرض متقدم').click()
  await page.wait_for_timeout(150)
  assert await page.locator('.protocol-stack details.protocol-step-fold:not([open])').count()==0, 'Advanced must expose all steps'
  advanced_height=await page.evaluate('document.documentElement.scrollHeight')
  assert advanced_height>cook_height, f'Advanced view should expose more content: {advanced_height}, {cook_height}'
  await page.get_by_role('button',name='وضع التنفيذ').click()
  await page.wait_for_timeout(150)
  assert await page.locator('.protocol-stack details.protocol-step-fold:not([open])').count()>=1, 'Back to compact cooking mode'
  print(f'PASS compact-protocol: {before} steps, folded={folded}, cookHeight={cook_height}, advancedHeight={advanced_height}, active checkbox and advanced navigation')
  await browser.close()

if __name__=='__main__': asyncio.run(main())
