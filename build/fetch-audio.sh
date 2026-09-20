#!/bin/sh
# Fetch the Tatoeba recordings the deck uses.
#
#   sh build/fetch-audio.sh
#
# The file is named by SENTENCE id, which is what audio.tatoeba.org serves:
# the other endpoint (tatoeba.org/audio/download/<audio id>) answers most ids
# with a 57 KB HTML error page that lands on disk looking like an mp3.
set -e
cd "$(dirname "$0")/.."
mkdir -p app/audio
node -e "const d=require('./app/data/deck.json');require('fs').writeFileSync('build/_audio-ids.txt',d.audio.join('\n'))"
wc -l < build/_audio-ids.txt
xargs -P 6 -I{} sh -c 'f="app/audio/{}.mp3"; [ -s "$f" ] || curl -sf --max-time 60 -o "$f" "https://audio.tatoeba.org/sentences/yue/{}.mp3" || rm -f "$f"' < build/_audio-ids.txt
ls app/audio | wc -l
du -sh app/audio | cut -f1
