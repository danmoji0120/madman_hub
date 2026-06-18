(function () {
  'use strict';

  const SUPPORTED_SOURCE_TYPES = Object.freeze([
    'combat_mission',
    'rumor',
    'case',
    'exploration',
    'tower',
    'raid'
  ]);

  const EXECUTABLE_SOURCE_TYPES = new Set(['combat_mission']);

  /**
   * @typedef {Object} CombatRequest
   * @property {string} requestId
   * @property {'combat_mission'|'rumor'|'case'|'exploration'|'tower'|'raid'} sourceType
   * @property {string} sourceId
   * @property {string} missionId
   * @property {string[]} partyMemberIds
   * @property {Object} partySnapshot
   * @property {string} difficulty
   * @property {number|string|null} seed
   * @property {{ autoClaim?: boolean, viewerMode?: string }} options
   * @property {{ callerLabel?: string, originTitle?: string, operation?: Object }} metadata
   */

  /**
   * @typedef {Object} CombatResult
   * @property {string} requestId
   * @property {string} sourceType
   * @property {string} sourceId
   * @property {string} missionId
   * @property {string} runId
   * @property {string} outcome
   * @property {Array} rounds
   * @property {Object|null} mvp
   * @property {Object} stats
   * @property {Array} rewards
   * @property {Array} injuries
   * @property {Array} logs
   * @property {Object} claim
   * @property {Object} visual
   */

  function compactString(value) {
    return String(value || '').trim();
  }

  function makeRequestId(sourceType, sourceId) {
    const prefix = compactString(sourceType) || 'combat';
    const id = compactString(sourceId) || 'unknown';
    const stamp = Date.now().toString(36);
    let random = '';
    if (window.crypto?.getRandomValues) {
      const buffer = new Uint32Array(1);
      window.crypto.getRandomValues(buffer);
      random = buffer[0].toString(36);
    } else {
      random = String((Date.now() % 0x100000).toString(36));
    }
    return `${prefix}_${id}_${stamp}_${random}`;
  }

  function normalizeSourceType(sourceType) {
    const safeType = compactString(sourceType);
    return SUPPORTED_SOURCE_TYPES.includes(safeType) ? safeType : '';
  }

  function isSupportedSourceType(sourceType) {
    return Boolean(normalizeSourceType(sourceType));
  }

  function isExecutableSourceType(sourceType) {
    return EXECUTABLE_SOURCE_TYPES.has(compactString(sourceType));
  }

  function assertExecutableSourceType(sourceType) {
    const safeType = compactString(sourceType);
    if (!isSupportedSourceType(safeType)) {
      throw new Error(`Unsupported combat sourceType: ${safeType || '(empty)'}`);
    }
    if (!isExecutableSourceType(safeType)) {
      throw new Error(`Combat sourceType is not implemented yet: ${safeType}`);
    }
  }

  function normalizeCombatRequest(input = {}) {
    const sourceType = normalizeSourceType(input.sourceType);
    const sourceId = compactString(input.sourceId || input.missionId);
    const missionId = compactString(input.missionId || sourceId);
    return {
      requestId: compactString(input.requestId) || makeRequestId(sourceType || 'combat', sourceId || missionId),
      sourceType,
      sourceId,
      missionId,
      partyMemberIds: Array.isArray(input.partyMemberIds)
        ? input.partyMemberIds.map(compactString).filter(Boolean)
        : [],
      partySnapshot: input.partySnapshot && typeof input.partySnapshot === 'object' ? input.partySnapshot : {},
      difficulty: compactString(input.difficulty || 'normal'),
      seed: input.seed ?? null,
      options: {
        autoClaim: input.options?.autoClaim !== false,
        viewerMode: compactString(input.options?.viewerMode || 'auto_battle')
      },
      metadata: {
        ...(input.metadata && typeof input.metadata === 'object' ? input.metadata : {}),
        callerLabel: compactString(input.metadata?.callerLabel || ''),
        originTitle: compactString(input.metadata?.originTitle || '')
      }
    };
  }

  function validateCombatRequest(request = {}) {
    const normalized = normalizeCombatRequest(request);
    assertExecutableSourceType(normalized.sourceType);
    if (!normalized.sourceId) throw new Error('CombatRequest.sourceId is required.');
    if (!normalized.partyMemberIds.length) throw new Error('CombatRequest.partyMemberIds is required.');
    return normalized;
  }

  function normalizeCombatResult(input = {}) {
    const request = input.request || input.combatRequest || {};
    const battleResult = input.battleResult || input;
    const sourceType = compactString(battleResult.sourceType || request.sourceType || '');
    const sourceId = compactString(battleResult.sourceId || request.sourceId || battleResult.operationId || '');
    const missionId = compactString(battleResult.missionId || request.missionId || sourceId);
    const rounds = Array.isArray(battleResult.rounds) ? battleResult.rounds : [];
    const logs = rounds.flatMap((round) => (round.actions || []).map((action) => ({
      round: round.round,
      actionId: action.id || '',
      text: action.logText || action.message || '',
      action
    })));
    return {
      requestId: compactString(battleResult.requestId || request.requestId || ''),
      sourceType,
      sourceId,
      missionId,
      runId: compactString(battleResult.runId || battleResult.battleId || ''),
      outcome: compactString(battleResult.result || battleResult.outcome || 'done'),
      rounds,
      mvp: battleResult.mvp || null,
      stats: battleResult.summary || battleResult.stats || {},
      rewards: Array.isArray(battleResult.rewards) ? battleResult.rewards : [],
      injuries: Array.isArray(battleResult.injuries) ? battleResult.injuries : [],
      logs,
      claim: battleResult.claim || {},
      visual: {
        battlefield: battleResult.battlefield || {},
        backgroundImage: battleResult.battlefield?.backgroundImage || battleResult.backgroundImage || ''
      }
    };
  }

  function applyCombatRequestToBattleResult(battleResult = {}, request = {}) {
    const normalized = normalizeCombatRequest(request);
    return {
      ...battleResult,
      requestId: normalized.requestId,
      sourceType: normalized.sourceType,
      sourceId: normalized.sourceId,
      missionId: normalized.missionId,
      source: normalized.sourceType || battleResult.source,
      operationId: battleResult.operationId || normalized.sourceId,
      operationTitle: battleResult.operationTitle || normalized.metadata.originTitle || ''
    };
  }

  window.MercenaryCombatContract = {
    SUPPORTED_SOURCE_TYPES,
    EXECUTABLE_SOURCE_TYPES: Array.from(EXECUTABLE_SOURCE_TYPES),
    makeRequestId,
    normalizeSourceType,
    isSupportedSourceType,
    isExecutableSourceType,
    assertExecutableSourceType,
    normalizeCombatRequest,
    validateCombatRequest,
    normalizeCombatResult,
    applyCombatRequestToBattleResult
  };
}());
