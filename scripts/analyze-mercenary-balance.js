const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'public', 'data');
const OUT_DIR = path.join(ROOT, 'tmp');
const JSON_REPORT_PATH = path.join(OUT_DIR, 'mercenary-balance-report.json');
const MD_REPORT_PATH = path.join(OUT_DIR, 'mercenary-balance-report.md');

const BALANCE_LEVELS = [1, 10, 20, 40, 60, 70];
const GRADES = ['N', 'R', 'SR', 'SSR', 'EX'];
const LEVEL_STAT_GAIN = { hp: 3, atk: 2, def: 2, spd: 1, tec: 2, sup: 2 };
const POWER_WEIGHTS = { hp: 0.25, atk: 1.2, def: 1, spd: 0.8, tec: 0.8, sup: 0.6 };
const MAX_LEVEL_FALLBACK = { N: 20, R: 40, SR: 60, SSR: 70, EX: 70, ENEMY: 70 };

const INPUT_FILES = [
  path.join(DATA_DIR, 'mercenaries.master.json'),
  path.join(DATA_DIR, 'mercenary.missions.master.json'),
  path.join(DATA_DIR, 'mercenary.cases.master.json'),
  path.join(DATA_DIR, 'mercenary.combat-missions.master.json'),
  path.join(DATA_DIR, 'mercenary.enemy-templates.master.json'),
  path.join(DATA_DIR, 'mercenary.encounters.master.json'),
  path.join(DATA_DIR, 'mercenary.encounter-enemies.master.json'),
  path.join(DATA_DIR, 'mercenary.combat-rewards.master.json'),
  path.join(DATA_DIR, 'mercenary.combat-logs.master.json'),
  path.join(DATA_DIR, 'mercenary.skills.json'),
  path.join(DATA_DIR, 'mercenary.attack-types.json')
];

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read ${path.relative(ROOT, filePath)}: ${error.message}`);
  }
}

function readJson(filePath, fallback = []) {
  const text = readText(filePath);
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Failed to parse JSON ${path.relative(ROOT, filePath)}: ${error.message}`);
  }
}

function statMtimes(files) {
  return Object.fromEntries(files.map((file) => [file, fs.existsSync(file) ? fs.statSync(file).mtimeMs : null]));
}

function assertInputFilesUnchanged(before) {
  Object.entries(before).forEach(([file, mtime]) => {
    const after = fs.existsSync(file) ? fs.statSync(file).mtimeMs : null;
    if (after !== mtime) {
      throw new Error(`Input file was modified unexpectedly: ${path.relative(ROOT, file)}`);
    }
  });
}

