const API = {
  get token() {
    return localStorage.getItem('madmen_token');
  },

  set token(value) {
    if (value) localStorage.setItem('madmen_token', value);
    else localStorage.removeItem('madmen_token');
  },

  async request(path, options = {}) {
    const { perfScope, ...fetchOptions } = options;
    const method = fetchOptions.method || 'GET';
    const startedAt = window.HubPerfLogger?.now?.() ?? Date.now();
    const headers = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers || {})
    };

    if (API.token) {
      headers.Authorization = `Bearer ${API.token}`;
    }

    let response;
    try {
      response = await fetch(path, {
        ...fetchOptions,
        headers
      });

      const data = await response.json().catch(() => ({}));
      window.HubPerfLogger?.recordApi?.({
        scope: perfScope || 'api',
        path,
        method,
        status: response.status,
        ok: response.ok,
        durationMs: (window.HubPerfLogger?.now?.() ?? Date.now()) - startedAt
      });

      if (!response.ok) {
        const error = new Error(data.message || '요청 실패');
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      if (!response) {
        window.HubPerfLogger?.recordApi?.({
          scope: perfScope || 'api',
          path,
          method,
          status: 0,
          ok: false,
          durationMs: (window.HubPerfLogger?.now?.() ?? Date.now()) - startedAt
        });
      }
      throw error;
    }
  },

  escape(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  },

  logout() {
    API.token = null;
    location.href = '/login.html';
  }
};
