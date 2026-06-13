const fs = require('fs');
const path = require('path');

const DEFAULT_SHEET_ID = process.env.MERCENARY_MISSION_SHEET_ID || '1O6qW_A7sxMoBCFu-d_zip6IkFoXfFkI_Z32dWJ5RY3U';
const DEFAULT_SHEET_NAME = process.env.MERCENARY_MISSION_SHEET_NAME || '의뢰 마스터';
const OUTPUT_PATH = path.join(__dirname, '../public/data/mercenary.missions.master.json');

function parseArgs(argv) {
  const args = {};
  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--csv' || token === '--tsv' || token === '--out') {
      args[token.slice(2)] = argv[index + 1];
      index += 1;
    }
  }
  return args;
}

function parseDelimited(text, delimiter = ',') {
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
    } else if (char === delimiter) {
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

function parseBoolean(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['true', '1', 'y', 'yes', '사용', '활성', 'on'].includes(normalized)) return true;
  if (['false', '0', 'n', 'no', '미사용', '비활성', 'off'].includes(normalized)) return false;
  return false;
}

function parseNumber(value, fallback = 0) {
  const normalized = String(value ?? '').replace(/,/g, '').trim();
  if (!normalized) return fallback;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeMissionRow(row) {
  return {
    missionId: String(row[0] || '').trim(),
    enabled: parseBoolean(row[1]),
    title: String(row[2] || '').trim(),
    category: String(row[3] || '').trim(),
    type: String(row[4] || '').trim(),
    risk: String(row[5] || '').trim(),
    primaryStats: parseList(row[6]).map((stat) => stat.toUpperCase()),
    recommendedWorkPower: parseNumber(row[7]),
    minMembers: parseNumber(row[8]),
    maxMembers: parseNumber(row[9]),
    durationSeconds: parseNumber(row[10]),
    rewardGold: parseNumber(row[11]),
    failureRewardGold: parseNumber(row[12]),
    preferredTags: parseList(row[13]),
    preferredPositions: parseList(row[14]),
    description: String(row[15] || '').trim(),
    successText: String(row[16] || '').trim(),
    failureText: String(row[17] || '').trim(),
    unlockCondition: String(row[18] || '').trim(),
    note: String(row[19] || '').trim(),
    officeExp: parseNumber(row[20]),
    mercenaryExp: parseNumber(row[21]),
    failureOfficeExp: parseNumber(row[22]),
    failureMercenaryExp: parseNumber(row[23])
  };
}

async function fetchSheetCsv() {
  const url = `https://docs.google.com/spreadsheets/d/${DEFAULT_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(DEFAULT_SHEET_NAME)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch mission sheet CSV: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

async function main() {
  const args = parseArgs(process.argv);
  let text;
  let delimiter = ',';

  if (args.csv) {
    text = fs.readFileSync(path.resolve(args.csv), 'utf8');
  } else if (args.tsv) {
    text = fs.readFileSync(path.resolve(args.tsv), 'utf8');
    delimiter = '\t';
  } else {
    text = await fetchSheetCsv();
  }

  const rows = parseDelimited(text, delimiter);
  const missions = rows
    .slice(1)
    .map(normalizeMissionRow)
    .filter((item) => item.missionId && item.category);

  const outputPath = path.resolve(args.out || OUTPUT_PATH);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(missions, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${missions.length} missions to ${outputPath}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  parseDelimited,
  parseBoolean,
  parseNumber,
  parseList,
  normalizeMissionRow
};
