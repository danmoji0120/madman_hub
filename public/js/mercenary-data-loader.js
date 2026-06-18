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
    const data = await loadJson('/data/mercenaries.master.json?v=285');
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
      loadJsonArray('/data/mercenary.attack-types.json?v=285'),
      loadJsonArray('/data/mercenary.skills.json?v=285'),
      loadJsonArray('/data/mercenary.status-effects.json?v=285'),
      loadJsonArray('/data/mercenary.combat-missions.master.json?v=285'),
      loadJsonArray('/data/mercenary.enemy-templates.master.json?v=285'),
      loadJsonArray('/data/mercenary.encounters.master.json?v=285'),
      loadJsonArray('/data/mercenary.encounter-enemies.master.json?v=285'),
      loadJsonArray('/data/mercenary.combat-rewards.master.json?v=285'),
      loadJsonArray('/data/mercenary.combat-rules.master.json?v=285'),
      loadJsonArray('/data/mercenary.combat-logs.master.json?v=285')
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

  window.MercenaryDataLoader = {
    loadMercenaryMasterData,
    loadMercenaryCombatRuleData
  };
}());
