const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const mime = require('mime-types');
const { PassThrough } = require('stream');
const { nanoid } = require('nanoid');
const { getUserStorageDir } = require('../utils/storage');
const { uploadStream, getDownloadUrl } = require('../services/r2Service');

// In-memory job store: jobId -> job object
const jobs = new Map();

// Clean up completed jobs older than 24 hours
setInterval(() => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [id, job] of jobs) {
    if (job.completedAt && job.completedAt < cutoff) jobs.delete(id);
  }
}, 60 * 60 * 1000);

function validatePath(userPath, userRoot) {
  const normalized = path.normalize(userPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const fullPath = path.resolve(userRoot, normalized);
  if (!fullPath.startsWith(path.resolve(userRoot))) {
    throw new Error('Path traversal attempt detected');
  }
  return normalized;
}

function getFolderSize(dirPath) {
  let total = 0;
  try {
    for (const item of fs.readdirSync(dirPath)) {
      const p = path.join(dirPath, item);
      const s = fs.statSync(p);
      total += s.isDirectory() ? getFolderSize(p) : s.size;
    }
  } catch {}
  return total;
}

async function runTransfer(job, fullPath, isFolder, baseName) {
  try {
    let bodyStream;
    let contentType;

    if (isFolder) {
      contentType = 'application/zip';
      const pass = new PassThrough();
      const archive = archiver('zip', { zlib: { level: 0 } });
      archive.on('error', (err) => pass.destroy(err));
      archive.pipe(pass);
      archive.directory(fullPath, baseName);
      archive.finalize();
      bodyStream = pass;
    } else {
      contentType = mime.lookup(job.fileName) || 'application/octet-stream';
      bodyStream = fs.createReadStream(fullPath);
    }

    await uploadStream({
      key: job.r2Key,
      body: bodyStream,
      contentType,
      fileName: job.fileName,
      onProgress: (loaded, total) => {
        job.bytesUploaded = loaded;
        if (total) job.totalBytes = total;
        job.progress = job.totalBytes > 0 ? Math.min(99, Math.round((loaded / job.totalBytes) * 100)) : 0;
      },
    });

    job.downloadUrl = await getDownloadUrl(job.r2Key, job.fileName);
    job.status = 'done';
    job.progress = 100;
    job.completedAt = Date.now();
    console.log(`R2 transfer done: ${job.fileName} -> ${job.r2Key}`);
  } catch (err) {
    job.status = 'error';
    job.error = err.message;
    job.completedAt = Date.now();
    console.error(`R2 transfer failed for job ${job.jobId}:`, err.message);
  }
}

exports.startTransfer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { path: itemPath, type } = req.body;

    if (!itemPath) return res.status(400).json({ error: 'Missing path' });
    if (!['file', 'folder'].includes(type)) return res.status(400).json({ error: 'type must be file or folder' });

    const userRoot = getUserStorageDir(userId);
    const safePath = validatePath(itemPath, userRoot);
    const fullPath = path.resolve(userRoot, safePath);

    if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'Path not found' });

    const stat = fs.statSync(fullPath);
    const isFolder = stat.isDirectory();

    if (type === 'folder' && !isFolder) return res.status(400).json({ error: 'Path is not a folder' });
    if (type === 'file' && isFolder) return res.status(400).json({ error: 'Path is not a file' });

    const jobId = nanoid(12);
    const baseName = path.basename(fullPath);
    const fileName = isFolder ? `${baseName}.zip` : baseName;
    const r2Key = `transfers/${userId}/${Date.now()}_${fileName}`;
    const totalBytes = isFolder ? getFolderSize(fullPath) : stat.size;

    const job = {
      jobId,
      userId,
      status: 'uploading',
      progress: 0,
      bytesUploaded: 0,
      totalBytes,
      r2Key,
      fileName,
      downloadUrl: null,
      error: null,
      createdAt: Date.now(),
      completedAt: null,
    };

    jobs.set(jobId, job);

    // Fire and forget — client polls for status
    runTransfer(job, fullPath, isFolder, baseName);

    res.json({ jobId, fileName, status: 'uploading' });
  } catch (err) {
    if (err.message === 'Path traversal attempt detected') {
      return res.status(403).json({ error: 'Invalid path' });
    }
    console.error('R2 startTransfer error:', err);
    res.status(500).json({ error: 'Failed to start transfer' });
  }
};

exports.getTransferStatus = async (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (job.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

  res.json({
    jobId: job.jobId,
    status: job.status,
    progress: job.progress,
    bytesUploaded: job.bytesUploaded,
    totalBytes: job.totalBytes,
    fileName: job.fileName,
    downloadUrl: job.downloadUrl,
    error: job.error,
  });
};
