const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

let _client = null;

function getClient() {
  if (_client) return _client;

  const endpoint =
    process.env.R2_ENDPOINT ||
    (process.env.R2_ACCOUNT_ID
      ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : null);

  if (!endpoint) throw new Error('R2 endpoint not configured. Set R2_ENDPOINT or R2_ACCOUNT_ID in .env');
  if (!process.env.R2_ACCESS_KEY_ID) throw new Error('R2_ACCESS_KEY_ID not set');
  if (!process.env.R2_SECRET_ACCESS_KEY) throw new Error('R2_SECRET_ACCESS_KEY not set');
  if (!process.env.R2_BUCKET_NAME) throw new Error('R2_BUCKET_NAME not set');

  _client = new S3Client({
    endpoint,
    region: process.env.S3_REGION || 'auto',
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  return _client;
}

async function uploadStream({ key, body, contentType, fileName, onProgress }) {
  const client = getClient();

  const upload = new Upload({
    client,
    params: {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
    queueSize: 4,
    partSize: 10 * 1024 * 1024, // 10 MB parts
  });

  upload.on('httpUploadProgress', (progress) => {
    if (onProgress) onProgress(progress.loaded || 0, progress.total || 0);
  });

  await upload.done();
}

async function getDownloadUrl(key, fileName, expiresIn = 86400) {
  if (process.env.R2_PUBLIC_DOMAIN) {
    return `${process.env.R2_PUBLIC_DOMAIN.replace(/\/$/, '')}/${key}`;
  }

  const client = getClient();
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  });

  return getSignedUrl(client, command, { expiresIn });
}

module.exports = { uploadStream, getDownloadUrl };
