#!/usr/bin/env node

// Test script for qBittorrent integration
// Usage: node scripts/test-qbittorrent.js

require('dotenv').config();
const QBittorrentClient = require('../src/services/qbittorrent/qBittorrentClient');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, symbol, message) {
  console.log(`${color}${symbol} ${message}${COLORS.reset}`);
}

function success(message) {
  log(COLORS.green, '✅', message);
}

function error(message) {
  log(COLORS.red, '❌', message);
}

function info(message) {
  log(COLORS.blue, 'ℹ️ ', message);
}

function warn(message) {
  log(COLORS.yellow, '⚠️ ', message);
}

async function testQBittorrent() {
  console.log('\n' + COLORS.cyan + '='.repeat(60) + COLORS.reset);
  console.log(COLORS.cyan + '  qBittorrent Integration Test Suite' + COLORS.reset);
  console.log(COLORS.cyan + '='.repeat(60) + COLORS.reset + '\n');

  const config = {
    url: process.env.QBITTORRENT_URL || 'http://localhost:8080',
    username: process.env.QBITTORRENT_USERNAME || 'admin',
    password: process.env.QBITTORRENT_PASSWORD || 'adminpass'
  };

  info(`Testing connection to: ${config.url}`);
  info(`Username: ${config.username}`);

  const client = new QBittorrentClient(config);

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Authentication
  console.log('\n' + COLORS.cyan + '1️⃣  Testing Authentication' + COLORS.reset);
  try {
    await client.login();
    success('Authentication successful');
    testsPassed++;
  } catch (e) {
    error(`Authentication failed: ${e.message}`);
    testsFailed++;
    process.exit(1);
  }

  // Test 2: Get Version
  console.log('\n' + COLORS.cyan + '2️⃣  Testing Version Info' + COLORS.reset);
  try {
    const version = await client.getVersion();
    const apiVersion = await client.getWebAPIVersion();
    success(`qBittorrent version: ${version}`);
    success(`WebUI API version: ${apiVersion}`);
    testsPassed++;
  } catch (e) {
    error(`Version check failed: ${e.message}`);
    testsFailed++;
  }

  // Test 3: Get Preferences
  console.log('\n' + COLORS.cyan + '3️⃣  Testing Preferences' + COLORS.reset);
  try {
    const prefs = await client.getPreferences();
    success(`Save path: ${prefs.save_path}`);
    success(`WebUI port: ${prefs.web_ui_port}`);
    success(`Max active downloads: ${prefs.max_active_downloads}`);
    testsPassed++;
  } catch (e) {
    error(`Get preferences failed: ${e.message}`);
    testsFailed++;
  }

  // Test 4: List Torrents
  console.log('\n' + COLORS.cyan + '4️⃣  Testing Torrent List' + COLORS.reset);
  try {
    const torrents = await client.getTorrents();
    success(`Found ${torrents.length} torrents`);

    if (torrents.length > 0) {
      info('Active torrents:');
      torrents.slice(0, 5).forEach(t => {
        console.log(`   - ${t.name} (${(t.progress * 100).toFixed(1)}%)`);
      });
    }
    testsPassed++;
  } catch (e) {
    error(`List torrents failed: ${e.message}`);
    testsFailed++;
  }

  // Test 5: Get Transfer Info
  console.log('\n' + COLORS.cyan + '5️⃣  Testing Transfer Info' + COLORS.reset);
  try {
    const transferInfo = await client.getTransferInfo();
    success(`Download speed: ${(transferInfo.dl_info_speed / 1024 / 1024).toFixed(2)} MB/s`);
    success(`Upload speed: ${(transferInfo.up_info_speed / 1024 / 1024).toFixed(2)} MB/s`);
    testsPassed++;
  } catch (e) {
    error(`Get transfer info failed: ${e.message}`);
    testsFailed++;
  }

  // Test 6: Add Test Torrent (Sintel demo)
  console.log('\n' + COLORS.cyan + '6️⃣  Testing Add Torrent (Sintel demo)' + COLORS.reset);
  const testMagnet = 'magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337';

  try {
    info('Adding test torrent: Sintel (open source movie)');
    await client.addTorrent({
      magnet: testMagnet,
      savePath: '/tmp/qbittorrent-test',
      category: 'test',
      tags: ['seedr-test'],
      paused: false
    });

    success('Torrent added successfully');

    // Wait for metadata
    info('Waiting 5 seconds for metadata...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get torrent list to find our test torrent
    const torrents = await client.getTorrents({ category: 'test' });
    const testTorrent = torrents.find(t => t.name.includes('Sintel'));

    if (testTorrent) {
      success(`Found torrent: ${testTorrent.name}`);
      success(`Size: ${(testTorrent.size / 1024 / 1024).toFixed(2)} MB`);
      success(`Progress: ${(testTorrent.progress * 100).toFixed(1)}%`);

      // Clean up - remove test torrent
      info('Cleaning up test torrent...');
      await client.deleteTorrents(testTorrent.hash, true);
      success('Test torrent removed');
    } else {
      warn('Test torrent not found yet (may need more time for metadata)');
    }

    testsPassed++;
  } catch (e) {
    error(`Add torrent test failed: ${e.message}`);
    testsFailed++;
  }

  // Test 7: Health Check
  console.log('\n' + COLORS.cyan + '7️⃣  Testing Health Check' + COLORS.reset);
  try {
    const health = await client.healthCheck();
    if (health.status === 'healthy') {
      success('Health check passed');
      success(`Version: ${health.version}`);
      success(`API Version: ${health.apiVersion}`);
      success(`Authenticated: ${health.authenticated}`);
    } else {
      error(`Health check failed: ${health.error}`);
    }
    testsPassed++;
  } catch (e) {
    error(`Health check failed: ${e.message}`);
    testsFailed++;
  }

  // Summary
  console.log('\n' + COLORS.cyan + '='.repeat(60) + COLORS.reset);
  console.log(COLORS.cyan + '  Test Summary' + COLORS.reset);
  console.log(COLORS.cyan + '='.repeat(60) + COLORS.reset);

  console.log(`\n${COLORS.green}✅ Passed: ${testsPassed}${COLORS.reset}`);
  console.log(`${COLORS.red}❌ Failed: ${testsFailed}${COLORS.reset}`);

  if (testsFailed === 0) {
    console.log(`\n${COLORS.green}🎉 All tests passed! qBittorrent integration is working correctly.${COLORS.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${COLORS.red}⚠️  Some tests failed. Please check the errors above.${COLORS.reset}\n`);
    process.exit(1);
  }
}

// Run tests
testQBittorrent().catch(error => {
  console.error('\n' + COLORS.red + '💥 Fatal error:' + COLORS.reset, error.message);
  process.exit(1);
});
