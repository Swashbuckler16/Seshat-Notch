import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/db/index.ts';
import { dataOwnershipService, hashPin } from '../src/services/dataOwnershipService.ts';
import { parseActivityCommand } from '../src/utils/activityQuickAdd.ts';

test('screen PIN is salted, throttled after five failures, and upgrades old hashes', async () => {
  await db.settings.clear();
  await dataOwnershipService.setAppLockPin('1234');
  const first = (await db.settings.get('app_lock_pin_hash')).value;
  assert.ok(first.startsWith('sn_salted_'));
  assert.equal(await dataOwnershipService.verifyAppLockPin('1234'), true);
  await dataOwnershipService.setAppLockPin('1234');
  assert.notEqual((await db.settings.get('app_lock_pin_hash')).value, first);
  for (let i = 0; i < 5; i++) assert.equal(await dataOwnershipService.verifyAppLockPin('9999'), false);
  assert.equal(await dataOwnershipService.verifyAppLockPin('1234'), false);
  await db.settings.delete('app_lock_attempts');
  await db.settings.put({key:'app_lock_pin_hash', value:hashPin('1234'), updatedAt:new Date().toISOString()});
  assert.equal(await dataOwnershipService.verifyAppLockPin('1234'), true);
  assert.ok((await db.settings.get('app_lock_pin_hash')).value.startsWith('sn_salted_'));
  assert.equal(await dataOwnershipService.disableAppLock('1234'), true);
});

test('plain-language activity commands do not capture ordinary tasks', () => {
  assert.deepEqual(parseActivityCommand('tick Sleep cycle'), {action:'tick',title:'Sleep cycle'});
  assert.deepEqual(parseActivityCommand('activity Read daily'), {action:'create',title:'Read daily'});
  assert.equal(parseActivityCommand('Read my book @today'), null);
  assert.equal(parseActivityCommand('tick '), null);
});
