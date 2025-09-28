// src/utils/trackers.js (CommonJS)

// Curated list of highly reliable trackers (2024) - tested for fast response and high uptime
const RELIABLE_TRACKERS = [
  // Primary reliable UDP trackers (fastest)
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.demonii.com:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://explodie.org:6969/announce',
  'udp://exodus.desync.com:6969/announce',

  // High-uptime DHT nodes
  'udp://tracker.openbittorrent.com:6969/announce',
  'udp://tracker.internetwarriors.net:1337/announce',

  // Popular working trackers
  'udp://9.rarbg.to:2710/announce',
  'udp://9.rarbg.me:2710/announce',
  'udp://tracker.leechers-paradise.org:6969/announce',

  // Backup HTTPS/HTTP trackers
  'https://tracker.opentrackr.org:443/announce',
  'http://tracker.opentrackr.org:1337/announce',
  'http://tracker.openbittorrent.com:80/announce',

  // Additional reliable ones for redundancy
  'udp://tracker.coppersurfer.tk:6969/announce',
  'udp://tracker.zer0day.to:1337/announce',
  'udp://tracker.leechers-paradise.org:6969/announce',
  'udp://tracker.pirateparty.red:6969/announce',
  'udp://tracker.cyberia.is:6969/announce'
];

// Extended list with more trackers for fallback (only used if reliable ones fail)
const EXTENDED_TRACKERS = [
  ...RELIABLE_TRACKERS,
  'udp://public.demonoid.ch:6969/announce',
  'udp://open.demonoid.ch:6969/announce',
  'udp://open-tracker.demonoid.ch:6969/announce',
  'udp://udp.tracker.projectk.org:23333/announce',
  'udp://ttk2.nbaonlineservice.com:6969/announce',
  'udp://tracker.zupix.online:6969/announce',
  'udp://tracker.valete.tf:9999/announce',
  'udp://tracker.torrust-demo.com:6969/announce',
  'udp://tracker.therarbg.to:6969/announce',
  'udp://tracker.theoks.net:6969/announce',
  'udp://tracker.srv00.com:6969/announce',
  'udp://tracker.qu.ax:6969/announce',
  'udp://tracker.plx.im:6969/announce',
  'udp://tracker.ololosh.space:6969/announce',
  'udp://tracker.hifitechindia.com:6969/announce'
];

const BASE_TRACKERS = RELIABLE_TRACKERS;

function getTrackers(extra = [], useExtended = false) {
  // Choose tracker set based on mode
  const trackerSet = useExtended ? EXTENDED_TRACKERS : BASE_TRACKERS;

  // Merge chosen set + extra and remove duplicates
  return Array.from(new Set([...trackerSet, ...extra])).filter(Boolean);
}

// Get only the most reliable trackers for fast initial attempts
function getReliableTrackers() {
  return [...RELIABLE_TRACKERS];
}

// Get extended tracker list for fallback when reliable ones fail
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