const fs = require('fs');
const path = require('path');

const SPREADSHEET_ID = '1O6qW_A7sxMoBCFu-d_zip6IkFoXfFkI_Z32dWJ5RY3U';
const SHEET_NAMES = {
  mercenaries: '\uC2DC\uD2B81',
  attackTypes: '\uACF5\uACA9 \uD0C0\uC785 \uADDC\uCE59',
  skills: '\uC2A4\uD0AC \uADDC\uCE59',
  statusEffects: '\uC0C1\uD0DC \uD6A8\uACFC \uADDC\uCE59',
  combatMissions: '\uC804\uD22C \uC758\uB8B0 \uB9C8\uC2A4\uD130',
  enemyTemplates: '\uC801 \uD15C\uD50C\uB9BF',
  encounters: '\uC804\uD22C \uC778\uCE74\uC6B4\uD130',
  encounterEnemies: '\uC804\uD22C \uC778\uCE74\uC6B4\uD130 \uD3B8\uC131',
  combatStages: '\uC804\uD22C \uC2A4\uD14C\uC774\uC9C0 \uB9C8\uC2A4\uD130',
  combatRewards: '\uC804\uD22C \uBCF4\uC0C1 \uD480',
  combatRules: '\uC804\uD22C \uADDC\uCE59',
  combatLogs: '\uC804\uD22C \uB85C\uADF8 \uBB38\uAD6C'
};

const OUTPUT_PATHS = {
  mercenaries: path.join(__dirname, '../public/data/mercenaries.master.json'),
  attackTypes: path.join(__dirname, '../public/data/mercenary.attack-types.json'),
  skills: path.join(__dirname, '../public/data/mercenary.skills.json'),
  statusEffects: path.join(__dirname, '../public/data/mercenary.status-effects.json'),
  combatMissions: path.join(__dirname, '../public/data/mercenary.combat-missions.master.json'),
  enemyTemplates: path.join(__dirname, '../public/data/mercenary.enemy-templates.master.json'),
  encounters: path.join(__dirname, '../public/data/mercenary.encounters.master.json'),
  encounterEnemies: path.join(__dirname, '../public/data/mercenary.encounter-enemies.master.json'),
  combatRewards: path.join(__dirname, '../public/data/mercenary.combat-rewards.master.json'),
  combatRules: path.join(__dirname, '../public/data/mercenary.combat-rules.master.json'),
  combatLogs: path.join(__dirname, '../public/data/mercenary.combat-logs.master.json')
};
const VALIDATION_REPORT_PATH = path.join(__dirname, '../tmp/mercenary-combat-validation-report.json');

const N_COMMON_SPECIES_KEYS = {
  '\uAC70\uBBF8\uC778': 'spiderkin',
  '\uACE0\uBE14\uB9B0': 'goblin',
  '\uACE0\uC591\uC774\uC218\uC778': 'catkin',
  '\uACE8\uB818': 'golem',
  '\uACF0\uC218\uC778': 'bearkin',
  '\uB108\uAD6C\uB9AC\uC218\uC778': 'raccoonkin',
  '\uB291\uB300\uC778': 'wolfkin',
  '\uB3C4\uB9C8\uBC40\uC778': 'lizardkin',
  '\uB4DC\uC6CC\uD504': 'dwarf',
  '\uBBF8\uB178\uD0C0\uC6B0\uB85C\uC2A4': 'minotaur',
  '\uBBF8\uBBF9': 'mimic',
  '\uC0AC\uC2B4\uC778': 'deerkin',
  '\uC0AC\uC790\uC778': 'lionkin',
  '\uC2AC\uB77C\uC784': 'slime',
  '\uC591\uC218\uC778': 'sheepkin',
  '\uC5B8\uB370\uB4DC': 'undead',
  '\uC5D8\uD504': 'elf',
  '\uC5EC\uC6B0\uC778': 'foxkin',
  '\uC624\uB2C8': 'oni',
  '\uC624\uD06C': 'orc',
  '\uC778\uAC04': 'human',
  '\uCF04\uD0C0\uC6B0\uB85C\uC2A4': 'centaur',
  '\uCF54\uBCFC\uD2B8': 'kobold',
  '\uD1A0\uB07C\uC778': 'rabbitkin',
  '\uD558\uD53C': 'harpy',
  '\uD761\uD608\uADC0': 'vampire'
};

