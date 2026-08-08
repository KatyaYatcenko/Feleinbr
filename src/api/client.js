const TOKEN_KEY = 'feleinbr_token';

// Deployed backend URL
export const API_URL = 'https://feleinbr.onrender.com';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = getToken();
  // If a relative path is provided, prefix it with API_URL
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Помилка запиту (${res.status})`);
  return data;
}

export const api = {
  register: (payload) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request('/api/auth/me'),

  getCharacters: () => request('/api/characters'),
  createCharacter: (payload) => request('/api/characters', { method: 'POST', body: JSON.stringify(payload) }),
  deleteCharacter: (id) => request(`/api/characters/${id}`, { method: 'DELETE' }),

  getMessages: (characterId) => request(`/api/messages/${characterId}`),
  sendMessage: (characterId, payload) =>
    request(`/api/messages/${characterId}`, { method: 'POST', body: JSON.stringify(payload) }),

  uploadFile: (file) => {
    const form = new FormData();
    form.append('file', file);
    return request('/api/upload', { method: 'POST', body: form });
  },
};
