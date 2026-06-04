(function initHubPerfLogger() {
  const states = new Map();

  function now() {
    if (window.performance && typeof window.performance.now === 'function') {
      return window.performance.now();
    }
    return Date.now();
  }

  function isEnabled(scope = 'dashboard') {
    try {
      if (window.__HUB_DEBUG_DASHBOARD === true) return true;
      if (localStorage.getItem('DEBUG_DASHBOARD') === 'true') return true;
      if (localStorage.getItem('HUB_DEBUG_DASHBOARD') === 'true') return true;
      return localStorage.getItem(`DEBUG_${String(scope).toUpperCase()}`) === 'true';
    } catch {
      return window.__HUB_DEBUG_DASHBOARD === true;
    }
  }

  function stateFor(scope) {
    const key = scope || 'dashboard';
    if (!states.has(key)) {
      states.set(key, { apiCalls: [] });
    }
    return states.get(key);
  }

  function roundMs(value) {
    return Math.round(Number(value) || 0);
  }

  function log(scope, message, details) {
    if (!isEnabled(scope)) return;
    if (details === undefined) {
      console.log(`[${scope}] ${message}`);
      return;
    }
    console.log(`[${scope}] ${message}`, details);
  }

  function recordApi(call = {}) {
    const scope = call.scope || 'api';
    const entry = {
      method: call.method || 'GET',
      path: call.path || '',
      status: call.status || 0,
      ok: Boolean(call.ok),
      durationMs: roundMs(call.durationMs)
    };
    stateFor(scope).apiCalls.push(entry);

    const status = entry.status ? ` ${entry.status}` : '';
    const result = entry.ok ? 'ok' : 'failed';
    log(scope, `api ${entry.method} ${entry.path} ${entry.durationMs}ms${status} ${result}`);
  }

  function measure(scope, label, fn) {
    const startedAt = now();
    try {
      return fn();
    } finally {
      log(scope, `${label} ${roundMs(now() - startedAt)}ms`);
    }
  }

  async function measureAsync(scope, label, fn) {
    const startedAt = now();
    try {
      return await fn();
    } finally {
      log(scope, `${label} ${roundMs(now() - startedAt)}ms`);
    }
  }

  function createScope(scope = 'dashboard') {
    return {
      isEnabled: () => isEnabled(scope),
      log: (message, details) => log(scope, message, details),
      resetApis: () => {
        stateFor(scope).apiCalls = [];
      },
      measure: (label, fn) => measure(scope, label, fn),
      measureAsync: (label, fn) => measureAsync(scope, label, fn),
      apiSummary: () => {
        const calls = stateFor(scope).apiCalls.slice();
        log(scope, `initial api count ${calls.length}`);
        log(scope, 'initial api list', calls.map((call) => ({
          method: call.method,
          path: call.path,
          status: call.status,
          ok: call.ok,
          durationMs: call.durationMs
        })));
        return calls;
      }
    };
  }

  window.HubPerfLogger = {
    isEnabled,
    now,
    log,
    recordApi,
    measure,
    measureAsync,
    createScope
  };
})();