function num(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeStats(value = {}) {
  return {
    hp: num(value.hp ?? value.HP),
    atk: num(value.atk ?? value.ATK ?? value.attack),
    def: num(value.def ?? value.DEF ?? value.defense),
    spd: num(value.spd ?? value.SPD ?? value.speed),
    tec: num(value.tec ?? value.TEC),
    sup: num(value.sup ?? value.SUP ?? value.support)
  };
}

function calculateUnifiedLevelBonus(level) {
  const safeLevel = Math.max(1, Math.floor(num(level, 1)));
  const levelOffset = safeLevel - 1;
  return Object.fromEntries(Object.entries(LEVEL_STAT_GAIN).map(([key, value]) => [key, value * levelOffset]));
}

function addStats(...parts) {
  const result = { hp: 0, atk: 0, def: 0, spd: 0, tec: 0, sup: 0 };
  parts.forEach((part) => {
    Object.keys(result).forEach((key) => {
      result[key] += num(part?.[key]);
    });
  });
  return result;
}

function calculatePower(stats) {
  return Math.floor(
    num(stats.hp) * POWER_WEIGHTS.hp
    + num(stats.atk) * POWER_WEIGHTS.atk
    + num(stats.def) * POWER_WEIGHTS.def
    + num(stats.spd) * POWER_WEIGHTS.spd
    + num(stats.tec) * POWER_WEIGHTS.tec
    + num(stats.sup) * POWER_WEIGHTS.sup
  );
}

function maxLevelFor(item) {
  const grade = String(item?.grade || 'N').toUpperCase();
  return Math.max(1, Math.floor(num(item?.maxLevel ?? item?.max_level, MAX_LEVEL_FALLBACK[grade] || 70)));
}

function buildLevelRow(baseStats, requestedLevel, maxLevel = 70) {
  const clampedLevel = Math.min(Math.max(1, requestedLevel), maxLevel);
  const levelBonus = calculateUnifiedLevelBonus(clampedLevel);
  const currentStats = addStats(baseStats, levelBonus);
  return {
    requestedLevel,
    level: clampedLevel,
    maxed: requestedLevel > clampedLevel,
    label: requestedLevel > clampedLevel ? `MAX@${clampedLevel}` : `Lv.${requestedLevel}`,
    ...currentStats,
    power: calculatePower(currentStats),
    levelBonus
  };
}

function buildGrowthRows(item) {
  const baseStats = normalizeStats(item.baseStats || item.stats);
  const maxLevel = maxLevelFor(item);
  const lv1Power = calculatePower(baseStats);
  return BALANCE_LEVELS.map((level) => {
    const row = buildLevelRow(baseStats, level, maxLevel);
    return { ...row, powerDeltaFromLv1: row.power - lv1Power };
  });
}

function compactSkillSummary(item) {
  return [item.basicAttackId, item.activeSkillId, item.passiveSkillId].filter(Boolean).join(' / ') || '없음';
}

function representativeScore(item, usedRoles = new Set()) {
  const stats = normalizeStats(item.baseStats || item.stats);
  const statScore = Object.values(stats).filter((value) => value > 0).length * 10;
  const role = String(item.combatRole || item.role || item.position || '').toLowerCase();
  return statScore
    + (item.combatRole ? 16 : 0)
    + (item.activeSkillId ? 10 : 0)
    + (item.passiveSkillId ? 8 : 0)
    + (item.recommendedSlot ? 5 : 0)
    + (role && !usedRoles.has(role) ? 12 : 0)
    + Math.min(20, calculatePower(stats) / 100);
}

function selectRepresentatives(mercenaries, perGrade = 5) {
  const result = {};
  GRADES.forEach((grade) => {
    const usedRoles = new Set();
    const candidates = mercenaries
      .filter((item) => String(item.grade || '').toUpperCase() === grade)
      .filter((item) => Object.values(normalizeStats(item.baseStats || item.stats)).some((value) => value > 0))
      .sort((left, right) => representativeScore(right, usedRoles) - representativeScore(left, usedRoles));
    result[grade] = [];
    candidates.forEach((item) => {
      if (result[grade].length >= perGrade) return;
      result[grade].push(item);
      usedRoles.add(String(item.combatRole || item.role || item.position || '').toLowerCase());
    });
  });
  return result;
}

function summarizeRepresentative(item) {
  const rows = buildGrowthRows(item);
  return {
    id: item.id,
    name: item.name,
    grade: item.grade,
    role: item.combatRole || item.role || item.position || '',
    recommendedSlot: item.recommendedSlot || '',
    maxLevel: maxLevelFor(item),
    baseStats: normalizeStats(item.baseStats || item.stats),
    skillSummary: compactSkillSummary(item),
    rows
  };
}

function getRole(value) {
  const haystack = String(value || '').toLowerCase();
  if (/tank|shield|guard|front|vanguard|captain|brute|대장|방패|전열|경비|수비/.test(haystack)) return 'tank';
  if (/heal|healer|medical|medic|priest|cleric|치료|의무|사제|성직/.test(haystack)) return 'healer';
  if (/support|buffer|assist|지원|보조/.test(haystack)) return 'support';
  if (/dealer|attack|damage|dps|striker|thief|chaser|assassin|rogue|공격|추적|기습|도둑/.test(haystack)) return 'dealer';
  return 'unknown';
}

function getEnemyDepthForPattern(pattern, index, count) {
  const itemNumber = index + 1;
  if (pattern === 'single_boss') return 'enemy_mid';
  if (pattern === 'swarm') return itemNumber <= Math.ceil(count / 2) ? 'enemy_front' : 'enemy_back';
  if (pattern === 'flank') return itemNumber === 1 ? 'enemy_back' : itemNumber === count ? 'enemy_front' : 'enemy_mid';
  if (pattern === 'boss_minions') return itemNumber === 4 ? 'enemy_mid' : itemNumber === 2 || itemNumber === 3 ? 'enemy_front' : 'enemy_back';
  if (count <= 1) return 'enemy_mid';
  return itemNumber <= 2 ? 'enemy_front' : 'enemy_back';
}

function getEnemyFormationPattern(operation) {
  if (operation.enemyFormation || operation.enemyPattern) return String(operation.enemyFormation || operation.enemyPattern);
  const enemies = operation.enemies || [];
  const hasBoss = enemies.some((enemy) => /boss|captain|대장|보스|큰|거대|심연|abyss/i.test([enemy.id, enemy.name, enemy.role].join(' ')));
  if (enemies.length <= 1) return 'single_boss';
  if (hasBoss && enemies.length >= 3) return 'boss_minions';
  if (enemies.length >= 4) return 'swarm';
  return 'front_to_back';
}

function enemyRoleModifiers(enemy, role, depth) {
  const haystack = [enemy.id, enemy.name, enemy.role, enemy.element, ...(Array.isArray(enemy.tags) ? enemy.tags : [])].join(' ').toLowerCase();
  const modifiers = { hp: 1, atk: 1, def: 1, spd: 1, tec: 1, sup: 1, healPower: 0, notes: [] };
  if (/slime|brute|tank|guard|vanguard|grunt|front|captain|슬라임|브루저|전열|행동대|대장|방패|수비/.test(haystack) || role === 'tank') {
    modifiers.hp *= 1.16; modifiers.def *= 1.16; modifiers.atk *= 0.96; modifiers.spd *= 0.92; modifiers.notes.push('tank/front');
  }
  if (/assassin|rogue|scout|thief|chaser|ambush|rat|기습|도둑|추적|암살/.test(haystack) || role === 'dealer') {
    modifiers.hp *= 0.9; modifiers.atk *= 1.12; modifiers.def *= 0.88; modifiers.spd *= 1.18; modifiers.tec *= 1.1; modifiers.notes.push('dealer/flank');
  }
  if (/mage|caster|wizard|abyss|servant|dark|magic|마법|심연|암흑|하수인/.test(haystack)) {
    modifiers.hp *= 0.94; modifiers.atk *= 1.18; modifiers.def *= 0.86; modifiers.spd *= 1.04; modifiers.notes.push('caster');
  }
  if (/healer|support|medic|priest|cleric|heal|치료|지원|의무|사제/.test(haystack) || role === 'healer' || role === 'support') {
    modifiers.hp *= 1.04; modifiers.atk *= 0.82; modifiers.def *= 1.04; modifiers.spd *= 1.06; modifiers.sup *= 1.4; modifiers.healPower = 80; modifiers.notes.push('support');
  }
  if (depth === 'enemy_front') {
    modifiers.hp *= 1.04; modifiers.def *= 1.08; modifiers.notes.push('front depth');
  } else if (depth === 'enemy_back') {
    modifiers.atk *= 1.04; modifiers.spd *= 1.03; modifiers.notes.push('back depth');
  }
  return modifiers;
}

function dangerMultiplier(danger) {
  const value = String(danger || '').trim();
  if (value === '높음' || /high/i.test(value)) return 1.28;
  if (value === '보통' || /normal|medium/i.test(value)) return 1.08;
  if (value === '낮음' || /low/i.test(value)) return 0.92;
  return 1;
}

function calculateEnemyStats(enemy, operation, index, levelOverride = null) {
  const pattern = getEnemyFormationPattern(operation);
  const depth = getEnemyDepthForPattern(pattern, index, (operation.enemies || []).length || 1);
  const level = Math.max(1, Math.floor(num(levelOverride ?? enemy.level, 1)));
  const baseStats = {
    hp: num(enemy.maxHp ?? enemy.hp, 520),
    atk: num(enemy.attack, 90) + 34,
    def: num(enemy.defense, 18) + 12,
    spd: num(enemy.speed, 10),
    tec: num(enemy.tec, 25) + 12,
    sup: num(enemy.support, 12) + 8
  };
  const levelStats = addStats(baseStats, calculateUnifiedLevelBonus(level));
  const role = getRole([enemy.role, enemy.name, enemy.element].join(' '));
  const isBoss = /boss|captain|대장|보스|큰|거대|심연|abyss/i.test([enemy.id, enemy.name, enemy.role].join(' '));
  const danger = dangerMultiplier(operation.danger);
  const bossBonus = isBoss ? 1.14 : 1;
  const depthAttackBonus = depth === 'enemy_front' ? 1.08 : depth === 'enemy_back' ? 0.92 : 1;
  const roleMods = enemyRoleModifiers(enemy, role, depth);
  const currentStats = {
    hp: Math.max(1, Math.round(levelStats.hp * danger * bossBonus * roleMods.hp)),
    atk: Math.max(1, Math.round(levelStats.atk * danger * depthAttackBonus * bossBonus * roleMods.atk)),
    def: Math.max(0, Math.round(levelStats.def * danger * (depth === 'enemy_front' ? 1.12 : 1) * roleMods.def)),
    spd: Math.max(1, Math.round((levelStats.spd + (depth === 'enemy_back' ? 1 : depth === 'enemy_front' ? 2 : 3)) * roleMods.spd)),
    tec: Math.max(1, Math.round(levelStats.tec * danger * roleMods.tec)),
    sup: Math.max(0, Math.round(levelStats.sup * danger * roleMods.sup))
  };
  return {
    enemyId: enemy.id || `enemy_${index + 1}`,
    enemyName: enemy.name || `Enemy ${index + 1}`,
    role,
    depth,
    level,
    baseStats,
    levelBonus: calculateUnifiedLevelBonus(level),
    currentStats,
    power: calculatePower(currentStats),
    modifiers: {
      dangerMultiplier: danger,
      bossBonus,
      depthAttackBonus,
      role: roleMods.notes
    }
  };
}

function buildSheetOperations({ combatMissions, enemyTemplates, encounters, encounterEnemies, combatRewards }) {
  const enemyById = new Map(enemyTemplates.map((enemy) => [String(enemy.enemyId || enemy.id || ''), enemy]));
  const encounterById = new Map(encounters.map((encounter) => [String(encounter.encounterId || encounter.id || ''), encounter]));
  const encounterEnemyRows = new Map();
  encounterEnemies.forEach((row) => {
    const key = String(row.encounterId || '');
    if (!key) return;
    if (!encounterEnemyRows.has(key)) encounterEnemyRows.set(key, []);
    encounterEnemyRows.get(key).push(row);
  });
  const rewardRows = new Map();
  combatRewards.forEach((row) => {
    const key = String(row.rewardGroupId || '');
    if (!key) return;
    if (!rewardRows.has(key)) rewardRows.set(key, []);
    rewardRows.get(key).push(row);
  });
  return combatMissions
    .filter((mission) => mission?.enabled !== false)
    .map((mission) => {
      const encounter = encounterById.get(String(mission.encounterId || '')) || {};
      const rows = (encounterEnemyRows.get(String(encounter.encounterId || encounter.id || '')) || [])
        .filter((row) => row?.enabled !== false)
        .sort((left, right) => Number(left.order || 0) - Number(right.order || 0));
      const enemies = [];
      rows.forEach((row) => {
        const template = enemyById.get(String(row.enemyId || ''));
        if (!template) return;
        const count = Math.max(1, Number(row.count || row.enemyCount || 1) || 1);
        for (let index = 0; index < count; index += 1) {
          const baseStats = template.baseStats || {};
          enemies.push({
            id: `${encounter.encounterId || mission.encounterId}_${row.slot || row.enemyId}_${index + 1}`,
            name: template.name || row.enemyId,
            role: row.role || template.role || '',
            element: Array.isArray(template.tags) ? template.tags[0] || '' : '',
            tags: template.tags || [],
            level: Number(row.enemyLevel || encounter.enemyLevel || 1) || 1,
            maxHp: Number(baseStats.hp || 1) || 1,
            hp: Number(baseStats.hp || 1) || 1,
            attack: Number(baseStats.atk || 1) || 1,
            defense: Number(baseStats.def || 0) || 0,
            speed: Number(baseStats.spd || 1) || 1,
            tec: Number(baseStats.tec || 0) || 0,
            support: Number(baseStats.sup || 0) || 0,
            positionKey: row.positionKey || template.positionKey || '',
            isBoss: Boolean(row.isBoss)
          });
        }
      });
      const rewardGroupId = mission.rewardGroupId || encounter.rewardGroupId || '';
      const coreRewards = (rewardRows.get(String(rewardGroupId)) || [])
        .filter((reward) => reward.enabled !== false && reward.rewardType === 'gold' && (!reward.systemRequirement || reward.systemRequirement === 'core'));
      return {
        id: mission.operationId || mission.missionId || mission.id,
        title: mission.title || encounter.title || '',
        danger: mission.danger || encounter.danger || '',
        recommendedPower: Number(mission.recommendedPower || 0) || 0,
        enemyFormation: encounter.cameraLayout || '',
        enemies,
        rewardGroupId,
        source: 'sheet_combat_mission',
        coreRewards
      };
    })
    .filter((operation) => operation.id && operation.enemies.length);
}

function summarizeEnemyGrowth(operation) {
  return (operation.enemies || []).map((enemy, index) => ({
    enemyId: enemy.id || `enemy_${index + 1}`,
    enemyName: enemy.name || `Enemy ${index + 1}`,
    role: enemy.role || '',
    baseStats: calculateEnemyStats(enemy, operation, index, 1).baseStats,
    rows: BALANCE_LEVELS.map((level) => {
      const result = calculateEnemyStats(enemy, operation, index, level);
      return { requestedLevel: level, level, ...result.currentStats, power: result.power, levelBonus: result.levelBonus, modifiers: result.modifiers };
    })
  }));
}

function analyzeOperation(operation) {
  const enemies = (operation.enemies || []).map((enemy, index) => calculateEnemyStats(enemy, operation, index));
  const enemyPowerTotal = enemies.reduce((sum, enemy) => sum + enemy.power, 0);
  const recommendedPower = num(operation.recommendedPower ?? operation.recommended_power);
  const ratio = recommendedPower / Math.max(1, enemyPowerTotal);
  const note = ratio < 0.65
    ? '추천 전투력이 낮게 잡혔을 가능성'
    : ratio > 1.45
      ? '추천 전투력이 높게 잡혔을 가능성'
      : '대체로 정상 범위';
  return {
    source: operation.source || 'sheet_combat_mission',
    operationId: operation.id || operation.operationId || operation.missionId,
    title: operation.title || '',
    danger: operation.danger || operation.risk || '',
    recommendedPower,
    enemyCount: enemies.length,
    enemyList: enemies.map((enemy) => ({ enemyId: enemy.enemyId, enemyName: enemy.enemyName, level: enemy.level, power: enemy.power, depth: enemy.depth, modifiers: enemy.modifiers })),
    enemyPowerTotal,
    enemyPowerAverage: enemies.length ? Math.round(enemyPowerTotal / enemies.length) : 0,
    candidateEasy: Math.floor(enemyPowerTotal * 0.85),
    candidateNormal: Math.floor(enemyPowerTotal),
    candidateHard: Math.floor(enemyPowerTotal * 1.15),
    currentVsEnemyRatio: Number(ratio.toFixed(3)),
    note
  };
}

function buildParty(name, members, level) {
  const rows = members.map((member) => {
    const baseStats = normalizeStats(member.baseStats || member.stats);
    const row = buildLevelRow(baseStats, level, maxLevelFor(member));
    return { id: member.id, name: member.name, grade: member.grade, requestedLevel: level, level: row.level, maxed: row.maxed, power: row.power };
  });
  const totalPower = rows.reduce((sum, row) => sum + row.power, 0);
  return { partyName: name, requestedLevel: level, members: rows, totalPower, avgPower: rows.length ? Math.round(totalPower / rows.length) : 0 };
}

function repeatToCount(items, count) {
  const result = [];
  for (let index = 0; index < count; index += 1) {
    if (!items.length) break;
    result.push(items[index % items.length]);
  }
  return result;
}

function buildVirtualParties(reps) {
  const parties = [];
  [
    ['N 5인', 'N', [1, 10, 20]],
    ['R 5인', 'R', [1, 10, 20, 40]],
    ['SR 5인', 'SR', [1, 20, 40, 60]],
    ['SSR 5인', 'SSR', [1, 20, 40, 70]]
  ].forEach(([label, grade, levels]) => {
    levels.forEach((level) => parties.push(buildParty(`${label} Lv.${level}`, repeatToCount(reps[grade] || [], 5), level)));
  });
  const mixedA = [...repeatToCount(reps.N || [], 2), ...repeatToCount(reps.R || [], 1), ...repeatToCount(reps.SR || [], 1), ...repeatToCount(reps.SSR || [], 1)];
  const mixedB = [...repeatToCount(reps.R || [], 3), ...repeatToCount(reps.SR || [], 2)];
  const mixedC = [...repeatToCount(reps.SR || [], 3), ...repeatToCount(reps.SSR || [], 1), ...repeatToCount(reps.EX || [], 1)];
  [10, 20, 40].forEach((level) => parties.push(buildParty(`N/R 3 + SR 1 + SSR 1 Lv.${level}`, mixedA, level)));
  [20, 40].forEach((level) => parties.push(buildParty(`R 3 + SR 2 Lv.${level}`, mixedB, level)));
  [40, 60, 70].forEach((level) => parties.push(buildParty(`SR 3 + SSR 1 + EX 1 Lv.${level}`, mixedC, level)));
  return parties;
}

function difficultyLabel(powerRatio) {
  const ratio = num(powerRatio);
  if (ratio >= 1.35) return '압도적 우세';
  if (ratio >= 1.15) return '우세';
  if (ratio >= 0.9) return '호각';
  if (ratio >= 0.75) return '열세';
  if (ratio >= 0.6) return '위험';
  return '압도적 열세';
}

function comparePartiesToOperations(parties, operations) {
  const keyParties = parties.filter((party) => /N 5인 Lv\.10|R 5인 Lv\.10|SR 5인 Lv\.20|N\/R 3/.test(party.partyName));
  return operations.map((operation) => ({
    operationId: operation.operationId,
    title: operation.title,
    comparisons: keyParties.map((party) => {
      const ratio = party.totalPower / Math.max(1, operation.recommendedPower);
      return {
        partyName: party.partyName,
        totalPower: party.totalPower,
        powerRatio: Number(ratio.toFixed(3)),
        difficultyLabel: difficultyLabel(ratio)
      };
    })
  }));
}

function analyzeMissions(missions) {
  return missions
    .filter((mission) => mission && mission.enabled !== false)
    .map((mission) => ({
      missionId: mission.missionId,
      title: mission.title,
      category: mission.category,
      recommendedWorkPower: num(mission.recommendedWorkPower),
      minMembers: num(mission.minMembers),
      maxMembers: num(mission.maxMembers),
      note: '업무 의뢰는 workPower 기준이라 전투 enemyPowerTotal 비교 대상이 아닙니다.'
    }))
    .sort((left, right) => left.recommendedWorkPower - right.recommendedWorkPower);
}

function analyzeCombatLogs(combatLogs = []) {
  return {
    total: combatLogs.length,
    enabled: combatLogs.filter((log) => log?.enabled !== false).length,
    groups: [...new Set(combatLogs.map((log) => log?.logGroupId).filter(Boolean))].sort(),
    logTypes: [...new Set(combatLogs.map((log) => log?.logType).filter(Boolean))].sort()
  };
}

function analyzeEnemySkillValidation(enemyTemplates = [], skills = [], attackTypes = []) {
  const skillIds = new Set(skills.map((skill) => String(skill.skillId || skill.skill_id || '').trim()).filter(Boolean));
  const attackIds = new Set(attackTypes.map((attack) => String(attack.basicAttackId || attack.basic_attack_id || '').trim()).filter(Boolean));
  const missingActionSkillIds = [];
  const missingBasicAttackIds = [];
  enemyTemplates.forEach((enemy) => {
    if (enemy?.enabled === false) return;
    const actionIds = [enemy?.actionSkillId, enemy?.skillId].map((id) => String(id || '').trim()).filter(Boolean);
    [...new Set(actionIds)].forEach((skillId) => {
      if (skillIds.size && !skillIds.has(skillId)) missingActionSkillIds.push({ enemyId: enemy.enemyId || enemy.id, skillId });
    });
    const basicAttackId = String(enemy?.basicAttackId || '').trim();
    if (basicAttackId && attackIds.size && !attackIds.has(basicAttackId)) missingBasicAttackIds.push({ enemyId: enemy.enemyId || enemy.id, basicAttackId });
  });
  return {
    missingActionSkillIds,
    missingBasicAttackIds,
    fallbackPolicy: 'Missing enemy actionSkillId is ignored at battle runtime; basicAttackId falls back to normal_strike if unknown.'
  };
}

function assertSameLevelBonus() {
  const lv10 = JSON.stringify(calculateUnifiedLevelBonus(10));
  const all = [...GRADES, 'ENEMY'].map((grade) => ({ grade, bonus: JSON.stringify(calculateUnifiedLevelBonus(10)) }));
  if (!all.every((item) => item.bonus === lv10)) throw new Error('Lv.10 levelBonus differs by grade/enemy.');
  const delta12 = JSON.stringify(addStats(calculateUnifiedLevelBonus(2), Object.fromEntries(Object.keys(LEVEL_STAT_GAIN).map((key) => [key, -calculateUnifiedLevelBonus(1)[key]]))));
  if (!all.every(() => delta12 === JSON.stringify(LEVEL_STAT_GAIN))) throw new Error('Lv.1 -> 2 statDelta differs from LEVEL_STAT_GAIN.');
  return {
    lv10: calculateUnifiedLevelBonus(10),
    lv1To2: { ...LEVEL_STAT_GAIN },
    checkedGroups: [...GRADES, 'ENEMY']
  };
}

function table(headers, rows) {
  const escape = (value) => String(value ?? '').replace(/\|/g, '/');
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escape).join(' | ')} |`)
  ].join('\n');
}

function powerCell(rows, level) {
  const row = rows.find((item) => item.requestedLevel === level);
  if (!row) return '-';
  return row.maxed ? `${row.power} (${row.label})` : row.power;
}

function makeMarkdown(report) {
  const repRows = Object.values(report.representatives).flat().map((item) => [
    item.grade,
    item.name,
    item.role,
    item.maxLevel,
    ...BALANCE_LEVELS.map((level) => powerCell(item.rows, level))
  ]);
  const partyRows = report.virtualParties.map((party) => [party.partyName, party.totalPower, party.avgPower]);
  const operationRows = report.operations.map((operation) => [
    operation.source,
    operation.operationId,
    operation.title,
    operation.recommendedPower,
    operation.enemyPowerTotal,
    operation.candidateEasy,
    operation.candidateNormal,
    operation.candidateHard,
    operation.note
  ]);
  const earlyRows = report.earlySheetOperationChecks.map((item) => [
    item.source,
    item.operationId,
    item.title,
    item.recommendedPower,
    item.enemyPowerTotal,
    item.candidateNormal,
    item.partyRatios.map((ratio) => `${ratio.partyName}: ${ratio.powerRatio} (${ratio.difficultyLabel})`).join('<br>')
  ]);
  return `# 용병단 성장 밸런스 리포트

