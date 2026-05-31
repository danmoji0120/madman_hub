const API = {
  get token() {
    return localStorage.getItem('madmen_token');
  },

  set token(value) {
    if (value) localStorage.setItem('madmen_token', value);
    else localStorage.removeItem('madmen_token');
  },

  async request(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (API.token) {
      headers.Authorization = `Bearer ${API.token}`;
    }

    const response = await fetch(path, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || '요청 실패');
    }

    return data;
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
