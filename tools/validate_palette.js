#!/usr/bin/env node
/* ==========================================================================
   validate_palette.js — checks a chart palette is actually usable.

   theme.css tells you to re-run this after touching --cat-*, --seq-* or
   --div-*. It lives here so that instruction is true: the original validator came
   from a tooling bundle that is not part of this repo and disappears.

   WHAT IT CHECKS, AND WHY EACH ONE MATTERS

     1. Lightness band   Marks sit on a dark panel. Too dark and they vanish
                         into it; too light and they glare and stop reading as
                         a set. Target OKLab L 0.45-0.72.
     2. Chroma floor     Below ~0.05 chroma a "colour" is grey, and a
                         categorical scale of greys is not a scale.
     3. CVD separation   Adjacent categorical hues simulated through
                         deuteranopia / protanopia / tritanopia (Machado 2009).
                         Two series a red-green dichromat cannot tell apart are
                         two series that do not exist for ~8% of men.
     4. Normal-vision    A pair can pass CVD and still be too close for
        separation       everyone else. Floor of 15 on the same scale.
     5. Contrast         WCAG contrast ratio against the panel colour. A WARN
                         here obligates a visible label or a table view; it is
                         not dismissable.
     6. Ramp monotonic   Sequential ramps must climb in lightness without
                         reversing, or "darker = more" silently stops holding.

   USAGE
     node tools/validate_palette.js                 # reads theme.css
     node tools/validate_palette.js "#aabbcc,..."   # ad-hoc list
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------- colour math

function hexToRgb(hex) {
  const h = hex.trim().replace('#', '');
  const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  return [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16) / 255);
}

const toLinear = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

function srgbToOklab([r, g, b]) {
  const R = toLinear(r), G = toLinear(g), B = toLinear(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

const chroma = ([, a, b]) => Math.hypot(a, b);
// OKLab distance, scaled x100 so the numbers read like familiar deltaE units.
const dE = (x, y) => Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) * 100;

function relLuminance([r, g, b]) {
  const [R, G, B] = [r, g, b].map(toLinear);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}
function contrast(a, b) {
  const [x, y] = [relLuminance(a), relLuminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// Machado, Oliveira & Fernandes (2009), severity 1.0.
const CVD = {
  deuteranopia: [[0.367322, 0.860646, -0.227968],
                 [0.280085, 0.672501, 0.047413],
                 [-0.011820, 0.042940, 0.968881]],
  protanopia:   [[0.152286, 1.052583, -0.204868],
                 [0.114503, 0.786281, 0.099216],
                 [-0.003882, -0.048116, 1.051998]],
  tritanopia:   [[1.255528, -0.076749, -0.178779],
                 [-0.078411, 0.930809, 0.147602],
                 [0.004733, 0.691367, 0.303900]],
};
function simulate(rgb, kind) {
  const m = CVD[kind];
  return m.map(row => Math.min(1, Math.max(0,
    row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2])));
}

// ---------------------------------------------------------------- reporting

let failures = 0, warnings = 0;
const line = (verdict, msg) => {
  if (verdict === 'FAIL') failures++;
  if (verdict === 'WARN') warnings++;
  console.log(`  ${verdict.padEnd(4)}  ${msg}`);
};

function checkSet(name, hexes, surface, opts = {}) {
  console.log(`\n── ${name} ${'─'.repeat(Math.max(0, 58 - name.length))}`);
  const labs = hexes.map(h => srgbToOklab(hexToRgb(h)));
  const rgbs = hexes.map(hexToRgb);
  const surfRgb = hexToRgb(surface);

  hexes.forEach((hex, i) => {
    const L = labs[i][0], C = chroma(labs[i]);
    const ratio = contrast(rgbs[i], surfRgb);
    const bits = [`L ${L.toFixed(3)}`, `C ${C.toFixed(3)}`, `contrast ${ratio.toFixed(2)}:1`];
    // A categorical set must hold ONE lightness band, or the eye reads the
    // lighter hues as "more". A ramp is the opposite: spanning lightness IS
    // the encoding, so it only has to stay off the two extremes and keep its
    // darkest step legible against the panel.
    const [loL, hiL] = opts.ramp ? [0.35, 0.92] : [0.45, 0.72];
    let verdict = 'ok';
    if (L < loL || L > hiL) verdict = 'FAIL';
    else if (!opts.skipChroma && C < 0.05) verdict = 'FAIL';
    else if (ratio < 2.2) verdict = 'WARN';
    line(verdict === 'ok' ? 'ok' : verdict, `${hex}  ${bits.join('  ')}`);
  });

  if (opts.adjacentOnly !== false) {
    console.log('  adjacent-pair separation:');
    for (let i = 0; i + 1 < hexes.length; i++) {
      const a = rgbs[i], b = rgbs[i + 1];
      const normal = dE(labs[i], labs[i + 1]);
      const cvd = Object.keys(CVD).map(k =>
        ({ k, d: dE(srgbToOklab(simulate(a, k)), srgbToOklab(simulate(b, k))) }));
      const worst = cvd.reduce((m, x) => (x.d < m.d ? x : m));
      let verdict = 'ok';
      if (normal < 15) verdict = 'FAIL';
      else if (worst.d < 6) verdict = 'FAIL';
      else if (worst.d < 8) verdict = 'WARN';
      line(verdict === 'ok' ? 'ok' : verdict,
        `${hexes[i]} / ${hexes[i + 1]}  normal ${normal.toFixed(1)}  ` +
        `worst ${worst.k} ${worst.d.toFixed(1)}`);
    }
  }

  if (opts.monotonic) {
    const Ls = labs.map(l => l[0]);
    const climbs = Ls.every((v, i) => i === 0 || v > Ls[i - 1]);
    const falls = Ls.every((v, i) => i === 0 || v < Ls[i - 1]);
    line(climbs || falls ? 'ok' : 'FAIL',
      `lightness monotonic: ${Ls.map(v => v.toFixed(2)).join(' → ')}`);
  }
}

// ---------------------------------------------------------------- input

function fromTheme(file) {
  const css = fs.readFileSync(file, 'utf8');
  // Only the live block: everything after the "PREVIOUS THEME" marker is a
  // commented-out archive and must not be validated as if it were in use.
  const live = css.split('PREVIOUS THEME')[0];
  const grab = re => {
    const out = [];
    let m;
    const r = new RegExp(re, 'g');
    while ((m = r.exec(live))) out.push(m[1]);
    return out;
  };
  return {
    surface: (live.match(/--ink-panel:\s*(#[0-9a-f]{3,8})/i) || [])[1] || '#110f22',
    cat: grab('--cat-\\d:\\s*(#[0-9a-f]{6})'),
    seq: grab('--seq-\\d:\\s*(#[0-9a-f]{6})'),
    divNeg: grab('--div-neg-\\d:\\s*(#[0-9a-f]{6})'),
    divPos: grab('--div-pos-\\d:\\s*(#[0-9a-f]{6})'),
  };
}

const arg = process.argv[2];
if (arg && arg.includes('#')) {
  checkSet('ad-hoc', arg.split(',').map(s => s.trim()), process.argv[3] || '#110f22');
} else {
  const file = path.join(__dirname, '..', 'theme.css');
  const t = fromTheme(file);
  console.log(`palette from ${path.relative(process.cwd(), file)}  ·  surface ${t.surface}`);
  checkSet('categorical (--cat-1..8)', t.cat, t.surface);
  checkSet('sequential (--seq-1..5)', t.seq, t.surface,
    { monotonic: true, adjacentOnly: false, skipChroma: true, ramp: true });
  checkSet('diverging negative', t.divNeg, t.surface, { adjacentOnly: false, ramp: true });
  checkSet('diverging positive', t.divPos, t.surface, { adjacentOnly: false, ramp: true });
}

console.log(`\n${failures} FAIL, ${warnings} WARN`);
process.exit(failures ? 1 : 0);
