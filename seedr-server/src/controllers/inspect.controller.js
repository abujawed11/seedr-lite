const { getTorrentMetadata } = require('../services/torrentMetadata');
const { humanBytes } = require('../utils/storage');

/**
 * POST /api/torrents/inspect
 * Body: { magnet: "magnet:?xt=urn:btih:..." }
 *
 * Inspects a torrent magnet to get metadata (name, size, files) without downloading any pieces.
 * Used for quota checking before actually adding the torrent.
 */
exports.inspect = async (req, res) => {
  const { magnet } = req.body || {};

  if (!magnet || typeof magnet !== 'string') {
    return res.status(400).json({
      error: 'Magnet URI is required',
      code: 'INVALID_INPUT'
    });
  }

  const userId = req.user.id;
  console.log(`[INSPECT] Starting metadata inspection for user ${userId}`);
  console.log(`[INSPECT] Magnet: ${magnet.substring(0, 60)}...`);

  try {
    // Fetch metadata without downloading pieces
    const metadata = await getTorrentMetadata(magnet, {
      timeoutMs: 10000 // 10 second timeout for inspect
    });

    console.log(`[INSPECT OK] ${metadata.name}, size=${humanBytes(metadata.sizeBytes)}, files=${metadata.files.length}`);

    return res.status(200).json({
      infoHash: metadata.infoHash,
      name: metadata.name,
      sizeBytes: metadata.sizeBytes,
      files: metadata.files
    });

  } catch (error) {
    console.log(`[INSPECT FAILED] ${error.message}`);

    // Different error types for better UX
    if (error.message.includes('timeout')) {
      return res.status(422).json({
        error: 'Could not fetch torrent information within timeout. Try again or use a different magnet.',
        code: 'METADATA_TIMEOUT',
        details: 'The torrent metadata could not be retrieved within the time limit'
      });
    }

    if (error.message.includes('Invalid magnet')) {
      return res.status(422).json({
        error: 'Invalid magnet URI format',
        code: 'INVALID_MAGNET',
        details: error.message
      });
    }

    return res.status(422).json({
      error: 'Could not fetch torrent metadata',
      code: 'METADATA_FETCH_FAILED',
      details: error.message
    });
  }
};