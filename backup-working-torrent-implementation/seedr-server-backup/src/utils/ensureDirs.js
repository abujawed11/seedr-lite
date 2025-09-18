const fs = require('fs');
const path = require('path');

function mkdirp(p) { fs.mkdirSync(p, { recursive: true }); }

function ensureDirs() {
  const ROOT = process.env.ROOT || './src/storage/library';
  const HLS = process.env.HLS || './src/storage/hls';
  const THUMBS = process.env.THUMBS || './src/storage/thumbs';
  const TMP = process.env.TMP || './src/storage/tmp';
  [ROOT, HLS, THUMBS, TMP].forEach(d => mkdirp(path.resolve(d)));
}

module.exports = { ensureDirs };
