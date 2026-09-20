// Does anything in the app end up wider than a phone?
//
//   node build/test-layout.mjs
//
// Robert, 20 Sept 2026, with three screenshots of the app scrolled sideways
// and every screen cut in half: "More scrolling issues too."
//
// The cause was a row of dashes at the top of a round — one per question. They
// were sized when a round was ten questions: 18px each plus 4px gaps is 216px,
// which fits. A round became twenty-five in v1.4.0 and can be set to forty,
// which is 546px and 870px. Nothing warned, because each rule was fine on its
// own; it was the multiplication that did not fit.
//
// So this checks the multiplications. It reads the real CSS and the real
// counts from the code, and fails the build if a repeated element cannot fit
// the narrowest phone worth supporting.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// A path can be passed in, so the check can be run against a deliberately
// broken copy to prove it still fails.
const css = readFileSync(process.argv[2] || join(ROOT, 'app', 'index.html'), 'utf8');
const appJs = readFileSync(join(ROOT, 'app', 'js', 'app.js'), 'utf8');

// An iPhone SE is 320 CSS pixels wide, and that is the floor this app aims at.
const PHONE = 320;
const fails = [];
const lines = [];

// The spacing scale, so gaps written as var(--sN) can be resolved.
const tokens = {};
for (const [, name, px] of css.matchAll(/--(s\d):\s*(\d+)px/g)) tokens['--' + name] = Number(px);
const px = (v) => (v == null ? null : /^var\(/.test(v) ? tokens[v.slice(4, -1).trim()] ?? null : /px$/.test(v) ? parseFloat(v) : null);

const ruleFor = (sel) => {
  const m = css.match(new RegExp('(?:^|[,}\\n])\\s*' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}', 'm'));
  return m ? m[1] : null;
};
const prop = (sel, name) => {
  const body = ruleFor(sel);
  if (!body) return null;
  const m = body.match(new RegExp('(?:^|;)\\s*' + name + '\\s*:\\s*([^;]+)'));
  return m ? m[1].trim() : null;
};

// ── the row of dashes, one per question in the round ─────────────────────
const sizes = [...appJs.matchAll(/size:\s*(\d+)\s*}/g)].map((m) => Number(m[1]));
const longest = sizes.length ? Math.max(...sizes) : 0;
if (!longest) fails.push('could not find the sitting sizes in app.js — this check is not measuring anything');
else {
  // A dash that can shrink is fine however many there are. A fixed width is
  // what caused this: it multiplies.
  const fixed = px(prop('.dot', 'width'));
  const gap = px(prop('.dots', 'gap')) ?? 0;
  const grows = /flex:\s*1/.test(ruleFor('.dot') || '');
  const widest = fixed ?? px(prop('.dot', 'max-width'));
  const worst = fixed == null && grows ? null : (widest ?? 0) * longest + gap * (longest - 1);
  lines.push(`longest sitting: ${longest} questions; dash ${fixed != null ? fixed + 'px fixed' : grows ? 'shrinks to fit' : '?'}, gap ${gap}px`);
  if (worst != null) {
    lines.push(`  the row of dashes would be ${Math.round(worst)}px on a ${PHONE}px phone`);
    if (worst > PHONE) fails.push(`the row of dashes is ${Math.round(worst)}px wide at a ${longest}-question sitting, on a ${PHONE}px phone`);
  } else lines.push('  the dashes share the width they are given, so any number of them fits');
}

// ── nothing else fixed wider than a phone ────────────────────────────────
// max-width is a ceiling, not a demand, so only width/min-width count.
const wide = [];
for (const [, name, val] of css.matchAll(/(?:^|[;{]\s*)(width|min-width)\s*:\s*(\d+)px/g)) {
  if (Number(val) > PHONE) wide.push(`${name}: ${val}px`);
}
if (wide.length) fails.push(`fixed widths larger than a ${PHONE}px phone: ${wide.join(', ')}`);
lines.push(`fixed widths over ${PHONE}px: ${wide.length}`);

// ── and the page itself must not scroll sideways ─────────────────────────
// `overflow-x: hidden` on the root makes it a scroll container, so too-wide
// content can still be scrolled to. `clip` cannot be scrolled at all.
const rootOverflow = prop('html, body', 'overflow-x') || prop('html', 'overflow-x') || prop('body', 'overflow-x');
lines.push(`the page's horizontal overflow: ${rootOverflow || 'not set'}`);
if (rootOverflow !== 'clip') fails.push(`the page should set overflow-x: clip so nothing can scroll it sideways (it is "${rootOverflow || 'not set'}")`);

console.log('test-layout:');
for (const l of lines) console.log('  ' + l);
if (fails.length) {
  console.error('\ntest-layout FAILED:');
  for (const f of fails) console.error('  - ' + f);
  process.exit(1);
}
console.log('test-layout: nothing is wider than a 320px phone.');
