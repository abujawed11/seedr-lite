const fs = require('fs');
const path = require('path');

function mkdirp(p) { fs.mkdirSync(p, { recursive: true }); }

function ensureDirs() {
  const ROOT = process.env.ROOT || './src/storage/library';
  const HLS = process.env.HLS || './src/storage/hls';
  const THUMBS = process.env.THUMBS || './src/storage/thumbs';
  const TMP = process.env.TMP || './src/storage/tmp';
  const CACHE = process.env.CACHE_DIR || './src/storage/cache';

  [ROOT, HLS, THUMBS, TMP, CACHE].forEach(d => mkdirp(path.resolve(d)));

  console.log('📁 Storage directories ensured:');
  console.log(`   ROOT:   ${path.resolve(ROOT)}`);
  console.log(`   CACHE:  ${path.resolve(CACHE)}`);
  console.log(`   HLS:    ${path.resolve(HLS)}`);
  console.log(`   THUMBS: ${path.resolve(THUMBS)}`);
  console.log(`   TMP:    ${path.resolve(TMP)}`);
}

module.exports = { ensureDirs };
