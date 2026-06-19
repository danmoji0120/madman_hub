const fs = require('fs');
const path = require('path');
const assert = require('assert');

const provider = (process.env.DB_PROVIDER || 'sqlite').toLowerCase();

if (provider !== 'sqlite') {
  throw new Error('Mercenaries smoke currently supports DB_PROVIDER=sqlite only.');
}

process.env.DB_PROVIDER = 'sqlite';
process.env.CASINO_DAILY_LIMIT = '0';
process.env.CASINO_ROULETTE_DAILY_LIMIT = '0';
process.env.CASINO_BLACKJACK_DAILY_LIMIT = '0';
process.env.CASINO_CRASH_DAILY_LIMIT = '0';
process.env.CASINO_SLOT_MACHINE_DAILY_LIMIT = '0';
process.env.CASINO_RUSSIAN_DAILY_LIMIT = '0';

const dbPath = path.join(__dirname, '../database/mercenaries-smoke.sqlite');
fs.rmSync(dbPath, { force: true });

process.env.PORT = process.env.PORT || '3104';
process.env.DB_PATH = dbPath;

const { start } = require('../server/app');
const { close, run, get } = require('../server/db');
const { addPointTransaction, ensurePointAccount } = require('../server/services/points.service');
const { treatmentCost } = require('../server/config/mercenaries.config');
const equipmentMaster = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/mercenary.equipment.master.json'), 'utf8'));
const mercenaryMaster = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/mercenaries.master.json'), 'utf8'));

const baseUrl = `http://127.0.0.1:${process.env.PORT}`;

async function request(route, options = {}, expectedStatus = 200) {
  const response = await fetch(`${baseUrl}${route}`, options);
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : await response.text();

  assert.strictEqual(response.status, expectedStatus, `${route}: ${JSON.stringify(data)}`);
  return data;
}

function assertCandidate(candidate) {
  assert.ok(candidate.id);
  assert.ok(candidate.mercenaryKey);
  assert.ok(candidate.templateKey);
  assert.ok(['N', 'R'].includes(candidate.rarity), `Unexpected candidate rarity: ${candidate.rarity}`);
  assert.ok(['N', 'R'].includes(candidate.performanceGrade), `Unexpected candidate grade: ${candidate.performanceGrade}`);
  assert.strictEqual(candidate.isUnique, false);
  assert.strictEqual(candidate.limited, false);
  assert.strictEqual(candidate.sourceType, 'hire_shop');
  assert.ok(Object.prototype.hasOwnProperty.call(candidate, 'illustrationUrl'));
}

async function forceRunReady(runId) {
  await run(
    "UPDATE mercenary_runs SET completes_at = datetime('now', '-1 second') WHERE id = ?",
    [runId]
  );
}

async function setDangerMissionForSmoke() {
  await run(
    `UPDATE mercenary_missions
     SET death_risk = 100, injury_risk = 100, duration_seconds = 1, base_success_rate = 1
     WHERE code = 'closed_zone_scout'`
  );
}

async function hireFirstCandidate(auth) {
  const candidates = await request('/api/mercenaries/candidates', { headers: auth });
  assert.strictEqual(candidates.success, true);
  assert.ok(candidates.items.length >= 1);
  const hired = await request(`/api/mercenaries/candidates/${candidates.items[0].id}/hire`, {
    method: 'POST',
    headers: auth
  });
  assert.strictEqual(hired.success, true);
  return hired.mercenary;
}

