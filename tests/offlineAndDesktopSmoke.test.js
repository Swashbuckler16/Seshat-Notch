import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { dataOwnershipService } from '../src/services/dataOwnershipService.ts';
import { reminderService } from '../src/services/reminderService.ts';
import { getDayBoundaryHour, setDayBoundaryHour, getLocalDateString } from '../src/utils/dateUtils.ts';
import { desktopShellService } from '../src/services/desktopShellService.ts';

// Provide an in-memory localStorage polyfill for Node test environment
const memoryStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => (memoryStorage.has(key) ? memoryStorage.get(key) : null),
  setItem: (key, val) => memoryStorage.set(key, String(val)),
  removeItem: (key) => memoryStorage.delete(key),
  clear: () => memoryStorage.clear(),
};

test('Offline Smoke Test: Static server serves all sw.js and manifest.webmanifest assets with 200 OK and sw.js survives partial failures', async () => {
  const rootDir = process.cwd();
  const publicDir = path.join(rootDir, 'public');

  const swCode = fs.readFileSync(path.join(publicDir, 'sw.js'), 'utf8');
  const manifestRaw = fs.readFileSync(path.join(publicDir, 'manifest.webmanifest'), 'utf8');
  const manifest = JSON.parse(manifestRaw);
  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');

  // Verify sw.js caches files individually rather than failing all on cache.addAll
  assert.ok(
    !swCode.includes('cache.addAll('),
    'sw.js must not use brittle cache.addAll() which aborts the entire install on a single 404'
  );
  assert.ok(
    swCode.includes('Promise.allSettled('),
    'sw.js should cache assets individually via Promise.allSettled'
  );

  // Verify manifest has 192px, 256px, 512px, maskable, and SVG icons
  const iconSizes = manifest.icons.map((i) => `${i.sizes}:${i.purpose}`);
  assert.ok(iconSizes.includes('192x192:any'), 'Manifest must include 192x192 icon');
  assert.ok(iconSizes.includes('256x256:any'), 'Manifest must include 256x256 icon');
  assert.ok(iconSizes.includes('512x512:any'), 'Manifest must include 512x512 icon');
  assert.ok(iconSizes.includes('512x512:maskable'), 'Manifest must include 512x512 maskable icon');
  assert.ok(iconSizes.includes('any:any'), 'Manifest must include favicon.svg');

  // Strict static server resolver matching GitHub Pages / Vite static hosting
  function serveStaticAsset(urlStr) {
    const u = new URL(urlStr, 'https://swashbuckler16.github.io/Seshat-Notch/');
    const relPath = u.pathname.replace(/^\/Seshat-Notch\/?/, '');
    const cleanRel = relPath === '' || relPath === '/' ? 'index.html' : relPath;

    let filePath = path.join(publicDir, cleanRel);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(rootDir, cleanRel);
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const buf = fs.readFileSync(filePath);
      return {
        ok: true,
        status: 200,
        type: 'basic',
        size: buf.byteLength,
        clone() {
          return this;
        },
      };
    }
    return {
      ok: false,
      status: 404,
      type: 'basic',
      size: 0,
      clone() {
        return this;
      },
    };
  }

  // 1. Verify all icons in manifest.webmanifest resolve with 200 OK
  for (const icon of manifest.icons) {
    const res = serveStaticAsset(icon.src);
    assert.equal(res.status, 200, `Manifest icon "${icon.src}" returned 404 on static server`);
    assert.ok(res.size > 0, `Manifest icon "${icon.src}" is empty`);
  }

  // 2. Verify all link hrefs in index.html resolve with 200 OK
  const hrefMatches = Array.from(indexHtml.matchAll(/<link[^>]+href=["']([^"']+)["']/g)).map(
    (m) => m[1]
  );
  for (const href of hrefMatches) {
    const res = serveStaticAsset(href);
    assert.equal(res.status, 200, `index.html link "${href}" returned 404 on static server`);
  }

  // 3. Execute real public/sw.js inside a simulated ServiceWorker global scope against the static server
  const listeners = {};
  const cacheStore = new Map();

  const swContext = {
    URL,
    Promise,
    console,
    self: {
      location: { origin: 'https://swashbuckler16.github.io' },
      addEventListener(type, fn) {
        listeners[type] = fn;
      },
      skipWaiting: () => Promise.resolve(),
      clients: { claim: () => Promise.resolve() },
    },
    caches: {
      open: async () => ({
        put: async (reqOrUrl, response) => {
          cacheStore.set(String(reqOrUrl), response);
        },
      }),
      keys: async () => [],
      delete: async () => true,
      match: async (req) => cacheStore.get(req.url || String(req)) || null,
    },
    fetch: async (urlStr) => serveStaticAsset(urlStr),
  };

  vm.runInNewContext(swCode, swContext);
  assert.equal(typeof listeners.install, 'function', 'sw.js must register an install listener');

  let installPromise;
  listeners.install({
    waitUntil(p) {
      installPromise = p;
    },
  });
  await installPromise;

  // Every single asset in ASSETS_TO_CACHE must have returned 200 OK and been stored in cache
  assert.equal(
    cacheStore.size,
    9,
    `Expected all 9 shell assets to be cached on install, got ${cacheStore.size}`
  );
  assert.ok(cacheStore.has('./favicon.svg'), 'favicon.svg must be cached during SW install');
  assert.ok(cacheStore.has('./icon-192.png'), 'icon-192.png must be cached during SW install');
  assert.ok(cacheStore.has('./icon-512.png'), 'icon-512.png must be cached during SW install');
  assert.ok(
    cacheStore.has('./icon-maskable-512.png'),
    'icon-maskable-512.png must be cached during SW install'
  );
});

