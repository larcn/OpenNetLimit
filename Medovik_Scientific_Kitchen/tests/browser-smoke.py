#!/usr/bin/env python3
from pathlib import Path
import re, asyncio, json, traceback, sys
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
RESULT_PATH = Path(__file__).resolve().parent / 'browser-test-results.json'


def build_bundle():
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', lambda m: f'<style>\n{(ROOT / m.group(1)).read_text(encoding="utf-8")}\n</style>', html)
    html = re.sub(r'<script src="([^"]+)"></script>', lambda m: f'<script>\n{(ROOT / m.group(1)).read_text(encoding="utf-8")}\n</script>', html)
    return html


async def main():
    results = []
    def record(name, ok, detail=None):
        results.append({'name': name, 'ok': bool(ok), 'detail': detail})
        print(('PASS ' if ok else 'FAIL ') + name, flush=True)
        if not ok:
            raise AssertionError(f'{name}: {detail}')

    page_errors = []
    console_errors = []
    bundle = build_bundle()
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        page = await browser.new_page(viewport={'width': 1440, 'height': 1000})
        page.set_default_timeout(5000)
        await page.evaluate("""
          (() => {
            const memory = Object.create(null);
            const storage = {
              getItem(k){ return Object.prototype.hasOwnProperty.call(memory,k) ? memory[k] : null; },
              setItem(k,v){ memory[k] = String(v); },
              removeItem(k){ delete memory[k]; },
              clear(){ Object.keys(memory).forEach(k => delete memory[k]); },
              key(i){ return Object.keys(memory)[i] || null; },
              get length(){ return Object.keys(memory).length; }
            };
            Object.defineProperty(window, 'localStorage', { value: storage, configurable: true });
          })();
        """)
        page.on('pageerror', lambda exc: page_errors.append(str(exc)))
        page.on('console', lambda msg: console_errors.append({'type': msg.type, 'text': msg.text}) if msg.type == 'error' else None)
        await page.set_content(bundle, wait_until='load')
        await page.wait_for_timeout(600)

        record('Application loads with main heading', await page.locator('body').get_by_text('التهيئة', exact=True).count() >= 1)
        record('Eight primary workflow steps are visible', await page.locator('.sidebar-step').count() == 8, await page.locator('.sidebar-step').count())

        record('Cooking mode switch exists', await page.get_by_role('button',name='عرض متقدم').count() == 1)
        before = await page.evaluate('SessionStore.resolveProductSpec()')
        await page.get_by_role('button',name='عرض متقدم').click()
        await page.wait_for_timeout(100)
        record('Advanced mode switch appears', await page.get_by_role('button',name='وضع التنفيذ').count() == 1)
        record('View mode does not mutate product calculation inputs', before == await page.evaluate('SessionStore.resolveProductSpec()'))
        await page.get_by_role('button',name='وضع التنفيذ').click()
        await page.wait_for_timeout(100)

        expected_step_texts = ['التهيئة','بروتوكول العجين والتحضير','الخبز','الحشو وشرح الحشو','التجميع والنضج','النتيجة والحفظ','مشاكل وحلول','قاعدة علمية']
        for index, expected in enumerate(expected_step_texts):
            await page.locator('.sidebar-step').nth(index).click()
            await page.wait_for_timeout(80)
            body = await page.locator('body').inner_text()
            record(f'Workflow step {index+1} opens: {expected}', expected in body)

        await page.locator('.sidebar-step').nth(7).click()
        await page.wait_for_timeout(100)
        record('Science reference visibly declares missing legacy evidence', 'الملف المرجعي غير متاح' in await page.locator('body').inner_text())

        # Recipe selection across all built-ins
        await page.locator('.sidebar-step').nth(0).click()
        recipe_select = page.locator('select.form-select').nth(0)
        recipe_values = await recipe_select.locator('option').evaluate_all("opts => opts.map(o => o.value).filter(Boolean)")
        record('Nine built-in dough recipes are selectable', len(recipe_values) == 9, recipe_values)
        for value in recipe_values:
            await recipe_select.select_option(value)
            await page.wait_for_timeout(80)
            session_recipe = await page.evaluate("SessionStore.resolveActiveRecipeProfile().id")
            expected_id = value.split(':')[-1]
            record(f'Recipe selection updates session: {expected_id}', session_recipe == expected_id, session_recipe)

        # Spartak is shown as spreadable batter, not balls.
        await recipe_select.select_option('builtin:dough:tetyanaSpartak')
        await page.wait_for_timeout(100)
        await page.locator('.sidebar-step').nth(5).click()
        await page.wait_for_timeout(100)
        review_text = await page.locator('body').inner_text()
        record('Spartak review says batter is spread in pan', 'يُنشر في الصينية' in review_text)

        # Shouqi does not expose a tempering tool because eggs are heated from the start.
        await page.locator('.sidebar-step').nth(0).click()
        await page.locator('select.form-select').nth(0).select_option('builtin:dough:ahmedShouqi')
        await page.locator('.sidebar-step').nth(1).click()
        await page.wait_for_timeout(100)
        record('Shouqi process does not show generic tempering button', await page.get_by_role('button', name='فتح حاسبة التمبرنج').count() == 0)

        # Aya does expose a direction-aware tempering tool.
        await page.locator('.sidebar-step').nth(0).click()
        await page.locator('select.form-select').nth(0).select_option('builtin:dough:ayaHabib')
        await page.locator('.sidebar-step').nth(1).click()
        await page.wait_for_timeout(100)
        temp_button = page.get_by_role('button', name='فتح حاسبة التمبرنج')
        record('Aya process exposes tempering tool', await temp_button.count() == 1)
        record('Tempering does not claim safe batch count', await page.get_by_text('الدفعات الآمنة', exact=True).count() == 0)
        record('Tempering does not show null target temperature as scientific goal', 'حرارة الهدف' not in await page.locator('body').inner_text())
        await temp_button.click()
        await page.wait_for_timeout(100)
        drawer_text = await page.locator('.drawer-panel').inner_text()
        record('Tempering drawer explains volumetric estimate', ('المتوسط الحجمي' in drawer_text or 'تقدير لاتزان الحرارة' in drawer_text), drawer_text[:600])
        record('Tempering drawer avoids guarantee wording', 'ضمان عدم التخثر' not in drawer_text)
        record('Tempering drawer exposes mixing direction', 'اتجاه الدمج' in drawer_text)
        await page.get_by_role('button', name='إغلاق').last.click()

        # Filling selection across all built-ins.
        await page.evaluate("SessionStore.setActiveStep('filling')")
        await page.wait_for_timeout(120)
        filling_select = page.locator('select.form-select').nth(0)
        filling_values = await filling_select.locator('option').evaluate_all("opts => opts.map(o => o.value).filter(Boolean)")
        record('Nine built-in fillings are selectable', len(filling_values) == 9, filling_values)
        for value in filling_values:
            await filling_select.select_option(value)
            await page.wait_for_timeout(60)
            session_filling = await page.evaluate("SessionStore.resolveActiveFillingProfile().id")
            expected_id = value.split(':')[-1]
            record(f'Filling selection updates session: {expected_id}', session_filling == expected_id, session_filling)

        # Raw and baked thickness are independent fields.
        await page.evaluate("SessionStore.setActiveStep('setup')")
        await page.wait_for_timeout(120)
        number_inputs = page.locator('input[type=number]')
        num_count = await number_inputs.count()
        record('Setup has separate raw and baked thickness fields', num_count >= 4, {'count':num_count,'body':(await page.locator('body').inner_text())[:800]})
        raw_input = page.get_by_label('سماكة الفرد الخام (مم)')
        baked_input = page.get_by_label('سماكة الطبقة بعد الخبز (مم)')
        await raw_input.fill('1.2')
        await raw_input.dispatch_event('change')
        await page.wait_for_function("Math.abs(SessionStore.resolveProductSpec().rawSheetThicknessMm - 1.2) < 1e-9")
        await page.wait_for_timeout(200)
        await page.get_by_label('سماكة الفرد الخام (مم)').wait_for(state='visible')
        baked_input = page.get_by_label('سماكة الطبقة بعد الخبز (مم)')
        await baked_input.fill('2.6')
        await baked_input.dispatch_event('change')
        await page.wait_for_function("Math.abs(SessionStore.resolveProductSpec().targetBakedLayerThicknessMm - 2.6) < 1e-9")
        spec = await page.evaluate("SessionStore.resolveProductSpec()")
        record('Raw thickness stored independently', abs(spec['rawSheetThicknessMm'] - 1.2) < 1e-9, spec)
        record('Baked thickness stored independently', abs(spec['targetBakedLayerThicknessMm'] - 2.6) < 1e-9, spec)

        # Invalid imported values are normalized.
        normalized = await page.evaluate("""
          (() => {
            SessionStore.updateProductSpec({d1:-4,layers:0,rawSheetThicknessMm:-3,targetBakedLayerThicknessMm:0,wastePct:120});
            return SessionStore.resolveProductSpec();
          })()
        """)
        record('Invalid product values are clamped', normalized['d1'] >= 5 and normalized['layers'] >= 1 and normalized['wastePct'] <= 50, normalized)

        # XSS payload remains text and does not create executable nodes.
        xss = await page.evaluate("""
          (() => {
            window.__medovikXss = 0;
            const payload = '</textarea><img id="xss-probe" src=x onerror="window.__medovikXss=1">';
            SessionStore.setPhaseNote('dough', payload);
            const stored = SessionStore.getPhaseNote('dough');
            SessionStore.setActiveStep('review');
            return {stored, flag: window.__medovikXss, image: !!document.querySelector('#xss-probe')};
          })()
        """)
        await page.wait_for_timeout(100)
        xss_after = await page.evaluate("({flag:window.__medovikXss||0,image:!!document.querySelector('#xss-probe')})")
        record('Stored XSS payload is neutralized', '<' not in xss['stored'] and not xss_after['image'] and xss_after['flag'] == 0, {'before':xss,'after':xss_after})

        # Save the formula currently displayed after scaling, not the source formula.
        await page.evaluate("""
          (() => {
            SessionStore.reset();
            SessionStore.updateProductSpec({d1:26,layers:9,rawSheetThicknessMm:1.4,targetBakedLayerThicknessMm:2.2,estimatedBakedLayerThicknessMm:2.2});
            SessionStore.setActiveStep('review');
          })()
        """)
        await page.wait_for_timeout(150)
        expected_mass = await page.evaluate("WorkflowContext.getCurrent().batch.scaledFormula.totalMass()")
        dough_save_form = page.locator('form.save-form').filter(has=page.locator('input[name="save-name"]')).nth(0)
        await dough_save_form.locator('input[name="save-name"]').fill('اختبار حفظ الصيغة الظاهرة')
        await dough_save_form.get_by_role('button', name='حفظ الوصفة').click()
        await page.wait_for_timeout(120)
        saved_data = await page.evaluate("""
          (() => {
            const records = RecipeLabStore.listRecords('dough').filter(r => r.origin === 'custom');
            const last = records[records.length - 1];
            const formula = last ? Formula.fromSnapshot(last.formulaSnapshot) : null;
            return {count:records.length,mass:formula ? formula.totalMass() : null,status:RecipeLabStore.getLastPersistStatus()};
          })()
        """)
        record('Save stores the currently scaled dough formula', saved_data['count'] >= 1 and abs(saved_data['mass'] - expected_mass) < 0.05, {'expected':expected_mass,'saved':saved_data})
        notice = page.locator('[data-app-notice]')
        await notice.wait_for(state='visible')
        status_text = await notice.inner_text()
        record('Save presents a clear success message', 'تم حفظ العجين' in status_text, status_text)

        # Tool registry: render every tool in an isolated host without throwing.
        tool_results = await page.evaluate("""
          (() => {
            const output = [];
            const context = {session:SessionStore.get(),analysis:WorkflowContext.getCurrent(),onRefresh(){},onClose(){}};
            ToolRegistry.getAll().forEach(tool => {
              const host = document.createElement('div');
              document.body.appendChild(host);
              try {
                ToolRegistry.open(tool.id, host, context);
                output.push({id:tool.id,ok:true,text:host.textContent.slice(0,80)});
              } catch (error) {
                output.push({id:tool.id,ok:false,error:String(error && error.stack || error)});
              }
              host.remove();
            });
            return output;
          })()
        """)
        bad_tools = [item for item in tool_results if not item['ok']]
        record('Every registered tool renders without an exception', len(bad_tools) == 0, bad_tools)

        # Normal UI language must stay practical rather than audit-heavy.
        full_text = await page.locator('body').inner_text()
        record('Normal interface avoids scientific-confidence panel', 'الثقة العلمية المستقلة' not in full_text and 'اكتمال بيانات المصدر' not in full_text)
        record('Normal filling UI does not call the compound metric Brix', 'Brix الحشو' not in full_text and 'بريكس الحشو' not in full_text)

        # Final error gate.
        record('No uncaught page errors', len(page_errors) == 0, page_errors)
        record('No browser console errors', len(console_errors) == 0, console_errors)
        await page.screenshot(path=str(Path(__file__).resolve().parent / 'final-ui.png'), full_page=True)
        await browser.close()

    report = {
        'generatedAt': __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),
        'total': len(results),
        'passed': sum(1 for item in results if item['ok']),
        'failed': sum(1 for item in results if not item['ok']),
        'pageErrors': page_errors,
        'consoleErrors': console_errors,
        'results': results
    }
    RESULT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'total':report['total'],'passed':report['passed'],'failed':report['failed']}, ensure_ascii=False))
    return 0 if report['failed'] == 0 else 1

if __name__ == '__main__':
    try:
        sys.exit(asyncio.run(main()))
    except Exception as exc:
        traceback.print_exc()
        RESULT_PATH.write_text(json.dumps({'fatal':str(exc),'traceback':traceback.format_exc()}, ensure_ascii=False, indent=2), encoding='utf-8')
        sys.exit(1)
