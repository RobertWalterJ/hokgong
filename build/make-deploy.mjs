// Write docs/ for GitHub Pages.
//
//   node build/single.mjs && node build/make-deploy.mjs
//
// Pages serves this at https://robertwalterj.github.io/hokgong/ — a SUBPATH.
// Everything here is relative ('manifest.webmanifest', './sw.js'), never
// '/…', which would work on localhost and break once deployed.
//
// This version differs from the single file in one way that matters: it
// carries the 545 recordings, so the listening questions work offline and the
// app is not depending on Tatoeba staying up.

import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs');
const page = join(ROOT, 'dist', 'hokgong.html');
let deckFile = null, deckMb = 0;
if (!existsSync(page)) throw new Error('dist/hokgong.html is missing — run node build/single.mjs first');

let build = 'local';
try { build = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT }).toString().trim(); } catch { /* not a repo */ }
build += '-' + new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');

// docs/ is rebuilt each time, but the design document is written by hand and
// lives there too, so it is kept.
const design = existsSync(join(OUT, 'design.html')) ? readFileSync(join(OUT, 'design.html'), 'utf8') : null;
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'icons'), { recursive: true });
if (design) writeFileSync(join(OUT, 'design.html'), design);

const head = `<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<script>if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {}));</script>
`;
let html = readFileSync(page, 'utf8');
if (!html.includes('</head>')) throw new Error('no </head> in the page');
html = html.replace('</head>', () => head + '</head>');

// Point at the recordings that ship beside the page, and tell the app which
// ids it has, so it never goes to the network for one it already carries.
const audioDir = join(ROOT, 'app', 'audio');
const ids = existsSync(audioDir) ? readdirSync(audioDir).filter((f) => f.endsWith('.mp3')).map((f) => +f.replace('.mp3', '')) : [];
if (!ids.length) throw new Error('app/audio is empty — run sh build/fetch-audio.sh first');
// ── the word list, as a file rather than as source ───────────────────────
// Four megabytes of deck inlined into the page is four megabytes the browser
// parses as CODE before it can show anything, re-downloaded whole on every
// deploy. Named by a hash of its contents so an unchanged deck keeps its
// filename and the phone keeps its copy.
{
  const deckJson = readFileSync(join(ROOT, 'app', 'data', 'deck.json'), 'utf8');
  const hash = createHash('sha256').update(deckJson).digest('hex').slice(0, 10);
  const name = `deck-${hash}.json`;
  mkdirSync(join(OUT, 'data'), { recursive: true });
  writeFileSync(join(OUT, 'data', name), deckJson);
  const wasInline = html;
  // The inline literal is everything between HOKGONG_DECK= and the closing
  // </script>; swapped for the URL the app fetches instead.
  html = html.replace(/window\.HOKGONG_DECK=.*?;<\/script>/s, `window.HOKGONG_DECK_URL="data/${name}";</script>`);
  if (html === wasInline) throw new Error('the inlined deck was not replaced with a URL');
  if (html.includes('HOKGONG_DECK=')) throw new Error('the deck is still inlined');
  deckFile = name;
  deckMb = deckJson.length / 1048576;
}

const before = html;
html = html.replace('window.HOKGONG_AUDIO="https://audio.tatoeba.org/sentences/yue/";',
  () => `window.HOKGONG_AUDIO="audio/";window.HOKGONG_AUDIO_IDS=${JSON.stringify(ids)};`);
if (html === before) throw new Error('the audio base was not switched to the local folder');

if (/(href|src)="\/(?!\/)/.test(html.slice(0, 6000))) throw new Error('a root-absolute URL would break under /hokgong/');
writeFileSync(join(OUT, 'index.html'), html);

{
  let sw = readFileSync(join(ROOT, 'app', 'sw.js'), 'utf8')
    .replace("'hokgong-v1-dev'", JSON.stringify('hokgong-v1-' + build))
    .replace("'deck-dev.json'", JSON.stringify(deckFile));
  // Both stamps matter: an unstamped version means a deploy nobody receives,
  // and an unstamped deck name means the worker prunes the word list it is
  // meant to be keeping.
  if (sw.includes('hokgong-v1-dev')) throw new Error('the service worker cache version was not stamped');
  if (sw.includes('deck-dev.json')) throw new Error('the service worker deck name was not stamped');
  writeFileSync(join(OUT, 'sw.js'), sw);
}
cpSync(join(ROOT, 'app', 'manifest.webmanifest'), join(OUT, 'manifest.webmanifest'));
for (const f of ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png']) cpSync(join(ROOT, 'app', 'icons', f), join(OUT, 'icons', f));
cpSync(audioDir, join(OUT, 'audio'), { recursive: true });
writeFileSync(join(OUT, '.nojekyll'), '');

// Everything the worker precaches must exist.
const sw = readFileSync(join(OUT, 'sw.js'), 'utf8');
const list = [...(sw.match(/PRECACHE = \[([^\]]*)\]/)?.[1] || '').matchAll(/'([^']+)'/g)].map((m) => m[1]).filter((u) => u !== './');
const missing = list.filter((u) => !existsSync(join(OUT, u)));
if (missing.length) throw new Error('the service worker precaches files that do not exist: ' + missing.join(', '));

const mb = (p) => (statSync(p).size / 1024 / 1024);
// Recursively, because the graded readers' recordings live in a folder of
// their own and the old count silently reported only the Tatoeba ones — so the
// deploy line said 18 MB while 29 MB was being shipped.
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).reduce((n, e) =>
  n + (e.isDirectory() ? walk(join(dir, e.name)) : mb(join(dir, e.name))), 0);
const audioMb = walk(join(OUT, 'audio'));
const hblDir = join(OUT, 'audio', 'hbl');
const hblN = existsSync(hblDir) ? readdirSync(hblDir).filter((f) => f.endsWith('.mp3')).length : 0;
// The page is a shell: markup, styles, the app's own code. The word list and
// the recordings are fetched beside it. If this ever fails it is because
// something large has been inlined into the page again, and a phone on a bus
// will feel it as the app not opening.
const pageMb = mb(join(OUT, 'index.html'));
if (pageMb > 1.5) throw new Error(`docs/index.html is ${pageMb.toFixed(1)} MB — something large has been inlined into the page again`);

console.log(`wrote docs/ — build ${build}, ${mb(join(OUT, 'index.html')).toFixed(1)} MB page + ${ids.length} Tatoeba + ${hblN} graded recordings (${audioMb.toFixed(0)} MB) + ${deckFile} (${deckMb.toFixed(1)} MB)`);
