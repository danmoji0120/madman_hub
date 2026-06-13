const fs = require('fs');
const path = require('path');

const SPREADSHEET_ID = '1O6qW_A7sxMoBCFu-d_zip6IkFoXfFkI_Z32dWJ5RY3U';
const SHEET_NAME = '시트1';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;
const OUTPUT_PATH = path.join(__dirname, '../public/data/mercenaries.master.json');

const N_COMMON_SPECIES_KEYS = {
  '거미수인': 'spiderkin',
  '고블린': 'goblin',
  '고양이수인': 'catkin',
  '골렘': 'golem',
  '곰수인': 'bearkin',
  '너구리수인': 'raccoonkin',
  '늑대수인': 'wolfkin',
  '도마뱀수인': 'lizardkin',
  '드워프': 'dwarf',
  '미노타우로스': 'minotaur',
  '미믹': 'mimic',
  '사슴수인': 'deerkin',
  '사자수인': 'lionkin',
  '슬라임': 'slime',
  '양수인': 'sheepkin',
  '언데드': 'undead',
  '엘프': 'elf',
  '여우수인': 'foxkin',
  '오니': 'oni',
  '오크': 'orc',
  '인간': 'human',
  '켄타우로스': 'centaur',
  '코볼트': 'kobold',
  '토끼수인': 'rabbitkin',
  '하피': 'harpy',
  '흡혈귀': 'vampire'
};

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
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBoolean(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return ['true', '1', 'yes', 'y', '필요', '재생성'].includes(normalized);
}

function parseNumber(value, fallback = 0) {
  const normalized = String(value || '').replace(/,/g, '').trim();
  if (!normalized) return fallback;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeMercenaryRow(row) {
  const grade = String(row[2] || '').trim();
  const species = String(row[4] || '').trim();
  const sheetImageKey = String(row[9] || row[22] || '').replace(/\.png$/i, '').trim();

  return {
    id: String(row[1] || '').trim(),
    grade,
    name: String(row[3] || '').trim(),
    species,
    job: String(row[5] || '').trim(),
    role: String(row[6] || '').trim(),
    position: String(row[7] || '').trim(),
    tags: parseTags(row[8]),
    imageKey: getImageKey({
      id: String(row[1] || '').trim(),
      grade,
      species,
      sheetImageKey
    }),
    dedicatedIllustration: parseBoolean(row[10]),
    obtainMethod: String(row[11] || '').trim(),
    memo: String(row[12] || '').trim(),
    combatSkill: String(row[13] || '').trim(),
    missionBonus: String(row[14] || '').trim(),
    adminBonus: String(row[15] || '').trim(),
    commandBonus: String(row[16] || '').trim(),
    illustrationStatus: String(row[21] || '').trim(),
    illustrationFileName: String(row[22] || '').trim(),
    reviewStatus: String(row[25] || '').trim(),
    needsRegeneration: parseBoolean(row[26]),
    extraNote: String(row[27] || '').trim(),
    baseStats: {
      hp: parseNumber(row[28]),
      atk: parseNumber(row[29]),
      def: parseNumber(row[30]),
      spd: parseNumber(row[31]),
      tec: parseNumber(row[32]),
      sup: parseNumber(row[33])
    },
    baseCombatPower: parseNumber(row[34]),
    maxLevel: parseNumber(row[35], null)
  };
}

async function main() {
  const response = await fetch(CSV_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet CSV: ${response.status} ${response.statusText}`);
  }

  const csv = await response.text();
  const rows = parseCsv(csv);
  const mercenaries = rows
    .slice(1)
    .map(normalizeMercenaryRow)
    .filter((item) => item.id && item.grade);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(mercenaries, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${mercenaries.length} mercenaries to ${OUTPUT_PATH}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  parseCsv,
  parseTags,
  parseBoolean,
  parseNumber,
  getNCommonImageKey,
  getImageKey,
  normalizeMercenaryRow
};
