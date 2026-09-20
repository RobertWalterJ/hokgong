// Hok Gong — does the palette still carry its information without colour?
//
//   node build/audit-colour.mjs            report, and fail on any loss
//   node build/audit-colour.mjs --full     every check, including the passes
//
// The rule and the engine live in build/lib/audit-template.mjs, shared with
// Landfall, Palimpsest, Halyard, Wordhoard and Commonplace. This file only
// says which tokens mean what, and where.
//
// The palette is deliberately red — this is an app about Cantonese, and the
// red is the point — which makes the test more necessary, not less: red and
// green verdicts are exactly the pair that collapses under deuteranopia.

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAudit } from './lib/audit-template.mjs';

const SPEC = {
  files: ['app/index.html'],       // the stylesheet is inline, in one <style>
  surfaces: [['light', ':root'], ['dark (phone)', ':root:not([data-theme="light"])'], ['dark (chosen)', ':root[data-theme="dark"]']],
  pairs: [
    // Right and wrong carry a ✓ and a ✗, so colour reinforces a glyph…
    { a: '--right', b: '--wrong', channel: 'shape', where: 'the marked answer and the verdict line' },
    { a: '--right-bg', b: '--wrong-bg', channel: 'tint', where: 'the wash behind a marked answer' },
    // …and those glyphs have to be legible on their own washes.
    { a: '--right', b: '--right-bg', channel: 'lightness', where: 'the ✓ on the right-answer wash' },
    { a: '--wrong', b: '--wrong-bg', channel: 'lightness', where: 'the ✗ on the wrong-answer wash' },
    // The round dots and the skill bars are read by fill alone.
    { a: '--accent', b: '--line', channel: 'lightness', where: 'the round dots: answered against still to come' },
    { a: '--accent', b: '--chip', channel: 'lightness', where: 'the skill bar: filled against the track' },
    // The three states in the word list (not met / met / known) are marked by
    // a dot with a label, but the dots must still separate by lightness.
    { a: '--line', b: '--dot-met', channel: 'lightness', where: 'word list: not met yet against met' },
    { a: '--dot-met', b: '--ink', channel: 'lightness', where: 'word list: met against known' },
    // The accent is a control colour; wrong is a verdict. In a red palette
    // those two must not be mistakable for one another.
    { a: '--accent', b: '--wrong', channel: 'tint', where: 'the accent against the wrong-answer red' },
  ],
  text: [
    { fg: '--ink', bg: '--bg', where: 'headings and body on the page' },
    { fg: '--ink', bg: '--card', where: 'questions, answers, options' },
    { fg: '--muted', bg: '--card', where: 'the notes under a question' },
    { fg: '--muted', bg: '--bg', where: 'the line under the home links' },
    { fg: '--muted', bg: '--chip', where: 'the meaning under a word chip' },
    { fg: '--ink', bg: '--chip', where: 'the example sentence' },
    { fg: '--accent', bg: '--card', where: 'Jyutping, links and quiet buttons' },
    { fg: '--accent', bg: '--bg', where: 'the wordmark' },
    { fg: '--accent', bg: '--chip', where: 'Jyutping on a word chip' },
    { fg: '--accent-ink', bg: '--accent', where: 'the Start button' },
    { fg: '--ink', bg: '--right-bg', where: 'the text of a right answer' },
    { fg: '--ink', bg: '--wrong-bg', where: 'the text of a wrong answer' },
    { fg: '--right', bg: '--card', where: 'the tone verdict when it matched' },
    { fg: '--wrong', bg: '--card', where: 'the tone verdict when it did not' },
    { fg: '--wrong', bg: '--bg', where: 'the warning when there is no Cantonese voice' },
  ],
};

runAudit(SPEC, join(dirname(fileURLToPath(import.meta.url)), '..'));
