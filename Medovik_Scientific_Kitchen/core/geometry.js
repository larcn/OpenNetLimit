/* offline build: geometry.js */
// geometry.js
function calcArea(shape, d1, d2) {
  if (shape === 'round') {
    const r = d1 / 2;
    return Math.PI * r * r;
  } else if (shape === 'rect') {
    return d1 * d2;
  }
  throw new Error(`Unknown shape: ${shape}`);
}

function calcPerimeter(shape, d1, d2) {
  if (shape === 'round') {
    return Math.PI * d1;
  } else if (shape === 'rect') {
    return 2 * (d1 + d2);
  }
  throw new Error(`Unknown shape: ${shape}`);
}

function calcVolume({ shape, d1, d2, layers, thicknessMm }) {
  const area = calcArea(shape, d1, d2);
  const h_cm = (thicknessMm || 0) / 10;
  const L = Math.max(1, layers || 1);
  const volume = area * h_cm * L;
  return { area, volume, layers: L };
}