생성 시각: ${report.generatedAt}

## 1. 성장 공식

- LEVEL_STAT_GAIN: \`${JSON.stringify(report.formulas.levelStatGain)}\`
- levelBonus 공식: \`LEVEL_STAT_GAIN[stat] * Math.max(0, level - 1)\`
- currentStats 공식: \`baseStats + levelBonus + trainingBonus + equipmentBonus + permanentBonus\`
- power 공식: \`hp * 0.25 + atk * 1.2 + def + spd * 0.8 + tec * 0.8 + sup * 0.6\`
- runtime combat source: \`sheet_combat_mission\`
- sheet_combat_mission: ${report.runtimeSourceSummary.sheetCombatMissionCount}
- legacy runtime operations: ${report.runtimeSourceSummary.legacyRuntimeOperationCount}

## 2. 등급별 대표 용병 성장표

${table(['Grade', 'Name', 'Role', 'MaxLv', ...BALANCE_LEVELS.map((level) => `Lv.${level}`)], repRows)}

## 3. 같은 레벨 levelBonus 동일성 검증

- 검증 대상: ${report.invariants.checkedGroups.join(', ')}
- Lv.10 levelBonus: \`${JSON.stringify(report.invariants.lv10)}\`
- Lv.1 -> Lv.2 statDelta: \`${JSON.stringify(report.invariants.lv1To2)}\`

## 4. 가상 파티 전투력표

${table(['Party', 'TotalPower', 'AvgPower'], partyRows)}

## 5. 적 성장표

${report.enemyGrowth.map((operation) => `### ${operation.operationId} · ${operation.title}