test('Backup & Restore preserves user settings (day rollover boundary & reminders) and tracks backup due status', async () => {
  memoryStorage.clear();

  // Configure custom settings
  setDayBoundaryHour(4);
  reminderService.saveSettings({
    enabled: true,
    morningTime: '08:15',
    eveningTime: '21:30',
    sundayReviewReminder: false,
  });
  dataOwnershipService.setDailyBackupPromptEnabled(true);

  // Verify backup is due when no backup has been saved today
  const todayStr = getLocalDateString();
  assert.equal(dataOwnershipService.isBackupDueToday(todayStr), true);

  // Snoozing hides the prompt for today
  dataOwnershipService.snoozeBackupPromptForToday();
  assert.equal(dataOwnershipService.isBackupDueToday(todayStr), false);

  // Export full backup JSON and verify preferences are embedded
  const jsonBackup = await dataOwnershipService.exportAllToJson();
  const parsed = JSON.parse(jsonBackup);
  assert.equal(parsed.preferences.dayBoundaryHour, 4);
  assert.equal(parsed.preferences.reminderSettings.enabled, true);
  assert.equal(parsed.preferences.reminderSettings.morningTime, '08:15');

  // Wipe localStorage settings back to defaults
  memoryStorage.clear();
  assert.equal(getDayBoundaryHour(), 0);
  assert.equal(reminderService.getSettings().enabled, false);

  // Restore from JSON backup and verify preferences are restored
  await dataOwnershipService.importFromJson(jsonBackup, 'replace');
  assert.equal(getDayBoundaryHour(), 4);
  assert.equal(reminderService.getSettings().enabled, true);
  assert.equal(reminderService.getSettings().morningTime, '08:15');
  assert.equal(reminderService.getSettings().eveningTime, '21:30');
  assert.equal(reminderService.getSettings().sundayReviewReminder, false);
});

test('Phase 14: Windows Desktop Shell (Tauri) configuration and bridge service exist and are complete', () => {
  const rootDir = process.cwd();
  const tauriConfPath = path.join(rootDir, 'src-tauri', 'tauri.conf.json');
  const cargoPath = path.join(rootDir, 'src-tauri', 'Cargo.toml');
  const mainRsPath = path.join(rootDir, 'src-tauri', 'src', 'main.rs');

  assert.ok(fs.existsSync(tauriConfPath), 'src-tauri/tauri.conf.json must exist');
  assert.ok(fs.existsSync(cargoPath), 'src-tauri/Cargo.toml must exist');
  assert.ok(fs.existsSync(mainRsPath), 'src-tauri/src/main.rs must exist');

  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
  assert.equal(tauriConf.productName, 'Seshat Notch');
  assert.equal(
    tauriConf.app.withGlobalTauri,
    true,
    'tauri.conf.json must enable app.withGlobalTauri so window.__TAURI__.event is available'
  );
  assert.equal(
    tauriConf.app.trayIcon,
    undefined,
    'tauri.conf.json must not declare a duplicate trayIcon alongside TrayIconBuilder in main.rs'
  );
  assert.ok(
    tauriConf.app.security.csp.includes('connect-src') &&
      tauriConf.app.security.csp.includes('ipc:'),
    'Tauri CSP must allow connect-src ipc: http://ipc.localhost'
  );

  const mainRs = fs.readFileSync(mainRsPath, 'utf8');
  assert.ok(mainRs.includes('save_backup_to_disk'), 'main.rs must expose save_backup_to_disk command');
  assert.ok(mainRs.includes('send_native_notification'), 'main.rs must expose send_native_notification command');
  assert.ok(mainRs.includes('seshat://quick-add'), 'main.rs must emit seshat://quick-add for global hotkey');
  assert.ok(mainRs.includes('tauri_plugin_single_instance'), 'main.rs must register single-instance plugin');
  assert.ok(mainRs.includes('set_autostart_enabled'), 'main.rs must expose start-with-Windows autostart command');

  const status = desktopShellService.getStatus();
  assert.equal(typeof status.isDesktopApp, 'boolean');
  assert.ok(status.globalHotkey.includes('Ctrl+K'));
});
