# خريطة المعمارية وترتيب البناء (`ARCHITECTURE_MAP`)

توثّق هذه الخريطة المسارات المرجعية، وترتيب تحميل ملفات البناء من `index.html`، وصادرات كل وحدة إلى النطاق العام (`global` / `window`)، ومشغّلات الاختبار والبناء المستقل.

---

## 1. مسارات الرموز المرجعية

- **`<SRC>`**: `core/` (المجلد الذي يحوي `core/balance.js` والوحدات الرياضية النقية).
- **`<TESTS>`**: `tests/` (يحوي الاختبارات المعيارية الجديدة تحت `tests/harness/`, `tests/golden/`, `tests/persistence/`, `tests/scripts/`, `tests/unit/` إلى جانب الاختبارات التكاملية القائمة).
- **`<APP>`**: `app-v6.js` (يعرّف `renderComparisonSection`, `flushRender`, `replaceMountedNode`, ومراحل الواجهة الست) مع طبقة الأدوات المساندة `app-tools.js`.

---

## 2. البناء المستقل ومشغّلات الاختبار

- **ملف الدخول المصدري**: `index.html` (يحوي 4 ملفات CSS متتابعة ثم قائمة `<script src="...">` الحتمية).
- **أمر بناء النسخة المستقلة** (يُضاف في المهمة 4): `node scripts/build-standalone.js` ← يولّد `Medovik_Standalone_Preview.html` بتضمين ملفات CSS الأربعة (`app.css`, `v6-styles.css`, `drawer-styles.css`, `ui-redesign.css`) وجميع وحدات JS بالترتيب نفسه دون أي أصل خارجي.
- **أمر فحص النسخة المستقلة**: `node scripts/check-standalone.js` (يبني ويفحص خلو `Medovik_Standalone_Preview.html` من طلبات الشبكة ويسجل الحجم في `docs/build-size.json`).
- **مشغّلات الاختبار**:
  1. **المشغّل المعياري للوحدات الجديدة ولقطات Golden (`node:test`)**:
     `node --test tests/harness/*.test.js tests/golden/*.test.js tests/persistence/*.test.js tests/scripts/*.test.js tests/unit/*.test.js`
     *(ملاحظة: لا يُشغَّل `node --test tests/` الأعمى مباشرة لأن `tests/` يحوي سكربتات فحص مستقلة مثل `tests/run-node-tests.js` تستدعي `process.exit`).*
  2. **المشغّلات القائمة في المشروع (تبقى خضراء جنباً إلى جنب)**:
     - `node tests/run-node-tests.js` (`39/39` شاملة مصفوفة `1,620` حالة).
     - `python tests/static-audit.py` (`8/8` فحص ثابت للأصول والصياغة والأمان).
     - `node tests/check-source-baseline.js` (حراسة بصمات الوصفات التسع والحشوات التسع).

---

## 3. الملفات المستثناة من `loadMedovik` (تلمس `document` وقت التحميل)

- **`app-v6.js`**: الملف الوحيد في قائمة البناء الذي يقرأ `document.readyState` ويستدعي `initApp()` / `document.addEventListener` فور التحميل؛ لذا يُستثنى من `loadMedovik` في بيئة `node:vm`.
- *(ملاحظة: `data/content-type-contracts.js` موجود في المستودع لكنه غير مُدرج في `index.html` ولا في النسخة المستقلة).*

---

## 4. ترتيب تحميل ملفات البناء وصادرات `global`

### أ) ملفات الأنماط (`CSS` في `index.html`)
1. `app.css`
2. `v6-styles.css`
3. `drawer-styles.css`
4. `ui-redesign.css`

### ب) وحدات `JavaScript` بترتيب البناء الفعلي