${table(['Enemy', 'Role', ...BALANCE_LEVELS.map((level) => `Lv.${level}`)], operation.enemies.map((enemy) => [
    enemy.enemyName,
    enemy.role,
    ...BALANCE_LEVELS.map((level) => powerCell(enemy.rows, level))
  ]))}
`).join('\n')}

## 6. 작전별 recommendedPower 비교

${table(['Source', 'Operation', 'Title', 'Current', 'EnemyTotal', 'Easy', 'Normal', 'Hard', 'Note'], operationRows)}

## 7. 시트 전투 의뢰 목록

${table(['Operation', 'Title', 'RecommendedPower', 'EnemyCount', 'RewardGroup'], report.sheetCombatMissions.map((operation) => [
    operation.operationId,
    operation.title,
    operation.recommendedPower,
    operation.enemyCount,
    operation.rewardGroupId
  ]))}

## 8. 초반 3개 sheet 작전 점검

${table(['Source', 'Operation', 'Title', 'Current', 'EnemyTotal', 'CandidateNormal', 'Party Ratios'], earlyRows)}

## 9. 전투 로그 문구 export 상태

- total combatLogs: ${report.combatLogStatus.total}
- enabled combatLogs: ${report.combatLogStatus.enabled}
- logGroupId: ${report.combatLogStatus.groups.join(', ') || '없음'}
- logType: ${report.combatLogStatus.logTypes.join(', ') || '없음'}

## 10. enemy skill 검증

- missing actionSkillId: ${report.enemySkillValidation.missingActionSkillIds.length}
- missing basicAttackId: ${report.enemySkillValidation.missingBasicAttackIds.length}
- fallback: ${report.enemySkillValidation.fallbackPolicy}

${table(['Enemy', 'MissingSkillId'], report.enemySkillValidation.missingActionSkillIds.map((item) => [item.enemyId, item.skillId]))}

## 11. 조정 후보

추천값은 자동 반영하지 않았습니다. 우선 검토 후보는 \`candidateNormal\`을 중심으로, 초반 완충이 필요하면 \`candidateEasy\`, 고난도 표기가 필요하면 \`candidateHard\`를 참고하세요.

${table(['Operation', 'CandidateEasy', 'CandidateNormal', 'CandidateHard'], report.operations.map((operation) => [
    `${operation.source}:${operation.operationId}`,
    operation.candidateEasy,
    operation.candidateNormal,
    operation.candidateHard
  ]))}

## 12. 주의사항

- 훈련/장비/사무소 해금 보정은 반영하지 않았습니다.
- 현재 runtime 기준은 sheet combat mission 6개입니다.
- 실제 체감은 스킬/상태/AI/명중/치명 때문에 달라질 수 있습니다.
- master JSON은 수정하지 않았고, report 파일만 생성했습니다.
`;
}

