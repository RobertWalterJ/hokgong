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
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs');
const page = join(ROOT, 'dist', 'hokgong.html');
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
const before = html;
html = html.replace('window.HOKGONG_AUDIO="https://audio.tatoeba.org/sentences/yue/";',
  () => `window.HOKGONG_AUDIO="audio/";window.HOKGONG_AUDIO_IDS=${JSON.stringify(ids)};`);
if (html === before) throw new Error('the audio base was not switched to the local folder');

if (/(href|src)="\/(?!\/)/.test(html.slice(0, 6000))) throw new Error('a root-absolute URL would break under /hokgong/');
writeFileSync(join(OUT, 'index.html'), html);

writeFileSync(join(OUT, 'sw.js'), readFileSync(join(ROOT, 'app', 'sw.js'), 'utf8').replace("'hokgong-v1-dev'", JSON.stringify('hokgong-v1-' + build)));
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
const audioMb = readdirSync(join(OUT, 'audio')).reduce((n, f) => n + mb(join(OUT, 'audio', f)), 0);
console.log(`wrote docs/ — build ${build}, ${mb(join(OUT, 'index.html')).toFixed(1)} MB page + ${ids.length} recordings (${audioMb.toFixed(0)} MB)`);
