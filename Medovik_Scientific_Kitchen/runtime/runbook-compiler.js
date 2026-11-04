// =============================================================================
// Medovik Workflow - Runbook Compiler
// Compiler only. It arranges and annotates protocol content; it does not invent
// missing numeric controls.
// =============================================================================
(function(global) {
  'use strict';

  function getRecipeById(id) {
    return global.MEDOVIK_RECIPE_PROFILES?.[id] || null;
  }

  function getFillingById(id) {
    const canonicalId = global.resolveFillingId?.(id) || id;
    return global.getFillingRecord?.(canonicalId) || global.FILLING_CATALOG?.[canonicalId] || null;
  }

  function getSweetnessSettings(session) {
    return global.SessionStore?.resolveSweetnessSettings?.(session) || {
      adjustmentPct: Number(session?.sweetnessPlan?.adjustmentPct ?? session?.fillingPlan?.entries?.[0]?.sweetnessAdjustmentPct ?? 0) || 0,
      target: String(session?.sweetnessPlan?.target || 'filling')
    };
  }

  function getBatchConfig(session) {
    return global.SessionStore?.resolveProductSpec?.(session) || session?.productSpec || global.DEFAULT_BATCH_CONFIG || {};
  }

  function getActiveRecipe(session) {
    return global.SessionStore?.resolveActiveRecipeProfile?.(session)
      || getRecipeById(session?.recipeSelection?.selectedRecipeId || session?.doughSystem?.recipeId || null);
  }

  function getActiveFilling(session) {
    return global.SessionStore?.resolveActiveFillingProfile?.(session)
      || getFillingById(
        global.resolveFillingId?.(session?.fillingPlan?.entries?.[0]?.fillingId)
        || global.DEFAULT_FILLING_ID
        || 'classic_sourcream_frosting'
      );
  }

  function safePhase(phase) {
    const normalized = typeof global.normalizeProtocolPhase === 'function'
      ? global.normalizeProtocolPhase(phase, { id: phase?.id || 'phase' })
      : phase;
    const validation = typeof global.validateProtocolPhase === 'function'
      ? global.validateProtocolPhase(normalized)
      : { ok: true, errors: [] };
    return {
      ...normalized,
      steps: Array.isArray(normalized.steps) ? normalized.steps.map(step=>({ ...step,
        controls: Array.isArray(step.controls) ? step.controls.map(control=>({
          ...control, provenanceKind: control.provenanceKind || (control.confidence==='derived'?'MODEL_ESTIMATE':'NORMALIZED_SOURCE')
        })) : []
      })) : [],
      validation
    };
  }

  function pushDerivedControl(step, control) {
    if (!step || !control) return;
    step.controls = Array.isArray(step.controls) ? step.controls : [];
    step.controls.push({ ...control, provenanceKind: 'MODEL_ESTIMATE' });
  }

  function asArray(value) {
    return Array.isArray(value) ? value.filter(Boolean) : (value == null ? [] : [value].filter(Boolean));
  }

  function pushStepBlocker(step, text) {
    if (!step || !text) return;
    step.readinessGate = step.readinessGate || {};
    step.readinessGate.blockers = asArray(step.readinessGate.blockers);
    step.readinessGate.blockers.push(text);
  }

  function pushFailureSignal(step, text) {
    if (!step || !text) return;
    step.failureSignals = asArray(step.failureSignals);
    step.failureSignals.push(text);
  }

  function formatWindowText(window) {
    if (!window?.range) return null;
    const { min, max } = window.range;
    const unit = window.unit ? ` ${window.unit}` : '';
    if (min == null && max == null) return null;
    if (Number(min) === Number(max)) return `${min}${unit}`;
    if (min != null && max != null) return `${min}–${max}${unit}`;
    return `${min ?? max}${unit}`;
  }

  function findStepByKeywords(steps, patterns = []) {
    return steps.find(step => {
      const haystack = `${step?.id || ''} ${step?.title || ''} ${step?.operatorAction || ''}`;
      return patterns.some(pattern => pattern.test(haystack));
    }) || null;
  }

  function appendCalculatedNotes(phase, session, recipe, filling) {
    if (!phase || !Array.isArray(phase.steps)) return phase;
    const config = getBatchConfig(session);
    const sweetnessSettings = getSweetnessSettings(session);
    const batch = global.BatchCalculator?.calculate?.(
      config,
      recipe,
      sweetnessSettings.adjustmentPct,
      filling,
      sweetnessSettings.target
    ) || null;
    const fillingBatch = global.BatchCalculator?.calculateFilling?.(
      config,
      filling,
      sweetnessSettings.adjustmentPct,
      recipe,
      sweetnessSettings.target
    ) || null;
    const temperingInputs = session?.execution?.stepData?.temperingInputs || null;
    const tempering = temperingInputs && global.TemperingCalculator?.calculateFromBatch
      ? global.TemperingCalculator.calculateFromBatch(batch, { ...temperingInputs, recipe })
      : null;

    const steps = phase.steps.map(step => ({ ...step, controls: Array.isArray(step.controls)
      ? step.controls.map(control => ({...control, provenanceKind: control.provenanceKind || 'NORMALIZED_SOURCE'})) : [] }));

    if (phase.id === 'dough' && tempering) {
      const eggStep = findStepByKeywords(steps, [/بيض/u, /تمبرنج/u, /egg/i, /temper/i]) || steps[0];
      const doughStep = findStepByKeywords(steps, [/دقيق/u, /عجين/u, /flour/i, /dough/i]) || steps[0];
      const doughSweetness = batch?.context?.sweetnessModel?.dough || null;
      pushDerivedControl(eggStep, {
        type: 'event',
        label: 'تقدير الدمج الحراري المسجل',
        text: `${tempering.batches} دفعات — ${tempering.directionLabel}`,
        confidence: 'derived'
      });
      pushDerivedControl(eggStep, {
        type: 'mass',
        label: 'كتلة الطور الساخن المحسوبة',
        value: Number(tempering.hotMass || tempering.syrupMass),
        min: Number(tempering.hotMass || tempering.syrupMass),
        max: Number(tempering.hotMass || tempering.syrupMass),
        unit: 'g',
        confidence: 'derived',
        text: 'قيمة مشتقة من session الحالية وتخدم قرار التمبرنج.'
      });
      if (doughSweetness?.active) {
        pushDerivedControl(doughStep, {
          type: 'event',
          label: 'تعديل الحلاوة الجاري',
          text: `${doughSweetness.requestedPct > 0 ? '+' : ''}${doughSweetness.requestedPct}% — ${doughSweetness.overallLabel || 'غير مصنف'}`,
          confidence: 'derived'
        });
        if (Number.isFinite(doughSweetness?.after?.sugarPctOnFlour)) {
          pushDerivedControl(doughStep, {
            type: 'qualitative',
            label: 'سكر/دقيق بعد التعديل',
            text: `${doughSweetness.after.sugarPctOnFlour}٪`,
            confidence: 'derived'
          });
        }
        if (Number.isFinite(doughSweetness?.after?.solidsWaterRatio)) {
          pushDerivedControl(doughStep, {
            type: 'qualitative',
            label: 'solids/water بعد التعديل',
            text: `${doughSweetness.after.solidsWaterRatio}`,
            confidence: 'derived'
          });
        }
        asArray(doughSweetness?.warnings).slice(0, 2).forEach(msg => pushStepBlocker(doughStep, msg));
        if (doughSweetness.overall === 'risk') {
          pushFailureSignal(doughStep, 'إذا صار خفض الحلاوة يبعد العجين بوضوح عن الملف المرجعي فلا تطارد النتيجة بدقيق إضافي غير محسوب؛ أعد تقييم مستوى الخفض أو المدرسة التشغيلية.');
        } else if (doughSweetness.overall === 'watch') {
          pushFailureSignal(doughStep, 'إذا اختلف الفرد أو الليونة أو اللون عن المرجع بعد تعديل الحلاوة فاقرأ العجين فعلياً ولا تفترض أن الحساب وحده يكفي.');
        }
      }
    }

    if (phase.id === 'baking' && batch?.ballWeight) {
      const firstStep = steps[0];
      const doughSweetness = batch?.context?.sweetnessModel?.dough || null;
      pushDerivedControl(firstStep, {
        type: 'mass',
        label: 'وزن الكرة المستهدف',
        value: Number(batch.ballWeight),
        min: Number(batch.ballWeight),
        max: Number(batch.ballWeight),
        unit: 'g',
        confidence: 'derived',
        text: null
      });
      if (Number.isFinite(Number(config?.rawSheetThicknessMm))) {
        pushDerivedControl(firstStep, {
          type: 'thickness',
          label: recipe?.shapingFamily === 'SPREAD_BATTER_SHEET' ? 'سمك النشر الخام' : 'سمك الفرد الخام',
          value: Number(config.rawSheetThicknessMm),
          min: Number(config.rawSheetThicknessMm),
          max: Number(config.rawSheetThicknessMm),
          unit: 'mm',
          confidence: 'derived',
          text: recipe?.layerGeometry?.status === 'SOURCE_VALUE' ? 'قيمة واردة في وصف المدرسة.' : 'قيمة تشغيلية قابلة للتعديل.'
        });
      }
      if (batch?.estimatedThicknessMm) {
        pushDerivedControl(firstStep, {
          type: 'thickness',
          label: 'سمك الطبقة المخبوزة المستهدف',
          value: Number(batch.estimatedThicknessMm),
          min: Number(batch.estimatedThicknessMm),
          max: Number(batch.estimatedThicknessMm),
          unit: 'mm',
          confidence: 'derived',
          text: 'تقدير هندسي لسمك الطبقة بعد الخَبز، وليس سمك الفرد الخام.'
        });
      }
      if (doughSweetness?.active) {
        pushDerivedControl(firstStep, {
          type: 'event',
          label: 'حكم حلاوة العجين',
          text: doughSweetness.overallLabel || 'غير مصنف',
          confidence: 'derived'
        });
        asArray(doughSweetness?.warnings).slice(0, 1).forEach(msg => pushStepBlocker(firstStep, msg));
        if (doughSweetness.overall !== 'controlled') {
          pushFailureSignal(firstStep, 'إذا تغير اللون أو الجفاف أو سلوك الفرد في الخَبز بعد تعديل الحلاوة فعدّل القرار من مرحلة العجين نفسها، لا في الفرن فقط.');
        }
      }
    }

    if (phase.id === 'filling' && (fillingBatch?.preparedRequiredMass || fillingBatch?.onCakeRequiredMass)) {
      const firstStep = steps[0];
      const fillingSweetness = fillingBatch?.context?.sweetnessModel?.filling || null;
      const sweetnessPlan = fillingBatch?.context?.sweetnessPlan || null;
      if (fillingBatch?.preparedRequiredMass) {
        pushDerivedControl(firstStep, {
          type: 'mass',
          label: 'كمية الحشو المطلوب تجهيزها',
          value: Number(fillingBatch.preparedRequiredMass),
          min: Number(fillingBatch.preparedRequiredMass),
          max: Number(fillingBatch.preparedRequiredMass),
          unit: 'g',
          confidence: 'derived',
          text: 'هذا هو رقم التحضير الخام قبل فاقد الـ yield والهدر. يعتمد على الحشو بين الطبقات والتغطية الخارجية حسب مواصفات المنتج الحالية.'
        });
      }
      if (fillingBatch?.onCakeRequiredMass) {
        pushDerivedControl(firstStep, {
          type: 'mass',
          label: 'الصافي المطلوب على الكيكة',
          value: Number(fillingBatch.onCakeRequiredMass),
          min: Number(fillingBatch.onCakeRequiredMass),
          max: Number(fillingBatch.onCakeRequiredMass),
          unit: 'g',
          confidence: 'derived',
          text: 'هذا هو الصافي الذي يصل فعليًا إلى الكيكة بعد خصم فاقد الـ yield والهدر من رقم التحضير.'
        });
      }
      if (fillingBatch?.yieldLossMass) {
        pushDerivedControl(firstStep, {
          type: 'mass',
          label: 'فاقد الـ yield',
          value: Number(fillingBatch.yieldLossMass),
          min: Number(fillingBatch.yieldLossMass),
          max: Number(fillingBatch.yieldLossMass),
          unit: 'g',
          confidence: 'derived',
          text: 'فقد متوقع بين التحضير الخام والكتلة القابلة للاستخدام بسبب تصفية/نزف/تحضير الحشو المرجعي.'
        });
      }
      if (fillingBatch?.wasteAllowanceMass) {
        pushDerivedControl(firstStep, {
          type: 'mass',
          label: 'سماحية الهدر',
          value: Number(fillingBatch.wasteAllowanceMass),
          min: Number(fillingBatch.wasteAllowanceMass),
          max: Number(fillingBatch.wasteAllowanceMass),
          unit: 'g',
          confidence: 'derived',
          text: 'هامش مضاف لتعويض فاقد الفرد والتوزيع والوعاء أثناء التنفيذ.'
        });
      }
      if (fillingBatch?.interiorRequiredMass) {
        pushDerivedControl(firstStep, {
          type: 'mass',
          label: 'حشو بين الطبقات',
          value: Number(fillingBatch.interiorRequiredMass),
          min: Number(fillingBatch.interiorRequiredMass),
          max: Number(fillingBatch.interiorRequiredMass),
          unit: 'g',
          confidence: 'derived',
          text: 'يمثل الكمية الإجمالية المخصصة للفواصل بين الطبقات فقط.'
        });
      }
      if (Number.isFinite(fillingBatch?.outerRequiredMass)) {
        pushDerivedControl(firstStep, {
          type: 'mass',
          label: 'التغطية الخارجية',
          value: Number(fillingBatch.outerRequiredMass),
          min: Number(fillingBatch.outerRequiredMass),
          max: Number(fillingBatch.outerRequiredMass),
          unit: 'g',
          confidence: 'derived',
          text: 'يمثل مجموع تغطية الوجه والجوانب إذا كانت التغطية الخارجية مفعلة.'
        });
      }
      if (fillingBatch?.perGap) {
        pushDerivedControl(firstStep, {
          type: 'mass',
          label: 'كتلة تقريبية لكل فجوة',
          value: Number(fillingBatch.perGap),
          min: Number(fillingBatch.perGap),
          max: Number(fillingBatch.perGap),
          unit: 'g',
          confidence: 'derived',
          text: 'قيمة تشغيلية مرجعية للتوزيع، لا وزن إلزامي بالجرام الواحد.'
        });
      }
      if (fillingBatch?.familyLabel) {
        pushDerivedControl(firstStep, {
          type: 'event',
          label: 'عائلة الحشو',
          text: fillingBatch.familyLabel,
          confidence: 'derived'
        });
      }
      if (fillingBatch?.targetTexture) {
        pushDerivedControl(firstStep, {
          type: 'qualitative',
          label: 'هدف القوام',
          text: fillingBatch.targetTexture,
          confidence: 'derived'
        });
      }
      const firstWindow = Array.isArray(fillingBatch?.operationalWindows) ? fillingBatch.operationalWindows[0] : null;
      const windowText = formatWindowText(firstWindow);
      if (firstWindow && windowText) {
        pushDerivedControl(firstStep, {
          type: firstWindow.unit === '°م' ? 'temperature' : 'time',
          label: firstWindow.label,
          text: windowText,
          confidence: 'derived'
        });
      }
      if (fillingSweetness?.active) {
        pushDerivedControl(firstStep, {
          type: 'event',
          label: 'تعديل الحلاوة الجاري',
          text: `${fillingSweetness.requestedPct > 0 ? '+' : ''}${fillingSweetness.requestedPct}% — ${fillingSweetness.overallLabel || 'غير مصنف'}`,
          confidence: 'derived'
        });
        if (fillingSweetness?.familyRuleSummary) {
          pushDerivedControl(firstStep, {
            type: 'qualitative',
            label: 'قاعدة هذه العائلة',
            text: fillingSweetness.familyRuleSummary,
            confidence: 'derived'
          });
        }
        if (Array.isArray(fillingSweetness?.adjustableNames) && fillingSweetness.adjustableNames.length) {
          pushDerivedControl(firstStep, {
            type: 'qualitative',
            label: 'عنصر الحلاوة القابل للتعديل',
            text: fillingSweetness.adjustableNames.join('، '),
            confidence: 'derived'
          });
        }
        if (Array.isArray(fillingSweetness?.compensationNames) && fillingSweetness.compensationNames.length) {
          pushDerivedControl(firstStep, {
            type: 'qualitative',
            label: 'تعويض بنيوي محتمل',
            text: fillingSweetness.compensationNames.join('، '),
            confidence: 'derived'
          });
        }
        if (Number.isFinite(fillingSweetness?.after?.solidsWaterRatio)) {
          pushDerivedControl(firstStep, {
            type: 'qualitative',
            label: 'solids/water بعد التعديل',
            text: `${fillingSweetness.after.solidsWaterRatio}`,
            confidence: 'derived'
          });
        }
        const sweetWarnings = asArray(fillingSweetness?.warnings).slice(0, 2);
        sweetWarnings.forEach(msg => pushStepBlocker(firstStep, msg));
        if (fillingSweetness.overall === 'risk') {
          pushFailureSignal(firstStep, 'إذا دفع خفض الحلاوة الحشو خارج العائلة المرجعية فلا تطارد التماسك بخفق إضافي وحده؛ عد إلى التبريد أو صيغة أقل عدوانية.');
        } else if (fillingSweetness.overall === 'watch') {
          pushFailureSignal(firstStep, 'إذا لاحظت أن الحشو صار أخف أو أثقل من المرجع بعد تعديل الحلاوة فاقرأ القوام الفعلي قبل متابعة التجميع.');
        }
      }
    }

    if (phase.id === 'assembly' && (fillingBatch?.preparedRequiredMass || fillingBatch?.onCakeRequiredMass)) {
      const firstStep = steps[1] || steps[0];
      const fillingSweetness = fillingBatch?.context?.sweetnessModel?.filling || null;
      if (fillingBatch?.perGap) {
        pushDerivedControl(firstStep, {
          type: 'mass',
          label: 'كتلة تقريبية لكل فجوة',
          value: Number(fillingBatch.perGap),
          min: Number(fillingBatch.perGap),
          max: Number(fillingBatch.perGap),
          unit: 'g',
          confidence: 'derived',
          text: 'قيمة مشتقة من session الحالية، وليست نصًا مرجعيًا مستقلًا.'
        });
      }
      if (fillingBatch?.preparedRequiredMass) {
        pushDerivedControl(firstStep, {
          type: 'mass',
          label: 'كمية الحشو المجهزة للجلسة',
          value: Number(fillingBatch.preparedRequiredMass),
          min: Number(fillingBatch.preparedRequiredMass),
          max: Number(fillingBatch.preparedRequiredMass),
          unit: 'g',
          confidence: 'derived',
          text: 'هذه هي كتلة التحضير الخام المتاحة للجلسة قبل فاقد الـ yield والهدر.'
        });
      }
      if (fillingBatch?.onCakeRequiredMass) {
        pushDerivedControl(firstStep, {
          type: 'mass',
          label: 'الصافي المستهدف على الكيكة',
          value: Number(fillingBatch.onCakeRequiredMass),
          min: Number(fillingBatch.onCakeRequiredMass),
          max: Number(fillingBatch.onCakeRequiredMass),
          unit: 'g',
          confidence: 'derived',
          text: 'هذا هو الصافي الذي يجب أن ينتهي على الكيكة بعد التوزيع.'
        });
      }
      if (fillingBatch?.interiorRequiredMass) {
        pushDerivedControl(firstStep, {
          type: 'mass',
          label: 'حشو بين الطبقات',
          value: Number(fillingBatch.interiorRequiredMass),
          min: Number(fillingBatch.interiorRequiredMass),
          max: Number(fillingBatch.interiorRequiredMass),
          unit: 'g',
          confidence: 'derived',
          text: 'هذه الكمية تخص الفواصل بين الطبقات فقط.'
        });
      }
      if (Number.isFinite(fillingBatch?.outerRequiredMass)) {
        pushDerivedControl(firstStep, {
          type: 'mass',
          label: 'التغطية الخارجية',
          value: Number(fillingBatch.outerRequiredMass),
          min: Number(fillingBatch.outerRequiredMass),
          max: Number(fillingBatch.outerRequiredMass),
          unit: 'g',
          confidence: 'derived',
          text: 'هذه الكمية مخصصة لتغطية الوجه والجوانب ضمن نفس الجلسة.'
        });
      }
      if (fillingBatch?.targetTexture) {
        pushDerivedControl(firstStep, {
          type: 'qualitative',
          label: 'ثبّت هذا القوام',
          text: fillingBatch.targetTexture,
          confidence: 'derived'
        });
      }
      if (fillingSweetness?.active) {
        pushDerivedControl(firstStep, {
          type: 'event',
          label: 'قراءة حلاوة الحشو الآن',
          text: fillingSweetness.overallLabel || 'غير مصنف',
          confidence: 'derived'
        });
        asArray(fillingSweetness?.warnings).slice(0, 1).forEach(msg => pushStepBlocker(firstStep, msg));
        if (fillingSweetness.overall !== 'controlled') {
          pushFailureSignal(firstStep, 'إذا بدت الفجوات أكثر رخاوة أو أكثر ثقلاً من المتوقع بعد تعديل الحلاوة فوزّع الحشو بحذر أكبر ولا تفترض أن سلوك المرجع ما زال نفسه تماماً.');
        }
      }
    }
    return { ...phase, steps };
  }

  const RunbookCompiler = {
    compile(sessionInput) {
      const session = sessionInput || global.SessionStore?.get?.() || null;
      if (!session) return null;

      const recipe = getActiveRecipe(session);
      const fillingMode = session?.fillingPlan?.mode || 'reference';
      const fillingScope = session?.fillingPlan?.scope || global.SessionStore?.FILLING_SCOPE || 'single-filling-v6';
      const filling = getActiveFilling(session);
      const doughPhases = global.ProtocolAuthority?.getDoughPhases?.(recipe) || {
        dough: safePhase({ id: 'dough', title: 'بروتوكول العجين', steps: [] }),
        baking: safePhase({ id: 'baking', title: 'الخبز', steps: [] })
      };
      const fillingPhase = global.ProtocolAuthority?.getFillingPhase?.(filling, fillingMode) || safePhase({ id: 'filling', title: 'بروتوكول الحشو', steps: [] });
      const assemblyPhase = global.ProtocolAuthority?.getAssemblyPhase?.(session) || safePhase({ id: 'assembly', title: 'التجميع', steps: [] });

      const phases = [
        safePhase({
          id: 'setup',
          title: 'إعداد الجلسة',
          description: 'تثبيت الوصفة والحشو والهندسة قبل الدخول في التنفيذ.',
          steps: [{
            id: 'setup-snapshot',
            phaseId: 'setup',
            operatorAction: 'راجع الوصفة والحشو والهندسة والسكيلنج قبل بدء التنفيذ.',
            purpose: 'منع القفز إلى التشغيل قبل تثبيت الخطة.',
            controls: [{ type: 'gate', label: 'شرط الدخول', text: 'الخطة مثبتة ومراجعة', confidence: 'editorial', provenanceKind:'NORMALIZED_SOURCE' }],
            sensoryCues: [],
            readinessGate: {
              condition: 'تم اختيار وصفة وحشو ومقاس قابل للتنفيذ.',
              blockers: ['غياب وصفة أو حشو أو مواصفات هندسية'],
              warning: null
            },
            failureSignals: [],
            outputState: 'خطة ثابتة.',
            scienceRef: null,
            provenance: { sourceType: 'compiled', sourceId: 'session-setup', completeness: 'full' }
          }]
        }),
        appendCalculatedNotes(safePhase(doughPhases.dough), session, recipe, filling),
        appendCalculatedNotes(safePhase(doughPhases.baking), session, recipe, filling),
        appendCalculatedNotes(safePhase(fillingPhase), session, recipe, filling),
        appendCalculatedNotes(safePhase(assemblyPhase), session, recipe, filling),
        safePhase({
          id: 'review',
          title: 'المراجعة والحفظ',
          description: 'توثيق نتيجة التنفيذ وملاحظات التكرار القادم.',
          steps: [{
            id: 'review-summary',
            phaseId: 'review',
            operatorAction: 'سجل النتيجة، الانحرافات، وما الذي يجب تثبيته أو تعديله في التشغيل التالي.',
            purpose: 'تحويل الجلسة إلى معرفة قابلة للتكرار.',
            controls: [{ type: 'gate', label: 'حد أدنى', text: 'نتيجة + ملاحظة تشغيلية واحدة على الأقل', confidence: 'editorial' }],
            sensoryCues: [],
            readinessGate: {
              condition: 'توجد مراجعة قابلة للعودة إليها لاحقًا.',
              blockers: ['إغلاق الجلسة دون توثيق أي نتيجة'],
              warning: null
            },
            failureSignals: [],
            outputState: 'جلسة موثقة.',
            scienceRef: null,
            provenance: { sourceType: 'compiled', sourceId: 'session-review', completeness: 'full' }
          }]
        })
      ];

      return {
        compiledAt: new Date().toISOString(),
        sessionId: session.id,
        recipeId: recipe?.id || null,
        fillingId: filling?.id || null,
        fillingMode,
        fillingScope,
        phases,
        validation: phases.map(phase => ({ id: phase.id, ok: phase.validation?.ok !== false, errors: phase.validation?.errors || [] }))
      };
    }
  };

  global.RunbookCompiler = RunbookCompiler;
})(typeof window !== 'undefined' ? window : globalThis);