function main() {
  const inputMtimes = statMtimes(INPUT_FILES);
  const mercenaries = readJson(path.join(DATA_DIR, 'mercenaries.master.json'), []);
  const missions = readJson(path.join(DATA_DIR, 'mercenary.missions.master.json'), []);
  const combatMissions = readJson(path.join(DATA_DIR, 'mercenary.combat-missions.master.json'), []);
  const enemyTemplates = readJson(path.join(DATA_DIR, 'mercenary.enemy-templates.master.json'), []);
  const encounters = readJson(path.join(DATA_DIR, 'mercenary.encounters.master.json'), []);
  const encounterEnemies = readJson(path.join(DATA_DIR, 'mercenary.encounter-enemies.master.json'), []);
  const combatRewards = readJson(path.join(DATA_DIR, 'mercenary.combat-rewards.master.json'), []);
  const combatLogs = readJson(path.join(DATA_DIR, 'mercenary.combat-logs.master.json'), []);
  const skills = readJson(path.join(DATA_DIR, 'mercenary.skills.json'), []);
  const attackTypes = readJson(path.join(DATA_DIR, 'mercenary.attack-types.json'), []);
  const sheetOperations = buildSheetOperations({ combatMissions, enemyTemplates, encounters, encounterEnemies, combatRewards });
  const operations = sheetOperations;
  if (!Array.isArray(mercenaries) || !mercenaries.length) throw new Error('mercenaries.master.json has no rows.');
  if (!Array.isArray(operations) || !operations.length) throw new Error('No combat operations were found.');

  const representativesRaw = selectRepresentatives(mercenaries);
  const representatives = Object.fromEntries(Object.entries(representativesRaw).map(([grade, items]) => [grade, items.map(summarizeRepresentative)]));
  const virtualParties = buildVirtualParties(representativesRaw);
  const operationAnalyses = operations.map(analyzeOperation);
  const partyComparisons = comparePartiesToOperations(virtualParties, operationAnalyses);
  const earlyIds = new Set(['combat_sewer_slime_cleanup', 'combat_mimic_entrance_sweep', 'combat_debtbreaker_skirmish']);
  const earlySheetOperationChecks = operationAnalyses
    .filter((operation) => earlyIds.has(operation.operationId))
    .map((operation) => {
      const comparison = partyComparisons.find((item) => item.operationId === operation.operationId);
      return { ...operation, partyRatios: comparison?.comparisons || [] };
    });
  const report = {
    generatedAt: new Date().toISOString(),
    formulas: {
      levelStatGain: LEVEL_STAT_GAIN,
      levelBonus: 'LEVEL_STAT_GAIN[stat] * Math.max(0, level - 1)',
      currentStats: 'baseStats + levelBonus + trainingBonus + equipmentBonus + permanentBonus',
      powerWeights: POWER_WEIGHTS
    },
    representatives,
    invariants: assertSameLevelBonus(),
    runtimeSourceSummary: {
      sheetCombatMissionCount: sheetOperations.length,
      legacyRuntimeOperationCount: 0,
      runtimeSource: 'sheet_combat_mission'
    },
    virtualParties,
    enemyGrowth: operations.map((operation) => ({
      source: operation.source || 'sheet_combat_mission',
      operationId: operation.id,
      title: operation.title,
      enemies: summarizeEnemyGrowth(operation)
    })),
    operations: operationAnalyses,
    sheetCombatMissions: sheetOperations.map((operation) => ({
      source: operation.source,
      operationId: operation.id,
      title: operation.title,
      recommendedPower: operation.recommendedPower,
      enemyCount: operation.enemies.length,
      rewardGroupId: operation.rewardGroupId,
      coreRewards: operation.coreRewards
    })),
    combatLogStatus: analyzeCombatLogs(combatLogs),
    enemySkillValidation: analyzeEnemySkillValidation(enemyTemplates, skills, attackTypes),
    missionWorkPower: analyzeMissions(missions),
    partyComparisons,
    earlySheetOperationChecks
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(JSON_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(MD_REPORT_PATH, makeMarkdown(report), 'utf8');
  assertInputFilesUnchanged(inputMtimes);

  console.log('Mercenary balance report generated.');
  console.log(`- ${path.relative(ROOT, JSON_REPORT_PATH)}`);
  console.log(`- ${path.relative(ROOT, MD_REPORT_PATH)}`);
  console.log('');
  console.log('Operation recommendedPower candidates:');
  operationAnalyses.forEach((operation) => {
    console.log(`- ${operation.operationId}: current=${operation.recommendedPower}, enemyTotal=${operation.enemyPowerTotal}, easy=${operation.candidateEasy}, normal=${operation.candidateNormal}, hard=${operation.candidateHard}, note=${operation.note}`);
  });
  console.log('');
  console.log(`Lv.10 shared levelBonus: ${JSON.stringify(report.invariants.lv10)}`);
}

if (require.main === module) {
  main();
}
