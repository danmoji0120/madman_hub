(function () {
  'use strict';

  const STORAGE_KEYS = {
    muted: 'mercenary.audio.muted',
    bgmMuted: 'mercenary.audio.bgmMuted',
    sfxMuted: 'mercenary.audio.sfxMuted',
    masterVolume: 'mercenary.audio.masterVolume',
    bgmVolume: 'mercenary.audio.bgmVolume',
    sfxVolume: 'mercenary.audio.sfxVolume'
  };

  const LEGACY_BGM_KEYS = {
    enabled: 'mercenary.bgm.enabled',
    volume: 'mercenary.bgm.volume',
    mode: 'mercenary.bgm.mode',
    currentTrackId: 'mercenary.bgm.currentTrackId'
  };

  const DEFAULTS = {
    muted: false,
    bgmMuted: false,
    sfxMuted: false,
    masterVolume: 0.8,
    bgmVolume: 0.45,
    sfxVolume: 0.75
  };

  const SFX = {
    ui_click: '/assets/mercenary/sfx/ui/button_click.mp3',
    ui_hover: '/assets/mercenary/sfx/ui/button_hover.mp3',
    attack_normal: '/assets/mercenary/sfx/battle/attack_normal.mp3',
    attack_critical: '/assets/mercenary/sfx/battle/attack_critical.mp3',
    attack_magic: '/assets/mercenary/sfx/battle/attack_magic.mp3',
    attack_ranged: '/assets/mercenary/sfx/battle/attack_ranged.mp3',
    heal: '/assets/mercenary/sfx/battle/heal.mp3',
    miss: '/assets/mercenary/sfx/battle/miss.mp3',
    hit_light: '/assets/mercenary/sfx/battle/hit_light.mp3',
    hit_heavy: '/assets/mercenary/sfx/battle/hit_heavy.mp3',
    battle_victory: '/assets/mercenary/sfx/battle/battle_victory.mp3',
    battle_defeat: '/assets/mercenary/sfx/battle/battle_defeat.mp3'
  };

  const BGM = [
    { id: 'battle_01', src: '/assets/mercenary/bgm/battle_01.mp3' },
    { id: 'battle_02', src: '/assets/mercenary/bgm/battle_02.mp3' }
  ];

  const state = {
    unlocked: false,
    settings: { ...DEFAULTS },
    battleBgm: null,
    battleBgmId: '',
    fadeTimer: null,
    sfxPool: new Map(),
    lastSfxAt: new Map(),
    lastHoverAt: 0,
    initialized: false
  };

  function clamp(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
  }

  function readBoolean(key, fallback) {
    try {
      const raw = window.localStorage?.getItem(key);
      if (raw === null || raw === undefined) return fallback;
      return raw === 'true';
    } catch (error) {
      console.warn('[mercenary-audio] failed to read setting:', key, error);
      return fallback;
    }
  }

  function readVolume(key, fallback) {
    try {
      const raw = window.localStorage?.getItem(key);
      if (raw === null || raw === undefined || raw === '') return fallback;
      return clamp(raw, 0, 1, fallback);
    } catch (error) {
      console.warn('[mercenary-audio] failed to read volume:', key, error);
      return fallback;
    }
  }

  function hasStoredValue(key) {
    try {
      return window.localStorage?.getItem(key) !== null;
    } catch (error) {
      return false;
    }
  }

  function readLegacyBgmSettings() {
    const hasEnabled = hasStoredValue(LEGACY_BGM_KEYS.enabled);
    const hasVolume = hasStoredValue(LEGACY_BGM_KEYS.volume);
    return {
      hasEnabled,
      hasVolume,
      bgmMuted: hasEnabled ? !readBoolean(LEGACY_BGM_KEYS.enabled, true) : DEFAULTS.bgmMuted,
      bgmVolume: hasVolume ? readVolume(LEGACY_BGM_KEYS.volume, DEFAULTS.bgmVolume) : DEFAULTS.bgmVolume
    };
  }

  function syncLegacyBgmSettings() {
    try {
      window.localStorage?.setItem(LEGACY_BGM_KEYS.enabled, String(!state.settings.bgmMuted));
      window.localStorage?.setItem(LEGACY_BGM_KEYS.volume, String(state.settings.bgmVolume));
    } catch (error) {
      console.warn('[mercenary-audio] failed to sync legacy BGM settings:', error);
    }
  }

  function saveAudioSettings() {
    try {
      window.localStorage?.setItem(STORAGE_KEYS.muted, String(Boolean(state.settings.muted)));
      window.localStorage?.setItem(STORAGE_KEYS.bgmMuted, String(Boolean(state.settings.bgmMuted)));
      window.localStorage?.setItem(STORAGE_KEYS.sfxMuted, String(Boolean(state.settings.sfxMuted)));
      window.localStorage?.setItem(STORAGE_KEYS.masterVolume, String(state.settings.masterVolume));
      window.localStorage?.setItem(STORAGE_KEYS.bgmVolume, String(state.settings.bgmVolume));
      window.localStorage?.setItem(STORAGE_KEYS.sfxVolume, String(state.settings.sfxVolume));
      syncLegacyBgmSettings();
    } catch (error) {
      console.warn('[mercenary-audio] failed to save settings:', error);
    }
  }

  function loadAudioSettings() {
    const legacy = readLegacyBgmSettings();
    state.settings = {
      muted: readBoolean(STORAGE_KEYS.muted, DEFAULTS.muted),
      bgmMuted: hasStoredValue(STORAGE_KEYS.bgmMuted) ? readBoolean(STORAGE_KEYS.bgmMuted, DEFAULTS.bgmMuted) : legacy.bgmMuted,
      sfxMuted: readBoolean(STORAGE_KEYS.sfxMuted, DEFAULTS.sfxMuted),
      masterVolume: readVolume(STORAGE_KEYS.masterVolume, DEFAULTS.masterVolume),
      bgmVolume: hasStoredValue(STORAGE_KEYS.bgmVolume) ? readVolume(STORAGE_KEYS.bgmVolume, DEFAULTS.bgmVolume) : legacy.bgmVolume,
      sfxVolume: readVolume(STORAGE_KEYS.sfxVolume, DEFAULTS.sfxVolume)
    };
    saveAudioSettings();
  }

  function getAudioSettings() {
    return { ...state.settings };
  }

  function isMuted() {
    return Boolean(state.settings.muted);
  }

  function isBgmMuted() {
    return isMuted() || Boolean(state.settings.bgmMuted);
  }

  function isSfxMuted() {
    return isMuted() || Boolean(state.settings.sfxMuted);
  }

  function bgmVolume() {
    return isBgmMuted() ? 0 : state.settings.masterVolume * state.settings.bgmVolume;
  }

  function sfxVolume(multiplier = 1) {
    return isSfxMuted() ? 0 : state.settings.masterVolume * state.settings.sfxVolume * clamp(multiplier, 0, 2, 1);
  }

  function applyAudioSettings() {
    if (state.battleBgm) state.battleBgm.volume = bgmVolume();
    if (isBgmMuted()) stopBattleBgm({ fade: false });
  }

  function setMuted(value) {
    state.settings.muted = Boolean(value);
    saveAudioSettings();
    applyAudioSettings();
  }

  function setBgmMuted(value) {
    state.settings.bgmMuted = Boolean(value);
    saveAudioSettings();
    applyAudioSettings();
  }

  function setSfxMuted(value) {
    state.settings.sfxMuted = Boolean(value);
    saveAudioSettings();
  }

  function setMasterVolume(value) {
    state.settings.masterVolume = clamp(value, 0, 1, DEFAULTS.masterVolume);
    saveAudioSettings();
    applyAudioSettings();
  }

  function setBgmVolume(value) {
    state.settings.bgmVolume = clamp(value, 0, 1, DEFAULTS.bgmVolume);
    saveAudioSettings();
    applyAudioSettings();
  }

  function setSfxVolume(value) {
    state.settings.sfxVolume = clamp(value, 0, 1, DEFAULTS.sfxVolume);
    saveAudioSettings();
  }

  function safePlay(audio) {
    if (!audio) return;
    const promise = audio.play();
    if (promise && typeof promise.catch === 'function') {
      promise.catch((error) => console.warn('[mercenary-audio] play skipped:', error?.message || error));
    }
  }

  function makeAudio(src) {
    if (typeof Audio === 'undefined' || !src) return null;
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.addEventListener('error', () => console.warn('[mercenary-audio] failed to load:', src));
    return audio;
  }

  function getSfxAudio(name) {
    const src = SFX[name];
    if (!src) return null;
    const pool = state.sfxPool.get(name) || [];
    state.sfxPool.set(name, pool);
    const idle = pool.find((audio) => audio.paused || audio.ended);
    if (idle) return idle;
    if (pool.length >= 4) return pool[0];
    const audio = makeAudio(src);
    if (audio) pool.push(audio);
    return audio;
  }

  function canPlaySfx(name, cooldownMs = 45) {
    const now = Date.now();
    const last = Number(state.lastSfxAt.get(name) || 0);
    if (now - last < cooldownMs) return false;
    state.lastSfxAt.set(name, now);
    return true;
  }

  function playSfx(name, options = {}) {
    if (!state.unlocked || isSfxMuted()) return;
    if (!canPlaySfx(name, Number(options.cooldownMs || 45))) return;
    const audio = getSfxAudio(name);
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    audio.volume = sfxVolume(options.volume ?? 1);
    safePlay(audio);
  }

  function pickBattleBgm() {
    if (!BGM.length) return null;
    if (window.crypto?.getRandomValues) {
      const buffer = new Uint32Array(1);
      window.crypto.getRandomValues(buffer);
      return BGM[buffer[0] % BGM.length];
    }
    return BGM[Math.floor(Date.now() % BGM.length)];
  }

  function clearFadeTimer() {
    if (state.fadeTimer) {
      window.clearInterval(state.fadeTimer);
      state.fadeTimer = null;
    }
  }

  function playBattleBgm() {
    if (!state.unlocked || isBgmMuted()) return;
    const track = pickBattleBgm();
    if (!track) return;
    clearFadeTimer();
    if (state.battleBgm) {
      state.battleBgm.pause();
      state.battleBgm = null;
    }
    const audio = makeAudio(track.src);
    if (!audio) return;
    state.battleBgm = audio;
    state.battleBgmId = track.id;
    audio.loop = true;
    audio.volume = 0;
    safePlay(audio);
    const target = bgmVolume();
    const startedAt = Date.now();
    state.fadeTimer = window.setInterval(() => {
      const progress = Math.min(1, (Date.now() - startedAt) / 600);
      if (audio !== state.battleBgm) {
        clearFadeTimer();
        return;
      }
      audio.volume = target * progress;
      if (progress >= 1) clearFadeTimer();
    }, 50);
  }

  function stopBattleBgm(options = {}) {
    const audio = state.battleBgm;
    if (!audio) return;
    clearFadeTimer();
    const useFade = options.fade !== false;
    if (!useFade) {
      audio.pause();
      audio.currentTime = 0;
      if (audio === state.battleBgm) state.battleBgm = null;
      return;
    }
    const startVolume = Number(audio.volume || 0);
    const startedAt = Date.now();
    state.fadeTimer = window.setInterval(() => {
      const progress = Math.min(1, (Date.now() - startedAt) / 800);
      if (audio !== state.battleBgm) {
        clearFadeTimer();
        return;
      }
      audio.volume = startVolume * (1 - progress);
      if (progress >= 1) {
        audio.pause();
        audio.currentTime = 0;
        if (audio === state.battleBgm) state.battleBgm = null;
        clearFadeTimer();
      }
    }, 50);
  }

  function playVictory() {
    stopBattleBgm({ fade: true });
    window.setTimeout(() => playSfx('battle_victory', { cooldownMs: 500 }), 180);
  }

  function playDefeat() {
    stopBattleBgm({ fade: true });
    window.setTimeout(() => playSfx('battle_defeat', { cooldownMs: 500 }), 180);
  }

  function actionText(action = {}) {
    return [
      action.actionType,
      action.attackTypeId,
      action.attackTypeName,
      action.skillId,
      action.skillName,
      action.effectType,
      action.kind,
      action.type
    ].join(' ').toLowerCase();
  }

  function playBattleAction(action = {}) {
    if (!action || action.actionRole === 'skill_cast' || action.ignoredBecauseTargetDefeated) return;
    const text = actionText(action);
    const damage = Number(action.appliedDamage ?? action.damage ?? action.amount ?? 0) || 0;
    const healing = Number(action.healing ?? (String(action.kind || action.type) === 'heal' ? action.amount : 0) ?? 0) || 0;
    const isMiss = Boolean(action.isMiss) || text.includes('miss');
    const isCritical = Boolean(action.isCritical) || text.includes('critical');
    const isHeal = healing > 0 || text.includes('heal');
    const isMagic = text.includes('magic') || text.includes('spell') || text.includes('arcane') || text.includes('hack') || text.includes('마법') || text.includes('해킹');
    const isRanged = text.includes('ranged') || text.includes('snipe') || text.includes('shoot') || text.includes('bow') || text.includes('원거리') || text.includes('저격') || text.includes('사격');
    const heavy = isCritical || Boolean(action.targetDefeated) || damage >= 80;

    if (isMiss) {
      playSfx('miss', { cooldownMs: 90 });
      return;
    }
    if (isHeal) {
      playSfx('heal', { cooldownMs: 90 });
      return;
    }
    if (damage <= 0 && !text.includes('attack')) return;
    const attackName = isCritical ? 'attack_critical' : isMagic ? 'attack_magic' : isRanged ? 'attack_ranged' : 'attack_normal';
    playSfx(attackName, { cooldownMs: 70 });
    window.setTimeout(() => playSfx(heavy ? 'hit_heavy' : 'hit_light', { cooldownMs: 50 }), 120);
  }

  function isDisabledControl(target) {
    return Boolean(target?.disabled || target?.getAttribute?.('aria-disabled') === 'true');
  }

  function isInteractive(target) {
    return Boolean(target?.closest?.('button, [role="button"], a, input, select, textarea, .mission-card, .battle-operation-card, .tab, .mercenary-btn'));
  }

  function bindUiSfx() {
    document.addEventListener('click', (event) => {
      const target = event.target?.closest?.('button, [role="button"], a, input[type="checkbox"], input[type="range"], select, .mission-card, .battle-operation-card, .tab, .mercenary-btn');
      if (!target || isDisabledControl(target)) return;
      playSfx('ui_click', { cooldownMs: 35, volume: 0.8 });
    }, true);
    document.addEventListener('pointerenter', (event) => {
      const target = event.target;
      if (!isInteractive(target) || isDisabledControl(target)) return;
      const now = Date.now();
      if (now - state.lastHoverAt < 70) return;
      state.lastHoverAt = now;
      playSfx('ui_hover', { cooldownMs: 70, volume: 0.5 });
    }, true);
  }

  function unlockAudio() {
    if (state.unlocked) return;
    state.unlocked = true;
    Object.values(SFX).slice(0, 1).forEach((src) => {
      const audio = makeAudio(src);
      if (!audio) return;
      audio.volume = 0;
      const promise = audio.play();
      if (promise && typeof promise.then === 'function') {
        promise.then(() => {
          audio.pause();
          audio.currentTime = 0;
        }).catch(() => {});
      }
    });
  }

  function bindUnlock() {
    const unlock = () => unlockAudio();
    document.addEventListener('pointerdown', unlock, { once: true, passive: true });
    document.addEventListener('click', unlock, { once: true, passive: true });
    document.addEventListener('keydown', unlock, { once: true });
  }

  function init() {
    if (state.initialized) return;
    state.initialized = true;
    loadAudioSettings();
    bindUnlock();
    bindUiSfx();
  }

  init();

  window.MercenaryAudio = {
    unlockAudio,
    playSfx,
    playBattleAction,
    playBattleBgm,
    stopBattleBgm,
    playVictory,
    playDefeat,
    setMasterVolume,
    setBgmVolume,
    setSfxVolume,
    isMuted,
    isBgmMuted,
    isSfxMuted,
    setMuted,
    setBgmMuted,
    setSfxMuted,
    getAudioSettings,
    saveAudioSettings,
    applyAudioSettings,
    paths: { sfx: { ...SFX }, bgm: BGM.map((item) => ({ ...item })) }
  };
})();
