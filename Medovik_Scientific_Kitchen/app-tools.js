// =============================================================================
// Medovik Workflow v6 - Active Tool Registry
// Connects contextual tools to the guided workflow session/runtime.
// =============================================================================
(function(global) {
  'use strict';

  const ToolRegistry = {
    tools: new Map(),

    register(tool) {
      if (!tool || !tool.id || typeof tool.render !== 'function') return;
      this.tools.set(tool.id, tool);
    },

    get(id) {
      return this.tools.get(id) || null;
    },

    getAll() {
      return Array.from(this.tools.values());
    },

    open(id, container, context = {}) {
      const tool = this.get(id);
      if (!tool || !container) return;
      container.textContent = '';
      tool.render(container, context);
      sanitizeRenderedTree(container);
    }
  };

  function getSessionStore() {
    return global.SessionStore || null;
  }

  function getCurrentRecipe() {
    return getSessionStore()?.resolveActiveRecipeProfile?.() || MEDOVIK_RECIPE_PROFILES?.ayaHabib || null;
  }

  function getCurrentFilling() {
    return getSessionStore()?.resolveActiveFillingProfile?.()
      || global.getFillingRecord?.(global.DEFAULT_FILLING_ID)
      || global.FILLING_CATALOG?.[global.DEFAULT_FILLING_ID]
      || null;
  }

  function getCurrentConfig() {
    return getSessionStore()?.resolveProductSpec?.() || {};
  }

  function getCurrentAdjustment() {
    return getSessionStore()?.getSweetnessAdjustmentPct?.() || 0;
  }

  function getSweetnessAdjustmentRange() {
    return global.SWEETNESS_ADJUSTMENT_RANGE || { min: -40, max: 40 };
  }

  function getCurrentSweetnessTarget() {
    return getSessionStore()?.getSweetnessTarget?.() || 'filling';
  }

  function getCurrentSweetnessSettings() {
    return { adjustmentPct: getCurrentAdjustment(), target: getCurrentSweetnessTarget() };
  }

  function getCurrentSession() {
    return getSessionStore()?.get?.() || null;
  }

  function getToolMonogram(tool) {
    const map = {
      'recipe-library': 'وص',
      'batch-calculator': 'دف',
      'tempering-tool': 'تم',
      'sweetness-tool': 'حل',
      'dough-analyzer': 'عج',
      'dough-formula-editor': 'تح',
      'filling-calculator': 'حش',
      'filling-formula-editor': 'تح',
      'full-analysis': 'كل',
      'science-reference': 'عل',
      'troubleshooting-reference': 'حل',
      'phase-log': 'سج',
      'review-tool': 'مر',
      'recipe-comparison': 'قر'
    };
    if (map[tool?.id]) return map[tool.id];
    const title = String(tool?.title || '').replace(/\s+/g, ' ').trim();
    return title.slice(0, 2) || 'أد';
  }

  function getCurrentPhaseId() {
    const session = getCurrentSession();
    return session?.execution?.currentPhase
      || session?.executionState?.currentPhase
      || getSessionStore()?.getCurrentPhase?.()
      || 'plan';
  }

  function getCurrentRunbook() {
    const session = getCurrentSession();
    return getSessionStore()?.getRunbook?.(session)
      || session?.compiledRunbook
      || null;
  }

  function getReferenceTopic() {
    return getSessionStore()?.getScienceTopicId?.()
      || getSessionStore()?.getReferenceTopic?.()
      || global.getDefaultReferenceTopicId?.('science')
      || 'science:dough-base-heat';
  }

  function setReferenceTopic(topic) {
    return getSessionStore()?.setScienceTopicId?.(topic)
      || getSessionStore()?.setReferenceTopic?.(topic);
  }

  function getTroubleshootingTopic() {
    return getSessionStore()?.getTroubleshootingTopicId?.()
      || global.getDefaultReferenceTopicId?.('troubleshooting')
      || 'trouble:dough-base-overheat';
  }

  function setTroubleshootingTopic(topic) {
    return getSessionStore()?.setTroubleshootingTopicId?.(topic);
  }

  function setCalculatedBatch(batch) {
    return getSessionStore()?.setCalculatedBatch?.(batch);
  }

  function getFormulaDisplayState(kind) {
    return getSessionStore()?.getFormulaDisplayState?.(kind) || null;
  }

  function getRunbookPhase(phaseId) {
    return getCurrentRunbook()?.phases?.find(phase => phase.id === phaseId) || null;
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function collectScienceNotesFromPhase(phase) {
    const ids = (phase?.steps || []).map(step => step?.scienceRef).filter(Boolean);
    return typeof global.listScienceNotes === 'function' ? global.listScienceNotes(ids) : [];
  }

  function getShapeFieldMeta(shape) {
    if ((shape || 'round') === 'round') {
      return { primary: 'قطر الكيك (سم)', secondary: 'غير مطلوب', hideSecondary: true };
    }
    return { primary: 'الطول (سم)', secondary: 'العرض (سم)', hideSecondary: false };
  }

  function refreshContext(context) {
    if (typeof context?.refresh === 'function') {
      context.refresh();
      return;
    }
    global.App?.refreshActiveView?.();
  }

  function closeFromTool(context) {
    if (typeof context?.close === 'function') {
      context.close();
      return;
    }
    global.App?.closeDrawer?.();
  }

  function formatNumber(value, digits = 1) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '0';
    return n.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sanitizeRenderedTree(root) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    root.querySelectorAll('script,iframe,object,embed,meta,link').forEach(node => node.remove());
    root.querySelectorAll('*').forEach(node => {
      Array.from(node.attributes || []).forEach(attr => {
        const name = String(attr.name || '').toLowerCase();
        const value = String(attr.value || '').trim().toLowerCase();
        if (name.startsWith('on') || ((name === 'href' || name === 'src' || name === 'xlink:href') && (value.startsWith('javascript:') || value.startsWith('data:text/html')))) {
          node.removeAttribute(attr.name);
        }
      });
    });
  }

  function humanizeLimitationReason(reason) {
    const labels = {
      'fixed-sweetness-floor': 'جزء من الحلاوة ثابت في مكونات غير قابلة للخفض المباشر.',
      'negative-factor': 'الحل الجبري يحتاج عامل حلاوة سالبًا، وهذا غير ممكن تركيبيًا.',
      'negative-dairy': 'الحفاظ على التوازن البنيوي يتطلب تعويضًا لبنيًا سالبًا، وهذا غير ممكن تركيبيًا.',
      'factor-min': 'الحد الأدنى التشغيلي للعائلة أوقف مزيدًا من الخفض.',
      'factor-max': 'الحد الأعلى التشغيلي للعائلة أوقف مزيدًا من الرفع.',
      'dairy-cap': 'سقف التعويض البنيوي للعائلة منع إضافة لبنية أكبر.',
      'no-adjustable-sweetness': 'لا توجد مصادر حلاوة قابلة للتعديل في هذه الصيغة.'
    };
    return labels[reason] || reason || '';
  }

  function readNumber(form, name, fallback = 0) {
    const field = form?.elements?.[name];
    const n = Number(field?.value);
    return Number.isFinite(n) ? n : fallback;
  }

  function readText(form, name, fallback = '') {
    return String(form?.elements?.[name]?.value || fallback);
  }

  function enhanceEditableFields(root, commit = null) {
    if (!root) return;
    root.querySelectorAll('input[type="number"], input[type="text"]').forEach(field => {
      field.addEventListener('focus', () => {
        if (typeof field.select === 'function') requestAnimationFrame(() => field.select());
      });
      field.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          if (typeof commit === 'function') commit();
          field.blur();
        }
      });
    });
  }

  function getIngredientRecord(id) {
    return global.IngredientsDB?.[id] || null;
  }

  function getIngredientLabel(id) {
    return getIngredientRecord(id)?.displayName || id || '';
  }

  function getEditableIngredientIds(kind, formula = null) {
    const baseIds = kind === 'dough'
      ? (global.RECIPE_EDITABLE_INGREDIENT_IDS || [])
      : (global.FILLING_EDITABLE_INGREDIENT_IDS || []);
    const currentIds = Array.isArray(formula?.items) ? formula.items.map(item => item.ingredientId) : [];
    return Array.from(new Set([...baseIds, ...currentIds]))
      .filter(id => !!getIngredientRecord(id));
  }

  function buildFormulaEditorRows(formula, fallbackIngredientId = null) {
    const items = Array.isArray(formula?.items) ? formula.items.map(item => ({ ...item })) : [];
    if (items.length) return items;
    return fallbackIngredientId ? [{ ingredientId: fallbackIngredientId, weight: 0 }] : [];
  }

  function renderFormulaEditorTable(kind, formula, allowedIngredientIds) {
    const items = buildFormulaEditorRows(formula, allowedIngredientIds[0] || null);
    if (!items.length) {
      return '<p class="empty-state">لا توجد صيغة قابلة للتحرير بعد.</p>';
    }
    return `
      <table class="ingredients-table formula-editor-table">
        <thead>
          <tr>
            <th>المكوّن</th>
            <th>الكمية</th>
            <th>إجراء</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((row, index) => `
            <tr data-formula-row="${index}">
              <td>
                <select data-role="ingredient-id">
                  ${allowedIngredientIds.map(id => `<option value="${id}" ${id === row.ingredientId ? 'selected' : ''}>${getIngredientLabel(id)}</option>`).join('')}
                </select>
              </td>
              <td>
                <input type="number" data-role="ingredient-weight" min="0" step="0.1" value="${formatNumber(row.weight, 1)}">
              </td>
              <td>
                <button type="button" class="btn subtle" data-role="remove-row">حذف</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="step-actions">
        <select id="${kind}-formula-add-ingredient">
          ${allowedIngredientIds.map(id => `<option value="${id}">${getIngredientLabel(id)}</option>`).join('')}
        </select>
        <button type="button" class="btn" id="${kind}-formula-add-row">إضافة مكوّن</button>
      </div>
    `;
  }

  function createFormulaFromRows(rows, baseFormula, kind) {
    const cleanItems = rows
      .map(row => ({ ingredientId: String(row.ingredientId || '').trim(), weight: Math.max(0, Number(row.weight) || 0) }))
      .filter(row => row.ingredientId);
    if (baseFormula && typeof baseFormula.withItems === 'function') {
      return baseFormula.withItems(cleanItems, {
        type: kind === 'filling' ? 'MANUAL_FILLING_EDIT' : 'MANUAL_DOUGH_EDIT',
        source: 'tool'
      });
    }
    return new Formula(cleanItems, { ...(baseFormula?.meta || {}) });
  }

  function extractFormulaRows(container) {
    return Array.from(container.querySelectorAll('[data-formula-row]')).map(row => ({
      ingredientId: row.querySelector('[data-role="ingredient-id"]')?.value || '',
      weight: Number(row.querySelector('[data-role="ingredient-weight"]')?.value) || 0
    }));
  }

  function renderFormulaEditorTool(container, context, kind) {
    const isDough = kind === 'dough';
    const fillingMode = !isDough ? (getSessionStore()?.getFillingMode?.() || 'reference') : null;
    const formula = isDough
      ? getSessionStore()?.getActiveFormula?.('dough')
      : getSessionStore()?.getActiveFormula?.('filling');
    const seedFormula = isDough
      ? (getSessionStore()?.getSeedFormula?.('dough') || formula)
      : (getSessionStore()?.getSeedFormula?.('filling') || formula);
    const formulaState = getFormulaDisplayState(kind);
    const storedCustomCard = !isDough && formulaState?.hasStoredCustom
      ? `<div class="result-card"><span class="result-label">نسخة حرة محفوظة</span><span class="result-value">${formatNumber(formulaState?.storedCustomVersion || 0, 0)} / ${formatNumber(formulaState?.storedCustomMutationCount || 0, 0)}</span></div>`
      : '';
    const allowedIngredientIds = getEditableIngredientIds(kind, formula);

    container.innerHTML = `
      <div class="tool-formula-editor">
        <div class="results-section">
          <h4>${isDough ? 'تحرير صيغة العجين' : 'تحرير صيغة الحشو'}</h4>
          <p class="hint">
            ${isDough
              ? 'التعديل هنا يغيّر صيغة العجين الحية للجلسة نفسها، وليس مجرد البروفايل المرجعي.'
              : (fillingMode === 'custom'
                  ? 'أنت الآن تعدّل صيغة الحشو الحية المستخدمة فعليًا في الحسابات الحالية.'
                  : 'أنت الآن ترى الصيغة المرجعية النشطة. أي حفظ جديد هنا سيحوّل الحشو إلى صيغة حرة محسوبة فعليًا.')}
          </p>
          <div class="results-grid">
            <div class="result-card"><span class="result-label">الوضع النشط</span><span class="result-value">${isDough ? 'حيّ' : (formulaState?.activeMode === 'custom' ? 'حر' : 'مرجعي')}</span></div>
            <div class="result-card"><span class="result-label">الإصدار النشط</span><span class="result-value">${formatNumber(formulaState?.version || 0, 0)}</span></div>
            <div class="result-card"><span class="result-label">المصدر المرجعي</span><span class="result-value">${formulaState?.sourceSeed || '-'}</span></div>
            <div class="result-card"><span class="result-label">التعديلات النشطة</span><span class="result-value">${formatNumber(formulaState?.mutationCount || 0, 0)}</span></div>
            ${storedCustomCard}
          </div>
        </div>
        <form id="${kind}-formula-editor-form">
          ${renderFormulaEditorTable(kind, formula, allowedIngredientIds)}
        </form>
        ${renderIngredientTable((seedFormula?.items || []).map(item => ({ label: getIngredientLabel(item.ingredientId), weight: item.weight })), 'مرجع البداية', 'لا توجد صيغة مرجعية.')}
        <div class="step-actions">
          <button type="button" class="btn primary" id="${kind}-formula-save">حفظ الصيغة الحالية</button>
          <button type="button" class="btn" id="${kind}-formula-reset">إعادة إلى المرجع</button>
        </div>
      </div>
    `;

    const form = container.querySelector(`#${kind}-formula-editor-form`);
    const saveFormula = () => {
      const nextFormula = createFormulaFromRows(extractFormulaRows(container), formula, kind);
      if (isDough) {
        getSessionStore()?.updateLiveFormula?.('dough', nextFormula, { type: 'manual-edit', source: 'tool', summary: 'تحرير يدوي لصيغة العجين' });
      } else {
        getSessionStore()?.setFillingMode?.('custom');
        getSessionStore()?.updateLiveFormula?.('filling', nextFormula, { type: 'manual-edit', source: 'tool', summary: 'تحرير يدوي لصيغة الحشو' });
      }
      refreshContext(context);
      ToolRegistry.open(isDough ? 'dough-formula-editor' : 'filling-formula-editor', container, context);
    };

    const addRow = () => {
      const addSelect = container.querySelector(`#${kind}-formula-add-ingredient`);
      const ingredientId = addSelect?.value || allowedIngredientIds[0] || '';
      const rows = extractFormulaRows(container);
      rows.push({ ingredientId, weight: 0 });
      const draftFormula = createFormulaFromRows(rows, formula, kind);
      container.querySelector(`#${kind}-formula-editor-form`).innerHTML = renderFormulaEditorTable(kind, draftFormula, allowedIngredientIds);
      wireEditorRows();
    };

    const wireEditorRows = () => {
      container.querySelectorAll('[data-role="remove-row"]').forEach(button => {
        button.addEventListener('click', () => {
          const rowNode = button.closest('[data-formula-row]');
          if (rowNode) rowNode.remove();
        });
      });
    };

    wireEditorRows();
    enhanceEditableFields(form, saveFormula);
    container.querySelector(`#${kind}-formula-add-row`)?.addEventListener('click', addRow);
    container.querySelector(`#${kind}-formula-save`)?.addEventListener('click', saveFormula);
    container.querySelector(`#${kind}-formula-reset`)?.addEventListener('click', () => {
      if (isDough) {
        getSessionStore()?.resetFormulaToSeed?.('dough');
      } else {
        getSessionStore()?.resetFormulaToSeed?.('filling');
        getSessionStore()?.setFillingMode?.('reference');
      }
      refreshContext(context);
      ToolRegistry.open(isDough ? 'dough-formula-editor' : 'filling-formula-editor', container, context);
    });
  }

  function renderIngredientTable(rows, title, emptyText) {
    const items = Array.isArray(rows) ? rows : [];
    return `
      <div class="results-section">
        <h4>${escapeHtml(title)}</h4>
        ${items.length ? `
          <table class="ingredients-table">
            <thead>
              <tr>
                <th>المكوّن</th>
                <th>الكمية</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(row => `
                <tr>
                  <td>${escapeHtml(row.label || row.ingredientId || '')}</td>
                  <td>${formatNumber(row.weight, 1)} ${row.unit || 'g'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : `<p class="empty-state">${emptyText || 'لا توجد بيانات متاحة.'}</p>`}
      </div>
    `;
  }

  function renderBulletList(title, items, className = 'solutions-list') {
    const values = (items || []).filter(Boolean);
    if (!values.length) return '';
    return `
      <div class="results-section">
        <h4>${escapeHtml(title)}</h4>
        <ul class="${className}">
          ${values.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  function formatScienceReference(reference) {
    if (!reference) return '';
    if (typeof reference === 'string') return reference;
    const label = reference.label || reference.source || 'مرجع';
    const meta = [
      reference.source ? `المصدر: ${reference.source}` : '',
      reference.note || '',
    ].filter(Boolean);
    return `
      <strong>${label}</strong>
      ${meta.length ? `<div class="hint">${meta.join(' — ')}</div>` : ''}
    `;
  }

  function renderScienceReferences(references) {
    const values = (references || []).filter(Boolean);
    if (!values.length) return '';
    return `
      <div class="science-reference-block">
        <p class="hint"><strong>الأثر المرجعي</strong></p>
        <ul class="solutions-list">
          ${values.map(reference => `<li>${formatScienceReference(reference)}</li>`).join('')}
        </ul>
      </div>
    `;
  }


  function renderOperationalWindow(title, windows) {
    const items = Array.isArray(windows) ? windows.filter(Boolean) : [];
    if (!items.length) return '';
    return `
      <div class="results-section">
        <h4>${escapeHtml(title)}</h4>
        <div class="troubleshooting-list">
          ${items.map(item => {
            const label = item?.label || item?.title || 'نافذة تشغيل';
            const digits = Number.isFinite(Number(item?.digits)) ? Number(item.digits) : 0;
            const unit = item?.unit ? ` ${item.unit}` : '';
            const min = Number(item?.range?.min);
            const max = Number(item?.range?.max);
            const hasMin = Number.isFinite(min);
            const hasMax = Number.isFinite(max);
            let value = item?.text || item?.value || item?.summary || '';
            if (!value && (hasMin || hasMax)) {
              const format = num => formatNumber(num, digits);
              if (hasMin && hasMax) {
                value = min === max ? `${format(min)}${unit}` : `${format(min)}–${format(max)}${unit}`;
              } else if (hasMin) {
                value = `${format(min)}${unit}+`;
              } else if (hasMax) {
                value = `حتى ${format(max)}${unit}`;
              }
            }
            return `
              <div class="troubleshoot-card operational-window-card">
                <h4>${label}</h4>
                ${value ? `<p>${value}</p>` : ''}
                ${item?.hint ? `<p class="hint">${item.hint}</p>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function renderIssueBlocks(title, items) {
    const values = (items || []).filter(Boolean);
    if (!values.length) return '';
    const sourceLabels = {
      protocol: 'البروتوكول',
      analysis: 'التحليل',
      observation: 'ملاحظة مسجلة',
      deviation: 'انحراف مسجل'
    };
    const severityLabels = {
      info: 'معلومة',
      low: 'منخفض',
      warning: 'تحذير',
      medium: 'متوسط',
      critical: 'حرج',
      high: 'عالٍ'
    };
    return `
      <div class="results-section">
        <h4>${escapeHtml(title)}</h4>
        <div class="troubleshooting-list">
          ${values.map(item => `
            <div class="troubleshoot-card">
              <div class="inline-badges">
                <span class="chip chip-neutral">${sourceLabels[item.source] || item.source || 'مصدر غير محدد'}</span>
                <span class="chip ${item.severity === 'critical' || item.severity === 'high' ? 'chip-danger' : (item.severity === 'warning' || item.severity === 'medium' ? 'chip-warning' : 'chip-info')}">${severityLabels[item.severity] || item.severity || 'معلومة'}</span>
              </div>
              <h4>${item.title || item.label || 'ملاحظة'}</h4>
              ${item.reason ? `<p>${item.reason}</p>` : ''}
              ${item.reference ? `<p class="hint">${item.reference}</p>` : ''}
              ${item.actions?.length ? `
                <ul class="solutions-list">
                  ${item.actions.map(action => `<li>${action}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function listify(value) {
    return Array.isArray(value) ? value : [];
  }

  function arrayify(value) {
    return listify(value);
  }

  function renderCalculationAudit(auditInput, options = {}) {
    const audits = (Array.isArray(auditInput) ? auditInput : [auditInput]).filter(Boolean);
    if (!audits.length) return '';
    const title = options.title || 'طريقة الحساب';
    const compact = !!options.compact;
    return `
      <div class="results-section calc-audit ${compact ? 'compact' : ''}">
        <h4>${escapeHtml(title)}</h4>
        <div class="calc-audit-grid">
          ${audits.map(audit => `
            <article class="calc-audit-card">
              <div class="calc-audit-head">
                <h5>${audit.title || 'نموذج'}</h5>
                <div class="calc-audit-badges">
                  <span class="calc-audit-badge verdict-${audit.verdict || 'info'}">${audit.verdictLabel || audit.verdict || ''}</span>
                </div>
              </div>
              ${audit.use ? `<p>${audit.use}</p>` : ''}
              ${listify(audit.basis).length ? `
                <div class="calc-audit-list">
                  <span class="calc-audit-label">يعتمد على:</span>
                  <ul class="solutions-list">${listify(audit.basis).map(item => `<li>${item}</li>`).join('')}</ul>
                </div>
              ` : ''}
              ${listify(audit.limits).length ? `
                <div class="calc-audit-list">
                  <span class="calc-audit-label">ما يجب الانتباه له:</span>
                  <ul class="solutions-list">${listify(audit.limits).map(item => `<li>${item}</li>`).join('')}</ul>
                </div>
              ` : ''}
            </article>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderRecipeMeta(recipe) {
    if (!recipe) return '';
    const notes = Array.isArray(recipe.notes) ? recipe.notes : [];
    return `
      <div class="recipe-details">
        <h4>${escapeHtml(recipe.name || '')}</h4>
        ${recipe.description ? `<p>${escapeHtml(recipe.description)}</p>` : ''}
        <div class="recipe-meta">
          ${recipe.chef ? `<span>${recipe.chef}</span>` : ''}
          ${recipe.bestFor ? `<span>${recipe.bestFor}</span>` : ''}
          ${recipe.source ? `<span>${recipe.source}</span>` : ''}
        </div>
        ${notes.length ? `
          <ul class="solutions-list">
            ${notes.slice(0, 4).map(note => `<li>${note}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `;
  }

  function renderReferenceExplorer(kind, selectedTopicId, currentPhaseId) {
    const categories = typeof global.listReferenceCategories === 'function'
      ? global.listReferenceCategories(kind)
      : [];
    const recommended = typeof global.getReferenceTopicsForPhase === 'function'
      ? global.getReferenceTopicsForPhase(kind, currentPhaseId)
      : [];
    return `
      <aside class="reference-tree">
        <div class="reference-tree-block">
          <h4>${kind === 'science' ? 'خريطة الموضوعات' : 'شجرة المشكلات'}</h4>
          <div class="reference-tree-list">
            ${categories.map(category => `
              <section class="reference-category">
                <h5>${category.title}</h5>
                <div class="reference-topic-buttons">
                  ${arrayify(category.topicIds).map(topicId => {
                    const topic = global.getReferenceTopic?.(kind, topicId);
                    if (!topic) return '';
                    const activeClass = topic.id === selectedTopicId ? ' is-active' : '';
                    return `<button type="button" class="reference-topic-button${activeClass}" data-reference-kind="${kind}" data-reference-topic="${topic.id}">${escapeHtml(topic.title)}</button>`;
                  }).join('')}
                </div>
              </section>
            `).join('')}
          </div>
        </div>
        <div class="reference-tree-block">
          <h4>موصى به من مرحلتك الحالية</h4>
          ${recommended.length ? `
            <div class="reference-recommendations">
              ${recommended.map(topic => `<button type="button" class="reference-recommendation" data-reference-kind="${kind}" data-reference-topic="${topic.id}">${escapeHtml(topic.title)}</button>`).join('')}
            </div>
          ` : '<p class="hint">المكتبة كاملة متاحة حتى لو لم توجد توصية مباشرة من المرحلة الحالية.</p>'}
        </div>
      </aside>
    `;
  }

  function renderReferenceArticle(topic) {
    if (!topic) {
      return `
        <section class="results-section">
          <h4>لا يوجد موضوع محدد</h4>
          <p>اختر موضوعًا من الشجرة الجانبية لعرض المحتوى.</p>
        </section>
      `;
    }

    const evidenceRecords = arrayify(topic.relatedScienceIds).map(id => global.getEvidenceRecord?.('science',id)).filter(Boolean);
    const evidenceNotice = evidenceRecords.some(rec => rec.status === 'NOT_AVAILABLE')
      ? 'الملف المرجعي غير متاح — الإحالات القديمة لا تثبت النص بمفردها.'
      : evidenceRecords.some(rec => rec.status === 'UNVERIFIED')
        ? 'غير متحقق من المصدر الأولي — المحتوى تفسير عملي غير معتمد كقياس مختبري.'
        : 'غير متحقق من المصدر الأولي في سجل الأدلة الحالي.';
    const articleSections = arrayify(topic.article?.sections);
    const relatedLinks = arrayify(topic.relatedTopicIds).map(topicId => global.getReferenceTopic?.(topicId.startsWith('science:') ? 'science' : 'troubleshooting', topicId)).filter(Boolean);
    return `
      <article class="reference-article">
        <header class="results-section">
          <h3>${escapeHtml(topic.title)}</h3>
          <p role="status" class="hint evidence-notice">${escapeHtml(evidenceNotice)}</p>
          <p>${escapeHtml(topic.summary || '')}</p>
          ${topic.article?.intro ? `<p class="hint">${escapeHtml(topic.article.intro)}</p>` : ''}
        </header>
        ${articleSections.map(section => `
          <section class="results-section">
            <h4>${escapeHtml(section.heading)}</h4>
            ${arrayify(section.paragraphs).map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}
            ${arrayify(section.bullets).length ? `<ul class="solutions-list">${arrayify(section.bullets).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
          </section>
        `).join('')}
        ${arrayify(topic.references).length ? `
          <section class="results-section">
            <h4>المراجع</h4>
            <ul class="solutions-list">
              ${arrayify(topic.references).map(reference => `
                <li>
                  <strong>${escapeHtml(reference.label || reference.source || '')}</strong>
                  ${reference.note ? ` — ${escapeHtml(reference.note)}` : ''}
                </li>
              `).join('')}
            </ul>
          </section>
        ` : ''}
        ${relatedLinks.length ? `
          <section class="results-section">
            <h4>موضوعات مرتبطة</h4>
            <div class="reference-related-links">
              ${relatedLinks.map(link => `<button type="button" class="reference-related-link" data-reference-kind="${link.id.startsWith('science:') ? 'science' : 'troubleshooting'}" data-reference-topic="${link.id}">${escapeHtml(link.title)}</button>`).join('')}
            </div>
          </section>
        ` : ''}
      </article>
    `;
  }

  function bindReferenceTopicButtons(container, context) {
    container.querySelectorAll('[data-reference-topic]').forEach(node => {
      node.addEventListener('click', () => {
        const kind = node.dataset.referenceKind;
        const topicId = node.dataset.referenceTopic;
        if (!topicId) return;
        if (kind === 'troubleshooting') {
          setTroubleshootingTopic(topicId);
        } else {
          setReferenceTopic(topicId);
        }
        refreshContext(context);
      });
    });
  }

  function readBatchConfig(form) {
    const current = getCurrentConfig();
    return {
      shape: readText(form, 'shape', current.shape || 'round'),
      d1: readNumber(form, 'd1', current.d1 || 20),
      d2: readNumber(form, 'd2', current.d2 || 30),
      layers: readNumber(form, 'layers', current.layers || 8),
      rawSheetThicknessMm: readNumber(form, 'rawSheetThicknessMm', current.rawSheetThicknessMm || 1.5),
      targetBakedLayerThicknessMm: readNumber(form, 'targetBakedLayerThicknessMm', current.targetBakedLayerThicknessMm || 2),
      estimatedBakedLayerThicknessMm: readNumber(form, 'targetBakedLayerThicknessMm', current.estimatedBakedLayerThicknessMm || current.targetBakedLayerThicknessMm || 2),
      fillingThicknessMm: readNumber(form, 'fillingThicknessMm', current.fillingThicknessMm || 3),
      includeOuterCoat: readText(form, 'includeOuterCoat', current.includeOuterCoat === false ? 'no' : 'yes') !== 'no',
      topCoatThicknessMm: readNumber(form, 'topCoatThicknessMm', current.topCoatThicknessMm || 2),
      sideCoatThicknessMm: readNumber(form, 'sideCoatThicknessMm', current.sideCoatThicknessMm || 2),
      wastePct: readNumber(form, 'wastePct', current.wastePct || 10),
      scaleMode: readText(form, 'scaleMode', current.scaleMode || 'volume'),
      ballWeight: readNumber(form, 'ballWeight', current.ballWeight || 140),
      targetFlourWeight: readNumber(form, 'targetFlourWeight', current.targetFlourWeight || 500)
    };
  }

  function renderBatchResult(result) {
    if (!result) return '';
    return `
      <div class="results-section">
        <h4>نتيجة سكيلنج العجين</h4>
        <div class="results-grid">
          <div class="result-card">
            <span class="result-label">وضع السكيلنج</span>
            <span class="result-value">${result.scaleMode || '-'}</span>
          </div>
          <div class="result-card">
            <span class="result-label">وزن الكرة</span>
            <span class="result-value">${formatNumber(result.ballWeight, 1)} g</span>
          </div>
          <div class="result-card">
            <span class="result-label">العجين الخام</span>
            <span class="result-value">${formatNumber(result.totalRaw, 1)} g</span>
          </div>
          <div class="result-card">
            <span class="result-label">السماكة المتوقعة</span>
            <span class="result-value">${formatNumber(result.estimatedThicknessMm, 1)} mm</span>
          </div>
          <div class="result-card">
            <span class="result-label">كثافة الخَبز</span>
            <span class="result-value">${formatNumber(result.usedBakedDensity, 3)}</span>
          </div>
          <div class="result-card">
            <span class="result-label">Bake Yield</span>
            <span class="result-value">${formatNumber(result.bakeYield, 1)}%</span>
          </div>
        </div>
        ${renderCalculationAudit(global.getCalculationAudit?.('batch', { scaleMode: result.scaleMode }), { title: 'تصنيف الحاسبة', compact: true })}
        ${renderIngredientTable(result.ingredientRows, 'مقادير العجين الناتجة', 'لا توجد مقادير ناتجة.')}
      </div>
    `;
  }

  function renderFillingResult(result) {
    if (!result) return '';
    return `
      <div class="results-section">
        <h4>نتيجة سكيلنج الحشو</h4>
        <div class="results-grid">
          <div class="result-card">
            <span class="result-label">الحشو</span>
            <span class="result-value">${result.fillingName || '-'}</span>
          </div>
          <div class="result-card">
            <span class="result-label">عائلة التشغيل</span>
            <span class="result-value">${result.familyLabel || '-'}</span>
          </div>
          <div class="result-card">
            <span class="result-label">التحضير قبل الـ yield والهدر</span>
            <span class="result-value">${formatNumber(result.preparedRequiredMass, 1)} g</span>
          </div>
          <div class="result-card">
            <span class="result-label">الصافي على الكيكة</span>
            <span class="result-value">${formatNumber(result.onCakeRequiredMass, 1)} g</span>
          </div>
          <div class="result-card">
            <span class="result-label">الصافي بعد الـ yield</span>
            <span class="result-value">${formatNumber(result.usablePreparedMass, 1)} g</span>
          </div>
          <div class="result-card">
            <span class="result-label">فاقد الـ yield</span>
            <span class="result-value">${formatNumber(result.yieldLossMass, 1)} g</span>
          </div>
          <div class="result-card">
            <span class="result-label">سماحية الهدر</span>
            <span class="result-value">${formatNumber(result.wasteAllowanceMass, 1)} g</span>
          </div>
          <div class="result-card">
            <span class="result-label">بين الطبقات</span>
            <span class="result-value">${formatNumber(result.interiorRequiredMass, 1)} g</span>
          </div>
          <div class="result-card">
            <span class="result-label">التغطية الخارجية</span>
            <span class="result-value">${formatNumber(result.outerRequiredMass, 1)} g</span>
          </div>
          <div class="result-card">
            <span class="result-label">لكل فراغ</span>
            <span class="result-value">${formatNumber(result.perGap, 1)} g</span>
          </div>
          <div class="result-card">
            <span class="result-label">تغطية الوجه</span>
            <span class="result-value">${formatNumber(result.topRequiredMass, 1)} g</span>
          </div>
          <div class="result-card">
            <span class="result-label">تغطية الجوانب</span>
            <span class="result-value">${formatNumber(result.sideRequiredMass, 1)} g</span>
          </div>
          <div class="result-card">
            <span class="result-label">الكثافة المستخدمة</span>
            <span class="result-value">${formatNumber(result.mixDensity, 3)}</span>
          </div>
        </div>
        <p class="hint">التحضير قبل الـ yield والهدر هو الرقم الذي يجب تجهيزه من المكونات. أما بين الطبقات والتغطية والصافي على الكيكة فهي ما يصل فعليًا إلى المنتج.</p>
        ${result.readinessSummary ? `<p class="hint">${result.readinessSummary}</p>` : ''}
        ${result.targetTexture ? `<p class="hint">الهدف التشغيلي: ${result.targetTexture}</p>` : ''}
        ${renderOperationalWindow('نوافذ تشغيل مفيدة', result.operationalWindows || [])}
        ${renderBulletList('ابدأ من هنا', result.setupNotes || [])}
        ${renderBulletList('راقب أثناء التنفيذ', result.watchpoints || [])}
        ${renderBulletList('أول تدخل عند الانحراف', result.firstInterventions || [])}
        ${result.adjustmentNote ? `<p class="hint">${result.adjustmentNote}</p>` : ''}
        ${renderCalculationAudit(global.getCalculationAudit?.('filling'), { title: 'تصنيف الحاسبة', compact: true })}
        ${renderIngredientTable(result.ingredientRows, 'مقادير التحضير الخام', 'لا توجد مقادير متاحة.')}
        ${renderIngredientTable(result.usableRows, 'الكتلة القابلة للاستخدام بعد الـ yield وقبل الهدر', 'لا توجد كتلة استخدام.')}
      </div>
    `;
  }

  function renderSweetnessSources(sources) {
    const items = Array.isArray(sources) ? sources : [];
    if (!items.length) return '';
    return `
      <div class="results-section">
        <h4>مصادر الحلاوة</h4>
        <table class="ingredients-table">
          <thead>
            <tr>
              <th>المصدر</th>
              <th>الوزن</th>
              <th>المساهمة</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(source => `
              <tr>
                <td>${source.name || source.label || source.id || ''}</td>
                <td>${formatNumber(source.mass, 1)} g</td>
                <td>${formatNumber(source.pctOfSweet, 1)}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }


  function renderChangedIngredients(title, rows) {
    const items = Array.isArray(rows) ? rows.filter(Boolean) : [];
    if (!items.length) return '';
    return `
      <div class="results-section">
        <h4>${escapeHtml(title)}</h4>
        <table class="ingredients-table">
          <thead>
            <tr>
              <th>المكوّن</th>
              <th>قبل</th>
              <th>بعد</th>
              <th>التغير</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(row => `
              <tr>
                <td>${escapeHtml(row.label || row.ingredientId || '')}</td>
                <td>${formatNumber(row.before, 1)} g</td>
                <td>${formatNumber(row.after, 1)} g</td>
                <td>${row.delta > 0 ? '+' : ''}${formatNumber(row.delta, 1)} g</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderGuardRails(title, rails) {
    const items = Array.isArray(rails) ? rails.filter(Boolean) : [];
    if (!items.length) return '';
    return `
      <div class="results-section">
        <h4>${escapeHtml(title)}</h4>
        <div class="troubleshooting-list">
          ${items.map(item => `
            <div class="troubleshoot-card">
              <h4>${item.label || 'قيد تشغيلي'} — ${item.statusLabel || ''}</h4>
              ${item.detail ? `<p>${item.detail}</p>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }


  function renderSweetnessElementTags(title, items, variant = 'science') {
    const list = asArray(items).filter(Boolean);
    if (!list.length) return '';
    return `
      <div class="results-section compact-section">
        <h4>${escapeHtml(title)}</h4>
        <div class="chip-row ${variant}">
          ${list.map(item => `<span class="meta-pill ${variant}">${item}</span>`).join('')}
        </div>
      </div>
    `;
  }

  function renderSweetnessSystemCard(system) {
    if (!system || !system.active) return '';
    const isDough = system.kind === 'dough';
    const rangeStates = system.rangeStates || null;
    return `
      <div class="results-section">
        <h4>${isDough ? 'نظام العجين' : `نظام الحشو — ${system.familyLabel || ''}`}</h4>
        <p class="hint">${system.strategyLabel || ''}</p>
        ${system.summary ? `<p>${system.summary}</p>` : ''}
        ${system.modelNote ? `<p class="hint">${system.modelNote}</p>` : ''}
        <div class="results-grid">
          <div class="result-card">
            <span class="result-label">الحلاوة قبل</span>
            <span class="result-value">${formatNumber(system.before?.sweetnessEqPer100, 1)}</span>
          </div>
          <div class="result-card">
            <span class="result-label">الحلاوة بعد</span>
            <span class="result-value">${formatNumber(system.after?.sweetnessEqPer100, 1)}</span>
          </div>
          <div class="result-card">
            <span class="result-label">الطلب/المحقق</span>
            <span class="result-value">${formatNumber(system.requestedPct, 0)}٪ / ${formatNumber(system.achievedPct, 1)}٪</span>
          </div>
          <div class="result-card">
            <span class="result-label">الحكم</span>
            <span class="result-value">${system.overallLabel || ''}</span>
          </div>
          ${rangeStates ? `
            <div class="result-card">
              <span class="result-label">الحل الرياضي</span>
              <span class="result-value">${formatNumber(rangeStates.algebraic?.factor, 3)}</span>
            </div>
            <div class="result-card">
              <span class="result-label">الممكن تركيبيًا</span>
              <span class="result-value">${formatNumber(rangeStates.compositionFeasible?.achievedPct, 1)}%</span>
            </div>
            <div class="result-card">
              <span class="result-label">المسموح تشغيليًا</span>
              <span class="result-value">${formatNumber(rangeStates.policyAuthorized?.achievedPct, 1)}%</span>
            </div>
          ` : ''}
          <div class="result-card">
            <span class="result-label">Solids/Water</span>
            <span class="result-value">${formatNumber(system.before?.solidsWaterRatio, 2)} → ${formatNumber(system.after?.solidsWaterRatio, 2)}</span>
          </div>
          ${isDough ? `
            <div class="result-card">
              <span class="result-label">سكر/دقيق</span>
              <span class="result-value">${formatNumber(system.before?.sugarPctOnFlour, 1)}٪ → ${formatNumber(system.after?.sugarPctOnFlour, 1)}٪</span>
            </div>
          ` : `
            <div class="result-card">
              <span class="result-label">الكثافة التشغيلية</span>
              <span class="result-value">${formatNumber(system.before?.usedDensity, 3)} → ${formatNumber(system.after?.usedDensity, 3)}</span>
            </div>
            <div class="result-card">
              <span class="result-label">Eq/Water</span>
              <span class="result-value">${formatNumber(system.before?.eqPer100Water, 1)} → ${formatNumber(system.after?.eqPer100Water, 1)}</span>
            </div>
            <div class="result-card">
              <span class="result-label">Fat%</span>
              <span class="result-value">${formatNumber(system.before?.fatPct, 1)} → ${formatNumber(system.after?.fatPct, 1)}</span>
            </div>
          `}
        </div>
        ${!isDough && system.profileLabel ? `<p class="hint">ملف الحشوة المرجعي: ${system.profileLabel}</p>` : ''}
        ${!isDough && system.familyRuleSummary ? `<p class="hint">قاعدة هذه العائلة: ${system.familyRuleSummary}</p>` : ''}
        ${renderBulletList('عناصر الحلاوة في هذا النظام', system.sweetnessElements || [])}
        ${!isDough ? renderSweetnessElementTags('العناصر القابلة للتعديل فعلياً', system.adjustableNames || system.activeSources || [], 'science') : ''}
        ${!isDough ? renderSweetnessElementTags('عناصر التعويض البنيوي', system.compensationNames || [], 'warning') : ''}
        ${!isDough ? renderSweetnessElementTags('حوامل الحلاوة الثابتة', system.fixedSweetNames || [], 'warning') : ''}
        ${!isDough && system.profileRationale ? `<p class="hint">منطق هذا الملف: ${system.profileRationale}</p>` : ''}
        ${!isDough && system.noCompositionChange ? `<div class="inline-block science"><h4>لا يوجد تغيير تركيبي فعلي</h4><p>الاستراتيجية الحالية لم تغيّر تركيب هذه الحشوة ضمن الحدود المفروضة؛ بقيت الصيغة كما هي، وأي فروق لاحقة يجب أن لا تُقرأ كتعديل سكر مباشر.</p></div>` : ''}
        ${!isDough && Number.isFinite(system.addedDairyMass) ? `<p class="hint">التعويض البنيوي: ${formatNumber(system.addedDairyMass, 1)} جم (${formatNumber(system.addedDairyPct, 1)}٪ من الكتلة الأساسية عند الحاجة).</p>` : ''}
        ${renderGuardRails('قيود الحماية البنيوية', system.guardRails || [])}
        ${renderBulletList('تحذيرات مهمة', system.warnings || [])}
        ${system.compositionLimitationReason ? `<p class="hint">القيد التركيبي: ${humanizeLimitationReason(system.compositionLimitationReason)}</p>` : ''}
        ${system.policyLimitationReason ? `<p class="hint">القيد التشغيلي: ${humanizeLimitationReason(system.policyLimitationReason)}</p>` : ''}
        ${!system.compositionLimitationReason && !system.policyLimitationReason && system.limitationReason ? `<p class="hint">سبب القيد الحالي: ${humanizeLimitationReason(system.limitationReason)}</p>` : ''}
        ${system.note ? `<p class="hint">${system.note}</p>` : ''}
        ${renderChangedIngredients('ما الذي تغيّر فعليًا', system.changedIngredients || [])}
      </div>
    `;
  }

  ToolRegistry.register({
    id: 'recipe-library',
    icon: '📚',
    title: 'مكتبة الوصفات',
    description: 'اختيار الوصفة المرجعية النشطة ومراجعة ملاحظاتها.',
    render(container, context) {
      const recipes = Object.values(MEDOVIK_RECIPE_PROFILES || {});
      const selected = getSessionStore()?.resolveActiveRecipeProfile?.()?.id || null;

      container.innerHTML = `
        <div class="tool-recipe-library">
          <p>اختر الوصفة المرجعية التي سيُبنى عليها السكيلنج والتحليل.</p>
          <div class="recipe-list">
            ${recipes.map(recipe => `
              <div class="recipe-item ${recipe.id === selected ? 'selected' : ''}" data-recipe-id="${recipe.id}">
                <div class="recipe-icon">${recipe.icon || '🍰'}</div>
                <div class="recipe-info">
                  <h4>${recipe.name}</h4>
                  <p>${recipe.description || ''}</p>
                  <div class="recipe-meta">
                    ${recipe.chef ? `<span>${recipe.chef}</span>` : ''}
                    ${recipe.bestFor ? `<span>${recipe.bestFor}</span>` : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
          ${renderRecipeMeta(getCurrentRecipe())}
        </div>
      `;

      container.querySelectorAll('[data-recipe-id]').forEach(node => {
        node.addEventListener('click', () => {
          const recipeId = node.dataset.recipeId;
          getSessionStore()?.setRecipe?.(recipeId);
          if (typeof context?.onSelect === 'function') {
            context.onSelect({ recipeId, recipe: getCurrentRecipe() });
          }
          refreshContext(context);
        });
      });
    }
  });

  ToolRegistry.register({
    id: 'batch-calculator',
    icon: '🧮',
    title: 'حاسبة الدفعة',
    description: 'سكيلنج العجين الفعلي باستخدام النواة الأصلية.',
    render(container, context) {
      const config = getCurrentConfig();
      const recipe = getCurrentRecipe();
      const filling = getCurrentFilling();
      const adjustment = getCurrentAdjustment();
      const result = BatchCalculator.calculate(config, recipe, adjustment, filling);
      setCalculatedBatch(result);

      const shapeMeta = getShapeFieldMeta(config.shape);
      container.innerHTML = `
        <div class="tool-batch-calculator">
          <form id="batch-calculator-form">
            <div class="form-grid">
              <div class="field">
                <label>الشكل</label>
                <select name="shape" id="batch-shape-select">
                  <option value="round" ${config.shape === 'round' ? 'selected' : ''}>دائري</option>
                  <option value="rect" ${config.shape === 'rect' ? 'selected' : ''}>مستطيل</option>
                </select>
              </div>
              <div class="field">
                <label id="batch-d1-label">${shapeMeta.primary}</label>
                <input type="number" name="d1" step="0.1" value="${formatNumber(config.d1, 1)}">
              </div>
              <div class="field ${shapeMeta.hideSecondary ? 'is-hidden' : ''}" id="batch-d2-field">
                <label id="batch-d2-label">${shapeMeta.secondary}</label>
                <input type="number" name="d2" step="0.1" value="${formatNumber(config.d2, 1)}">
              </div>
              <div class="field">
                <label>عدد الطبقات</label>
                <input type="number" name="layers" min="1" step="1" value="${formatNumber(config.layers, 0)}">
              </div>
              <div class="field">
                <label>سماكة الفرد الخام (مم)</label>
                <input type="number" name="rawSheetThicknessMm" min="0.2" step="0.1" value="${formatNumber(config.rawSheetThicknessMm, 1)}">
              </div>
              <div class="field">
                <label>سماكة الطبقة بعد الخبز (مم)</label>
                <input type="number" name="targetBakedLayerThicknessMm" min="0.2" step="0.1" value="${formatNumber(config.targetBakedLayerThicknessMm, 1)}">
              </div>
              <div class="field">
                <label>سماكة الحشو بين الطبقات (مم)</label>
                <input type="number" name="fillingThicknessMm" step="0.1" value="${formatNumber(config.fillingThicknessMm, 1)}">
              </div>
              <div class="field">
                <label>التغطية الخارجية</label>
                <select name="includeOuterCoat">
                  <option value="yes" ${config.includeOuterCoat === false ? '' : 'selected'}>مفعلة</option>
                  <option value="no" ${config.includeOuterCoat === false ? 'selected' : ''}>معطلة</option>
                </select>
              </div>
              <div class="field">
                <label>سماكة تغطية الوجه (مم)</label>
                <input type="number" name="topCoatThicknessMm" min="0" step="0.1" value="${formatNumber(config.topCoatThicknessMm, 1)}">
              </div>
              <div class="field">
                <label>سماكة تغطية الجوانب (مم)</label>
                <input type="number" name="sideCoatThicknessMm" min="0" step="0.1" value="${formatNumber(config.sideCoatThicknessMm, 1)}">
              </div>
              <div class="field">
                <label>الهدر (%)</label>
                <input type="number" name="wastePct" min="0" max="50" step="1" value="${formatNumber(config.wastePct, 0)}">
              </div>
              <div class="field">
                <label>وضع السكيلنج</label>
                <select name="scaleMode">
                  <option value="volume" ${config.scaleMode === 'volume' ? 'selected' : ''}>حسب الحجم</option>
                  <option value="manualBall" ${config.scaleMode === 'manualBall' ? 'selected' : ''}>وزن الكرة</option>
                  <option value="flourBasis" ${config.scaleMode === 'flourBasis' ? 'selected' : ''}>أساس وزن الدقيق</option>
                </select>
              </div>
              <div class="field">
                <label>وزن الكرة (جم)</label>
                <input type="number" name="ballWeight" min="1" step="0.1" value="${formatNumber(config.ballWeight, 1)}">
              </div>
              <div class="field">
                <label>وزن الدقيق المستهدف (جم)</label>
                <input type="number" name="targetFlourWeight" min="1" step="1" value="${formatNumber(config.targetFlourWeight, 0)}">
              </div>
            </div>
          </form>
          ${renderBatchResult(result)}
          ${renderIssueBlocks('ملاحظات العجين المرجعية', result?.doughAudit?.metricNotes?.map(note => ({ title: 'ملاحظة', reason: note })) || [])}
        </div>
      `;

      const form = container.querySelector('#batch-calculator-form');
      const update = () => {
        const nextConfig = readBatchConfig(form);
        getSessionStore()?.updateProductSpec?.(nextConfig);
        const nextResult = BatchCalculator.calculate(nextConfig, getCurrentRecipe(), getCurrentAdjustment(), getCurrentFilling());
        setCalculatedBatch(nextResult);
        if (typeof context?.onApply === 'function') context.onApply(nextResult);
        refreshContext(context);
      };

      form?.querySelectorAll('input, select').forEach(field => {
        field.addEventListener('change', update);
      });
      enhanceEditableFields(form, update);
    }
  });

  ToolRegistry.register({
    id: 'tempering-tool',
    icon: '🌡️',
    title: 'أداة دمج البيض والقاعدة الساخنة',
    description: 'تقدير حراري يراعي اتجاه الدمج، ويستخدم فقط للوصفات التي تضيف البيض بعد التسخين.',
    render(container, context) {
      const recipe = getCurrentRecipe();
      const applicable = TemperingCalculator.isApplicableToRecipe?.(recipe);
      if (!applicable) {
        container.innerHTML = `
          <div class="tool-tempering">
            <div class="notice-card">
              <h4>لا يوجد تمبرنج منفصل في هذه الوصفة</h4>
              <p>${escapeHtml(recipe?.name || 'الوصفة الحالية')} تنتمي إلى مسار ${escapeHtml(recipe?.processFamily || 'حراري مختلف')}؛ اتبع ترتيب الوصفة الأصلي ولا تفرض عليها إضافة البيض بعد التسخين.</p>
            </div>
          </div>`;
        return;
      }
      const batchResult = BatchCalculator.calculate(getCurrentConfig(), recipe, getCurrentAdjustment(), getCurrentFilling());
      const auto = TemperingCalculator.calculateFromBatch(batchResult, { eggTemp: 20, hotTemp: 75, batches: 4, recipe });
      const defaults = {
        eggMass: auto?.eggMass || 150,
        eggTemp: auto?.eggTemp || 20,
        hotMass: auto?.hotMass || 400,
        hotTemp: auto?.hotTemp || 75,
        batches: auto?.batches || 4,
        direction: auto?.direction || recipe?.temperingDirection || 'EGG_INTO_HOT_BASE'
      };
      const values = { ...defaults, ...(context?.values || {}) };
      const result = context?.result || TemperingCalculator.calculate(values.eggMass, values.eggTemp, values.hotMass, values.hotTemp, values.batches, values.direction);
      container.innerHTML = `
        <div class="tool-tempering">
          <div class="notice-card">
            <strong>اتجاه الوصفة الحالية</strong>
            <p>${escapeHtml(result.directionLabel)}</p>
          </div>
          <form id="tempering-form">
            <div class="form-grid compact-grid">
              <div class="field"><label>اتجاه الدمج</label><select name="direction">
                <option value="EGG_INTO_HOT_BASE" ${values.direction === 'EGG_INTO_HOT_BASE' ? 'selected' : ''}>إضافة البيض إلى القاعدة الساخنة</option>
                <option value="HOT_BASE_INTO_EGG" ${values.direction === 'HOT_BASE_INTO_EGG' ? 'selected' : ''}>إضافة القاعدة الساخنة إلى البيض</option>
              </select></div>
              <div class="field"><label>كتلة البيض (جم)</label><input type="number" name="eggMass" min="1" step="1" value="${formatNumber(values.eggMass, 1)}"></div>
              <div class="field"><label>حرارة البيض (°م)</label><input type="number" name="eggTemp" step="0.1" value="${formatNumber(values.eggTemp, 1)}"></div>
              <div class="field"><label>كتلة القاعدة الساخنة (جم)</label><input type="number" name="hotMass" min="1" step="1" value="${formatNumber(values.hotMass, 1)}"></div>
              <div class="field"><label>حرارة القاعدة (°م)</label><input type="number" name="hotTemp" step="0.1" value="${formatNumber(values.hotTemp, 1)}"></div>
              <div class="field"><label>عدد الدفعات</label><input type="number" name="batches" min="1" max="12" step="1" value="${formatNumber(values.batches, 0)}"></div>
            </div>
          </form>
          <div class="results-section">
            <div class="results-grid">
              <div class="result-card"><span class="result-label">متوسط الحرارة النهائي</span><span class="result-value">${formatNumber(result.finalTemp, 1)}°م</span></div>
              <div class="result-card"><span class="result-label">قراءة النهاية</span><span class="result-value">${escapeHtml(result.finalRiskLabel || '—')}</span></div>
              <div class="result-card"><span class="result-label">حجم الدفعة المضافة</span><span class="result-value">${formatNumber(result.batchSize, 1)} g</span></div>
            </div>
            <table class="tempering-table">
              <thead><tr><th>الدفعة</th><th>متوسط الحرارة بعد الدمج</th><th>القراءة</th></tr></thead>
              <tbody>${result.results.map(row => `<tr><td>${row.batch}</td><td>${formatNumber(row.temp, 1)}°م</td><td>${escapeHtml(row.riskLabel || row.level || '—')}</td></tr>`).join('')}</tbody>
            </table>
            ${renderBulletList('ما يجب مراعاته', result.notes)}
            <p class="hint">الحساب يقدّر اتزان حرارة الكتلة كاملة؛ لا يقيس حرارة التلامس اللحظية ولا يضمن منع التخثر. اتبع اتجاه الوصفة والخفق المستمر.</p>
          </div>
        </div>`;
      const form = container.querySelector('#tempering-form');
      const rerender = () => {
        const nextValues = {
          direction: readText(form, 'direction', defaults.direction),
          eggMass: readNumber(form, 'eggMass', defaults.eggMass),
          eggTemp: readNumber(form, 'eggTemp', defaults.eggTemp),
          hotMass: readNumber(form, 'hotMass', defaults.hotMass),
          hotTemp: readNumber(form, 'hotTemp', defaults.hotTemp),
          batches: readNumber(form, 'batches', defaults.batches)
        };
        ToolRegistry.open('tempering-tool', container, { ...context, values: nextValues, result: TemperingCalculator.calculate(nextValues.eggMass, nextValues.eggTemp, nextValues.hotMass, nextValues.hotTemp, nextValues.batches, nextValues.direction) });
      };
      form?.querySelectorAll('input,select').forEach(field => field.addEventListener('change', rerender));
    }
  });

  ToolRegistry.register({
    id: 'sweetness-tool' ,
    icon: '🍯',
    title: 'تحليل الحلاوة',
    description: 'تحليل الحلاوة الموزونة وتعديلها مع الحفاظ على التوازن.',
    render(container, context) {
      const adjustment = getCurrentAdjustment();
      const target = getCurrentSweetnessTarget();
      const adjustmentRange = getSweetnessAdjustmentRange();
      const result = SweetnessCalculator.calculate(getCurrentConfig(), getCurrentRecipe(), getCurrentFilling(), { adjustmentPct: adjustment, target });
      const primarySystem = target === 'dough'
        ? result.model?.systems?.dough
        : (target === 'filling' ? result.model?.systems?.filling : null);
      let primaryMeterValue = primarySystem?.after?.sweetnessEqPer100 ?? result.averageSweetness;
      let primaryMeterLabel = target === 'dough'
        ? 'قراءة العجين المستهدفة'
        : (target === 'filling' ? 'قراءة الحشو المستهدفة' : 'متوسط الكيكة');
      let primaryMeterUnit = 'مكافئ/100جم';
      let primaryMeterWidth = Math.min(100, Math.max(0, primaryMeterValue * 2.5));
      const primaryReading = result.primaryReading || null;
      if (primaryReading && Number.isFinite(Number(primaryReading.value))) {
        primaryMeterValue = Number(primaryReading.value);
        primaryMeterLabel = primaryReading.label || primaryMeterLabel;
        primaryMeterUnit = primaryReading.unit || primaryMeterUnit;
        primaryMeterWidth = Math.min(100, Math.max(0, primaryMeterValue / (Number(primaryReading.meterMax) || 40) * 100));
      }

      container.innerHTML = `
        <div class="tool-sweetness">
          <div class="field">
            <label>تعديل الحلاوة (${formatNumber(adjustment, 0)}%)</label>
            <div class="inline-input-row">
              <input type="range" min="${adjustmentRange.min}" max="${adjustmentRange.max}" step="1" value="${formatNumber(adjustment, 0)}" id="sweetness-adjustment">
              <input type="number" min="${adjustmentRange.min}" max="${adjustmentRange.max}" step="1" value="${formatNumber(adjustment, 0)}" id="sweetness-adjustment-number">
              <button class="btn" id="apply-sweetness-adjustment" type="button">تطبيق</button>
            </div>
            <span class="adjustment-value">${formatNumber(adjustment, 0)}%</span>
          </div>
          <div class="field">
            <label>طبّق التعديل على</label>
            <select id="sweetness-target">
              <option value="filling" ${target === 'filling' ? 'selected' : ''}>الحشو فقط</option>
              <option value="dough" ${target === 'dough' ? 'selected' : ''}>العجين فقط</option>
              <option value="both" ${target === 'both' ? 'selected' : ''}>العجين والحشو</option>
            </select>
          </div>
          <div class="results-section">
            <div class="sweetness-meter">
              <div class="meter-bar">
                <div class="meter-fill" style="width: ${primaryMeterWidth}%; background-color: ${result.rating?.color || '#27ae60'}"></div>
              </div>
              <div class="meter-value">${formatNumber(primaryMeterValue, 1)} ${primaryMeterUnit}</div>
              <div class="hint">${primaryMeterLabel}</div>
              <div class="sweetness-rating" style="color: ${result.rating?.color || '#27ae60'}">${result.label || ''}</div>
            </div>
            <div class="results-grid">
              <div class="result-card">
                <span class="result-label">العجين</span>
                <span class="result-value">${formatNumber(result.doughSweetness, 1)}</span>
              </div>
              <div class="result-card">
                <span class="result-label">الحشو</span>
                <span class="result-value">${formatNumber(result.fillingSweetness, 1)}</span>
              </div>
            </div>
            <p class="hint">نطاق التطبيق الحالي: ${result.model?.targetLabel || (result.target === 'dough' ? 'العجين فقط' : (result.target === 'both' ? 'العجين والحشو' : 'الحشو فقط'))}.</p>
            ${result.recommendation ? `<p class="hint">${result.recommendation}</p>` : ''}
            ${renderBulletList('كيف يقرأ هذا النموذج الحلاوة؟', result.model?.explanation || [])}
            ${renderCalculationAudit(global.getCalculationAudit?.('sweetness'), { title: 'تصنيف النموذج', compact: true })}
            <div class="step-actions">
              <button class="btn" id="reset-sweetness-adjustment">إعادة الضبط</button>
            </div>
          </div>
          ${renderSweetnessSystemCard(result.model?.systems?.dough)}
          ${renderSweetnessSystemCard(result.model?.systems?.filling)}
          ${renderBulletList('تحذيرات النموذج الحالية', result.model?.warnings || [])}
          ${renderSweetnessSources(result.sources)}
        </div>
      `;

      const slider = container.querySelector('#sweetness-adjustment');
      const numberInput = container.querySelector('#sweetness-adjustment-number');
      const targetSelect = container.querySelector('#sweetness-target');
      const valueLabel = container.querySelector('.adjustment-value');
      const commitSweetness = () => {
        const value = Math.max(adjustmentRange.min, Math.min(adjustmentRange.max, Number(numberInput?.value ?? slider?.value) || 0));
        const activeTarget = targetSelect?.value || target;
        const nextResult = SweetnessCalculator.calculate(getCurrentConfig(), getCurrentRecipe(), getCurrentFilling(), { adjustmentPct: value, target: activeTarget });
        if (slider) slider.value = String(value);
        if (numberInput) numberInput.value = String(value);
        if (valueLabel) valueLabel.textContent = `${formatNumber(value, 0)}%`;
        getSessionStore()?.setSweetnessAdjustmentPct?.(value);
        const notePass = (kind, system) => {
          if (!system || !system.active) return;
          getSessionStore()?.notePolicyPass?.(kind, {
            requestedPct: system.requestedPct,
            achievedPct: system.achievedPct,
            limitationReason: system.limitationReason || null,
            compositionLimitationReason: system.compositionLimitationReason || null,
            policyLimitationReason: system.policyLimitationReason || null,
            rangeStates: system.rangeStates || null,
            target: activeTarget
          });
        };
        if (activeTarget === 'both') {
          notePass('dough', nextResult.model?.systems?.dough);
          notePass('filling', nextResult.model?.systems?.filling);
        } else if (activeTarget === 'dough') {
          notePass('dough', nextResult.model?.systems?.dough);
        } else {
          notePass('filling', nextResult.model?.systems?.filling);
        }
        refreshContext(context);
      };
      slider?.addEventListener('input', () => {
        if (numberInput) numberInput.value = slider.value;
        if (valueLabel) valueLabel.textContent = `${formatNumber(slider.value, 0)}%`;
      });
      slider?.addEventListener('change', commitSweetness);
      numberInput?.addEventListener('change', commitSweetness);
      numberInput?.addEventListener('focus', () => {
        if (typeof numberInput.select === 'function') requestAnimationFrame(() => numberInput.select());
      });
      numberInput?.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commitSweetness();
          numberInput.blur();
        }
      });
      container.querySelector('#apply-sweetness-adjustment')?.addEventListener('click', commitSweetness);
      targetSelect?.addEventListener('change', () => {
        getSessionStore()?.setSweetnessTarget?.(targetSelect.value);
        refreshContext(context);
      });
      container.querySelector('#reset-sweetness-adjustment')?.addEventListener('click', () => {
        getSessionStore()?.setSweetnessAdjustmentPct?.(0);
        refreshContext(context);
      });
    }
  });

  ToolRegistry.register({
    id: 'dough-analyzer',
    icon: '🥣',
    title: 'تشخيص العجين',
    description: 'فحص مرجعي للعجين مقابل النموذج الأصلي.',
    render(container) {
      const result = DoughAnalyzer.analyze(getCurrentRecipe(), getCurrentConfig(), getCurrentFilling(), getCurrentAdjustment());

      container.innerHTML = `
        <div class="tool-dough-analyzer">
          <div class="analysis-grid">
            <div class="analysis-card">
              <h4>دهن/دقيق</h4>
              <div class="analysis-value">${formatNumber(result.fatRatio, 1)}%</div>
            </div>
            <div class="analysis-card">
              <h4>ماء/دقيق</h4>
              <div class="analysis-value">${formatNumber(result.liquidRatio, 1)}%</div>
            </div>
            <div class="analysis-card">
              <h4>سكر/دقيق</h4>
              <div class="analysis-value">${formatNumber(result.sugarRatio, 1)}%</div>
            </div>
          </div>
          <div class="overall-rating" style="border-color: ${result.overall?.color || '#27ae60'}; color: ${result.overall?.color || '#27ae60'}">
            ${result.overall?.label || 'لا توجد قراءة'}
          </div>
          ${renderIssueBlocks('انحرافات العجين', result.issues?.map(issue => ({
            title: issue.label,
            reason: issue.status === 'below' ? 'أقل من المرجع.' : 'أعلى من المرجع.'
          })) || [])}
          ${renderCalculationAudit(global.getCalculationAudit?.('dough-audit'), { title: 'تصنيف التشخيص', compact: true })}
          ${renderBulletList('ملاحظات التدقيق', result.audit?.metricNotes || [])}
        </div>
      `;
    }
  });

  ToolRegistry.register({
    id: 'dough-formula-editor',
    icon: '✎',
    title: 'تحرير العجين',
    description: 'تحرير الصيغة الحية للعجين داخل الجلسة الحالية.',
    render(container, context) {
      renderFormulaEditorTool(container, context, 'dough');
    }
  });

  ToolRegistry.register({
    id: 'filling-calculator',
    icon: '🍶',
    title: 'حاسبة الحشو',
    description: 'سكيلنج الحشو الفعلي مع مراعاة الكثافة والـ yield.',
    render(container, context) {
      const fillings = typeof global.listFillings === 'function' ? global.listFillings() : Object.values(global.FILLING_CATALOG || {});
      const selected = getSessionStore()?.resolveActiveFillingProfile?.()?.id || null;
      const result = BatchCalculator.calculateFilling(getCurrentConfig(), getCurrentFilling(), getCurrentAdjustment(), getCurrentRecipe());

      container.innerHTML = `
        <div class="tool-filling-calculator">
          <div class="recipe-list">
            ${fillings.map(filling => `
              <label class="recipe-item ${filling.id === selected ? 'selected' : ''}">
                <input type="radio" name="selected-filling" value="${filling.id}" ${filling.id === selected ? 'checked' : ''}>
                <div class="recipe-info">
                  <h4>${filling.name}</h4>
                  <p>${filling.description || ''}</p>
                </div>
              </label>
            `).join('')}
          </div>
          ${renderFillingResult(result)}
          ${renderIssueBlocks('تدقيق الحشو', result?.densityAudit?.checks ? Object.entries(result.densityAudit.checks).map(([key, check]) => ({
            title: check?.label || key,
            reason: check?.status === 'within' ? 'ضمن المرجع.' : check?.status === 'above' ? 'أعلى من المرجع.' : 'أقل من المرجع.'
          })) : [])}
        </div>
      `;

      container.querySelectorAll('input[name="selected-filling"]').forEach(field => {
        field.addEventListener('change', () => {
          getSessionStore()?.setFilling?.(field.value);
          if (typeof context?.onSelect === 'function') {
            context.onSelect({ fillingId: field.value, filling: getCurrentFilling() });
          }
          refreshContext(context);
        });
      });
    }
  });

  ToolRegistry.register({
    id: 'filling-formula-editor',
    icon: '✎',
    title: 'تحرير الحشو',
    description: 'تحرير الصيغة الحية للحشو داخل الجلسة الحالية.',
    render(container, context) {
      renderFormulaEditorTool(container, context, 'filling');
    }
  });

  ToolRegistry.register({
    id: 'full-analysis',
    icon: '📊',
    title: 'التحليل الكامل',
    description: 'عرض موحّد للعجين والحشو والحلاوة والمشكلات المرجعية.',
    render(container) {
      const result = global.WorkflowContext?.getCurrent?.(getCurrentSession()) || null;
      if (!result) {
        container.innerHTML = '<div class="empty-state"><p>تعذر بناء التحليل الحالي.</p></div>';
        return;
      }

      container.innerHTML = `
        <div class="tool-full-analysis">
          <div class="analysis-grid">
            <div class="analysis-card">
              <h4>سماكة العجين</h4>
              <div class="analysis-value">${formatNumber(result.batch?.estimatedThicknessMm, 1)} mm</div>
            </div>
            <div class="analysis-card">
              <h4>تحضير الحشو</h4>
              <div class="analysis-value">${formatNumber(result.filling?.preparedRequiredMass, 1)} g</div>
            </div>
            <div class="analysis-card">
              <h4>الصافي على الكيكة</h4>
              <div class="analysis-value">${formatNumber(result.filling?.onCakeRequiredMass, 1)} g</div>
            </div>
            <div class="analysis-card">
              <h4>التغطية الخارجية</h4>
              <div class="analysis-value">${formatNumber(result.filling?.outerRequiredMass, 1)} g</div>
            </div>
            <div class="analysis-card">
              <h4>عائلة الحشو</h4>
              <div class="analysis-value">${escapeHtml(result.fillingExecution?.familyLabel || result.filling?.familyLabel || '-')}</div>
            </div>
            <div class="analysis-card">
              <h4>الحلاوة</h4>
              <div class="analysis-value">${formatNumber(result.sweetness?.averageSweetness, 1)}</div>
            </div>
            <div class="analysis-card">
              <h4>البنية</h4>
              <div class="analysis-value">${formatNumber(result.structure?.stability || 0, 1)}</div>
            </div>
          </div>
          <p class="hint">المصدر: خدمة التحليل الموحدة فوق الجلسة النشطة.</p>
          ${renderCalculationAudit(global.listCalculationAudits?.(['batch', 'filling', 'sweetness', 'dough-audit'], { scaleMode: result.batch?.scaleMode || getCurrentConfig().scaleMode }), { title: 'تصنيف المحركات الحالية' })}
          ${result.fillingExecution?.targetTexture ? `<p class="hint">هدف الحشو الحالي: ${escapeHtml(result.fillingExecution.targetTexture)}</p>` : ''}
          ${renderOperationalWindow('نوافذ تشغيل الحشو', result.fillingExecution?.operationalWindows || [])}
          ${renderBulletList('راقب في الحشو', result.fillingExecution?.watchpoints || [])}
          ${renderIssueBlocks('مشكلات حرجة', result.summary?.issues?.map(issue => ({ title: 'مشكلة', reason: issue })) || [])}
          ${renderIssueBlocks('تحذيرات', result.summary?.warnings?.map(item => ({ title: 'تحذير', reason: item })) || [])}
          ${renderBulletList('ملاحظات', result.summary?.notes || [])}
        </div>
      `;
    }
  });

  ToolRegistry.register({
    id: 'science-reference',
    icon: 'ًں”¬',
    title: 'القاعدة العلمية',
    description: 'مكتبة موضوعات علمية واضحة مع توصيات من المرحلة الحالية، من دون حصر المحتوى في الحالة النشطة فقط.',
    render(container, context) {
      const phaseId = getCurrentPhaseId();
      const selectedTopicId = getReferenceTopic();
      const fallbackTopicId = global.getDefaultReferenceTopicId?.('science');
      const topic = global.getReferenceTopic?.('science', selectedTopicId)
        || global.getReferenceTopic?.('science', fallbackTopicId)
        || null;
      const science = global.WorkflowContext?.getScienceContext?.(phaseId, getCurrentSession()) || {};
      const phase = science.phase || getRunbookPhase(phaseId);

      container.innerHTML = `
        <div class="tool-science-reference reference-browser">
          ${renderReferenceExplorer('science', topic?.id || fallbackTopicId, phaseId)}
          <div class="reference-content">
            <div class="results-section">
              <h4>السياق الحالي</h4>
              <div class="results-grid">
                <div class="result-card"><span class="result-label">الوصفة</span><span class="result-value">${science.recipe?.name || getCurrentRecipe()?.name || '-'}</span></div>
                <div class="result-card"><span class="result-label">الحشو</span><span class="result-value">${science.filling?.name || getCurrentFilling()?.name || '-'}</span></div>
                <div class="result-card"><span class="result-label">المرحلة</span><span class="result-value">${phase?.title || phaseId}</span></div>
                <div class="result-card"><span class="result-label">الموضوع المفتوح</span><span class="result-value">${topic?.title || '—'}</span></div>
              </div>
              <p class="hint">هذه المكتبة مستقلة عن المرحلة الحالية، لكننا نرشح لك موضوعات مرتبطة بموقعك التشغيلي لتسريع الوصول.</p>
            </div>
            ${renderReferenceArticle(topic)}
          </div>
        </div>
      `;
      bindReferenceTopicButtons(container, context);
    }
  });

  ToolRegistry.register({
    id: 'troubleshooting-reference',
    icon: 'ًں§ھ',
    title: 'مشاكل وحلول',
    description: 'شجرة مشكلات عملية مع شرح واضح، مع إبقاء إشارات الجلسة الحالية كطبقة مساعدة لا كطريقة الوصول الوحيدة.',
    render(container, context) {
      const phaseId = getCurrentPhaseId();
      const selectedTopicId = getTroubleshootingTopic();
      const fallbackTopicId = global.getDefaultReferenceTopicId?.('troubleshooting');
      const topic = global.getReferenceTopic?.('troubleshooting', selectedTopicId)
        || global.getReferenceTopic?.('troubleshooting', fallbackTopicId)
        || null;
      const diagnostics = global.WorkflowContext?.getDiagnosticsContext?.(phaseId, getCurrentSession()) || null;
      const snapshot = global.WorkflowContext?.getPhaseSnapshot?.(phaseId, getCurrentSession()) || null;
      const cards = diagnostics?.troubleshootingCards || snapshot?.troubleshootingCards || [];
      container.innerHTML = `
        <div class="tool-troubleshooting-reference reference-browser">
          ${renderReferenceExplorer('troubleshooting', topic?.id || fallbackTopicId, phaseId)}
          <div class="reference-content">
            <div class="results-section">
              <h4>الإشارات الحية من الجلسة</h4>
              <p class="hint">المكتبة هنا مستقلة. الإشارات التالية تساعدك فقط على ربط المشكلة المفتوحة بما يحدث الآن في مرحلتك الحالية.</p>
              ${snapshot ? `<p class="hint">جاهزية المرحلة: ${snapshot.readyToAdvance ? 'جاهزة للانتقال' : 'تحتاج إكمالًا'} — الخطوات المطلوبة/المكتملة: ${snapshot.requiredSteps}/${snapshot.completedSteps}</p>` : ''}
            </div>
            ${renderReferenceArticle(topic)}
            ${renderIssueBlocks('إشارات من الجلسة الحالية', cards)}
            ${renderBulletList('تحذيرات مرتبطة بالحالة', diagnostics?.warnings || [])}
            ${renderBulletList('ملاحظات مرتبطة بالحالة', diagnostics?.notes || [])}
          </div>
        </div>
      `;
      bindReferenceTopicButtons(container, context);
    }
  });

  ToolRegistry.register({
    id: 'phase-log',
    icon: '📝',
    title: 'سجل المرحلة',
    description: 'تسجيل observations / deviations / phase note داخل الجلسة الحالية بشكل منظم.',
    render(container, context) {
      const phaseId = getCurrentPhaseId();
      const session = getCurrentSession();
      const currentNote = getSessionStore()?.getPhaseNote?.(phaseId) || '';
      const observations = getSessionStore()?.getObservations?.(phaseId) || [];
      const deviations = getSessionStore()?.getDeviations?.(phaseId) || [];
      container.innerHTML = `
        <div class="tool-phase-log">
          <div class="results-section">
            <h4>سجل المرحلة الحالية: ${phaseId}</h4>
            <p class="hint">استخدم هذا السجل لتوثيق ما حدث فعليًا بدل ترك التشخيص يعتمد على الحسابات فقط.</p>
          </div>
          <form id="phase-note-form" class="results-section">
            <h4>ملاحظة المرحلة</h4>
            <textarea name="phaseNote" rows="4" placeholder="ملاحظة مختصرة عن المرحلة الحالية...">${currentNote}</textarea>
            <div class="step-actions"><button type="submit" class="btn primary">حفظ الملاحظة</button></div>
          </form>
          <form id="phase-observation-form" class="results-section">
            <h4>إضافة ملاحظة تشغيلية</h4>
            <textarea name="observationText" rows="3" placeholder="ما الذي لاحظته أثناء التنفيذ؟"></textarea>
            <div class="field">
              <label>الشدّة</label>
              <select name="severity">
                <option value="info">معلومة</option>
                <option value="warning">تحذير</option>
                <option value="critical">حرج</option>
              </select>
            </div>
            <div class="step-actions"><button type="submit" class="btn">إضافة الملاحظة</button></div>
          </form>
          <form id="phase-deviation-form" class="results-section">
            <h4>إضافة انحراف مسجل</h4>
            <textarea name="deviationText" rows="3" placeholder="ما الانحراف الذي حدث؟"></textarea>
            <div class="field">
              <label>الأثر</label>
              <select name="impact">
                <option value="warning">تحذير</option>
                <option value="critical">حرج</option>
                <option value="unknown">غير محسوم</option>
              </select>
            </div>
            <div class="step-actions"><button type="submit" class="btn">إضافة الانحراف</button></div>
          </form>
          ${renderIssueBlocks('الملاحظات المسجلة', observations.map(item => ({ title: item.text, reason: item.createdAt, severity: item.severity || 'info', actions: [] })))}
          ${renderIssueBlocks('الانحرافات المسجلة', deviations.map(item => ({ title: item.text, reason: item.createdAt, severity: item.impact || 'warning', actions: [] })))}
        </div>
      `;

      container.querySelector('#phase-note-form')?.addEventListener('submit', event => {
        event.preventDefault();
        const form = event.currentTarget;
        getSessionStore()?.setPhaseNote?.(phaseId, readText(form, 'phaseNote', ''));
        refreshContext(context);
      });

      container.querySelector('#phase-observation-form')?.addEventListener('submit', event => {
        event.preventDefault();
        const form = event.currentTarget;
        getSessionStore()?.addObservation?.({
          phaseId,
          text: readText(form, 'observationText', ''),
          severity: readText(form, 'severity', 'info')
        });
        refreshContext(context);
      });

      container.querySelector('#phase-deviation-form')?.addEventListener('submit', event => {
        event.preventDefault();
        const form = event.currentTarget;
        getSessionStore()?.addDeviation?.({
          phaseId,
          text: readText(form, 'deviationText', ''),
          impact: readText(form, 'impact', 'warning')
        });
        refreshContext(context);
      });
    }
  });

  ToolRegistry.register({
    id: 'workflow-tools-hub',
    icon: null,
    title: 'مركز الأدوات',
    description: 'فتح الأدوات السياقية دون تحويلها إلى مراحل تشغيل رئيسية.',
    render(container, context) {
      const tools = ToolRegistry.getAll().filter(tool => !['workflow-tools-hub'].includes(tool.id));
      container.innerHTML = `
        <div class="workflow-tools-hub">
          <div class="tools-grid">
            ${tools.map(tool => `
              <div class="tool-card" data-tool-id="${tool.id}">
                <div class="tool-card-mark">${getToolMonogram(tool)}</div>
                <div class="tool-card-copy">
                  <h4>${tool.title}</h4>
                  <p>${tool.description || ''}</p>
                </div>
                <button class="btn btn-primary">فتح</button>
              </div>`).join('')}
          </div>
        </div>
      `;

      container.querySelectorAll('[data-tool-id]').forEach(node => {
        node.addEventListener('click', () => {
          const nextToolId = node.dataset.toolId;
          if (!nextToolId || nextToolId === 'workflow-tools-hub') return;
          const host = container.parentElement;
          if (!host) return;
          ToolRegistry.open(nextToolId, container, context);
          host.parentElement?.querySelector('.drawer-title') && (host.parentElement.querySelector('.drawer-title').textContent = ToolRegistry.get(nextToolId)?.title || 'أداة');
        });
      });
    }
  });

  ToolRegistry.register({
    id: 'review-tool',
    icon: '⭐',
    title: 'مراجعة التشغيل',
    description: 'تسجيل نتيجة التنفيذ والملاحظات وربطها بالسياق الحالي.',
    render(container, context) {
      container.innerHTML = `
        <div class="tool-review">
          <form id="review-form">
            <div class="field">
              <label>التقييم</label>
              <select name="stars">
                <option value="5">5</option>
                <option value="4">4</option>
                <option value="3">3</option>
                <option value="2">2</option>
                <option value="1">1</option>
              </select>
            </div>
            <div class="field">
              <label>النتيجة</label>
              <select name="outcome">
                <option value="success">ناجحة</option>
                <option value="partial">جزئية</option>
                <option value="fail">فاشلة</option>
              </select>
            </div>
            <div class="field">
              <label>ملاحظات</label>
              <textarea name="notes" rows="5" placeholder="سجل ما حدث فعليًا، وليس الانطباع فقط."></textarea>
            </div>
            <div class="step-actions">
              <button type="submit" class="btn primary">حفظ المراجعة</button>
            </div>
          </form>
        </div>
      `;

      container.querySelector('#review-form')?.addEventListener('submit', event => {
        event.preventDefault();
        const form = event.currentTarget;
        getSessionStore()?.addReview?.({
          stars: readNumber(form, 'stars', 5),
          outcome: readText(form, 'outcome', 'success'),
          notes: readText(form, 'notes', ''),
          recipeId: getSessionStore()?.resolveActiveRecipeProfile?.()?.id || null,
          fillingId: getSessionStore()?.resolveActiveFillingProfile?.()?.id || null,
          adjustmentPct: getCurrentAdjustment(),
          batchConfig: getCurrentConfig()
        });
        if (typeof context?.onSave === 'function') {
          context.onSave({ saved: true });
        }
        refreshContext(context);
        closeFromTool(context);
      });
    }
  });

  global.ToolRegistry = ToolRegistry;
  global.readText = global.readText || readText;
  global.readNumber = global.readNumber || readNumber;
})(typeof window !== 'undefined' ? window : globalThis);
