#!/usr/bin/env python3
"""Build a truthful acceptance index from actual gate logs and exit artifacts."""
from pathlib import Path
import json,datetime
ROOT=Path(__file__).resolve().parent.parent
STAMP=datetime.date.today().isoformat()
GATES=[
 ('SOURCE_INTEGRITY','الملفات المرجعية والعجائن والحشوات لم تتغير','tests/fixtures/medovik-v6-source-baseline.json','node tests/check-source-baseline.js','baseline','PASS: exact original hashes'),
 ('CORE_MATH','الحسابات العلمية المستقلة تحفظ الكتلة وتوافق الهندسة','tests/science-reference-check.py','python tests/science-reference-check.py','reference','PASS: independent mass accounting'),
 ('RECIPE_PROTOCOLS','تبقى مسارات Shouqi وSpartak وآية منفصلة','tests/browser-smoke.py','python tests/browser-smoke.py','browser','PASS Shouqi process does not show generic tempering button'),
 ('STORAGE','الحفظ يتعامل مع كمية العجين المحجّمة','tests/browser-smoke.py','python tests/browser-smoke.py','browser','PASS Save stores the currently scaled dough formula'),
 ('STORAGE_REOPEN_SNAPSHOT','استعادة بيانات جلسة محفوظة عبر سياق صفحة جديد (ليست إعادة فتح HTTP)','tests/browser-journey.py','python tests/browser-journey.py','journeys','PASS save-reload'),
 ('MOBILE_UX','رحلة هاتف 390px تعمل دون خطأ JS أو تجاوز أفقي','tests/browser-journey.py','python tests/browser-journey.py','journeys','PASS normal-recipe'),
 ('TEMPERING_UI','واجهة التمبرنج لا تزعم معرفة عدد دفعات آمن','tests/browser-smoke.py','python tests/browser-smoke.py','browser','PASS Tempering does not claim safe batch count'),
 ('NODE_REGRESSION','انحدار الحسابات والبيانات في Node','tests/run-node-tests.js','node tests/run-node-tests.js','node','"failed": 0'),
 ('STATIC_AUDIT','اجتياز الفحص الثابت المدرج بالمشروع','tests/static-audit.py','python tests/static-audit.py','static','"failed": 0'),
 ('SCIENTIFIC_CLAIMS_TRACE','اكتمال سجل الادعاءات ولا يثبت صحة كل مرجع','tests/fixtures/science-claims.json','python tests/check-science-claims.py','scienceclaims','PASS: 8 claims traced'),
 ('COMPETITOR_EVIDENCE','اكتمال سجلات المنافسين دون ادعاء استخدام مباشر','tests/fixtures/competitor-benchmark.json','python tests/validate-competitor-benchmark.py','competitor','PASS: 18 competitor evidence rows'),
 ('MODEL_SENSITIVITY','تحليل حساسية محكوم بمدخلات افتراضية','tests/science-sensitivity.py','python tests/science-sensitivity.py','sensitivity','PASS: for model density'),
 ('COMPACT_COOK_PROTOCOL','وضع التنفيذ يعرض الخطوة الحالية كاملة ويطوي غير النشطة مع بقاء العرض المتقدم','tests/compact-protocol-test.py','python tests/compact-protocol-test.py','compact','PASS compact-protocol:'),
 ('TRACEABLE_RECIPE_LINKS','روابط المصدر الأولي متاحة لوصفتين مع إبقاء مطابقة المقادير غير مكتملة','tests/source-link-test.js','node tests/source-link-test.js','sourcelinks','PASS: primary source links documented')]
rows=[]
for ident,req,source,command,slug,marker in GATES:
 log=ROOT/'_audit_logs'/'gates'/f'{slug}.log';side=ROOT/'_audit_logs'/'gates'/f'{slug}.exit'
 executed=log.exists() and side.exists()
 code=side.read_text().strip() if executed else None
 found=marker in log.read_text(errors='replace') if executed else False
 status='PASS' if code=='0' and found else 'FAIL' if executed else 'NOT_RUN'
 r={'id':ident,'requirement':req,'source':source,'command':command,'expected':'exit 0; '+marker,'observed':marker if found else ('marker missing' if executed else ''),'status':status,'artifact':str(log.relative_to(ROOT)) if executed else None,'exitArtifact':str(side.relative_to(ROOT)) if executed else None,'runDate':STAMP if executed else None}
 if status!='PASS':r['reason']='test not run' if not executed else f'exit code {code}, marker found={found}'
 rows.append(r)
for ident,req,why in [
 ('HUMAN_COOK_REVIEW','شخص غير مطور يستطيع اتباع وصفة كاملة عمليًا','لم تجر تجربة استخدام مع شخص مستقل'),
 ('HOME_OVEN_PREDICTION','تطابق أوزان وسمك المخبوز فعليًا مع الفرن المنزلي','لا توجد قياسات منزلية مصرح بها؛ النموذج لا يدعي المعايرة'),
 ('COMPETITOR_DIRECT_USE','قياس النقرات والزمن مقابل المنافسين','البيانات الحالية من صفحات المنافسين الرسمية فقط'),
 ('INDEPENDENT_FOOD_SCIENCE_REVIEW','فحص باحث علوم غذاء مستقل للمصادر والاستنتاجات','لم يتوفر مراجع متخصص مستقل'),
 ('NATIVE_BROWSER_RELAUNCH','إعادة فتح ملف/عنوان من سياق تخزين المتصفح الحقيقي','المتصفح المعزول منع file:// وlocalhost إداريًا؛ اختبار الاستعادة يحاكي نقل snapshot إلى صفحة جديدة وليس إعادة الفتح الأصلية')]:
 rows.append({'id':ident,'requirement':req,'source':'docs/USER_CHECKS_AR.md','command':None,'expected':'تحقق بشري/خارجي','observed':None,'status':'NOT_VERIFIED','artifact':None,'reason':why})
(ROOT/'tests/acceptance-matrix.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
for x in rows:print(x['id'],x['status'])
