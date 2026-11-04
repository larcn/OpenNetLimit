#!/usr/bin/env python3
"""UI redesign acceptance: run at baseline RED, then after implementation GREEN."""
from pathlib import Path
import asyncio, runpy, json
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
BUNDLE=runpy.run_path(str(ROOT/'tests/browser-smoke.py'))['build_bundle']
OUT=Path(__file__).resolve().parents[2]/'evidence'
OUT.mkdir(exist_ok=True)

async def main():
    cases=[]
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True, executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        for width,height in [(390,844),(768,1024),(1366,860),(375,812)]:
            page=await browser.new_page(viewport={'width':width,'height':height}, reduced_motion='reduce')
            err=[]
            page.on('pageerror',lambda e:err.append(str(e)))
            await page.set_content(BUNDLE(),wait_until='load')
            await page.wait_for_timeout(170)
            assert await page.locator('.journey-progress[role=progressbar]').count()==1, 'must expose meaningful journey progress'
            assert await page.locator('.workflow-hero').count()==1, 'must expose current-step context'
            assert await page.locator('.sidebar-step').count()==8
            assert await page.locator('.mobile-rail button').count()==8
            assert await page.locator('.mobile-rail').evaluate('(n)=>getComputedStyle(n).overflowX')!='auto', 'no swipe-only workflow navigation'
            assert await page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth'), 'horizontal overflow'
            assert await page.locator('#main-workspace').count()==1, 'skip target'
            assert await page.locator('a.skip-link[href="#main-workspace"]').count()==1
            assert not err,err
            await page.locator('.mobile-rail button').nth(3).click(force=True) if width<=960 else await page.locator('.sidebar-step').nth(3).click()
            await page.wait_for_timeout(170)
            assert await page.locator('.workflow-hero').get_by_text('الحشو',exact=False).count()>0
            assert await page.get_by_role('progressbar').get_attribute('aria-valuenow')=='4'
            assert await page.locator('button.view-mode-btn').count()==1
            before=await page.evaluate('SessionStore.resolveProductSpec()')
            await page.locator('button.view-mode-btn').click()
            await page.wait_for_timeout(150)
            assert before==await page.evaluate('SessionStore.resolveProductSpec()'),'advanced switch mutated product'
            await page.locator('button.view-mode-btn').click()
            await page.wait_for_timeout(150)
            if width<=960:
                assert await page.locator('.journey-dock').is_visible(), 'mobile dock needed'
                assert await page.locator('.journey-dock button').count()>=1
            await page.screenshot(path=str(OUT/f'ui-v2-{width}.png'),full_page=False)
            cases.append({'viewport':width,'scrollHeight':await page.evaluate('document.documentElement.scrollHeight'),'errors':err})
            await page.close()
        # Escape drawer control tested at desktop
        page=await browser.new_page(viewport={'width':1366,'height':850})
        await page.set_content(BUNDLE(),wait_until='load')
        await page.get_by_role('button',name='الأدوات').click()
        await page.wait_for_timeout(170)
        assert await page.locator('.drawer-panel.is-open').count()==1
        await page.keyboard.press('Escape')
        await page.wait_for_timeout(170)
        assert await page.locator('.drawer-panel.is-open').count()==0,'Escape should close drawer'
        await page.close()
        await browser.close()
    (OUT/'ui-redesign-metrics.json').write_text(json.dumps(cases,ensure_ascii=False,indent=2),encoding='utf-8')
    print('PASS ui redesign 4 breakpoints, semantics, viewport, mode, and drawer escape')

if __name__=='__main__': asyncio.run(main())
