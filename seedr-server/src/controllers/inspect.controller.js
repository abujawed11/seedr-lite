const { getTorrentMetadata } = require('../services/torrentMetadata');
const { fastDeadTorrentCheck, extractInfoHashFromMagnet } = require('../services/torrentMetadata');
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
      timeoutMs: 100000 // 10 second timeout for inspect
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

/**
 * POST /api/torrents/health-check
 * Body: { magnet: "magnet:?xt=urn:btih:..." }
 *
 * Quick health check to determine if a torrent is alive/dead before attempting full metadata fetch.
 * Returns in ~8 seconds with assessment of torrent viability.
 */
exports.healthCheck = async (req, res) => {
  const { magnet } = req.body || {};

  if (!magnet || typeof magnet !== 'string') {
    return res.status(400).json({
      error: 'Magnet URI is required',
      code: 'INVALID_INPUT'
    });
  }

  const userId = req.user.id;
  console.log(`[HEALTH CHECK] Starting quick health check for user ${userId}`);

  try {
    const infoHash = extractInfoHashFromMagnet(magnet);
    console.log(`[HEALTH CHECK] Checking ${infoHash}...`);

    // Perform fast health check
    const healthResult = await fastDeadTorrentCheck(magnet, infoHash);

    const healthStatus = healthResult.isDead ? 'dead' :
                        healthResult.hasMetadata ? 'excellent' :
                        healthResult.hasPeers ? 'good' : 'poor';

    const recommendation = healthResult.isDead ? 'This torrent appears to be dead. Try a different magnet.' :
                          healthResult.hasMetadata ? 'Torrent is healthy and should download quickly.' :
                          healthResult.hasPeers ? 'Torrent has peers but may take longer to start.' :
                          'Torrent status unclear, proceed with caution.';

    console.log(`[HEALTH CHECK OK] ${infoHash}: ${healthStatus} (${healthResult.errorCount} errors, ${healthResult.warningCount} warnings)`);

    return res.status(200).json({
      infoHash,
      status: healthStatus,
      recommendation,
      details: {
        hasMetadata: healthResult.hasMetadata,
        hasPeers: healthResult.hasPeers,
        errorCount: healthResult.errorCount,
        warningCount: healthResult.warningCount,
        isDead: healthResult.isDead
      },
      checkDurationMs: 8000  // Approximate duration
    });

  } catch (error) {
    console.log(`[HEALTH CHECK FAILED] ${error.message}`);

    return res.status(422).json({
      error: 'Health check failed',
      code: 'HEALTH_CHECK_FAILED',
      details: error.message,
      recommendation: 'Unable to determine torrent health. Try full metadata fetch instead.'
    });
  }
};