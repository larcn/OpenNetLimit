(function (global) {
  'use strict';

  const MAX_VARIABLES = 4;
  const MODES = Object.freeze(['free', 'lower', 'upper']);
  const SINGULAR_REL_THRESHOLD = 1e-12;
  const BOUND_TOLERANCE = 1e-12;

  function getDefaultEps() {
    const reg = global.MEDOVIK_ENGINEERING_CONSTANTS?.SOLVER_REGULARIZATION?.value;
    return typeof reg === 'number' && Number.isFinite(reg) && reg >= 0 ? reg : 1e-9;
  }

  function solveGaussianPivot(matrix, rhs) {
    const n = matrix.length;
    if (n === 0) return { x: [], absDet: 1, ok: true };
    const A = matrix.map((row) => row.slice());
    const b = rhs.slice();
    let absDet = 1;

    for (let col = 0; col < n; col += 1) {
      let pivotRow = col;
      let maxAbs = Math.abs(A[col][col]);
      for (let r = col + 1; r < n; r += 1) {
        const candidate = Math.abs(A[r][col]);
        if (candidate > maxAbs) {
          maxAbs = candidate;
          pivotRow = r;
        }
      }
      if (!Number.isFinite(maxAbs) || maxAbs === 0) {
        return { x: null, absDet: 0, ok: false };
      }
      if (pivotRow !== col) {
        const tmpRow = A[col];
        A[col] = A[pivotRow];
        A[pivotRow] = tmpRow;
        const tmpB = b[col];
        b[col] = b[pivotRow];
        b[pivotRow] = tmpB;
      }

      const pivot = A[col][col];
      absDet *= Math.abs(pivot);
      for (let r = col + 1; r < n; r += 1) {
        const factor = A[r][col] / pivot;
        if (factor === 0) continue;
        for (let c = col; c < n; c += 1) {
          A[r][c] -= factor * A[col][c];
        }
        b[r] -= factor * b[col];
      }
    }

    const x = new Array(n);
    for (let i = n - 1; i >= 0; i -= 1) {
      let sum = b[i];
      for (let j = i + 1; j < n; j += 1) {
        sum -= A[i][j] * x[j];
      }
      const val = sum / A[i][i];
      if (!Number.isFinite(val)) {
        return { x: null, absDet: 0, ok: false };
      }
      x[i] = val;
    }

    return { x, absDet, ok: true };
  }

  function evaluateObjective(posRows, x, x0, eps) {
    let total = 0;
    for (let i = 0; i < posRows.length; i += 1) {
      const row = posRows[i];
      let dot = 0;
      for (let j = 0; j < x.length; j += 1) {
        dot += (Number(row.a[j]) || 0) * x[j];
      }
      const diff = dot - row.b;
      total += row.w * diff * diff;
    }
    if (eps > 0) {
      let regSum = 0;
      for (let j = 0; j < x.length; j += 1) {
        const dx = x[j] - x0[j];
        regSum += dx * dx;
      }
      total += eps * regSum;
    }
    return total;
  }

  function solveBoundedVectors(input) {
    if (!input || typeof input !== 'object') {
      throw new TypeError('solveBoundedVectors requires an input object');
    }
    const { rows = [], lower, upper, x0 } = input;
    if (!Array.isArray(lower) || !Array.isArray(upper) || !Array.isArray(x0)) {
      throw new TypeError('lower, upper, and x0 must be arrays');
    }

    const n = lower.length;
    if (n > MAX_VARIABLES) {
      throw new RangeError(`solveBoundedVectors supports at most ${MAX_VARIABLES} variables (got ${n})`);
    }
    if (upper.length !== n || x0.length !== n) {
      throw new Error('infeasible-bounds');
    }

    const cleanLower = new Array(n);
    const cleanUpper = new Array(n);
    const cleanX0 = new Array(n);
    for (let j = 0; j < n; j += 1) {
      const lo = lower[j];
      const hi = upper[j];
      if (
        typeof lo !== 'number' ||
        !Number.isFinite(lo) ||
        typeof hi !== 'number' ||
        Number.isNaN(hi) ||
        hi === -Infinity ||
        lo > hi
      ) {
        throw new Error('infeasible-bounds');
      }
      cleanLower[j] = lo;
      cleanUpper[j] = hi;
      cleanX0[j] = typeof x0[j] === 'number' && Number.isFinite(x0[j]) ? x0[j] : lo;
    }

    const eps = input.eps !== undefined ? Number(input.eps) : getDefaultEps();
    if (!Number.isFinite(eps) || eps < 0) {
      throw new RangeError('eps must be a non-negative finite number');
    }

    const posRows = [];
    if (Array.isArray(rows)) {
      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        if (!row || !Array.isArray(row.a)) continue;
        const w = Number(row.w);
        const b = Number(row.b);
        if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(b)) continue;
        posRows.push({
          a: row.a.map((v) => Number(v) || 0),
          b,
          w
        });
      }
    }

    if (n === 0) {
      return {
        x: [],
        objective: evaluateObjective(posRows, [], [], eps),
        pattern: []
      };
    }

    const totalPatterns = Math.pow(3, n);
    const m = posRows.length;
    let best = null;

    for (let code = 0; code < totalPatterns; code += 1) {
      const pattern = new Array(n);
      const x = new Array(n);
      const freeIndices = [];
      let rem = code;
      let skipPattern = false;

      for (let j = n - 1; j >= 0; j -= 1) {
        const mode = MODES[rem % 3];
        rem = Math.floor(rem / 3);
        pattern[j] = mode;
        if (mode === 'lower') {
          x[j] = cleanLower[j];
        } else if (mode === 'upper') {
          if (!Number.isFinite(cleanUpper[j])) {
            skipPattern = true;
            break;
          }
          x[j] = cleanUpper[j];
        }
      }
      if (skipPattern) continue;

      for (let j = 0; j < n; j += 1) {
        if (pattern[j] === 'free') {
          freeIndices.push(j);
        }
      }

      const k = freeIndices.length;
      if (k > 0) {
        const shiftedB = new Array(m);
        for (let r = 0; r < m; r += 1) {
          let fixedSum = 0;
          const rowA = posRows[r].a;
          for (let j = 0; j < n; j += 1) {
            if (pattern[j] !== 'free') {
              fixedSum += (rowA[j] || 0) * x[j];
            }
          }
          shiftedB[r] = posRows[r].b - fixedSum;
        }

        let freeSolution = null;

        if (k === m) {
          const subA = new Array(k);
          let rowNormProd = 1;
          for (let r = 0; r < k; r += 1) {
            const subRow = new Array(k);
            let normSq = 0;
            for (let c = 0; c < k; c += 1) {
              const val = posRows[r].a[freeIndices[c]] || 0;
              subRow[c] = val;
              normSq += val * val;
            }
            subA[r] = subRow;
            rowNormProd *= Math.sqrt(normSq);
          }

          if (rowNormProd > 0) {
            const direct = solveGaussianPivot(subA, shiftedB);
            if (direct.ok && direct.absDet > SINGULAR_REL_THRESHOLD * rowNormProd) {
              freeSolution = direct.x;
            }
          }
        }

        if (!freeSolution) {
          const normalM = new Array(k);
          const normalRhs = new Array(k);
          for (let u = 0; u < k; u += 1) {
            const rowM = new Array(k).fill(0);
            rowM[u] = eps;
            normalM[u] = rowM;
            normalRhs[u] = eps * cleanX0[freeIndices[u]];
          }

          for (let r = 0; r < m; r += 1) {
            const w = posRows[r].w;
            const br = shiftedB[r];
            const rowA = posRows[r].a;
            for (let u = 0; u < k; u += 1) {
              const au = rowA[freeIndices[u]] || 0;
              normalRhs[u] += w * au * br;
              for (let v = 0; v < k; v += 1) {
                normalM[u][v] += w * au * (rowA[freeIndices[v]] || 0);
              }
            }
          }

          const solvedNormal = solveGaussianPivot(normalM, normalRhs);
          if (!solvedNormal.ok) continue;
          freeSolution = solvedNormal.x;
        }

        for (let u = 0; u < k; u += 1) {
          x[freeIndices[u]] = freeSolution[u];
        }
      }

      let feasible = true;
      for (let j = 0; j < n; j += 1) {
        const val = x[j];
        if (!Number.isFinite(val)) {
          feasible = false;
          break;
        }
        if (val < cleanLower[j] - BOUND_TOLERANCE || val > cleanUpper[j] + BOUND_TOLERANCE) {
          feasible = false;
          break;
        }
        if (val < cleanLower[j]) x[j] = cleanLower[j];
        if (val > cleanUpper[j]) x[j] = cleanUpper[j];
      }
      if (!feasible) continue;

      const objective = evaluateObjective(posRows, x, cleanX0, eps);
      if (!Number.isFinite(objective)) continue;

      if (best === null || objective < best.objective) {
        best = { x, objective, pattern };
      }
    }

    if (!best) {
      throw new Error('infeasible-bounds');
    }

    return best;
  }

  global.MedovikBoundedSolver = Object.freeze({
    solveBoundedVectors
  });
})(typeof window !== 'undefined' ? window : globalThis);
