# Mercenary Equipment Export

The mercenary item and equipment masters are exported from the Google Sheet `용병단 캐릭터 시트`.

Sheet tabs:

- `아이템 마스터`
- `장비 마스터`
- `장비 이미지 프롬프트`

Generated JSON:

- `public/data/mercenary.items.master.json`
- `public/data/mercenary.equipment.master.json`
- `public/data/mercenary.equipment-image-prompts.master.json`

Export command:

```bash
node scripts/export-mercenary-equipment.js
```

Optional sheet override:

```bash
MERCENARY_EQUIPMENT_SHEET_ID=1O6qW_A7sxMoBCFu-d_zip6IkFoXfFkI_Z32dWJ5RY3U node scripts/export-mercenary-equipment.js
```

Runtime export rules:

- Only rows with `사용 여부` set to true are exported for items and equipment.
- Disabled rows are excluded and counted in the console report.
- Empty `export_json` and `{}` are ignored.
- Valid object `export_json` is merged into the normalized row.
- Invalid `export_json` skips that row with a warning.
- Duplicate `itemId`, `equipmentId`, and `imageKey` are validation errors.

Equipment slots:

- `weapon`
- `armor`
- `accessory`
- `tool`

Current expected enabled equipment count:

- weapon: 40
- armor: 40
- accessory: 40
- tool: 40
- total: 160

Data loader access:

```js
const bundle = await window.MercenaryDataLoader.loadMercenaryEquipmentBundle();
bundle.items;
bundle.equipment;
bundle.equipmentImagePrompts;
bundle.byItemId;
bundle.equipmentById;
bundle.imagePromptByKey;
bundle.equipmentBySlot.weapon;
bundle.equipmentBySlot.armor;
bundle.equipmentBySlot.accessory;
bundle.equipmentBySlot.tool;
```

The equipment bundle uses empty arrays/maps if JSON fetch fails, so the mercenary lobby does not crash when optional equipment data is unavailable.

Not implemented in this step:

- Enhancement
- Set effects
- Applying equipment stats to combat
- Connecting equipment to combat rewards


## Equip / unequip 0.1

Runtime equipment ownership is stored in `user_mercenary_inventory_items`, and per-mercenary equipped slots are stored in `user_mercenary_equipment_slots`. One mercenary can equip one item per slot, and one inventory entry can only be equipped once.

Equipment bonuses are shown in mercenary detail, inventory detail, and battle board party power. As of equipment combat 0.2, equipped HP/ATK/DEF/SPD/TEC/SUP bonuses are snapshotted at battle start and applied to client battle units. Accuracy, evasion, critical, and healing modifiers are still snapshot/display-only and are reserved for a later combat formula pass.
