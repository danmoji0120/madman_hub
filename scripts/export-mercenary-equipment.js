const fs = require('fs');
const path = require('path');

const DEFAULT_SHEET_ID = '1O6qW_A7sxMoBCFu-d_zip6IkFoXfFkI_Z32dWJ5RY3U';
const SPREADSHEET_ID = process.env.MERCENARY_EQUIPMENT_SHEET_ID || DEFAULT_SHEET_ID;

const SHEET_NAMES = {
  items: '아이템 마스터',
  equipment: '장비 마스터',
  equipmentImagePrompts: '장비 이미지 프롬프트'
};

const OUTPUT_PATHS = {
  items: path.join(__dirname, '../public/data/mercenary.items.master.json'),
  equipment: path.join(__dirname, '../public/data/mercenary.equipment.master.json'),
  equipmentImagePrompts: path.join(__dirname, '../public/data/mercenary.equipment-image-prompts.master.json')
};

const VALID_GRADES = new Set(['N', 'R', 'SR', 'SSR', 'EX']);
const VALID_ITEM_TYPES = new Set(['equipment', 'material', 'consumable', 'clue', 'rumor_seed', 'misc']);
const VALID_EQUIPMENT_SLOTS = new Set(['weapon', 'armor', 'accessory', 'tool']);

