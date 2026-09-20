// Palimpsest — write docs/ for GitHub Pages.
//
//   node build/single.mjs && node build/make-deploy.mjs
//
// Pages serves this at https://robertwalterj.github.io/palimpsest/ — a
// SUBPATH. Everything here is relative ('manifest.webmanifest', './sw.js'),
// never '/…', which would work on localhost and break once deployed.
//
// The page is the same single file as the Artifact, plus what an installable
// app needs: a manifest, icons, and a service worker for offline use.

import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs');
const page = join(ROOT, 'dist', 'palimpsest.html');
if (!existsSync(page)) throw new Error('dist/palimpsest.html is missing — run node build/single.mjs first');

let build = 'local';
try { build = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT }).toString().trim(); } catch { /* not a repo */ }
build += '-' + new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'icons'), { recursive: true });

const head = `<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<script>if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {}));</script>
`;
let html = readFileSync(page, 'utf8');
if (!html.includes('</head>')) throw new Error('no </head> in the page');
html = html.replace('</head>', () => head + '</head>');
if (/(href|src)="\/(?!\/)/.test(html.slice(0, 5000))) throw new Error('a root-absolute URL would break under /palimpsest/');
writeFileSync(join(OUT, 'index.html'), html);

writeFileSync(join(OUT, 'sw.js'), readFileSync(join(ROOT, 'app', 'sw.js'), 'utf8').replace("'palimpsest-v1-dev'", JSON.stringify('palimpsest-v1-' + build)));
cpSync(join(ROOT, 'app', 'manifest.webmanifest'), join(OUT, 'manifest.webmanifest'));
for (const f of ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png']) cpSync(join(ROOT, 'app', 'icons', f), join(OUT, 'icons', f));
writeFileSync(join(OUT, '.nojekyll'), '');

// Everything the worker precaches must exist.
const sw = readFileSync(join(OUT, 'sw.js'), 'utf8');
const list = [...(sw.match(/PRECACHE = \[([^\]]*)\]/)?.[1] || '').matchAll(/'([^']+)'/g)].map((m) => m[1]).filter((u) => u !== './');
const missing = list.filter((u) => !existsSync(join(OUT, u)));
if (missing.length) throw new Error('the service worker precaches files that do not exist: ' + missing.join(', '));

console.log(`wrote docs/ — build ${build}, ${(html.length / 1024 / 1024).toFixed(1)} MB page`);
