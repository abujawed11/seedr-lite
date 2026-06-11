// Tracks every active fs.ReadStream by absolute file path.
// deleteFile drains all handles for a path before calling unlink/rmSync,
// preventing the Linux "deleted but still open" inode-leak pattern.

const path = require('path');

const activeStreams = new Map(); // absolutePath -> Set<ReadStream>

function register(filePath, stream) {
  if (!activeStreams.has(filePath)) activeStreams.set(filePath, new Set());
  activeStreams.get(filePath).add(stream);
}

function unregister(filePath, stream) {
  const set = activeStreams.get(filePath);
  if (!set) return;
  set.delete(stream);
  if (set.size === 0) activeStreams.delete(filePath);
}

// Destroy all open streams for a single file and wait for them to close.
function drainPath(filePath) {
  const set = activeStreams.get(filePath);
  if (!set || set.size === 0) return Promise.resolve();

  return Promise.all([...set].map(stream => new Promise(resolve => {
    if (stream.destroyed) { resolve(); return; }
    stream.once('close', resolve);
    stream.once('error', resolve);
    stream.destroy();
  })));
}

// Destroy all open streams whose path is inside dirPath (for recursive delete).
function drainDirectory(dirPath) {
  const sep = path.sep;
  const prefix = dirPath.endsWith(sep) ? dirPath : dirPath + sep;
  const promises = [];

  for (const [filePath, set] of activeStreams.entries()) {
    if (filePath === dirPath || filePath.startsWith(prefix)) {
      for (const stream of set) {
        promises.push(new Promise(resolve => {
          if (stream.destroyed) { resolve(); return; }
          stream.once('close', resolve);
          stream.once('error', resolve);
          stream.destroy();
        }));
      }
    }
  }

  return Promise.all(promises);
}

module.exports = { register, unregister, drainPath, drainDirectory };
