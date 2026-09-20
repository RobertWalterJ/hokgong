// Palimpsest — fold the app into one HTML file for the phone.
//
//   node build/single.mjs
//
// Runs the gates first (verify, colour audit, schedule simulation); any
// failure stops the build. Then: modules bundled by esbuild into one script,
// fonts inlined as data URIs (Latin and Latin Extended only — the questions
// need ’ and é, not Vietnamese), and the pack inlined so nothing is fetched.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'app');
const run = (f) => execFileSync(process.execPath, [join(ROOT, 'build', f)], { stdio: 'inherit' });
run('bundle.mjs');          // runs verify.mjs itself
run('audit-colour.mjs');
run('test-schedule.mjs');

const js = (await build({
  entryPoints: [join(APP, 'js', 'app.js')], bundle: true, format: 'iife', write: false,
  minify: true, target: 'es2020', legalComments: 'none',
})).outputFiles[0].text;

let fonts = readFileSync(join(APP, 'fonts', 'fonts.css'), 'utf8')
  .split('\n').filter((l) => !/vietnamese/.test(l)).join('\n')
  .replace(/url\((([\w-]+)\.woff2)\)/g, (_, file) =>
    `url(data:font/woff2;base64,${readFileSync(join(APP, 'fonts', file)).toString('base64')})`);
const css = readFileSync(join(APP, 'styles.css'), 'utf8');
const safe = (s) => s.replace(/<\/script/gi, '<\\/script');
const data = safe(readFileSync(join(APP, 'data', 'canada.json'), 'utf8'));
const lib = safe(readFileSync(join(APP, 'data', 'canada-library.json'), 'utf8'));

// Function replacers throughout: a replacement STRING treats `$&`, `$'` and
// `` $` `` specially, and minified code or the books' text can contain them.
// The version shown in About: package.json's number, the commit it was built
// from (with "+" if there were uncommitted changes — app/data is generated
// by this build, so it doesn't count), and the date.
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
let commit = 'local';
try {
  commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT }).toString().trim();
  if (execFileSync('git', ['status', '--porcelain', '--', 'app', 'content', 'build', ':!app/data'], { cwd: ROOT }).toString().trim()) commit += '+';
} catch { /* not a repo */ }
// The local calendar date: an evening build in Toronto is still today there.
const d = new Date();
const BUILD = JSON.stringify({ v: pkg.version, commit, date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` });

const html = readFileSync(join(APP, 'index.html'), 'utf8')
  .replace('<link rel="stylesheet" href="fonts/fonts.css">', () => `<style>${fonts}</style>`)
  .replace('<link rel="stylesheet" href="styles.css">', () => `<style>${css}</style>`)
  .replace('<script type="module" src="js/app.js"></script>', () =>
    `<script>window.__PALIMPSEST_BUILD=${BUILD};window.__PALIMPSEST_DATA={canada:${data}};window.__PALIMPSEST_LIB={canada:${lib}};</script>\n<script>${safe(js)}</script>`);

mkdirSync(join(ROOT, 'dist'), { recursive: true });
writeFileSync(join(ROOT, 'dist', 'palimpsest.html'), html);
console.log(`wrote dist/palimpsest.html — ${(html.length / 1024).toFixed(0)} KB`);
