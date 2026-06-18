(function () {
  'use strict';

  function compactString(value) {
    return String(value || '').trim();
  }

  function getMercenaryInstanceId(member) {
    if (!member) return '';
    return compactString(
      member.userMercenaryId
      || member.user_mercenary_id
      || member.ownedId
      || member.sourceId
      || member.instanceId
      || member.instance_id
      || member.rosterId
      || member.id
    );
  }

  function normalizePartyMemberIds(values = []) {
    return Array.from(new Set((Array.isArray(values) ? values : [])
      .map((value) => compactString(value))
      .filter(Boolean)));
  }

  function getPartyMemberIds(party = {}, explicitMemberIds = null) {
    if (Array.isArray(explicitMemberIds)) return normalizePartyMemberIds(explicitMemberIds);
    if (Array.isArray(party.partyMemberIds)) return normalizePartyMemberIds(party.partyMemberIds);
    if (Array.isArray(party.members)) return normalizePartyMemberIds(party.members.map(getMercenaryInstanceId));
    if (party.slots && typeof party.slots === 'object') return normalizePartyMemberIds(Object.values(party.slots));
    return [];
  }

  function createCombatMissionRequest(operation = {}, party = {}, options = {}) {
    const contract = window.MercenaryCombatContract;
    if (!contract) throw new Error('MercenaryCombatContract is not loaded.');
    const sourceId = compactString(operation.id || operation.operationId || operation.missionId);
    const request = contract.normalizeCombatRequest({
      sourceType: 'combat_mission',
      sourceId,
      missionId: compactString(operation.missionId || sourceId),
      partyMemberIds: getPartyMemberIds(party, options.partyMemberIds),
      partySnapshot: {
        ...party,
        members: Array.isArray(party.members) ? party.members.map((member) => ({ ...member })) : []
      },
      difficulty: compactString(operation.danger || 'normal'),
      seed: options.seed ?? null,
      options: {
        autoClaim: options.autoClaim !== false,
        viewerMode: options.viewerMode || 'auto_battle'
      },
      metadata: {
        callerLabel: '전투 작전판',
        originTitle: compactString(operation.title || ''),
        operation
      }
    });
    return contract.validateCombatRequest(request);
  }

  function createUnsupportedRequest(sourceType, sourceId, metadata = {}) {
    const contract = window.MercenaryCombatContract;
    if (!contract) throw new Error('MercenaryCombatContract is not loaded.');
    return contract.normalizeCombatRequest({
      sourceType,
      sourceId,
      missionId: sourceId,
      metadata
    });
  }

  function assertCanExecuteRequest(request = {}) {
    const contract = window.MercenaryCombatContract;
    if (!contract) throw new Error('MercenaryCombatContract is not loaded.');
    return contract.validateCombatRequest(request);
  }

  function attachRequestToBattleResult(battleResult = {}, request = {}) {
    const contract = window.MercenaryCombatContract;
    if (!contract) throw new Error('MercenaryCombatContract is not loaded.');
    return contract.applyCombatRequestToBattleResult(battleResult, request);
  }

  function normalizeBattleResultToCombatResult(battleResult = {}, request = {}) {
    const contract = window.MercenaryCombatContract;
    if (!contract) throw new Error('MercenaryCombatContract is not loaded.');
    return contract.normalizeCombatResult({ battleResult, request });
  }

  window.MercenaryCombatAdapters = {
    createCombatMissionRequest,
    createUnsupportedRequest,
    assertCanExecuteRequest,
    attachRequestToBattleResult,
    normalizeBattleResultToCombatResult
  };
}());
