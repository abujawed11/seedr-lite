const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET || 'change-me';
const ttl = Number(process.env.LINK_TTL_SECONDS || 7 * 24 * 3600);

function makeDirectLinkPayload({ torrentId, fileIndex, asAttachment = false, userId = null }) {
  return { torrentId, fileIndex, asAttachment, userId };
}

function signLink(payload, expiresInSec = ttl) {
  return jwt.sign(payload, secret, { expiresIn: expiresInSec });
}

function verifyLink(token) {
  return jwt.verify(token, secret);
}

module.exports = { makeDirectLinkPayload, signLink, verifyLink };
