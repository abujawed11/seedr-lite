const { checkStorageAvailable, humanBytes } = require('../utils/storage');

// Middleware to validate storage before torrent operations
const validateStorageSpace = (requiredBytesField = 'torrentSize') => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      let requiredBytes = 0;

      // Extract required bytes from request body or estimate from torrent
      if (req.body[requiredBytesField]) {
        requiredBytes = req.body[requiredBytesField];
      } else {
        // If torrent size not provided, we'll allow the operation
        // and check during download progress
        return next();
      }

      const storageCheck = await checkStorageAvailable(userId, requiredBytes);

      if (!storageCheck.hasSpace) {
        return res.status(413).json({
          error: 'Insufficient storage space',
          details: {
            required: humanBytes(storageCheck.requiredSpace),
            available: humanBytes(storageCheck.availableSpace),
            currentUsage: humanBytes(storageCheck.currentUsage),
            quota: humanBytes(storageCheck.quota)
          }
        });
      }

      // Add storage info to request for logging
      req.storageInfo = storageCheck;
      next();
    } catch (error) {
      console.error('Storage validation error:', error);
      res.status(500).json({ error: 'Failed to validate storage space' });
    }
  };
};

// Middleware to validate storage during download progress
const validateStorageDuringDownload = async (userId, currentTorrentSize) => {
  try {
    const storageCheck = await checkStorageAvailable(userId, currentTorrentSize);
    return storageCheck.hasSpace;
  } catch (error) {
    console.error('Storage validation during download error:', error);
    return false;
  }
};

module.exports = {
  validateStorageSpace,
  validateStorageDuringDownload
};