| # | المسار | يلمس `document` عند التحميل؟ | الصادرات إلى `global` (`window` / `globalThis`) |
| --- | :--- | :---: | :--- |
| 1 | `core/domain-utils.js` | لا | `MEDOVIK_VALUE_STATUS`, `MEDOVIK_MASS_BASIS`, `MEDOVIK_DOUGH_PROCESS_FAMILY`, `MEDOVIK_DOUGH_SHAPING_FAMILY`, `medovikFiniteOrNull`, `medovikClamp`, `medovikCleanText`, `escapeHtml`, `validateIngredientRecord`, `normalizeProductSpec`, `formatEngineeringEstimate` |
| 1b | `core/engineering-constants.js` | لا | `MEDOVIK_ENGINEERING_CONSTANTS` |
| 1c | `core/focus-preserve.js` | لا | `MedovikFocus` |
| 1d | `core/numeric-input.js` | لا | `MedovikNumericInput` |
| 1e | `core/timer-model.js` | لا | `MedovikTimers` |
| 2 | `core/formula.js` | لا | `Formula` |
| 3 | `core/science-model.js` | لا | `COMPONENT_DENSITIES` *(const علوي)*, `pos`, `clamp`, `smoothstep01`, `getIngredientCompositionFractions`, `getIngredientContributionFromRecord`, `estimateFormulaComponents`, `densityFromComponentMasses`, `estimateNonAeratedDensityFromComposition`, `summarizeFillingMassShares`, `midpointBand`, `evaluateBand`, `inferFillingAerationModel`, `estimateFillingDensity`, `estimateFinalMoistureTarget`, `estimateDoughPorosity`, `estimateDoughBakeModel`, `safeDiv`, `evaluateBandStatusHtml`, `confidenceFromAuditScore`, `bandStatusScore`, `auditFillingAgainstMasterProfile`, `auditDoughSystem` |
| 4 | `core/model-evidence.js` | لا | `assessModelEvidence` |
| 5 | `core/geometry.js` | لا | `calcArea`, `calcPerimeter`, `calcVolume` |
| 6 | `core/thickness-consistency.js` | لا | `auditThicknessConsistency` |
| 6b | `core/bounded-vectors-solver.js` | لا | `MedovikBoundedSolver` |
| 7 | `core/balance.js` | لا | `getSweetnessEquivalentPerGram`, `normalizeIdList`, `isDirectSweetnessAdjustable`, `getIngredientContribution`, `analyzeFormulaGroups`, `buildScaledFormula`, `makeSugarOnlyNote`, `adjustSweetnessSugarOnly`, `solveLinear2x2`, `adjustFillingSweetnessKeepSolidsWater`, `adjustSweetnessWithBalance` |
| 8 | `core/product.js` | لا | `ProductGeometry`, `Product` |
| 8b | `core/comparison-model.js` | لا | `MedovikComparison` |
| 8c | `core/moisture-analysis.js` | لا | `MedovikMoisture` |
| 8d | `core/aqueous-activity.js` | لا | `MedovikAqueousActivity` |
| 8e | `core/cream-reconstitution.js` | لا | `MedovikCreamPrep` |
| 9 | `ingredients/ingredient-references.js` | لا | `SCIENCE_REFERENCE_REGISTRY` *(const علوي)*, `getScienceReferences`, `buildScienceMeta`, `getDefaultScienceMetaForType`, `describeScienceConfidence`, `inferFieldBasis`, `normalizeFieldValue`, `getIngredientFieldAuditRows`, `confidenceToNumeric`, `numericToConfidence`, `basisFactor`, `summarizeScienceEntries`, `formatScienceBasisLabel` |
| 10 | `data/ingredients-db.js` | لا | `BASE_INGREDIENT_IDS`, `BaseIngredientsDB`, `IngredientsDB`, `CANONICAL_INGREDIENTS_DB`, `registerIngredient`, `getIngredient`, `getIngredientScienceMeta`, `getCustomIngredients`, `resetToBaseIngredients`, `restoreCustomIngredients`, `getCanonicalIngredientEntry`, `listCanonicalIngredientEntries`, `ensureIngredientInDbById`, `describeIngredientTruthMode` |
| 10b | `core/bench-calibration.js` | لا | `MedovikBench` |
| 11 | `ingredients/dough-profiles.js` | لا | `hasIdSet`, `massById`, `flourMass`, `withinBand`, `inferCurrentDoughProfile`, `evaluateDoughAgainstProfile`, `inferDoughStageKind`, `cloneDoughStage`, `buildMasterDoughTemplate`, `getMasterDoughTemplate`, `getMasterDoughs`, `getMasterDoughProfile` |
| 12 | `data/filling-rules.js` | لا | `FILLING_RULES`, `getApplicableRules` |
| 13 | `data/master-fillings-data.js` | لا | `MASTER_FILLINGS`, `MASTER_FILLING_PROCESS_YIELDS`, `getMasterFillingProfile`, `getMasterFillingYieldModel`, `applyMasterFillingYieldModel` *(تحوي `masterStages[].timeCues`)* |
| 14 | `data/recipes.js` | لا | `MEDOVIK_RECIPE_PROFILES`, `TEMPERING_METHOD` |
| 15 | `data/filling-catalog.js` | لا | `LEGACY_FILLING_ID_ALIASES`, `DEFAULT_FILLING_ID`, `FILLING_CATALOG`, `resolveFillingId`, `getFillingRecord`, `listFillings` |
| 16 | `data/science-content.js` | لا | `SCIENCE_CONTENT`, `getScienceNote`, `listScienceNotes` |
| 17 | `data/evidence-register.js` | لا | `MEDOVIK_EVIDENCE_REGISTRY`, `getEvidenceRecord` |
| 18 | `data/reference-library.js` | لا | `REFERENCE_LIBRARY`, `getReferenceSection`, `getReferenceTopic`, `listReferenceCategories`, `listReferenceTopics`, `getDefaultReferenceTopicId`, `getReferenceTopicsForPhase` |
| 19 | `data/protocol-schema.js` | لا | `PROTOCOL_COMPLETENESS`, `PROTOCOL_CONTROL_TYPES`, `PROTOCOL_CONFIDENCE`, `normalizeProtocolStep`, `validateProtocolStep`, `normalizeProtocolPhase`, `validateProtocolPhase` |
| 20 | `data/protocol-authority.js` | لا | `ProtocolAuthority`, `getProtocolCoverageMatrix` |
| 21 | `tempering.js` | لا | `calcThermalMixing`, `calcTempering` |
| 22 | `app-calculators.js` | لا | `buildRecipeFormula`, `buildFillingFormula`, `findMasterFillingRecord`, `normalizeSweetnessSettings`, `BatchCalculator`, `TemperingCalculator`, `SweetnessCalculator`, `DoughAnalyzer`, `RecipeLabAnalyzer`, `FullAnalysis`, `RECIPE_EDITABLE_INGREDIENT_IDS`, `FILLING_EDITABLE_INGREDIENT_IDS`, `buildIngredientRows`, `getCalculationAudit`, `listCalculationAudits` |
| 23 | `runtime/session-store.js` | لا | `AppState`, `SessionManager`, `MEDOVIK_SESSION_SCHEMA_VERSION`, `SWEETNESS_ADJUSTMENT_RANGE`, `DEFAULT_PRODUCT_SPEC`, `DEFAULT_BATCH_CONFIG`, `SessionStore` |
| 24 | `runtime/recipe-lab-store.js` | لا | `MEDOVIK_RECIPE_LAB_SCHEMA_VERSION`, `RecipeLabStore` |
| 25 | `runtime/runbook-compiler.js` | لا | `RunbookCompiler` |
| 26 | `runtime/workflow-context.js` | لا | `WorkflowContext` |
| 27 | `runtime/view-prefs.js` | لا | `MedovikViewPrefs` |
| 28 | `app-tools.js` | لا | `ToolRegistry`, `readText`, `readNumber` |
| 29 | `app-v6.js` | **نعم (مستثنى من `vm`)** | `App`, `MedovikApp` |

---

## 5. متابعات مؤجَّلة مسجلة معمارياً

- **R2 — مقارنة كيكتين كاملتين**: مؤجَّلة لأن `buildRuntimeContext` في `app-calculators.js` يقرأ `AppState` ويستدعي `ensureLiveDoughFormula`؛ تتطلب استخراج دالة نقية مستقلة بعد مراجعة لقطات `golden`.
