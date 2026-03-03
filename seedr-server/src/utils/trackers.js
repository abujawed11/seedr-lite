// src/utils/trackers.js (CommonJS)

// Curated list of reliable trackers — sourced from ngosang/trackerslist (2025)
// Dead trackers removed: rarbg.to/me, coppersurfer.tk, zer0day.to,
//   pirateparty.red, internetwarriors.net, leechers-paradise.org
const RELIABLE_TRACKERS = [
  // Top-tier UDP trackers (fastest, highest uptime)
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.demonii.com:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://exodus.desync.com:6969/announce',
  'udp://tracker.torrent.eu.org:451/announce',

  // High-uptime alternatives
  'udp://utracker.ghostchu-services.top:6969/announce',
  'udp://tracker.therarbg.to:6969/announce',
  'udp://tracker.theoks.net:6969/announce',
  'udp://tracker.srv00.com:6969/announce',
  'udp://tracker.qu.ax:6969/announce',

  // Backup HTTP/HTTPS trackers
  'http://tracker.opentrackr.org:1337/announce',
  'http://tracker.openbittorrent.com:80/announce',
  'https://torrent.tracker.durukanbal.com:443/announce',
];

// Extended list for fallback — adds more UDP trackers for maximum peer discovery
const EXTENDED_TRACKERS = [
  ...RELIABLE_TRACKERS,
  'udp://udp.tracker.projectk.org:23333/announce',
  'udp://tracker.torrust-demo.com:6969/announce',
  'udp://tracker.t-1.org:6969/announce',
  'udp://tracker.playground.ru:6969/announce',
  'udp://tracker.opentorrent.top:6969/announce',
  'udp://tracker.fnix.net:6969/announce',
  'udp://tracker.filemail.com:6969/announce',
  'udp://tracker.bittor.pw:1337/announce',
  'udp://tracker.alaskantf.com:6969/announce',
  'udp://tracker.1h.is:1337/announce',
  'udp://open.dstud.io:6969/announce',
  'udp://leet-tracker.moe:1337/announce',
  'udp://evan.im:6969/announce',
  'udp://bittorrent-tracker.e-n-c-r-y-p-t.net:1337/announce',
];

const BASE_TRACKERS = RELIABLE_TRACKERS;

function getTrackers(extra = [], useExtended = false) {
  const trackerSet = useExtended ? EXTENDED_TRACKERS : BASE_TRACKERS;
  return Array.from(new Set([...trackerSet, ...extra])).filter(Boolean);
}

function getReliableTrackers() {
  return [...RELIABLE_TRACKERS];
}

function getExtendedTrackers() {
  return [...EXTENDED_TRACKERS];
}

module.exports = {
  trackers: BASE_TRACKERS,
  getTrackers,
  getReliableTrackers,
  getExtendedTrackers,
  RELIABLE_TRACKERS,
  EXTENDED_TRACKERS
};