function sheetCsvUrl(sheetName) {
  return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

function getNCommonImageKey(species) {
  const speciesKey = N_COMMON_SPECIES_KEYS[String(species || '').trim()];
  return speciesKey ? `n_${speciesKey}_common_01` : '';
}

function getImageKey({ id, grade, species, sheetImageKey }) {
  const normalizedGrade = String(grade || '').trim().toUpperCase();
  if (normalizedGrade === 'N') return getNCommonImageKey(species) || sheetImageKey;
  return id || sheetImageKey;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        value += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(value);
      value = '';
    } else if (char === '\n') {
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else if (char !== '\r') {
      value += char;
    }
  }

  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

function parseTags(value) {
  return String(value || '')
    .split(/[,\|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseJsonCell(value, fallback = null) {
  const text = String(value || '').trim();
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch (error) {
    return fallback;
  }
}

function parseBoolean(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return ['true', '1', 'yes', 'y', 'use', 'enabled', '\uD544\uC694', '\uC0AC\uC6A9', '\uC0AC\uC6A9 \uC911', '\uD65C\uC131', 'o', 'ok'].includes(normalized);
}

function parseNumber(value, fallback = 0) {
  const normalized = String(value || '').replace(/,/g, '').trim();
  if (!normalized) return fallback;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseInteger(value, fallback = 0) {
  const parsed = parseNumber(value, fallback);
  return Number.isFinite(parsed) ? Math.floor(parsed) : fallback;
}

function parseRate(value, fallback = 0) {
  const text = String(value || '').replace(/,/g, '').trim();
  if (!text) return fallback;
  if (text.endsWith('%')) return parseNumber(text.slice(0, -1), 0) / 100;
  const parsed = parseNumber(text, fallback);
  return parsed > 1 ? parsed / 100 : parsed;
}

function headerMapFromRow(row) {
  const map = new Map();
  row.forEach((cell, index) => {
    const key = String(cell || '').trim();
    if (key && !map.has(key)) map.set(key, index);
  });
  return map;
}

function findHeaderIndex(rows, requiredKeys) {
  return rows.findIndex((row) => {
    const map = headerMapFromRow(row);
    return requiredKeys.every((key) => map.has(key));
  });
}

function cell(row, headerMap, keys, fallbackIndex = -1) {
  const list = Array.isArray(keys) ? keys : [keys];
  for (const key of list) {
    if (headerMap.has(key)) return row[headerMap.get(key)];
  }
  return fallbackIndex >= 0 ? row[fallbackIndex] : '';
}

function firstCell(row, headerMap, keys, fallback = '') {
  const value = cell(row, headerMap, keys);
  return value === undefined || value === null || value === '' ? fallback : value;
}

function normalizeId(value) {
  return String(value || '').trim();
}

function normalizePositionKey(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return '';
  if (['front', '\uC804\uC5F4'].includes(text)) return 'front';
  if (['middle', 'mid', '\uC911\uC5F4'].includes(text)) return 'middle';
  if (['back', 'rear', '\uD6C4\uC5F4'].includes(text)) return 'back';
  return text;
}

function parseExportObject(row, headerMap, sheetName, rowNumber) {
  const raw = firstCell(row, headerMap, ['export_json', 'exportJson']);
  if (!raw) return null;
  const text = String(raw || '').trim();
  if (!/^[{\[]/.test(text)) return null;
  const parsed = parseJsonCell(raw, null);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    console.warn(`[combat export warning] ${sheetName} row ${rowNumber}: explicit JSON parse failed; using column fallback.`);
    return null;
  }
  return parsed;
}

function rowsToObjects(rows, requiredKeys) {
  const headerIndex = Math.max(0, findHeaderIndex(rows, requiredKeys));
  const header = rows[headerIndex] || [];
  const headerMap = headerMapFromRow(header);
  const dataRows = rows.slice(headerIndex + 1);
  return { headerMap, dataRows };
}

function normalizeMercenaryRow(row, headerMap = new Map()) {
  const id = String(cell(row, headerMap, 'id', 1) || '').trim();
  const grade = String(cell(row, headerMap, ['grade', '\uB4F1\uAE09'], 2) || '').trim();
  const species = String(cell(row, headerMap, ['species', '\uC885\uC871'], 4) || '').trim();
  const sheetImageKey = String(cell(row, headerMap, ['imageKey', '\uACF5\uC6A9 \uC77C\uB7EC \uD0A4'], 9) || cell(row, headerMap, ['illustrationFileName', '\uC77C\uB7EC \uD30C\uC77C\uBA85'], 22) || '')
    .replace(/\.png$/i, '')
    .trim();
  const combatRole = String(cell(row, headerMap, 'combat_role', 13) || '').trim();
  const recommendedSlot = String(cell(row, headerMap, 'recommended_slot', 14) || '').trim();
  const basicAttackId = String(cell(row, headerMap, 'basic_attack_id', 15) || '').trim();
  const attackType = String(cell(row, headerMap, 'attack_type', 16) || '').trim();
  const missionTags = parseTags(cell(row, headerMap, 'mission_tags', 41));
  const adminPower = parseNumber(cell(row, headerMap, 'admin_power', 43), 0);
  const adminTags = parseTags(cell(row, headerMap, 'admin_tags', 44));
  const formationTags = parseTags(cell(row, headerMap, 'formation_tags', 45));
  const attackFormulaHint = String(cell(row, headerMap, 'attack_formula_hint', 46) || '').trim();

  return {
    id,
    grade,
    name: String(cell(row, headerMap, ['name', '\uC774\uB984'], 3) || '').trim(),
    species,
    job: String(cell(row, headerMap, ['job', '\uC9C1\uAD70'], 5) || '').trim(),
    role: String(cell(row, headerMap, ['role', '\uC5ED\uD560'], 6) || '').trim(),
    position: String(cell(row, headerMap, ['position', '\uC804\uD22C \uD3EC\uC9C0\uC158'], 7) || '').trim(),
    tags: parseTags(cell(row, headerMap, ['tags', '\uD0DC\uADF8'], 8)),
    imageKey: getImageKey({ id, grade, species, sheetImageKey }),
    dedicatedIllustration: parseBoolean(cell(row, headerMap, ['dedicatedIllustration', '\uC804\uC6A9 \uC77C\uB7EC \uC5EC\uBD80'], 10)),
    obtainMethod: String(cell(row, headerMap, ['obtainMethod', '\uD68D\uB4DD \uBC29\uC2DD'], 11) || '').trim(),
    memo: String(cell(row, headerMap, ['memo', '\uBA54\uBAA8'], 12) || '').trim(),
    combatSkill: attackFormulaHint || attackType || basicAttackId,
    missionBonus: missionTags.length ? missionTags.join(', ') : '',
    adminBonus: adminPower || adminTags.length ? `${adminPower ? `admin ${adminPower}` : ''}${adminTags.length ? ` ${adminTags.join(', ')}` : ''}`.trim() : '',
    commandBonus: formationTags.join(', '),
    illustrationStatus: String(cell(row, headerMap, ['illustrationStatus', '\uC77C\uB7EC \uC0DD\uC131 \uC0C1\uD0DC'], 21) || '').trim(),
    illustrationFileName: String(cell(row, headerMap, ['illustrationFileName', '\uC77C\uB7EC \uD30C\uC77C\uBA85'], 22) || '').trim(),
    reviewStatus: String(cell(row, headerMap, ['reviewStatus', '\uAC80\uC218 \uC0C1\uD0DC'], 25) || '').trim(),
    needsRegeneration: parseBoolean(cell(row, headerMap, ['needsRegeneration', '\uC7AC\uC0DD\uC131 \uD544\uC694'], 26)),
    extraNote: String(cell(row, headerMap, ['extraNote', '\uAE30\uD0C0'], 27) || '').trim(),
    baseStats: {
      hp: parseNumber(cell(row, headerMap, '\uAE30\uC900 HP', 28)),
      atk: parseNumber(cell(row, headerMap, '\uAE30\uC900 ATK', 29)),
      def: parseNumber(cell(row, headerMap, '\uAE30\uC900 DEF', 30)),
      spd: parseNumber(cell(row, headerMap, '\uAE30\uC900 SPD', 31)),
      tec: parseNumber(cell(row, headerMap, '\uAE30\uC900 TEC', 32)),
      sup: parseNumber(cell(row, headerMap, '\uAE30\uC900 SUP', 33))
    },
    baseCombatPower: parseNumber(cell(row, headerMap, '\uAE30\uC900 \uC804\uD22C\uB825', 34)),
    maxLevel: parseNumber(cell(row, headerMap, '\uCD5C\uB300 \uB808\uBCA8', 35), null),
    combatRole,
    recommendedSlot,
    basicAttackId,
    attackType,
    combatTags: parseTags(cell(row, headerMap, 'combat_tags', 36)),
    evasionRate: parseRate(cell(row, headerMap, 'evasion_rate', 37)),
    accuracyRate: parseRate(cell(row, headerMap, 'accuracy_rate', 38)),
    critRate: parseRate(cell(row, headerMap, 'crit_rate', 39)),
    healPower: parseNumber(cell(row, headerMap, 'heal_power', 40)),
    missionTags,
    missionWeakTags: parseTags(cell(row, headerMap, 'mission_weak_tags', 42)),
    adminPower,
    adminTags,
    formationTags,
    attackFormulaHint,
    activeSkillId: String(cell(row, headerMap, 'active_skill_id', 47) || '').trim(),
    passiveSkillId: String(cell(row, headerMap, 'passive_skill_id', 48) || '').trim(),
    skillTags: parseTags(cell(row, headerMap, 'skill_tags', 49))
  };
}

function normalizeAttackTypeRow(row, headerMap) {
  const basicAttackId = String(cell(row, headerMap, 'basic_attack_id') || '').trim();
  return {
    basicAttackId,
    basic_attack_id: basicAttackId,
    attackType: String(cell(row, headerMap, 'attack_type') || '').trim(),
    attack_type: String(cell(row, headerMap, 'attack_type') || '').trim(),
    displayName: String(cell(row, headerMap, 'display_name') || '').trim(),
    display_name: String(cell(row, headerMap, 'display_name') || '').trim(),
    damageType: String(cell(row, headerMap, 'damage_type') || '').trim(),
    formulaHint: String(cell(row, headerMap, 'formula_hint') || '').trim(),
    description: String(cell(row, headerMap, 'description') || '').trim(),
    defaultTags: parseTags(cell(row, headerMap, 'default_tags')),
    useInCombat: parseBoolean(cell(row, headerMap, 'use_in_combat'))
  };
}

function normalizeSkillRow(row, headerMap) {
  const skillId = String(cell(row, headerMap, 'skill_id') || '').trim();
  const statusId = String(cell(row, headerMap, 'status_id') || '').trim();
  return {
    skillId,
    skill_id: skillId,
    skillType: String(cell(row, headerMap, 'skill_type') || '').trim(),
    skill_type: String(cell(row, headerMap, 'skill_type') || '').trim(),
    displayName: String(cell(row, headerMap, 'display_name') || '').trim(),
    display_name: String(cell(row, headerMap, 'display_name') || '').trim(),
    trigger: String(cell(row, headerMap, 'trigger') || '').trim(),
    cooldown: parseNumber(cell(row, headerMap, 'cooldown'), 0),
    targetRule: String(cell(row, headerMap, 'target_rule') || '').trim(),
    effectType: String(cell(row, headerMap, 'effect_type') || '').trim(),
    powerScale: String(cell(row, headerMap, 'power_scale') || '').trim(),
    duration: String(cell(row, headerMap, 'duration') || '').trim(),
    condition: String(cell(row, headerMap, 'condition') || '').trim(),
    statusId,
    status_id: statusId,
    logTemplate: String(cell(row, headerMap, 'log_template') || '').trim(),
    useInCombat: parseBoolean(cell(row, headerMap, 'use_in_combat')),
    notes: String(cell(row, headerMap, 'notes') || '').trim(),
    statusChance: parseRate(cell(row, headerMap, 'status_chance'), 0),
    statusDuration: parseNumber(cell(row, headerMap, 'status_duration'), 0),
    statusPower: parseNumber(cell(row, headerMap, 'status_power'), 0)
  };
}

function normalizeStatusEffectRow(row, headerMap) {
  const statusId = String(cell(row, headerMap, 'status_id') || '').trim();
  return {
    statusId,
    status_id: statusId,
    statusType: String(cell(row, headerMap, 'status_type') || '').trim(),
    status_type: String(cell(row, headerMap, 'status_type') || '').trim(),
    displayName: String(cell(row, headerMap, 'display_name') || '').trim(),
    display_name: String(cell(row, headerMap, 'display_name') || '').trim(),
    iconKey: String(cell(row, headerMap, 'icon_key') || '').trim(),
    targetSide: String(cell(row, headerMap, 'target_side') || '').trim(),
    statModifier: String(cell(row, headerMap, 'stat_modifier') || '').trim(),
    dotFormula: String(cell(row, headerMap, 'dot_formula') || '').trim(),
    controlEffect: String(cell(row, headerMap, 'control_effect') || '').trim(),
    durationDefault: parseNumber(cell(row, headerMap, 'duration_default'), 0),
    stackRule: String(cell(row, headerMap, 'stack_rule') || '').trim(),
    maxStack: parseNumber(cell(row, headerMap, 'max_stack'), 0),
    dispelRule: String(cell(row, headerMap, 'dispel_rule') || '').trim(),
    resistanceTag: String(cell(row, headerMap, 'resistance_tag') || '').trim(),
    logApply: String(cell(row, headerMap, 'log_apply') || '').trim(),
    logTick: String(cell(row, headerMap, 'log_tick') || '').trim(),
    useInCombat: parseBoolean(cell(row, headerMap, 'use_in_combat')),
    notes: String(cell(row, headerMap, 'notes') || '').trim()
  };
}

function normalizeCombatMissionRow(row, headerMap, rowNumber) {
  const exported = parseExportObject(row, headerMap, SHEET_NAMES.combatMissions, rowNumber);
  if (exported) {
    const id = normalizeId(exported.id || exported.missionId || exported.operationId || exported.export_id);
    return {
      ...exported,
      id,
      missionId: normalizeId(exported.missionId || id),
      operationId: normalizeId(exported.operationId || id),
      enabled: exported.enabled !== false,
      recommendedPower: parseInteger(exported.recommendedPower, 0),
      minPartySize: parseInteger(exported.minPartySize, 1),
      maxPartySize: parseInteger(exported.maxPartySize, 5),
      durationSec: parseInteger(exported.durationSec, 0),
      enemyPreviewCount: parseInteger(exported.enemyPreviewCount, 0),
      repeatable: exported.repeatable !== false
    };
  }
  const missionId = normalizeId(firstCell(row, headerMap, ['mission_id', 'export_id']));
  return {
    id: missionId,
    missionId,
    operationId: missionId,
    enabled: parseBoolean(firstCell(row, headerMap, ['사용 여부', 'enabled'], 'true')),
    title: String(firstCell(row, headerMap, ['의뢰명', 'title'])).trim(),
    description: String(firstCell(row, headerMap, ['설명', 'description'])).trim(),
    danger: String(firstCell(row, headerMap, ['위험도', 'danger'])).trim(),
    requiredOfficeLevel: parseInteger(firstCell(row, headerMap, ['필요 사무소 Lv', 'requiredOfficeLevel']), 1),
    recommendedPower: parseInteger(firstCell(row, headerMap, ['권장 전투력', 'recommendedPower']), 0),
    minPartySize: parseInteger(firstCell(row, headerMap, ['최소 인원', 'minPartySize']), 1),
    maxPartySize: parseInteger(firstCell(row, headerMap, ['최대 인원', 'maxPartySize']), 5),
    durationSec: parseInteger(firstCell(row, headerMap, ['소요 시간(초)', 'durationSec']), 0),
    encounterId: normalizeId(firstCell(row, headerMap, ['encounter_id', 'encounterId'])),
    rewardGroupId: normalizeId(firstCell(row, headerMap, ['reward_group_id', 'rewardGroupId'])),
    injuryRiskPercent: parseRate(firstCell(row, headerMap, ['부상 위험(%)', 'injuryRiskPercent']), 0) * 100,
    primaryStats: parseTags(firstCell(row, headerMap, ['주요 스탯', 'primaryStats'])),
    recommendedTags: parseTags(firstCell(row, headerMap, ['추천 태그', 'recommendedTags'])),
    recommendedPositions: parseTags(firstCell(row, headerMap, ['추천 포지션', 'recommendedPositions'])),
    unlockCondition: String(firstCell(row, headerMap, ['해금 조건', 'unlockCondition'])).trim(),
    displayText: String(firstCell(row, headerMap, ['표시 문구', 'displayText'])).trim(),
    successText: String(firstCell(row, headerMap, ['성공 문구', 'successText'])).trim(),
    failureText: String(firstCell(row, headerMap, ['실패 문구', 'failureText'])).trim(),
    combatUiType: String(firstCell(row, headerMap, ['전투 UI 타입', 'combatUiType'])).trim(),
    cardIconKey: String(firstCell(row, headerMap, ['카드 아이콘 key', 'cardIconKey'])).trim(),
    battlefieldPreviewKey: String(firstCell(row, headerMap, ['전장 미리보기 key', 'battlefieldPreviewKey'])).trim(),
    enemyPreviewCount: parseInteger(firstCell(row, headerMap, ['적 미리보기 수', 'enemyPreviewCount']), 0),
    order: parseInteger(firstCell(row, headerMap, ['정렬 우선순위', 'order']), 0),
    releaseStage: String(firstCell(row, headerMap, ['출시 단계', 'releaseStage'])).trim(),
    repeatable: parseBoolean(firstCell(row, headerMap, ['repeatable'], 'true')),
    injuryProfile: String(firstCell(row, headerMap, ['injury_profile', 'injuryProfile'])).trim(),
    sourceStatus: String(firstCell(row, headerMap, ['source_status', 'sourceStatus'])).trim()
  };
}

function normalizeEnemyTemplateRow(row, headerMap, rowNumber) {
  const exported = parseExportObject(row, headerMap, SHEET_NAMES.enemyTemplates, rowNumber);
  if (exported) {
    const id = normalizeId(exported.id || exported.enemyId || exported.export_id);
    return {
      ...exported,
      id,
      enemyId: normalizeId(exported.enemyId || id),
      enabled: exported.enabled !== false,
      positionKey: normalizePositionKey(exported.positionKey || exported.position),
      baseStats: {
        hp: parseNumber(exported.baseStats?.hp ?? exported.hp),
        atk: parseNumber(exported.baseStats?.atk ?? exported.atk),
        def: parseNumber(exported.baseStats?.def ?? exported.def),
        spd: parseNumber(exported.baseStats?.spd ?? exported.spd),
        tec: parseNumber(exported.baseStats?.tec ?? exported.tec),
        sup: parseNumber(exported.baseStats?.sup ?? exported.sup)
      },
      battleScale: parseNumber(exported.battleScale, 1),
      anchor: {
        x: parseNumber(exported.anchor?.x, 0.5),
        y: parseNumber(exported.anchor?.y, 0.92)
      }
    };
  }
  const enemyId = normalizeId(firstCell(row, headerMap, ['enemy_id', 'export_id']));
  return {
    id: enemyId,
    enemyId,
    enabled: parseBoolean(firstCell(row, headerMap, ['사용 여부', 'enabled'], 'true')),
    name: String(firstCell(row, headerMap, ['적 이름', 'name'])).trim(),
    grade: String(firstCell(row, headerMap, ['등급', 'grade'])).trim(),
    role: String(firstCell(row, headerMap, ['역할', 'role'])).trim(),
    position: String(firstCell(row, headerMap, ['전투 포지션', 'position'])).trim(),
    positionKey: normalizePositionKey(firstCell(row, headerMap, ['position_key', 'positionKey', '전투 포지션'])),
    typeKey: normalizeId(firstCell(row, headerMap, ['enemy_type_key', 'typeKey'])),
    tags: parseTags(firstCell(row, headerMap, ['태그', 'tags'])),
    baseStats: {
      hp: parseNumber(firstCell(row, headerMap, ['HP'])),
      atk: parseNumber(firstCell(row, headerMap, ['ATK'])),
      def: parseNumber(firstCell(row, headerMap, ['DEF'])),
      spd: parseNumber(firstCell(row, headerMap, ['SPD'])),
      tec: parseNumber(firstCell(row, headerMap, ['TEC'])),
      sup: parseNumber(firstCell(row, headerMap, ['SUP']))
    },
    skillId: normalizeId(firstCell(row, headerMap, ['기본 스킬', 'skillId'])),
    actionSkillId: normalizeId(firstCell(row, headerMap, ['action_skill_id', 'actionSkillId'])),
    basicAttackId: normalizeId(firstCell(row, headerMap, ['basic_attack_id', 'basicAttackId'])),
    aiType: normalizeId(firstCell(row, headerMap, ['ai_type', 'aiType'])),
    description: String(firstCell(row, headerMap, ['설명', 'description'])).trim(),
    imageKey: normalizeId(firstCell(row, headerMap, ['image_key', 'imageKey'])),
    imagePath: String(firstCell(row, headerMap, ['image_path', 'imagePath'])).trim(),
    battleScale: parseNumber(firstCell(row, headerMap, ['battle_scale', 'battleScale']), 1),
    anchor: {
      x: parseNumber(firstCell(row, headerMap, ['anchor_x'], 0.5), 0.5),
      y: parseNumber(firstCell(row, headerMap, ['anchor_y'], 0.92), 0.92)
    },
    shadowType: String(firstCell(row, headerMap, ['shadow_type', 'shadowType'])).trim(),
    hitEffect: String(firstCell(row, headerMap, ['hit_effect', 'hitEffect'])).trim(),
    deathEffect: String(firstCell(row, headerMap, ['death_effect', 'deathEffect'])).trim(),
    exportStatus: String(firstCell(row, headerMap, ['export_status', 'exportStatus'])).trim()
  };
}

function normalizeEncounterRow(row, headerMap, rowNumber) {
  const exported = parseExportObject(row, headerMap, SHEET_NAMES.encounters, rowNumber);
  if (exported) {
    const id = normalizeId(exported.id || exported.encounterId || exported.export_id);
    return {
      ...exported,
      id,
      encounterId: normalizeId(exported.encounterId || id),
      enabled: exported.enabled !== false,
      enemyLevel: parseInteger(exported.enemyLevel, 1),
      parsedEnemyCount: parseInteger(exported.parsedEnemyCount, 0)
    };
  }
  const encounterId = normalizeId(firstCell(row, headerMap, ['encounter_id']));
  return {
    id: encounterId,
    encounterId,
    enabled: parseBoolean(firstCell(row, headerMap, ['사용 여부', 'enabled'], 'true')),
    title: String(firstCell(row, headerMap, ['전투명', 'title'])).trim(),
    danger: String(firstCell(row, headerMap, ['위험도', 'danger'])).trim(),
    enemyComposition: String(firstCell(row, headerMap, ['적 구성', 'enemyComposition'])).trim(),
    enemyLevel: parseInteger(firstCell(row, headerMap, ['enemy_level', 'enemyLevel']), 1),
    battleRuleId: normalizeId(firstCell(row, headerMap, ['battle_rule_id', 'battleRuleId'])),
    recommendedTags: parseTags(firstCell(row, headerMap, ['권장 대응 태그', 'recommendedTags'])),
    rewardGroupId: normalizeId(firstCell(row, headerMap, ['reward_group_id', 'rewardGroupId'])),
    backgroundLabel: String(firstCell(row, headerMap, ['배경', 'backgroundLabel'])).trim(),
    introText: String(firstCell(row, headerMap, ['전투 도입 문구', 'introText'])).trim(),
    victoryText: String(firstCell(row, headerMap, ['승리 문구', 'victoryText'])).trim(),
    defeatText: String(firstCell(row, headerMap, ['패배 문구', 'defeatText'])).trim(),
    backgroundKey: normalizeId(firstCell(row, headerMap, ['background_key', 'backgroundKey'])),
    backgroundPath: String(firstCell(row, headerMap, ['background_path', 'backgroundPath'])).trim(),
    battleBgmKey: normalizeId(firstCell(row, headerMap, ['battle_bgm_key', 'battleBgmKey'])),
    stageTint: String(firstCell(row, headerMap, ['stage_tint', 'stageTint'])).trim(),
    weatherEffect: String(firstCell(row, headerMap, ['weather_effect', 'weatherEffect'])).trim(),
    cameraLayout: String(firstCell(row, headerMap, ['camera_layout', 'cameraLayout'])).trim(),
    parsedEnemyCount: parseInteger(firstCell(row, headerMap, ['parsed_enemy_count', 'parsedEnemyCount']), 0),
    normalizedSheet: String(firstCell(row, headerMap, ['normalized_sheet', 'normalizedSheet'])).trim(),
    exportStatus: String(firstCell(row, headerMap, ['export_status', 'exportStatus'])).trim()
  };
}

function normalizeEncounterEnemyRow(row, headerMap, rowNumber) {
  const exported = parseExportObject(row, headerMap, SHEET_NAMES.encounterEnemies, rowNumber);
  if (exported) {
    return {
      ...exported,
      encounterId: normalizeId(exported.encounterId),
      enabled: exported.enabled !== false,
      slot: normalizeId(exported.slot || exported.enemySlot),
      order: parseInteger(exported.order, 0),
      enemyId: normalizeId(exported.enemyId),
      count: Math.max(1, parseInteger(exported.count ?? exported.enemyCount, 1)),
      enemyLevel: parseInteger(exported.enemyLevel, 1),
      positionKey: normalizePositionKey(exported.positionKey),
      isBoss: Boolean(exported.isBoss)
    };
  }
  return {
    encounterId: normalizeId(firstCell(row, headerMap, ['encounter_id', 'encounterId'])),
    enabled: parseBoolean(firstCell(row, headerMap, ['사용 여부', 'enabled'], 'true')),
    slot: normalizeId(firstCell(row, headerMap, ['enemy_slot', 'slot'])),
    order: parseInteger(firstCell(row, headerMap, ['enemy_order', 'order']), 0),
    enemyId: normalizeId(firstCell(row, headerMap, ['enemy_id', 'enemyId'])),
    count: Math.max(1, parseInteger(firstCell(row, headerMap, ['enemy_count', 'count']), 1)),
    enemyLevel: parseInteger(firstCell(row, headerMap, ['enemy_level', 'enemyLevel']), 1),
    positionKey: normalizePositionKey(firstCell(row, headerMap, ['position_key', 'positionKey'])),
    role: String(firstCell(row, headerMap, ['enemy_role', 'role'])).trim(),
    grade: String(firstCell(row, headerMap, ['enemy_grade', 'grade'])).trim(),
    roleModifierKey: normalizeId(firstCell(row, headerMap, ['role_modifier_key', 'roleModifierKey'])),
    spawnGroup: normalizeId(firstCell(row, headerMap, ['spawn_group', 'spawnGroup'])),
    isBoss: parseBoolean(firstCell(row, headerMap, ['is_boss', 'isBoss'])),
    rewardGroupId: normalizeId(firstCell(row, headerMap, ['reward_group_id', 'rewardGroupId'])),
    battleRuleId: normalizeId(firstCell(row, headerMap, ['battle_rule_id', 'battleRuleId'])),
    backgroundKey: normalizeId(firstCell(row, headerMap, ['background_key', 'backgroundKey'])),
    notes: String(firstCell(row, headerMap, ['notes'])).trim()
  };
}

function normalizeCombatRewardRow(row, headerMap, rowNumber) {
  const exported = parseExportObject(row, headerMap, SHEET_NAMES.combatRewards, rowNumber);
  if (exported) {
    const equipmentItemId = normalizeId(exported.equipmentItemId || exported.equipment_item_id);
    const materialItemId = normalizeId(exported.materialItemId || exported.material_item_id);
    const itemId = normalizeId(exported.itemId || exported.item_id || equipmentItemId || materialItemId);
    const weight = parseNumber(exported.weight, 0);
    return {
      ...exported,
      rewardGroupId: normalizeId(exported.rewardGroupId),
      rewardType: normalizeId(exported.rewardType),
      weight,
      dropRate: parseNumber(exported.dropRate ?? exported.drop_rate ?? weight, weight),
      gold: parseInteger(exported.gold, 0),
      officeExp: parseInteger(exported.officeExp, 0),
      mercExp: parseInteger(exported.mercExp ?? exported.mercenaryExp, 0),
      itemId,
      equipmentItemId,
      materialItemId,
      enabled: exported.enabled !== false
    };
  }
  const weight = parseNumber(firstCell(row, headerMap, ['가중치', 'weight']), 0);
  const equipmentItemId = normalizeId(firstCell(row, headerMap, ['장비 item_id', 'equipmentItemId', 'equipment_item_id']));
  const materialItemId = normalizeId(firstCell(row, headerMap, ['재료 item_id', 'materialItemId', 'material_item_id']));
  const itemId = normalizeId(firstCell(row, headerMap, ['item_id', 'itemId'], equipmentItemId || materialItemId));
  return {
    rewardGroupId: normalizeId(firstCell(row, headerMap, ['reward_group_id', 'rewardGroupId'])),
    rewardType: normalizeId(firstCell(row, headerMap, ['reward_type', 'rewardType'])),
    weight,
    dropRate: parseNumber(firstCell(row, headerMap, ['dropRate', 'drop_rate'], weight), weight),
    gold: parseInteger(firstCell(row, headerMap, ['골드', 'gold']), 0),
    officeExp: parseInteger(firstCell(row, headerMap, ['사무소 EXP', 'officeExp']), 0),
    mercExp: parseInteger(firstCell(row, headerMap, ['용병 EXP', 'mercExp', 'mercenaryExp']), 0),
    itemId,
    equipmentItemId,
    materialItemId,
    rumorSeedId: normalizeId(firstCell(row, headerMap, ['소문 seed_id', 'rumorSeedId'])),
    caseId: normalizeId(firstCell(row, headerMap, ['사건 case_id', 'caseId'])),
    resultText: String(firstCell(row, headerMap, ['결과 문구', 'resultText'])).trim(),
    notes: String(firstCell(row, headerMap, ['비고', 'notes'])).trim(),
    iconKey: normalizeId(firstCell(row, headerMap, ['reward_icon_key', 'iconKey'])),
    systemRequirement: normalizeId(firstCell(row, headerMap, ['시스템 요구', 'systemRequirement'])),
    enabled: parseBoolean(firstCell(row, headerMap, ['활성 상태', 'enabled'], 'true'))
  };
}

function parseOptionalExportJson(row, headerMap) {
  const text = String(firstCell(row, headerMap, ['export_json', 'exportJson']) || '').trim();
  if (!text || text === '{}') return {};
  if (!/^[{\[]/.test(text)) return {};
  const parsed = parseJsonCell(text, null);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
}

function normalizeCombatStageRow(row, headerMap, rowNumber) {
  const stageId = normalizeId(firstCell(row, headerMap, ['stage_id', 'stageId']));
  const exported = parseOptionalExportJson(row, headerMap);
  const stage = {
    id: stageId,
    stageId,
    enabled: parseBoolean(firstCell(row, headerMap, ['\uC0AC\uC6A9 \uC5EC\uBD80', 'enabled'], 'true')),
    generatedMissionId: normalizeId(firstCell(row, headerMap, ['generated_mission_id', 'generatedMissionId'])),
    baseMissionId: normalizeId(firstCell(row, headerMap, ['base_mission_id', 'baseMissionId'])),
    stageNumber: String(firstCell(row, headerMap, ['\uC2A4\uD14C\uC774\uC9C0 \uBC88\uD638', 'stage_number', 'stageNumber']) || '').trim(),
    title: String(firstCell(row, headerMap, ['\uC2A4\uD14C\uC774\uC9C0\uBA85', 'stage_name', 'title'])).trim(),
    difficultyTier: String(firstCell(row, headerMap, ['\uB09C\uC774\uB3C4 \uD2F0\uC5B4', 'difficulty_tier', 'difficultyTier'])).trim(),
    requiredOfficeLevel: parseInteger(firstCell(row, headerMap, ['\uD544\uC694 \uC0AC\uBB34\uC18C Lv', 'requiredOfficeLevel']), 1),
    recommendedPower: parseInteger(firstCell(row, headerMap, ['\uAD8C\uC7A5 \uC804\uD22C\uB825', 'recommendedPower']), 0),
    baseEncounterId: normalizeId(firstCell(row, headerMap, ['base_encounter_id', 'baseEncounterId'])),
    generatedEncounterId: normalizeId(firstCell(row, headerMap, ['generated_encounter_id', 'generatedEncounterId'])),
    baseRewardGroupId: normalizeId(firstCell(row, headerMap, ['base_reward_group_id', 'baseRewardGroupId'])),
    generatedRewardGroupId: normalizeId(firstCell(row, headerMap, ['generated_reward_group_id', 'generatedRewardGroupId'])),
    enemyLevelBonus: parseInteger(firstCell(row, headerMap, ['enemy_level_bonus', 'enemyLevelBonus']), 0),
    enemyHpMultiplier: parseNumber(firstCell(row, headerMap, ['enemy_hp_multiplier', 'enemyHpMultiplier']), 1),
    enemyAtkMultiplier: parseNumber(firstCell(row, headerMap, ['enemy_atk_multiplier', 'enemyAtkMultiplier']), 1),
    enemyDefMultiplier: parseNumber(firstCell(row, headerMap, ['enemy_def_multiplier', 'enemyDefMultiplier']), 1),
    enemySpdMultiplier: parseNumber(firstCell(row, headerMap, ['enemy_spd_multiplier', 'enemySpdMultiplier']), 1),
    enemyTecMultiplier: parseNumber(firstCell(row, headerMap, ['enemy_tec_multiplier', 'enemyTecMultiplier']), 1),
    enemySupMultiplier: parseNumber(firstCell(row, headerMap, ['enemy_sup_multiplier', 'enemySupMultiplier']), 1),
    enemyCountBonus: parseInteger(firstCell(row, headerMap, ['enemy_count_bonus', 'enemyCountBonus']), 0),
    bossEnemyId: normalizeId(firstCell(row, headerMap, ['boss_enemy_id', 'bossEnemyId'])),
    bossCount: parseInteger(firstCell(row, headerMap, ['boss_count', 'bossCount']), 0),
    goldMultiplier: parseNumber(firstCell(row, headerMap, ['gold_multiplier', 'goldMultiplier']), 1),
    officeExpMultiplier: parseNumber(firstCell(row, headerMap, ['office_exp_multiplier', 'officeExpMultiplier']), 1),
    mercenaryExpMultiplier: parseNumber(firstCell(row, headerMap, ['mercenary_exp_multiplier', 'mercenaryExpMultiplier']), 1),
    dropRateMultiplier: parseNumber(firstCell(row, headerMap, ['drop_rate_multiplier', 'dropRateMultiplier']), 1),
    injuryRiskMultiplier: parseNumber(firstCell(row, headerMap, ['\uBD80\uC0C1 \uC704\uD5D8 \uBC30\uC728', 'injuryRiskMultiplier']), 1),
    unlockCondition: String(firstCell(row, headerMap, ['\uD574\uAE08 \uC870\uAC74', 'unlockCondition'])).trim(),
    displayText: String(firstCell(row, headerMap, ['\uD45C\uC2DC \uBB38\uAD6C', 'displayText'])).trim(),
    notes: String(firstCell(row, headerMap, ['\uBE44\uACE0', 'notes'])).trim(),
    sourceRow: rowNumber
  };
  return {
    ...stage,
    ...exported,
    id: exported.id || stage.id,
    stageId: exported.stageId || stage.stageId,
    generatedMissionId: normalizeId(exported.generatedMissionId || stage.generatedMissionId),
    generatedEncounterId: normalizeId(exported.generatedEncounterId || stage.generatedEncounterId),
    generatedRewardGroupId: normalizeId(exported.generatedRewardGroupId || stage.generatedRewardGroupId)
  };
}

function buildStageModifier(stage) {
  return {
    stageId: stage.stageId,
    enemyLevelBonus: stage.enemyLevelBonus,
    hpMultiplier: stage.enemyHpMultiplier,
    atkMultiplier: stage.enemyAtkMultiplier,
    defMultiplier: stage.enemyDefMultiplier,
    spdMultiplier: stage.enemySpdMultiplier,
    tecMultiplier: stage.enemyTecMultiplier,
    supMultiplier: stage.enemySupMultiplier
  };
}

function multiplyInteger(value, multiplier) {
  const base = Number(value || 0) || 0;
  const factor = Number(multiplier || 1) || 1;
  return Math.max(0, Math.round(base * factor));
}

function inferEquipmentRewardGrade(reward = {}) {
  const text = String(reward.itemId || reward.equipmentItemId || '').toLowerCase();
  if (text.startsWith('eq_ex_')) return 'EX';
  if (text.startsWith('eq_ssr_')) return 'SSR';
  if (text.startsWith('eq_sr_')) return 'SR';
  if (text.startsWith('eq_r_')) return 'R';
  if (text.startsWith('eq_n_')) return 'N';
  return '';
}

function clampEquipmentDropRate(reward, dropRate) {
  const rewardType = String(reward?.rewardType || '').toLowerCase();
  if (rewardType !== 'equipment') return dropRate;
  const grade = inferEquipmentRewardGrade(reward);
  if (grade === 'N') return Math.min(dropRate, 25);
  if (grade === 'R') return Math.min(dropRate, 18);
  if (grade === 'SR') return Math.min(dropRate, 3);
  if (grade === 'SSR' || grade === 'EX') return 0;
  return dropRate;
}

function deriveCombatStageExports({ stages, combatMissions, encounters, encounterEnemies, combatRewards }) {
  const missionById = new Map(combatMissions.map((item) => [item.missionId, item]));
  const encounterById = new Map(encounters.map((item) => [item.encounterId, item]));
  const enemiesByEncounterId = new Map();
  encounterEnemies.forEach((row) => {
    const key = row.encounterId;
    if (!enemiesByEncounterId.has(key)) enemiesByEncounterId.set(key, []);
    enemiesByEncounterId.get(key).push(row);
  });
  const rewardsByGroupId = new Map();
  combatRewards.forEach((row) => {
    const key = row.rewardGroupId;
    if (!rewardsByGroupId.has(key)) rewardsByGroupId.set(key, []);
    rewardsByGroupId.get(key).push(row);
  });

  const derived = { missions: [], encounters: [], encounterEnemies: [], rewards: [], warnings: [] };
  stages.filter((stage) => stage.enabled !== false).forEach((stage) => {
    const baseMission = missionById.get(stage.baseMissionId);
    const baseEncounter = encounterById.get(stage.baseEncounterId);
    const baseEnemyRows = enemiesByEncounterId.get(stage.baseEncounterId) || [];
    const baseRewardRows = rewardsByGroupId.get(stage.baseRewardGroupId) || [];
    if (!baseMission) {
      derived.warnings.push(`stage ${stage.stageId}: missing base mission ${stage.baseMissionId}`);
      return;
    }
    if (!baseEncounter) {
      derived.warnings.push(`stage ${stage.stageId}: missing base encounter ${stage.baseEncounterId}`);
      return;
    }
    if (!baseEnemyRows.length) {
      derived.warnings.push(`stage ${stage.stageId}: missing base encounter enemies ${stage.baseEncounterId}`);
      return;
    }
    if (!baseRewardRows.length) {
      derived.warnings.push(`stage ${stage.stageId}: missing base reward group ${stage.baseRewardGroupId}`);
      return;
    }

    const stageNotes = [`derived from ${stage.baseMissionId}`, `stage ${stage.stageId}`, stage.notes].filter(Boolean).join(' | ');
    derived.missions.push({
      ...baseMission,
      id: stage.generatedMissionId,
      missionId: stage.generatedMissionId,
      operationId: stage.generatedMissionId,
      title: stage.title || baseMission.title,
      requiredOfficeLevel: stage.requiredOfficeLevel,
      recommendedPower: stage.recommendedPower,
      encounterId: stage.generatedEncounterId,
      rewardGroupId: stage.generatedRewardGroupId,
      injuryRiskPercent: Math.max(0, Math.round(Number(baseMission.injuryRiskPercent || 0) * Number(stage.injuryRiskMultiplier || 1))),
      unlockCondition: stage.unlockCondition,
      displayText: stage.displayText || baseMission.displayText,
      sourceStatus: 'stage_derived',
      isStageMission: true,
      baseMissionId: stage.baseMissionId,
      stageId: stage.stageId,
      stageNumber: stage.stageNumber,
      stageTier: stage.difficultyTier,
      difficultyTier: stage.difficultyTier,
      generatedMissionId: stage.generatedMissionId,
      generatedEncounterId: stage.generatedEncounterId,
      generatedRewardGroupId: stage.generatedRewardGroupId,
      notes: stageNotes
    });

    const baseEnemyLevel = Number(baseEncounter.enemyLevel || 1) || 1;
    const stageModifier = buildStageModifier(stage);
    derived.encounters.push({
      ...baseEncounter,
      id: stage.generatedEncounterId,
      encounterId: stage.generatedEncounterId,
      title: stage.title || `${baseEncounter.title || stage.baseEncounterId} Stage ${stage.stageNumber}`,
      enemyLevel: Math.max(1, baseEnemyLevel + Number(stage.enemyLevelBonus || 0)),
      rewardGroupId: stage.generatedRewardGroupId,
      stageId: stage.stageId,
      baseEncounterId: stage.baseEncounterId,
      stageModifiers: stageModifier,
      exportStatus: 'stage_derived',
      notes: stageNotes
    });

    let maxOrder = 0;
    let maxEnemyLevel = 1;
    baseEnemyRows.forEach((row) => {
      const baseLevel = Number(row.enemyLevel || baseEncounter.enemyLevel || 1) || 1;
      const order = Number(row.order || 0) || 0;
      maxOrder = Math.max(maxOrder, order);
      maxEnemyLevel = Math.max(maxEnemyLevel, baseLevel);
      derived.encounterEnemies.push({
        ...row,
        encounterId: stage.generatedEncounterId,
        slot: `${row.slot || row.enemyId}_stage_${stage.stageNumber || stage.stageId}`,
        order,
        count: Math.max(1, Number(row.count || 1) + Number(stage.enemyCountBonus || 0)),
        enemyLevel: Math.max(1, baseLevel + Number(stage.enemyLevelBonus || 0)),
        rewardGroupId: stage.generatedRewardGroupId,
        stageId: stage.stageId,
        baseEncounterId: stage.baseEncounterId,
        stageModifiers: stageModifier,
        notes: [row.notes, stageNotes].filter(Boolean).join(' | ')
      });
    });

    if (stage.bossEnemyId && Number(stage.bossCount || 0) > 0) {
      derived.encounterEnemies.push({
        encounterId: stage.generatedEncounterId,
        enabled: true,
        slot: `boss_01_${stage.stageId}`,
        order: maxOrder + 10,
        enemyId: stage.bossEnemyId,
        count: Math.max(1, Number(stage.bossCount || 1) || 1),
        enemyLevel: Math.max(1, maxEnemyLevel + Number(stage.enemyLevelBonus || 0)),
        positionKey: 'front',
        role: 'boss',
        grade: '',
        roleModifierKey: 'boss',
        spawnGroup: 'boss',
        isBoss: true,
        rewardGroupId: stage.generatedRewardGroupId,
        battleRuleId: baseEnemyRows[0]?.battleRuleId || baseEncounter.battleRuleId || '',
        backgroundKey: baseEnemyRows[0]?.backgroundKey || baseEncounter.backgroundKey || '',
        stageId: stage.stageId,
        baseEncounterId: stage.baseEncounterId,
        stageModifiers: stageModifier,
        notes: stageNotes
      });
    }

    baseRewardRows.forEach((reward) => {
      const rewardType = String(reward.rewardType || '').toLowerCase();
      const isDrop = ['material', 'equipment', 'drop', 'case_clue', 'rumor_seed'].some((key) => rewardType.includes(key));
      const stageDropRate = isDrop
        ? clampEquipmentDropRate(reward, parseNumber(reward.dropRate ?? reward.weight, 0) * Number(stage.dropRateMultiplier || 1))
        : reward.dropRate;
      derived.rewards.push({
        ...reward,
        rewardGroupId: stage.generatedRewardGroupId,
        gold: multiplyInteger(reward.gold, stage.goldMultiplier),
        officeExp: multiplyInteger(reward.officeExp, stage.officeExpMultiplier),
        mercExp: multiplyInteger(reward.mercExp ?? reward.mercenaryExp, stage.mercenaryExpMultiplier),
        mercenaryExp: multiplyInteger(reward.mercenaryExp ?? reward.mercExp, stage.mercenaryExpMultiplier),
        weight: isDrop ? stageDropRate : reward.weight,
        dropRate: stageDropRate,
        amountMin: reward.amountMin !== undefined ? multiplyInteger(reward.amountMin, isDrop ? stage.dropRateMultiplier : 1) : reward.amountMin,
        amountMax: reward.amountMax !== undefined ? multiplyInteger(reward.amountMax, isDrop ? stage.dropRateMultiplier : 1) : reward.amountMax,
        stageId: stage.stageId,
        baseRewardGroupId: stage.baseRewardGroupId,
        notes: [reward.notes, stageNotes].filter(Boolean).join(' | ')
      });
    });
  });
  return derived;
}

function normalizeCombatRuleRow(row, headerMap, rowNumber) {
  const exported = parseExportObject(row, headerMap, SHEET_NAMES.combatRules, rowNumber);
  if (exported) return exported;
  const ruleId = normalizeId(firstCell(row, headerMap, ['battle_rule_id', 'rule_id', 'id']));
  return {
    id: ruleId,
    battleRuleId: ruleId,
    enabled: parseBoolean(firstCell(row, headerMap, ['사용 여부', 'enabled'], 'true')),
    name: String(firstCell(row, headerMap, ['규칙명', 'name'])).trim(),
    maxRounds: parseInteger(firstCell(row, headerMap, ['maxRounds', 'max_rounds']), 12),
    targetRule: normalizeId(firstCell(row, headerMap, ['targetRule', 'target_rule'])),
    speedRule: normalizeId(firstCell(row, headerMap, ['speedRule', 'speed_rule'])),
    logStyle: normalizeId(firstCell(row, headerMap, ['logStyle', 'log_style'])),
    formula: String(firstCell(row, headerMap, ['damage_formula', 'formula'])).trim()
  };
}

function normalizeCombatLogRow(row, headerMap, rowNumber) {
  const exported = parseExportObject(row, headerMap, SHEET_NAMES.combatLogs, rowNumber);
  if (exported) {
    const logGroupId = normalizeId(exported.logGroupId || exported.log_group_id);
    const logType = normalizeId(exported.logType || exported.log_type);
    const sourceRow = parseInteger(exported.sourceRow, rowNumber);
    return {
      ...exported,
      id: normalizeId(exported.id || `${logGroupId}__${logType}__${sourceRow}`),
      logId: normalizeId(exported.id || `${logGroupId}__${logType}__${sourceRow}`),
      logGroupId,
      logType,
      weight: parseNumber(exported.weight, 100),
      conditionTags: Array.isArray(exported.conditionTags) ? exported.conditionTags.map(String).filter(Boolean) : parseTags(exported.conditionTags),
      template: String(exported.template || '').trim(),
      notes: String(exported.notes || '').trim(),
      effectKey: normalizeId(exported.effectKey || exported.effect_key),
      soundKey: normalizeId(exported.soundKey || exported.sound_key),
      enabled: exported.enabled !== false,
      sourceRow
    };
  }
  const logGroupId = normalizeId(firstCell(row, headerMap, ['log_group_id', 'logGroupId']));
  const logType = normalizeId(firstCell(row, headerMap, ['log_type', 'logType']));
  const template = String(firstCell(row, headerMap, ['문구', 'template'])).trim();
  if (!logGroupId || !logType || !template) {
    console.warn(`[combat export warning] ${SHEET_NAMES.combatLogs} row ${rowNumber}: skipped missing log_group_id/log_type/template.`);
    return null;
  }
  const enabledRaw = firstCell(row, headerMap, ['활성 상태', 'enabled'], '');
  if (String(enabledRaw || '').trim() === '') {
    console.warn(`[combat export warning] ${SHEET_NAMES.combatLogs} row ${rowNumber}: blank enabled; exporting enabled=false.`);
  }
  const id = `${logGroupId}__${logType}__${rowNumber}`;
  return {
    id,
    logId: id,
    logGroupId,
    logType,
    weight: parseNumber(firstCell(row, headerMap, ['가중치', 'weight']), 100),
    conditionTags: parseTags(firstCell(row, headerMap, ['조건 태그', 'conditionTags'])),
    template,
    notes: String(firstCell(row, headerMap, ['비고', 'notes'])).trim(),
    effectKey: normalizeId(firstCell(row, headerMap, ['effect_key', 'effectKey'])),
    soundKey: normalizeId(firstCell(row, headerMap, ['sound_key', 'soundKey'])),
    enabled: String(enabledRaw || '').trim() ? parseBoolean(enabledRaw) : false,
    sourceRow: rowNumber
  };
}

function requireUnique(items, key, label) {
  const seen = new Map();
  items.forEach((item, index) => {
    const value = normalizeId(typeof key === 'function' ? key(item) : item?.[key]);
    if (!value) return;
    if (seen.has(value)) throw new Error(`${label}: duplicate key "${value}" at rows ${seen.get(value) + 1} and ${index + 1}`);
    seen.set(value, index);
  });
}

function validateCombatExports({ combatMissions, enemyTemplates, encounters, encounterEnemies, combatRewards, combatRules, combatLogs, attackTypes, skills }) {
  const encounterIds = new Set(encounters.map((item) => item.encounterId).filter(Boolean));
  const rewardGroupIds = new Set(combatRewards.map((item) => item.rewardGroupId).filter(Boolean));
  const enemyIds = new Set(enemyTemplates.map((item) => item.enemyId).filter(Boolean));
  const ruleIds = new Set(combatRules.map((item) => item.battleRuleId || item.id).filter(Boolean));
  const attackIds = new Set(attackTypes.map((item) => item.basicAttackId).filter(Boolean));
  const skillIds = new Set(skills.map((item) => item.skillId).filter(Boolean));
  const warnings = [];
  const missingActionSkillIds = [];
  const missingBasicAttackIds = [];

  requireUnique(combatMissions, 'missionId', 'combat missions');
  requireUnique(enemyTemplates, 'enemyId', 'enemy templates');
  requireUnique(encounters, 'encounterId', 'encounters');
  requireUnique(encounterEnemies, (item) => `${item.encounterId}:${item.slot || item.order || item.enemyId}`, 'encounter enemies');
  requireUnique(combatLogs, 'id', 'combat logs');

  combatMissions.forEach((mission) => {
    if (mission.enabled === false) return;
    if (mission.encounterId && !encounterIds.has(mission.encounterId)) throw new Error(`combat mission ${mission.missionId}: missing encounter ${mission.encounterId}`);
    if (mission.rewardGroupId && !rewardGroupIds.has(mission.rewardGroupId)) throw new Error(`combat mission ${mission.missionId}: missing reward group ${mission.rewardGroupId}`);
  });
  encounters.forEach((encounter) => {
    if (encounter.enabled === false) return;
    if (encounter.rewardGroupId && !rewardGroupIds.has(encounter.rewardGroupId)) throw new Error(`encounter ${encounter.encounterId}: missing reward group ${encounter.rewardGroupId}`);
    if (encounter.battleRuleId && ruleIds.size && !ruleIds.has(encounter.battleRuleId)) throw new Error(`encounter ${encounter.encounterId}: missing battle rule ${encounter.battleRuleId}`);
  });
  encounterEnemies.forEach((row) => {
    if (row.enabled === false) return;
    if (row.encounterId && !encounterIds.has(row.encounterId)) throw new Error(`encounter enemy ${row.encounterId}/${row.slot}: missing encounter`);
    if (row.enemyId && !enemyIds.has(row.enemyId)) throw new Error(`encounter enemy ${row.encounterId}/${row.slot}: missing enemy ${row.enemyId}`);
  });
  enemyTemplates.forEach((enemy) => {
    if (enemy.enabled === false) return;
    if (enemy.basicAttackId && attackIds.size && !attackIds.has(enemy.basicAttackId)) {
      missingBasicAttackIds.push({ enemyId: enemy.enemyId, basicAttackId: enemy.basicAttackId });
      warnings.push(`enemy ${enemy.enemyId}: basicAttackId not found in attack type rules (${enemy.basicAttackId})`);
    }
    const enemySkillIds = [enemy.actionSkillId, enemy.skillId].map((id) => String(id || '').trim()).filter(Boolean);
    [...new Set(enemySkillIds)].forEach((skillId) => {
      if (skillIds.size && !skillIds.has(skillId)) {
        missingActionSkillIds.push({ enemyId: enemy.enemyId, skillId });
        warnings.push(`enemy ${enemy.enemyId}: actionSkillId not found in skill rules (${skillId})`);
      }
    });
  });
  combatLogs.forEach((log) => {
    if (!log.id || !log.logGroupId || !log.logType || !log.template) warnings.push(`combat log row ${log.sourceRow || '?'}: missing required field`);
  });
  const inventoryRewardTypes = new Set(['material', 'equipment', 'item', 'drop']);
  combatRewards.forEach((reward) => {
    if (reward.enabled === false) return;
    const rewardType = String(reward.rewardType || '').toLowerCase();
    if (!inventoryRewardTypes.has(rewardType)) return;
    const itemId = reward.itemId || reward.equipmentItemId || reward.materialItemId || '';
    if (!itemId) warnings.push(`combat reward ${reward.rewardGroupId}/${rewardType}: missing itemId`);
    if (rewardType === 'equipment') {
      const grade = inferEquipmentRewardGrade(reward);
      const dropRate = parseNumber(reward.dropRate ?? reward.weight, 0);
      if (grade === 'SSR' || grade === 'EX') warnings.push(`combat reward ${reward.rewardGroupId}: ${grade} equipment is not allowed in normal combat drops (${itemId})`);
      if (grade === 'SR' && dropRate > 3) warnings.push(`combat reward ${reward.rewardGroupId}: SR equipment dropRate ${dropRate} exceeds 3% clamp (${itemId})`);
    }
  });
  return { warnings, missingActionSkillIds, missingBasicAttackIds };
}

async function fetchSheetRows(sheetName) {
  const response = await fetch(sheetCsvUrl(sheetName));
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet CSV (${sheetName}): ${response.status} ${response.statusText}`);
  }
  return parseCsv(await response.text());
}

function writeJsonAtomic(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, filePath);
}

async function main() {
  const mercRows = await fetchSheetRows(SHEET_NAMES.mercenaries);
  const mercTable = rowsToObjects(mercRows, ['id', 'combat_role']);
  const mercenaries = mercTable.dataRows
    .map((row) => normalizeMercenaryRow(row, mercTable.headerMap))
    .filter((item) => item.id && item.grade);

  const attackRows = await fetchSheetRows(SHEET_NAMES.attackTypes);
  const attackTable = rowsToObjects(attackRows, ['basic_attack_id', 'attack_type']);
  const attackTypes = attackTable.dataRows
    .map((row) => normalizeAttackTypeRow(row, attackTable.headerMap))
    .filter((item) => item.basicAttackId);

  const skillRows = await fetchSheetRows(SHEET_NAMES.skills);
  const skillTable = rowsToObjects(skillRows, ['skill_id', 'skill_type']);
  const skills = skillTable.dataRows
    .map((row) => normalizeSkillRow(row, skillTable.headerMap))
    .filter((item) => item.skillId);

  const statusRows = await fetchSheetRows(SHEET_NAMES.statusEffects);
  const statusTable = rowsToObjects(statusRows, ['status_id', 'status_type']);
  const statusEffects = statusTable.dataRows
    .map((row) => normalizeStatusEffectRow(row, statusTable.headerMap))
    .filter((item) => item.statusId);

  const combatMissionRows = await fetchSheetRows(SHEET_NAMES.combatMissions);
  const combatMissionTable = rowsToObjects(combatMissionRows, ['mission_id']);
  let combatMissions = combatMissionTable.dataRows
    .map((row, index) => normalizeCombatMissionRow(row, combatMissionTable.headerMap, index + 1))
    .filter((item) => item.missionId);

  const enemyTemplateRows = await fetchSheetRows(SHEET_NAMES.enemyTemplates);
  const enemyTemplateTable = rowsToObjects(enemyTemplateRows, ['enemy_id']);
  const enemyTemplates = enemyTemplateTable.dataRows
    .map((row, index) => normalizeEnemyTemplateRow(row, enemyTemplateTable.headerMap, index + 1))
    .filter((item) => item.enemyId);

  const encounterRows = await fetchSheetRows(SHEET_NAMES.encounters);
  const encounterTable = rowsToObjects(encounterRows, ['encounter_id']);
  let encounters = encounterTable.dataRows
    .map((row, index) => normalizeEncounterRow(row, encounterTable.headerMap, index + 1))
    .filter((item) => item.encounterId);

  const encounterEnemyRows = await fetchSheetRows(SHEET_NAMES.encounterEnemies);
  const encounterEnemyTable = rowsToObjects(encounterEnemyRows, ['encounter_id', 'enemy_id']);
  let encounterEnemies = encounterEnemyTable.dataRows
    .map((row, index) => normalizeEncounterEnemyRow(row, encounterEnemyTable.headerMap, index + 1))
    .filter((item) => item.encounterId && item.enemyId);

  const combatRewardRows = await fetchSheetRows(SHEET_NAMES.combatRewards);
  const combatRewardTable = rowsToObjects(combatRewardRows, ['reward_group_id']);
  let combatRewards = combatRewardTable.dataRows
    .map((row, index) => normalizeCombatRewardRow(row, combatRewardTable.headerMap, index + 1))
    .filter((item) => item.rewardGroupId && item.rewardType && item.enabled !== false);

  const combatStageRows = await fetchSheetRows(SHEET_NAMES.combatStages);
  const combatStageTable = rowsToObjects(combatStageRows, ['stage_id', 'generated_mission_id']);
  const combatStages = combatStageTable.dataRows
    .map((row, index) => normalizeCombatStageRow(row, combatStageTable.headerMap, index + 1))
    .filter((item) => item.stageId && item.generatedMissionId);
  const derivedStages = deriveCombatStageExports({
    stages: combatStages,
    combatMissions,
    encounters,
    encounterEnemies,
    combatRewards
  });
  combatMissions = [...combatMissions, ...derivedStages.missions];
  encounters = [...encounters, ...derivedStages.encounters];
  encounterEnemies = [...encounterEnemies, ...derivedStages.encounterEnemies];
  combatRewards = [...combatRewards, ...derivedStages.rewards];

  const combatRuleRows = await fetchSheetRows(SHEET_NAMES.combatRules);
  const combatRuleTable = rowsToObjects(combatRuleRows, ['battle_rule_id']);
  const combatRules = combatRuleTable.dataRows
    .map((row, index) => normalizeCombatRuleRow(row, combatRuleTable.headerMap, index + 1))
    .filter((item) => item.battleRuleId || item.id);

  const combatLogRows = await fetchSheetRows(SHEET_NAMES.combatLogs);
  const combatLogTable = rowsToObjects(combatLogRows, ['log_group_id', 'log_type']);
  const combatLogs = combatLogTable.dataRows
    .map((row, index) => normalizeCombatLogRow(row, combatLogTable.headerMap, index + 1))
    .filter((item) => item && (item.logId || item.id));

  const combatValidation = validateCombatExports({
    combatMissions,
    enemyTemplates,
    encounters,
    encounterEnemies,
    combatRewards,
    combatRules,
    combatLogs,
    attackTypes,
    skills
  });
  const combatLogGroups = [...new Set(combatLogs.map((log) => log.logGroupId).filter(Boolean))].sort();
  const combatLogTypes = [...new Set(combatLogs.map((log) => log.logType).filter(Boolean))].sort();
  const inventoryRewardTypes = new Set(['material', 'equipment', 'item', 'drop']);
  const inventoryRewards = combatRewards.filter((reward) => (
    reward.enabled !== false
    && inventoryRewardTypes.has(String(reward.rewardType || '').toLowerCase())
  ));
  const validationReport = {
    generatedAt: new Date().toISOString(),
    combatLogs: {
      total: combatLogs.length,
      enabled: combatLogs.filter((log) => log.enabled).length,
      groups: combatLogGroups,
      logTypes: combatLogTypes
    },
    combatStages: {
      sourceRows: combatStages.length,
      enabled: combatStages.filter((stage) => stage.enabled !== false).length,
      generatedMissions: derivedStages.missions.length,
      generatedEncounters: derivedStages.encounters.length,
      generatedEncounterEnemies: derivedStages.encounterEnemies.length,
      generatedRewards: derivedStages.rewards.length
    },
    enemySkills: {
      missingActionSkillIds: combatValidation.missingActionSkillIds,
      missingBasicAttackIds: combatValidation.missingBasicAttackIds
    },
    inventoryRewards: {
      enabledRows: inventoryRewards.length,
      equipmentRows: inventoryRewards.filter((reward) => reward.rewardType === 'equipment').length,
      materialRows: inventoryRewards.filter((reward) => reward.rewardType === 'material').length,
      srEquipmentRows: inventoryRewards.filter((reward) => reward.rewardType === 'equipment' && inferEquipmentRewardGrade(reward) === 'SR').length,
      ssrEquipmentRows: inventoryRewards.filter((reward) => reward.rewardType === 'equipment' && inferEquipmentRewardGrade(reward) === 'SSR').length,
      exEquipmentRows: inventoryRewards.filter((reward) => reward.rewardType === 'equipment' && inferEquipmentRewardGrade(reward) === 'EX').length
    },
    warnings: [...derivedStages.warnings, ...combatValidation.warnings]
  };

  writeJsonAtomic(OUTPUT_PATHS.mercenaries, mercenaries);
  writeJsonAtomic(OUTPUT_PATHS.attackTypes, attackTypes);
  writeJsonAtomic(OUTPUT_PATHS.skills, skills);
  writeJsonAtomic(OUTPUT_PATHS.statusEffects, statusEffects);
  writeJsonAtomic(OUTPUT_PATHS.combatMissions, combatMissions);
  writeJsonAtomic(OUTPUT_PATHS.enemyTemplates, enemyTemplates);
  writeJsonAtomic(OUTPUT_PATHS.encounters, encounters);
  writeJsonAtomic(OUTPUT_PATHS.encounterEnemies, encounterEnemies);
  writeJsonAtomic(OUTPUT_PATHS.combatRewards, combatRewards);
  writeJsonAtomic(OUTPUT_PATHS.combatRules, combatRules);
  writeJsonAtomic(OUTPUT_PATHS.combatLogs, combatLogs);
  writeJsonAtomic(VALIDATION_REPORT_PATH, validationReport);

  console.log(`Wrote ${mercenaries.length} mercenaries to ${OUTPUT_PATHS.mercenaries}`);
  console.log(`Wrote ${attackTypes.length} attack types to ${OUTPUT_PATHS.attackTypes}`);
  console.log(`Wrote ${skills.length} skills to ${OUTPUT_PATHS.skills}`);
  console.log(`Wrote ${statusEffects.length} status effects to ${OUTPUT_PATHS.statusEffects}`);
  console.log(`Wrote ${combatMissions.length} combat missions to ${OUTPUT_PATHS.combatMissions}`);
  console.log(`Wrote ${enemyTemplates.length} enemy templates to ${OUTPUT_PATHS.enemyTemplates}`);
  console.log(`Wrote ${encounters.length} encounters to ${OUTPUT_PATHS.encounters}`);
  console.log(`Wrote ${encounterEnemies.length} encounter enemies to ${OUTPUT_PATHS.encounterEnemies}`);
  console.log(`Wrote ${combatRewards.length} combat rewards to ${OUTPUT_PATHS.combatRewards}`);
  console.log(`Wrote ${combatRules.length} combat rules to ${OUTPUT_PATHS.combatRules}`);
  console.log(`Wrote ${combatLogs.length} combat logs to ${OUTPUT_PATHS.combatLogs}`);
  console.log(`Derived ${derivedStages.missions.length} combat stage missions from ${combatStages.length} stage rows`);
  console.log(`Enabled inventory combat reward rows: ${inventoryRewards.length}`);
  console.log(`Wrote combat validation report to ${VALIDATION_REPORT_PATH}`);
  derivedStages.warnings.forEach((warning) => console.warn(`[combat stage warning] ${warning}`));
  combatValidation.warnings.forEach((warning) => console.warn(`[combat export warning] ${warning}`));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  main,
  parseCsv,
  parseTags,
  parseBoolean,
  parseNumber,
  parseRate,
  getNCommonImageKey,
  getImageKey,
  normalizeMercenaryRow,
  normalizeAttackTypeRow,
  normalizeSkillRow,
  normalizeStatusEffectRow,
  normalizeCombatMissionRow,
  normalizeCombatStageRow,
  deriveCombatStageExports,
  normalizeEnemyTemplateRow,
  normalizeEncounterRow,
  normalizeEncounterEnemyRow,
  normalizeCombatRewardRow,
  normalizeCombatRuleRow,
  normalizeCombatLogRow,
  rowsToObjects
};