function sheetCsvUrl(sheetName) {
  return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
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
    if (char === '"') inQuotes = true;
    else if (char === ',') {
      row.push(value);
      value = '';
    } else if (char === '\n') {
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else if (char !== '\r') value += char;
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  return rows;
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

function rowsToObjects(rows, requiredKeys, sheetName) {
  const headerIndex = findHeaderIndex(rows, requiredKeys);
  if (headerIndex < 0) throw new Error(`${sheetName}: required headers not found (${requiredKeys.join(', ')})`);
  const headerMap = headerMapFromRow(rows[headerIndex] || []);
  return { headerMap, dataRows: rows.slice(headerIndex + 1), headerIndex };
}

function cell(row, headerMap, keys) {
  const list = Array.isArray(keys) ? keys : [keys];
  for (const key of list) {
    if (headerMap.has(key)) return row[headerMap.get(key)];
  }
  return '';
}

function asString(value) {
  return String(value ?? '').trim();
}

function asNullableString(value) {
  const text = asString(value);
  return text ? text : null;
}

function asNumber(value, fallback = 0) {
  const text = asString(value).replace(/,/g, '');
  if (!text) return fallback;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asBoolean(value, fallback = false) {
  const text = asString(value).toLowerCase();
  if (!text) return fallback;
  if (['true', '1', 'yes', 'y', '사용', '사용중', '활성', 'o', 'ok'].includes(text)) return true;
  if (['false', '0', 'no', 'n', '미사용', '비활성', 'x'].includes(text)) return false;
  return fallback;
}

function splitList(value) {
  return asString(value)
    .split(/[,\|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeGrade(value) {
  return asString(value).toUpperCase();
}

function normalizeSlot(value) {
  return asString(value).toLowerCase();
}

function hasRefError(item) {
  return Object.values(item || {}).some((value) => {
    if (value && typeof value === 'object') return hasRefError(value);
    return asString(value).includes('#REF!');
  });
}

function parseExportJson(row, headerMap, sheetName, rowNumber, warnings) {
  const text = asString(cell(row, headerMap, 'export_json'));
  if (!text || text === '{}') return null;
  if (!/^[{\[]/.test(text)) return null;
  try {
    const parsed = JSON.parse(text);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      warnings.push(`${sheetName} row ${rowNumber}: export_json must be an object; row skipped.`);
      return { skip: true };
    }
    return { value: parsed };
  } catch (error) {
    warnings.push(`${sheetName} row ${rowNumber}: invalid export_json; row skipped.`);
    return { skip: true };
  }
}

function mergeExport(rowObject, parsed) {
  return parsed?.value ? { ...rowObject, ...parsed.value } : rowObject;
}

function normalizeItemRow(row, headerMap, rowNumber, warnings, counters) {
  const enabled = asBoolean(cell(row, headerMap, '사용 여부'));
  if (!enabled) {
    counters.disabledItems += 1;
    return null;
  }
  const parsed = parseExportJson(row, headerMap, SHEET_NAMES.items, rowNumber, warnings);
  if (parsed?.skip) return null;
  const item = mergeExport({
    itemId: asString(cell(row, headerMap, 'item_id')),
    enabled,
    itemType: asString(cell(row, headerMap, 'item_type')),
    grade: normalizeGrade(cell(row, headerMap, '등급')),
    name: asString(cell(row, headerMap, '이름')),
    description: asString(cell(row, headerMap, '설명')),
    iconKey: asString(cell(row, headerMap, 'icon_key')),
    imageKey: asString(cell(row, headerMap, 'image_key')),
    stackable: asBoolean(cell(row, headerMap, 'stackable')),
    maxStack: asNumber(cell(row, headerMap, 'max_stack'), 1),
    sellValue: asNumber(cell(row, headerMap, '판매가'), 0),
    sourceTags: splitList(cell(row, headerMap, '획득처 태그')),
    effectSummary: asString(cell(row, headerMap, '효과 요약')),
    notes: asString(cell(row, headerMap, '비고'))
  }, parsed);
  if (!item.itemId) warnings.push(`${SHEET_NAMES.items} row ${rowNumber}: missing item_id; row skipped.`);
  if (!VALID_GRADES.has(item.grade)) warnings.push(`${SHEET_NAMES.items} row ${rowNumber}: invalid grade ${item.grade}; row skipped.`);
  if (!VALID_ITEM_TYPES.has(item.itemType)) warnings.push(`${SHEET_NAMES.items} row ${rowNumber}: invalid item_type ${item.itemType}; row skipped.`);
  if (!item.itemId || !VALID_GRADES.has(item.grade) || !VALID_ITEM_TYPES.has(item.itemType)) return null;
  if (hasRefError(item)) warnings.push(`${SHEET_NAMES.items} row ${rowNumber}: contains #REF!.`);
  return item;
}

function normalizeEquipmentRow(row, headerMap, rowNumber, warnings, counters) {
  const enabled = asBoolean(cell(row, headerMap, '사용 여부'));
  if (!enabled) {
    counters.disabledEquipment += 1;
    return null;
  }
  const parsed = parseExportJson(row, headerMap, SHEET_NAMES.equipment, rowNumber, warnings);
  if (parsed?.skip) return null;
  const equipment = mergeExport({
    equipmentId: asString(cell(row, headerMap, 'equipment_id')),
    itemId: asString(cell(row, headerMap, 'item_id')),
    enabled,
    grade: normalizeGrade(cell(row, headerMap, '등급')),
    name: asString(cell(row, headerMap, '장비명')),
    slot: normalizeSlot(cell(row, headerMap, '장착 슬롯')),
    category: asString(cell(row, headerMap, '장비 분류')),
    recommendedPositions: splitList(cell(row, headerMap, '추천 포지션')),
    recommendedRoles: splitList(cell(row, headerMap, '추천 역할')),
    stats: {
      hp: asNumber(cell(row, headerMap, 'HP'), 0),
      atk: asNumber(cell(row, headerMap, 'ATK'), 0),
      def: asNumber(cell(row, headerMap, 'DEF'), 0),
      spd: asNumber(cell(row, headerMap, 'SPD'), 0),
      tec: asNumber(cell(row, headerMap, 'TEC'), 0),
      sup: asNumber(cell(row, headerMap, 'SUP'), 0)
    },
    modifiers: {
      accuracy: asNumber(cell(row, headerMap, '명중 보정'), 0),
      evasion: asNumber(cell(row, headerMap, '회피 보정'), 0),
      critical: asNumber(cell(row, headerMap, '치명 보정'), 0),
      healing: asNumber(cell(row, headerMap, '회복 보정'), 0),
      combatPower: asNumber(cell(row, headerMap, '전투력 보정'), 0)
    },
    tags: splitList(cell(row, headerMap, '장비 태그')),
    specialEffectId: asNullableString(cell(row, headerMap, '특수 효과 id')),
    equipRestriction: asNullableString(cell(row, headerMap, '착용 제한')),
    summary: asString(cell(row, headerMap, '설명 문구')),
    flavorText: asString(cell(row, headerMap, 'flavor_text')),
    imageKey: asString(cell(row, headerMap, 'image_key')),
    balanceStatus: asString(cell(row, headerMap, 'balance_status')),
    notes: asString(cell(row, headerMap, '비고'))
  }, parsed);
  if (!equipment.equipmentId) warnings.push(`${SHEET_NAMES.equipment} row ${rowNumber}: missing equipment_id; row skipped.`);
  if (!equipment.itemId) warnings.push(`${SHEET_NAMES.equipment} row ${rowNumber}: missing item_id; row skipped.`);
  if (!VALID_GRADES.has(equipment.grade)) warnings.push(`${SHEET_NAMES.equipment} row ${rowNumber}: invalid grade ${equipment.grade}; row skipped.`);
  if (!VALID_EQUIPMENT_SLOTS.has(equipment.slot)) warnings.push(`${SHEET_NAMES.equipment} row ${rowNumber}: invalid slot ${equipment.slot}; row skipped.`);
  if (!equipment.equipmentId || !equipment.itemId || !VALID_GRADES.has(equipment.grade) || !VALID_EQUIPMENT_SLOTS.has(equipment.slot)) return null;
  if (hasRefError(equipment)) warnings.push(`${SHEET_NAMES.equipment} row ${rowNumber}: contains #REF!.`);
  return equipment;
}

function normalizeImagePromptRow(row, headerMap, rowNumber, warnings, counters) {
  const imageKey = asString(cell(row, headerMap, 'image_key'));
  const itemId = asString(cell(row, headerMap, 'item_id'));
  if (!imageKey && !itemId) {
    counters.disabledImagePrompts += 1;
    return null;
  }
  const prompt = {
    imageKey,
    itemId,
    grade: normalizeGrade(cell(row, headerMap, '등급')),
    name: asString(cell(row, headerMap, '장비명')),
    category: asString(cell(row, headerMap, '장비 분류')),
    imageType: asString(cell(row, headerMap, '이미지 타입')),
    commonPrompt: asString(cell(row, headerMap, '공통 프롬프트')),
    itemPrompt: asString(cell(row, headerMap, '장비 프롬프트')),
    compositionPrompt: asString(cell(row, headerMap, '구도 프롬프트')),
    backgroundPrompt: asString(cell(row, headerMap, '배경 프롬프트')),
    negativePrompt: asString(cell(row, headerMap, '네거티브')),
    fileName: asString(cell(row, headerMap, '파일명')),
    generationStatus: asString(cell(row, headerMap, '생성 상태')),
    reviewStatus: asString(cell(row, headerMap, '검수 상태')),
    needsRegeneration: asBoolean(cell(row, headerMap, '재생성 필요')),
    notes: asString(cell(row, headerMap, '비고'))
  };
  if (!prompt.imageKey) warnings.push(`${SHEET_NAMES.equipmentImagePrompts} row ${rowNumber}: missing image_key; row skipped.`);
  if (!prompt.itemId) warnings.push(`${SHEET_NAMES.equipmentImagePrompts} row ${rowNumber}: missing item_id; row skipped.`);
  if (prompt.grade && !VALID_GRADES.has(prompt.grade)) warnings.push(`${SHEET_NAMES.equipmentImagePrompts} row ${rowNumber}: invalid grade ${prompt.grade}; row skipped.`);
  if (!prompt.imageKey || !prompt.itemId || (prompt.grade && !VALID_GRADES.has(prompt.grade))) return null;
  if (hasRefError(prompt)) warnings.push(`${SHEET_NAMES.equipmentImagePrompts} row ${rowNumber}: contains #REF!.`);
  return prompt;
}

function requireUnique(items, key, label, errors) {
  const seen = new Set();
  items.forEach((item) => {
    const value = asString(item[key]);
    if (!value) return;
    if (seen.has(value)) errors.push(`${label}: duplicate ${key} ${value}`);
    seen.add(value);
  });
}

async function fetchSheetRows(sheetName) {
  const response = await fetch(sheetCsvUrl(sheetName));
  if (!response.ok) throw new Error(`Failed to fetch sheet CSV (${sheetName}): ${response.status} ${response.statusText}`);
  return parseCsv(await response.text());
}

function writeJsonAtomic(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, filePath);
}

function validateExports({ items, equipment, imagePrompts }) {
  const errors = [];
  const warnings = [];
  requireUnique(items, 'itemId', 'items', errors);
  requireUnique(equipment, 'equipmentId', 'equipment', errors);
  requireUnique(imagePrompts, 'imageKey', 'equipment image prompts', errors);
  const itemIds = new Set(items.map((item) => item.itemId));
  const promptKeys = new Set(imagePrompts.map((prompt) => prompt.imageKey));
  equipment.forEach((item) => {
    if (item.itemId && !itemIds.has(item.itemId)) warnings.push(`equipment ${item.equipmentId}: missing item ${item.itemId}`);
    if (item.imageKey && !promptKeys.has(item.imageKey)) warnings.push(`equipment ${item.equipmentId}: missing image prompt ${item.imageKey}`);
  });
  imagePrompts.forEach((prompt) => {
    if (prompt.itemId && !itemIds.has(prompt.itemId)) warnings.push(`image prompt ${prompt.imageKey}: missing item ${prompt.itemId}`);
  });
  const slotCounts = Object.fromEntries([...VALID_EQUIPMENT_SLOTS].map((slot) => [slot, equipment.filter((item) => item.slot === slot).length]));
  return { errors, warnings, slotCounts };
}

async function exportSheet(sheetName, requiredKeys) {
  const rows = await fetchSheetRows(sheetName);
  return rowsToObjects(rows, requiredKeys, sheetName);
}

async function main() {
  const warnings = [];
  const counters = {
    disabledItems: 0,
    disabledEquipment: 0,
    disabledImagePrompts: 0
  };
  const itemTable = await exportSheet(SHEET_NAMES.items, ['item_id']);
  const equipmentTable = await exportSheet(SHEET_NAMES.equipment, ['equipment_id', 'item_id']);
  const promptTable = await exportSheet(SHEET_NAMES.equipmentImagePrompts, ['image_key', 'item_id']);

  const items = itemTable.dataRows
    .map((row, index) => normalizeItemRow(row, itemTable.headerMap, itemTable.headerIndex + index + 2, warnings, counters))
    .filter(Boolean);
  const equipment = equipmentTable.dataRows
    .map((row, index) => normalizeEquipmentRow(row, equipmentTable.headerMap, equipmentTable.headerIndex + index + 2, warnings, counters))
    .filter(Boolean);
  const imagePrompts = promptTable.dataRows
    .map((row, index) => normalizeImagePromptRow(row, promptTable.headerMap, promptTable.headerIndex + index + 2, warnings, counters))
    .filter(Boolean);

  const validation = validateExports({ items, equipment, imagePrompts });
  warnings.push(...validation.warnings);

  if (validation.errors.length) {
    validation.errors.forEach((error) => console.error(`[equipment export error] ${error}`));
    process.exitCode = 1;
    return;
  }

  writeJsonAtomic(OUTPUT_PATHS.items, items);
  writeJsonAtomic(OUTPUT_PATHS.equipment, equipment);
  writeJsonAtomic(OUTPUT_PATHS.equipmentImagePrompts, imagePrompts);

  console.log(`Wrote ${items.length} enabled items to ${OUTPUT_PATHS.items}`);
  console.log(`Wrote ${equipment.length} enabled equipment rows to ${OUTPUT_PATHS.equipment}`);
  console.log(`Wrote ${imagePrompts.length} image prompts to ${OUTPUT_PATHS.equipmentImagePrompts}`);
  console.log(`Disabled rows: items=${counters.disabledItems}, equipment=${counters.disabledEquipment}, imagePrompts=${counters.disabledImagePrompts}`);
  console.log(`Equipment slot counts: weapon=${validation.slotCounts.weapon}, armor=${validation.slotCounts.armor}, accessory=${validation.slotCounts.accessory}, tool=${validation.slotCounts.tool}`);
  console.log(`Warnings: ${warnings.length}`);
  warnings.forEach((warning) => console.warn(`[equipment export warning] ${warning}`));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
