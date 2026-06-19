(function () {
  async function loadJson(url) {
    const response = await fetch(url, {
      cache: 'no-cache'
    });
    if (!response.ok) {
      throw new Error(`Failed to load mercenary data: ${url} (${response.status})`);
    }
    return response.json();
  }

  async function loadJsonArray(url) {
    try {
      const data = await loadJson(url);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn('[mercenary-data-loader] optional data load failed:', url, error);
      return [];
    }
  }

  async function loadMercenaryMasterData() {
    const data = await loadJson('/data/mercenaries.master.json?v=304');
    return Array.isArray(data) ? data : [];
  }

  async function loadMercenaryCombatRuleData() {
    const [
      attackTypes,
      skills,
      statusEffects,
      combatMissions,
      enemyTemplates,
      encounters,
      encounterEnemies,
      combatRewards,
      combatRules,
      combatLogs
    ] = await Promise.all([
      loadJsonArray('/data/mercenary.attack-types.json?v=304'),
      loadJsonArray('/data/mercenary.skills.json?v=304'),
      loadJsonArray('/data/mercenary.status-effects.json?v=304'),
      loadJsonArray('/data/mercenary.combat-missions.master.json?v=304'),
      loadJsonArray('/data/mercenary.enemy-templates.master.json?v=304'),
      loadJsonArray('/data/mercenary.encounters.master.json?v=304'),
      loadJsonArray('/data/mercenary.encounter-enemies.master.json?v=304'),
      loadJsonArray('/data/mercenary.combat-rewards.master.json?v=304'),
      loadJsonArray('/data/mercenary.combat-rules.master.json?v=304'),
      loadJsonArray('/data/mercenary.combat-logs.master.json?v=304')
    ]);
    return {
      attackTypes,
      skills,
      statusEffects,
      combatMissions,
      enemyTemplates,
      encounters,
      encounterEnemies,
      combatRewards,
      combatRules,
      combatLogs
    };
  }

  function indexBy(items, keyName) {
    return Object.fromEntries((Array.isArray(items) ? items : [])
      .map((item) => [String(item?.[keyName] || '').trim(), item])
      .filter(([key]) => key));
  }

  function groupEquipmentBySlot(equipment = []) {
    const grouped = {
      weapon: [],
      armor: [],
      accessory: [],
      tool: []
    };
    (Array.isArray(equipment) ? equipment : []).forEach((item) => {
      const slot = String(item?.slot || '').trim();
      if (!grouped[slot]) grouped[slot] = [];
      grouped[slot].push(item);
    });
    return grouped;
  }

  async function loadMercenaryItemsMasterData() {
    return loadJsonArray('/data/mercenary.items.master.json?v=304');
  }

  async function loadMercenaryEquipmentMasterData() {
    return loadJsonArray('/data/mercenary.equipment.master.json?v=304');
  }

  async function loadMercenaryEquipmentImagePromptsMasterData() {
    return loadJsonArray('/data/mercenary.equipment-image-prompts.master.json?v=304');
  }

  async function loadMercenaryEquipmentBundle() {
    const [items, equipment, equipmentImagePrompts] = await Promise.all([
      loadMercenaryItemsMasterData(),
      loadMercenaryEquipmentMasterData(),
      loadMercenaryEquipmentImagePromptsMasterData()
    ]);
    return {
      items,
      equipment,
      equipmentImagePrompts,
      byItemId: indexBy(items, 'itemId'),
      equipmentById: indexBy(equipment, 'equipmentId'),
      imagePromptByKey: indexBy(equipmentImagePrompts, 'imageKey'),
      equipmentBySlot: groupEquipmentBySlot(equipment)
    };
  }

  window.MercenaryDataLoader = {
    loadMercenaryMasterData,
    loadMercenaryCombatRuleData,
    loadMercenaryItemsMasterData,
    loadMercenaryEquipmentMasterData,
    loadMercenaryEquipmentImagePromptsMasterData,
    loadMercenaryEquipmentBundle
  };
}());
