// Hok Gong — small shared pieces: the DOM helper, icons, read-aloud buttons,
// bottom sheets, reading preferences and a history-aware router.

import { say, unlock, available as speechAvailable, stop as stopSpeech } from './speech.js';
import { stopAudio } from './audio.js';

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
}
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const P = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const ICON = {
  speak: P('<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>'),
  back: P('<path d="M15 18l-6-6 6-6"/>'),
  chev: P('<path d="M9 18l6-6-6-6"/>'),
  play: P('<path d="M7 5l12 7-12 7z" fill="currentColor"/>'),
  pause: P('<path d="M8 5v14M16 5v14" stroke-width="3"/>'),
  stop: P('<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>'),
  prev: P('<path d="M18 6l-8 6 8 6z" fill="currentColor"/><path d="M6 6v12"/>'),
  next: P('<path d="M6 6l8 6-8 6z" fill="currentColor"/><path d="M18 6v12"/>'),
  learn: P('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 21.5V5.5"/><path d="M9 8h7M9 12h5"/>'),
  practise: P('<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>'),
  library: P('<path d="M4 4h4v16H4zM10 4h4v16h-4z"/><path d="M16.5 4.5l3.8 1-3.9 14.6-3.8-1z"/>'),
  progress: P('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  settings: P('<circle cx="12" cy="12" r="3"/><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.4-2.3.9a7.6 7.6 0 0 0-1.7-1L15 2.5H9.9l-.4 2.5a7.6 7.6 0 0 0-1.7 1l-2.3-.9-2 3.4L5.5 11a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4 2.3-.9a7.6 7.6 0 0 0 1.7 1l.4 2.5H15l.4-2.5a7.6 7.6 0 0 0 1.7-1l2.3.9 2-3.4Z"/>'),
  aa: P('<path d="M3 19l5-14 5 14M5 14h6"/><path d="M15 19l3.5-9 3.5 9M16.2 16h4.6"/>'),
  focus: P('<rect x="3" y="9" width="18" height="6" rx="1.5"/><path d="M3 5h18M3 19h18" opacity=".4"/>'),
  rise: '<svg viewBox="0 0 26 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2 10 C 9 10, 15 7, 24 2"/></svg>',
  book: P('<path d="M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2zM22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z"/>'),
};

export const iconBtn = (icon, label, onclick, cls = 'icon') =>
  h('button', { class: cls, type: 'button', 'aria-label': label, title: label, html: ICON[icon], onclick });

// What the ENGLISH voice should say. Handing it Chinese characters makes it
// read them in Mandarin — which, to a learner who cannot read characters, is
// an unrecognisable word in the wrong language in the middle of a sentence.
// The build writes every character in the app's own prose with its Jyutping
// after it, so speech keeps the romanisation and drops the characters.
export const forSpeech = (text) => String(text)
  .replace(/[㐀-鿿]+\s*\(([^)]+)\)/g, '$1')   // 飲茶 (jam2 caa4) → jam2 caa4
  .replace(/[㐀-鿿]+/g, ' — ')            // anything left becomes a pause
  .replace(/\s{2,}/g, ' ')
  .replace(/\s+([,.;:!?])/g, '$1')
  .trim();

export const sayBtn = (text, label = 'Read aloud') => (speechAvailable()
  ? h('button', { class: 'icon', type: 'button', 'aria-label': label, title: label, html: ICON.speak,
    onclick: (e) => { e.stopPropagation(); unlock(); say(forSpeech(typeof text === 'function' ? text() : text)); } })
  : null);

// ── bottom sheet ───────────────────────────────────────────────────────
let openSheet = null;
export function sheet(...kids) {
  closeSheet();
  const scrim = h('div', { class: 'scrim', onclick: closeSheet });
  const box = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'grip' }), ...kids);
  document.body.append(scrim, box);
  openSheet = { scrim, box, onKey: (e) => { if (e.key === 'Escape') closeSheet(); } };
  document.addEventListener('keydown', openSheet.onKey);
  box.querySelector('button, [href], input')?.focus();
  return box;
}
export function closeSheet() {
  if (!openSheet) return;
  openSheet.scrim.remove(); openSheet.box.remove();
  document.removeEventListener('keydown', openSheet.onKey);
  openSheet = null;
}

// ── reading preferences → CSS variables ───────────────────────────────
export const READ_DEFAULTS = { size: 19, lh: 1.6, measure: 60, ls: 0, font: 'serif', tint: 'none', terms: true };
export function applyReading(r) {
  const s = document.documentElement.style;
  s.setProperty('--read-size', `${r.size}px`);
  s.setProperty('--read-lh', String(r.lh));
  s.setProperty('--read-measure', `${r.measure}ch`);
  s.setProperty('--read-ls', `${r.ls}em`);
  s.setProperty('--read-font', r.font === 'sans' ? 'var(--ui)' : 'var(--read)');
  if (r.tint && r.tint !== 'none') document.documentElement.setAttribute('data-tint', r.tint);
  else document.documentElement.removeAttribute('data-tint');
}

// ── screens and the back button ────────────────────────────────────────
// Every screen is a history entry, so Android's back gesture goes back a
// screen instead of out of the app (design audit).
const $app = document.getElementById('app');
let current = null;
let guard = null;                 // () => boolean: return true to block leaving
export function setLeaveGuard(fn) { guard = fn; }
export function show(name, render, { replace = false, arg = null } = {}) {
  stopSpeech(); stopAudio(); closeSheet();
  current = { name, render, arg };
  const state = { name, arg };
  try { replace || !history.state ? history.replaceState(state, '') : history.pushState(state, ''); } catch { /* sandboxed */ }
  paint();
}
function paint() {
  const kids = current.render(current.arg);
  $app.replaceChildren(...[].concat(kids).filter(Boolean));
  window.scrollTo(0, 0);
}
const routes = new Map();
export function route(name, render) { routes.set(name, render); }
window.addEventListener('popstate', (e) => {
  if (guard && guard()) { try { history.pushState(history.state, ''); } catch { /* ignore */ } return; }
  const st = e.state;
  const render = st && routes.get(st.name);
  stopSpeech(); stopAudio(); closeSheet();
  if (render) { current = { name: st.name, render, arg: st.arg }; paint(); }
});
export const back = () => { try { history.back(); } catch { /* ignore */ } };

// A disclosure: the plain fact stays in the open, the detail folds away one
// tap behind a label. Used for the things the app must say but should not
// open with — how to install a Cantonese voice, what a number does not mean.
export function disclosure(label, ...kids) {
  return h('details', { class: 'more' }, h('summary', {}, label), ...kids.flat(Infinity).filter(Boolean));
}

export const currentScreen = () => current?.name || null;
export const repaint = () => { if (current) paint(); };

// A short, soft wash of colour over the whole screen when an answer lands:
// green for right, red for not. Robert asked for it, and it is worth being
// clear about what it is — REINFORCEMENT, never the signal itself. The tick
// or cross, the word "Right" or "Not quite", and the marked option all carry
// the verdict on their own, so nothing is lost if you cannot see the colour
// or the flash never renders.
export function flash(kind) {
  const el = h('div', { class: 'flash ' + kind, 'aria-hidden': 'true' });
  document.body.append(el);
  setTimeout(() => el.remove(), 480);
}