async function main() {
  const server = await start();

  try {
    const health = await request('/health');
    assert.strictEqual(health.status, 'ok');
    await request('/api/mercenary/combat-stage-clears', {}, 401);

    const email = `mercenary-smoke-${Date.now()}@example.com`;
    const password = 'secret123';
    const registered = await request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName: 'Mercenary Smoke User' })
    });
    assert.ok(registered.user?.id);

    const loggedIn = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    assert.ok(loggedIn.token);
    const auth = { Authorization: `Bearer ${loggedIn.token}`, 'Content-Type': 'application/json' };
    const userId = loggedIn.user.id;

    const initialStageClears = await request('/api/mercenary/combat-stage-clears', { headers: auth });
    assert.strictEqual(initialStageClears.success, true);
    assert.deepStrictEqual(initialStageClears.clears, []);
    const lockedStageClaim = await request('/api/mercenary/battles/claim', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        battleId: `locked-stage-${Date.now()}`,
        operationId: 'combat_sewer_slime_cleanup_stage_02',
        result: 'victory',
        partyUserMercenaryIds: ['missing-owned-mercenary'],
        allies: [],
        enemies: [],
        battleResult: { rounds: [] }
      })
    }, 403);
    assert.strictEqual(lockedStageClaim.code, 'STAGE_LOCKED');
    assert.ok(Array.isArray(lockedStageClaim.reasons));

    const smokeEquipment = equipmentMaster.find((item) => item.itemId && item.slot === 'weapon');
    assert.ok(smokeEquipment?.itemId);
    const smokeMasterId = mercenaryMaster.find((item) => item.id)?.id;
    assert.ok(smokeMasterId);
    const createdOwned = await run(
      `INSERT INTO user_mercenaries
       (user_id, mercenary_id, current_level, current_exp, status, operational_status, is_locked)
       VALUES (?, ?, 1, 0, ?, 'idle', 0)`,
      [userId, smokeMasterId, '대기 중']
    );
    const smokeOwnedId = String(createdOwned.id);
    const smokeInventoryId = `smoke-inventory-${Date.now()}`;
    await run(
      `INSERT INTO user_mercenary_inventory_items
       (id, user_id, item_id, item_type, quantity, locked, acquired_source_type)
       VALUES (?, ?, ?, 'equipment', 1, 0, 'smoke')`,
      [smokeInventoryId, userId, smokeEquipment.itemId]
    );
    const emptyEquipmentSlots = await request('/api/mercenary/equipment-slots', { headers: auth });
    assert.strictEqual(emptyEquipmentSlots.success, true);
    assert.ok(Array.isArray(emptyEquipmentSlots.items));
    await request(`/api/mercenary/my/${smokeOwnedId}/equipment/equip`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ inventoryItemId: 'missing-inventory-item' })
    }, 404);
    const equipped = await request(`/api/mercenary/my/${smokeOwnedId}/equipment/equip`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ inventoryItemId: smokeInventoryId })
    });
    assert.strictEqual(equipped.success, true);
    assert.ok(equipped.equipmentSlots.weapon);
    assert.ok(Number(equipped.equipmentBonus.combatPower || 0) > 0);
    await request(`/api/mercenary/my/${smokeOwnedId}/equipment/equip`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ inventoryItemId: smokeInventoryId })
    }, 409);
    const equippedInventory = await request('/api/mercenary/inventory', { headers: auth });
    assert.strictEqual(equippedInventory.items.find((item) => item.id === smokeInventoryId)?.equipped, true);
    const unequipped = await request(`/api/mercenary/my/${smokeOwnedId}/equipment/weapon`, {
      method: 'DELETE',
      headers: auth
    });
    assert.strictEqual(unequipped.success, true);
    assert.strictEqual(unequipped.equipmentSlots.weapon, null);

    const lockResult = await request(`/api/mercenary/my/${smokeOwnedId}/lock`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({ locked: true })
    });
    assert.strictEqual(lockResult.success, true);
    assert.strictEqual(lockResult.locked, true);
    await request(`/api/mercenary/my/${smokeOwnedId}/dismiss`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ confirmName: mercenaryMaster.find((item) => item.id === smokeMasterId)?.name || smokeMasterId })
    }, 409);
    const unlockResult = await request(`/api/mercenary/my/${smokeOwnedId}/lock`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({ locked: false })
    });
    assert.strictEqual(unlockResult.success, true);
    assert.strictEqual(unlockResult.locked, false);
    await request(`/api/mercenary/my/${smokeOwnedId}/dismiss`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ confirmName: 'wrong-name' })
    }, 400);
    const reEquipped = await request(`/api/mercenary/my/${smokeOwnedId}/equipment/equip`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ inventoryItemId: smokeInventoryId })
    });
    assert.strictEqual(reEquipped.success, true);
    const dismissResult = await request(`/api/mercenary/my/${smokeOwnedId}/dismiss`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ confirmName: mercenaryMaster.find((item) => item.id === smokeMasterId)?.name || smokeMasterId })
    });
    assert.strictEqual(dismissResult.success, true);
    assert.strictEqual(dismissResult.dismissedMercenaryId, smokeOwnedId);
    assert.ok(Number(dismissResult.unequippedItemsCount || 0) >= 1);
    const afterDismissInventory = await request('/api/mercenary/inventory', { headers: auth });
    assert.strictEqual(afterDismissInventory.items.find((item) => item.id === smokeInventoryId)?.equipped, false);
    const afterDismissRoster = await request('/api/mercenary/my', { headers: auth });
    assert.strictEqual(afterDismissRoster.items.some((item) => String(item.ownedId || item.id) === smokeOwnedId), false);

    await addPointTransaction({
      userId,
      amount: 5000,
      type: 'mercenary_smoke_fund',
      reason: 'Mercenary smoke funding',
      sourcePlatform: 'smoke'
    });
    const startingAccount = await ensurePointAccount(userId);
    assert.ok(startingAccount.balance >= 5000);

    const candidates = await request('/api/mercenaries/candidates', { headers: auth });
    assert.strictEqual(candidates.success, true);
    assert.strictEqual(candidates.items.length, 3);
    candidates.items.forEach(assertCandidate);

    const candidate = candidates.items[0];
    const hire = await request(`/api/mercenaries/candidates/${candidate.id}/hire`, {
      method: 'POST',
      headers: auth
    });
    assert.strictEqual(hire.success, true);
    assert.strictEqual(hire.mercenary.sourceType, 'hire_shop');
    assert.ok(['N', 'R'].includes(hire.mercenary.rarity));
    assert.ok(['N', 'R'].includes(hire.mercenary.performanceGrade));
    assert.ok(Object.prototype.hasOwnProperty.call(hire.mercenary, 'illustrationUrl'));
    assert.strictEqual(hire.account.balance, startingAccount.balance - candidate.hireCost);

    await request(`/api/mercenaries/candidates/${candidate.id}/hire`, {
      method: 'POST',
      headers: auth
    }, 409);

    const roster = await request('/api/mercenaries', { headers: auth });
    assert.strictEqual(roster.success, true);
    assert.ok(roster.items.some((item) => item.id === hire.mercenary.id));

    const beforeRescue = await ensurePointAccount(userId);
    const rescue = await request(`/api/mercenaries/${hire.mercenary.id}/rescue/subscribe`, {
      method: 'POST',
      headers: auth
    });
    assert.strictEqual(rescue.success, true);
    assert.strictEqual(rescue.mercenary.rescueInsured, true);
    assert.strictEqual(rescue.account.balance, beforeRescue.balance - rescue.cost);

    const missions = await request('/api/mercenaries/missions', { headers: auth });
    assert.strictEqual(missions.success, true);
    assert.ok(missions.items.length >= 5);
    const patrol = missions.items.find((item) => item.code === 'patrol');
    assert.ok(patrol);
    assert.strictEqual(typeof patrol.durationSeconds, 'number');
    assert.strictEqual(typeof patrol.deathRisk, 'number');

    const started = await request('/api/mercenaries/missions/patrol/start', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ mercenaryIds: [hire.mercenary.id] })
    });
    assert.strictEqual(started.success, true);
    assert.strictEqual(started.run.status, 'running');

    const deployed = await request('/api/mercenaries', { headers: auth });
    assert.strictEqual(deployed.items.find((item) => item.id === hire.mercenary.id).status, 'deployed');

    await request(`/api/mercenaries/runs/${started.run.id}/claim`, { method: 'POST', headers: auth }, 409);
    await forceRunReady(started.run.id);
    const claimed = await request(`/api/mercenaries/runs/${started.run.id}/claim`, {
      method: 'POST',
      headers: auth
    });
    assert.strictEqual(claimed.success, true);
    assert.ok(['great_success', 'success', 'partial_success', 'fail', 'disaster'].includes(claimed.result));
    assert.strictEqual(claimed.run.status, 'completed');
    assert.ok(Object.prototype.hasOwnProperty.call(claimed, 'xpGained'));

    let latestMerc = (await request('/api/mercenaries', { headers: auth })).items
      .find((item) => item.id === hire.mercenary.id);
    if (latestMerc.status === 'hospitalized') {
      const expectedCost = treatmentCost({
        level: latestMerc.level,
        performanceGrade: latestMerc.performanceGrade,
        injuryLevel: latestMerc.injuryLevel
      });
      const beforeTreat = await ensurePointAccount(userId);
      const treated = await request(`/api/mercenaries/${latestMerc.id}/treat`, {
        method: 'POST',
        headers: auth
      });
      assert.strictEqual(treated.success, true);
      assert.strictEqual(treated.cost, expectedCost);
      assert.strictEqual(treated.account.balance, beforeTreat.balance - expectedCost);
      latestMerc = treated.mercenary;
    }

    if (latestMerc.status !== 'idle') {
      await run('UPDATE mercenaries SET status = ?, injury_level = 0 WHERE id = ?', ['idle', latestMerc.id]);
      latestMerc.status = 'idle';
    }

    await setDangerMissionForSmoke();
    const rescueRun = await request('/api/mercenaries/missions/closed_zone_scout/start', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ mercenaryIds: [latestMerc.id] })
    });
    await forceRunReady(rescueRun.run.id);
    const rescued = await request(`/api/mercenaries/runs/${rescueRun.run.id}/claim`, {
      method: 'POST',
      headers: auth
    });
    assert.strictEqual(rescued.success, true);
    const rescuedMerc = rescued.run.mercenaries.find((item) => item.id === latestMerc.id);
    assert.strictEqual(rescuedMerc.status, 'hospitalized');
    assert.strictEqual(rescuedMerc.injuryLevel, 3);
    assert.notStrictEqual(rescuedMerc.status, 'dead');
    assert.ok((rescued.run.rescueResult || {})[latestMerc.id]?.status === 'rescued');

    const rescuedExpectedCost = treatmentCost({
      level: rescuedMerc.level,
      performanceGrade: rescuedMerc.performanceGrade,
      injuryLevel: rescuedMerc.injuryLevel
    });
    const beforeRescuedTreat = await ensurePointAccount(userId);
    const rescuedTreat = await request(`/api/mercenaries/${rescuedMerc.id}/treat`, {
      method: 'POST',
      headers: auth
    });
    assert.strictEqual(rescuedTreat.success, true);
    assert.strictEqual(rescuedTreat.cost, rescuedExpectedCost);
    assert.strictEqual(rescuedTreat.account.balance, beforeRescuedTreat.balance - rescuedExpectedCost);

    const doomedMerc = await hireFirstCandidate(auth);
    const deathRun = await request('/api/mercenaries/missions/closed_zone_scout/start', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ mercenaryIds: [doomedMerc.id] })
    });
    await forceRunReady(deathRun.run.id);
    const killed = await request(`/api/mercenaries/runs/${deathRun.run.id}/claim`, {
      method: 'POST',
      headers: auth
    });
    assert.strictEqual(killed.success, true);
    const deadMerc = killed.run.mercenaries.find((item) => item.id === doomedMerc.id);
    assert.strictEqual(deadMerc.status, 'dead');
    assert.ok((killed.run.deathResult || {})[doomedMerc.id]?.status === 'killed');

    await request('/api/mercenaries/missions/patrol/start', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ mercenaryIds: [doomedMerc.id] })
    }, 409);
    await request(`/api/mercenaries/${doomedMerc.id}/treat`, { method: 'POST', headers: auth }, 409);

    const history = await request('/api/mercenaries/history', { headers: auth });
    assert.strictEqual(history.success, true);
    assert.ok(history.items.length >= 3);

    const overview = await request('/api/mercenaries/overview', { headers: auth });
    assert.strictEqual(overview.success, true);
    assert.ok(Array.isArray(overview.candidates));
    assert.ok(Array.isArray(overview.mercenaries));
    assert.ok(Array.isArray(overview.missions));
    assert.ok(Array.isArray(overview.history));
    assert.ok(overview.summary.dead >= 1);

    const exGradeCount = await get("SELECT COUNT(*) AS count FROM mercenary_candidates WHERE performance_grade = 'EX'");
    assert.strictEqual(exGradeCount.count, 0);

    console.log('Mercenaries smoke test passed.');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await close();
    fs.rmSync(dbPath, { force: true });
  }
}

main().catch(async (error) => {
  console.error(error);
  await close().catch(() => {});
  fs.rmSync(dbPath, { force: true });
  process.exit(1);
});
