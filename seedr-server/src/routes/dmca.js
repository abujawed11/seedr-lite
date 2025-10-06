const express = require('express');
const database = require('../models/database');
const { authenticateToken } = require('../middlewares/auth');
const asyncHandler = require('../middlewares/asyncHandler');
const { nanoid } = require('nanoid');

const router = express.Router();

// Middleware to check if user is admin
const authenticateAdmin = async (req, res, next) => {
  // First authenticate the token
  await authenticateToken(req, res, async () => {
    // Then check if user is admin
    const user = await database.getUserById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
};

// Submit DMCA takedown notice (public endpoint)
router.post('/report', asyncHandler(async (req, res) => {
  const {
    reporterName,
    reporterEmail,
    reporterPhone,
    reporterAddress,
    copyrightedWork,
    infringingContent,
    goodFaithStatement,
    accuracyStatement,
    signature
  } = req.body;

  // Validation
  if (!reporterName || !reporterEmail || !copyrightedWork || !infringingContent || !signature) {
    return res.status(400).json({ error: 'Required fields missing' });
  }

  if (!goodFaithStatement || !accuracyStatement) {
    return res.status(400).json({ error: 'You must agree to both required statements' });
  }

  // Get client IP address
  const clientIp = req.ip || req.connection.remoteAddress;

  // Generate report ID
  const reportId = nanoid();

  // Store DMCA report in database
  await database.createDMCAReport({
    id: reportId,
    reporterName,
    reporterEmail,
    reporterPhone,
    reporterAddress,
    copyrightedWork,
    infringingContent,
    goodFaithStatement,
    accuracyStatement,
    signature,
    clientIp
  });

  console.log(`[DMCA] New report submitted: ${reportId} from ${reporterEmail}`);

  // TODO: Send email notification to admin
  // await emailService.sendDMCAAlert(reportId, reporterEmail, infringingContent);

  res.json({
    success: true,
    message: 'DMCA takedown notice received. We will investigate within 24-48 hours.',
    reportId
  });
}));

// Get all DMCA reports (admin only)
router.get('/reports', authenticateAdmin, asyncHandler(async (req, res) => {
  const reports = await database.getAllDMCAReports();
  res.json({ reports });
}));

// Get single DMCA report by ID (admin only)
router.get('/reports/:reportId', authenticateAdmin, asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const report = await database.getDMCAReportById(reportId);

  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }

  res.json({ report });
}));

// Take action on DMCA report (admin only)
router.post('/reports/:reportId/action', authenticateAdmin, asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const { action, notes } = req.body; // action: 'approved', 'rejected', 'removed'

  const report = await database.getDMCAReportById(reportId);
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }

  const now = new Date().toISOString();

  // Update report status
  await database.updateDMCAReport(reportId, {
    status: action,
    processedBy: req.user.id,
    adminNotes: notes || null,
    processedAt: now
  });

  console.log(`[DMCA] Report ${reportId} ${action} by admin ${req.user.username}`);

  // TODO: If action is 'approved' or 'removed', remove the infringing content
  // This would require parsing the infringing_content field and taking action
  // e.g., deleting files, removing torrents, etc.

  res.json({
    success: true,
    message: `DMCA report ${action} successfully`
  });
}));

// Delete DMCA report (admin only)
router.delete('/reports/:reportId', authenticateAdmin, asyncHandler(async (req, res) => {
  const { reportId } = req.params;

  const deleted = await database.deleteDMCAReport(reportId);

  if (!deleted) {
    return res.status(404).json({ error: 'Report not found' });
  }

  console.log(`[DMCA] Report ${reportId} deleted by admin ${req.user.username}`);

  res.json({ success: true, message: 'DMCA report deleted' });
}));

module.exports = router;
