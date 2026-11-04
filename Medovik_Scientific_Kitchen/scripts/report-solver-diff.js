'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { loadMedovik, ROOT_DIR } = require('../tests/harness/load-medovik');

const FILLING_IDS = [
  'classic_sourcream_frosting',
  'classic_dulce_sourcream',
  'shouqi_1',
  'shouqi_2',
  'shouqi_3',
  'ayahabib',
  'hiba',
  'younis_cream1',
  'younis_cream2'
];

const DELTAS = [-30, -15, -5, 5, 15, 30];

function fmtNum(val, digits = 2) {
  if (val === null || val === undefined || !Number.isFinite(Number(val))) return '—';
  return Number(val).toFixed(digits);
}

function pctDrift(before, after) {
  const b = Number(before);
  const a = Number(after);
  if (!Number.isFinite(b) || !Number.isFinite(a) || Math.abs(b) < 1e-9) return 0;
  return ((a - b) / b) * 100;
}

function runSuite(mode) {
  const ctx = loadMedovik();
  ctx.MedovikSweetnessSolverMode = mode;
  const rows = new Map();

  for (const fillingId of FILLING_IDS) {
    ctx.SessionStore.reset();
    ctx.SessionStore.setRecipe('ayaHabib');
    ctx.SessionStore.setFilling(fillingId);
    const config = ctx.SessionStore.resolveProductSpec();
    const recipeProfile = ctx.SessionStore.resolveActiveRecipeProfile();
    const fillingProfile = ctx.SessionStore.resolveActiveFillingProfile();

    for (const delta of DELTAS) {
      const res = ctx.SweetnessCalculator.calculate(config, recipeProfile, fillingProfile, delta, 'filling');
      const analysis = res?.context?.fillingAdjustment?.analysis || {};
      rows.set(`${fillingId}:${delta}`, {
        fillingId,
        delta,
        mode: analysis.mode || 'none',
        requestedPct: Number(analysis.requestedPct ?? delta),
        achievedPct: Number(analysis.achievedPct ?? 0),
        beforeRatio: analysis.beforeRatio ?? res?.context?.fillingAdjustment?.before?.solidsWater?.ratio ?? null,
        afterRatio: analysis.afterRatio ?? res?.context?.fillingAdjustment?.after?.solidsWater?.ratio ?? null,
        addedDairyMass: Number(analysis.addedDairyMass ?? 0),
        compositionLimited: Boolean(analysis.compositionLimited)
      });
    }
  }
  return rows;
}

function generateReport() {
  const legacyMap = runSuite('legacy');
  const boundedMap = runSuite('bounded');

  let improvedSweetness = 0;
  let worsenedSweetness = 0;
  let increasedDrift = 0;
  let decreasedDrift = 0;
  let identicalCases = 0;
  let changedCases = 0;

  const tableLines = [
    '| الحشو | الطلب % | النمط | المحقق (قديم) % | المحقق (مقيّد) % | Δ فجوة الحلاوة | صلب/ماء (قبل) | صلب/ماء (قديم) | صلب/ماء (مقيّد) | انجراف S/W قديم % | انجراف S/W مقيّد % | ألبان مضافة قديم (غ) | ألبان مضافة مقيّد (غ) | مقيد تركيبياً (ق/م) |',
    '| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |'
  ];

  for (const fillingId of FILLING_IDS) {
    for (const delta of DELTAS) {
      const key = `${fillingId}:${delta}`;
      const leg = legacyMap.get(key);
      const bnd = boundedMap.get(key);

      const legGap = Math.abs(leg.achievedPct - leg.requestedPct);
      const bndGap = Math.abs(bnd.achievedPct - bnd.requestedPct);
      const legDrift = pctDrift(leg.beforeRatio, leg.afterRatio);
      const bndDrift = pctDrift(bnd.beforeRatio, bnd.afterRatio);

      const sweetDiff = Math.abs(bnd.achievedPct - leg.achievedPct);
      const dairyDiff = Math.abs(bnd.addedDairyMass - leg.addedDairyMass);
      const ratioDiff = Math.abs((Number(bnd.afterRatio) || 0) - (Number(leg.afterRatio) || 0));

      if (sweetDiff <= 1e-4 && dairyDiff <= 1e-4 && ratioDiff <= 1e-5) {
        identicalCases += 1;
      } else {
        changedCases += 1;
        if (bndGap < legGap - 1e-4) improvedSweetness += 1;
        else if (bndGap > legGap + 1e-4) worsenedSweetness += 1;

        if (Math.abs(bndDrift) > Math.abs(legDrift) + 1e-4) increasedDrift += 1;
        else if (Math.abs(bndDrift) < Math.abs(legDrift) - 1e-4) decreasedDrift += 1;
      }

      tableLines.push(
        `| \`${fillingId}\` | ${delta > 0 ? '+' : ''}${delta}% | \`${bnd.mode}\` | ${fmtNum(leg.achievedPct, 2)}% | ${fmtNum(bnd.achievedPct, 2)}% | ${fmtNum(legGap - bndGap, 2)}% | ${fmtNum(leg.beforeRatio, 3)} | ${fmtNum(leg.afterRatio, 3)} | ${fmtNum(bnd.afterRatio, 3)} | ${fmtNum(legDrift, 2)}% | ${fmtNum(bndDrift, 2)}% | ${fmtNum(leg.addedDairyMass, 1)} | ${fmtNum(bnd.addedDairyMass, 1)} | ${leg.compositionLimited ? 'نعم' : 'لا'} / ${bnd.compositionLimited ? 'نعم' : 'لا'} |`
      );
    }
  }

  const md = [
    '# تقرير فروق حلّال الحلاوة المقيّد مقابل الحلّال القديم (`solver-diff-report`)',
    '',
    'يقارن هذا التقرير مخرجات `SweetnessCalculator.calculate(..., delta, "filling")` عبر الحشوات التسع المعتمدة × 6 مستويات طلب (`-30%`, `-15%`, `-5%`, `+5%`, `+15%`, `+30%` = 54 حالة) بين الوضع الافتراضي الحالي (`legacy`) والحلّال المقيّد الجديد (`bounded` / `bounded-vectors-v1`).',
    '',
    '## 1. ملخص تنفيذي للمالك (قرار البوابة `D3` / `SWEETNESS_SOLVER_DEFAULT`)',
    '',
    `- **إجمالي الحالات المختبرة**: **${FILLING_IDS.length * DELTAS.length}** حالة (\`ayaHabib\` بالإعدادات الافتراضية للجلسة).`,
    `- **الحالات المتطابقة تمامًا** (غير المقيدة أو استراتيجية \`sugarOnly\`): **${identicalCases}** حالة.`,
    `- **الحالات التي اختلف فيها الحلّالان** (عند نشاط قيد \`d >= 0\` أو حدود المعامل أو سقف الألبان): **${changedCases}** حالة.`,
    `- **حالات تحسّنت فيها دقة تحقيق هدف الحلاوة** (\`|achievedPct - requestedPct|\` أقل في \`bounded\`): **${improvedSweetness}** حالة (مقابل **${worsenedSweetness}** تراجعت).`,
    `- **حالات زاد فيها انجراف المواد الصلبة/الماء** (\`|Δ(S/W)|\` أعلى مقابل تحقيق هدف الحلاوة بدقة أكبر): **${increasedDrift}** حالة (مقابل **${decreasedDrift}** انخفض فيها الانجراف).`,
    '',
    '> [!NOTE]',
    '> **ملاحظة دلالية للمالك**: عند خفض الحلاوة في حشوة لبنية (مثل الساور كريم + السكر البودرة)، يكون الحل الجبري الوحيد الذي يحفظ نسبة المواد الصلبة/الماء دون تغيير هو تصغير الوصفة كلها (أي إنقاص كتلة الألبان `d < 0`)، وهو ما يمنعه القيد الفيزيائي `d >= 0`. عندما يُصفَّر `d = 0`، يعيد الحلّال المقيّد حساب معامل السكر ليحقق نسبة خفض الحلاوة المطلوبة بالضبط (ضمن `factorBounds`) بدل الاكتفاء بمعامل الحل غير المقيّد المبتور، ولذلك تقترب الحلاوة المتحققة من الطلب الفعلي مقابل زيادة طفيفة في انجراف `solids/water`. كما أنه عند اصطدام إضافة الألبان بسقف `compensationCapPct` عند رفع الحلاوة، يعيد الحلّال المقيّد موازنة معامل السكر مع السقف بدل قصّ الألبان بعد الحل وترك انحراف غير محسوب.',
    '',
    '## 2. جدول المقارنة التفصيلي (54 حالة)',
    '',
    '*موجب «Δ فجوة الحلاوة» يعني أن الحلّال المقيّد قلّل الخطأ عن النسبة المطلوبة بمقدار تلك النقاط المئوية.*',
    '',
    ...tableLines,
    ''
  ].join('\n');

  const outPath = path.join(ROOT_DIR, 'docs', 'solver-diff-report.md');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, md, 'utf8');
  return {
    outPath,
    identicalCases,
    changedCases,
    improvedSweetness,
    increasedDrift
  };
}

if (require.main === module) {
  const summary = generateReport();
  console.log(JSON.stringify(summary, null, 2));
}

module.exports = {
  generateReport
};
