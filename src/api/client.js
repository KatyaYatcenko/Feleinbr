const TOKEN_KEY = 'feleinbr_token';
const PENDING_MESSAGES_KEY = 'feleinbr_pending_messages';

// Deployed backend URL
export const API_URL = 'https://feleinbr.onrender.com';


export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getPendingMessagesData() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_MESSAGES_KEY) || '[]');
  } catch {
    return [];
  }
}

function setPendingMessagesData(items) {
  localStorage.setItem(PENDING_MESSAGES_KEY, JSON.stringify(items));
}

export function getPendingMessages() {
  return getPendingMessagesData();
}

export function queuePendingMessage(characterId, payload) {
  const pending = getPendingMessagesData();

  // Не додає повторно те саме повідомлення (той самий текст+фото для
  // того самого персонажа), якщо воно вже стоїть у черзі — інакше кожна
  // невдала спроба надсилання того самого повідомлення (наприклад, під
  // час тимчасових проблем з AI-сервісами) створює дублікат, і всі вони
  // одночасно "вистрілюють" при наступній синхронізації.
  const isDuplicate = pending.some(
    (item) =>
      item.characterId === characterId &&
      item.content === (payload.content || '') &&
      item.imageUrl === (payload.imageUrl || null)
  );
  if (isDuplicate) return;

  pending.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    characterId,
    content: payload.content || '',
    imageUrl: payload.imageUrl || null,
    createdAt: new Date().toISOString(),
  });
  setPendingMessagesData(pending);
}

// Прибирає з локальної черги всі "непередані" повідомлення конкретного
// персонажа. Обов'язково викликати при повному очищенні чату, інакше
// старі повідомлення "воскресають" — chatClear стирає лише те, що вже є
// в базі, а ця черга живе окремо в localStorage і при наступному заході
// на сайт автоматично намагається відправити все, що в ній лишилось.
export function clearPendingMessagesForCharacter(characterId) {
  const pending = getPendingMessagesData();
  const remaining = pending.filter(
    (item) => item.characterId !== characterId
  );
  setPendingMessagesData(remaining);
}

// Повністю стирає локальну чергу "непереданих" повідомлень — раніше вона
// автоматично пересилалась на сервер при кожному вході в застосунок,
// що спричиняло "воскресання" старих/видалених повідомлень з новими,
// щоразу іншими відповідями персонажа. Ця функція викликається один раз
// при вході, щоб прибрати те, що вже встигло накопичитись у черзі.
export function clearAllPendingMessages() {
  setPendingMessagesData([]);
}

export async function syncPendingMessages() {
  const pending = getPendingMessagesData();
  if (!pending.length) return [];

  const successfullySynced = [];
  const remaining = [];

  for (const item of pending) {
    try {
      await request(`/api/messages/${item.characterId}`, {
        method: 'POST',
        body: JSON.stringify({ content: item.content, imageUrl: item.imageUrl }),
      });
      successfullySynced.push(item.id);
    } catch (err) {
      console.warn('Failed to sync pending message', err);
      remaining.push(item);
    }
  }

  setPendingMessagesData(remaining);
  return successfullySynced;
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
  if (!res.ok) {
    const error = new Error(data.error || `Помилка запиту (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return data;
}

export const api = {
  register: (payload) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request('/api/auth/me'),

  getCharacters: () => request('/api/characters'),
  createCharacter: (payload) => request('/api/characters', { method: 'POST', body: JSON.stringify(payload) }),
  deleteCharacter: (id) => request(`/api/characters/${id}`, { method: 'DELETE' }),
  updateCharacter: (id, payload) => request(`/api/characters/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  updateCharacterByPut: (id, payload) => request(`/api/characters/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  getMessages: (characterId) => request(`/api/messages/${characterId}`),
  deleteMessages: (characterId) => request(`/api/messages/${characterId}`, { method: 'DELETE' }),
  updateUserProfile: (payload) => request('/api/auth/profile', { method: 'PUT', body: JSON.stringify(payload) }),
  forgotPassword: (payload) => request('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify(payload) }),
  resetPassword: (payload) => request('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),
  sendMessage: (characterId, payload) =>
    request(`/api/messages/${characterId}`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteMessage: (characterId, messageId) => request(`/api/messages/${characterId}/${messageId}`, { method: 'DELETE' }),
  rewindMessage: (characterId, messageId) => request(`/api/messages/${characterId}/${messageId}/rewind`, { method: 'POST' }),
  queuePendingMessage,
  clearPendingMessagesForCharacter,
  clearAllPendingMessages,
  syncPendingMessages,

  uploadFile: (file) => {
    const form = new FormData();
    form.append('file', file);
    return request('/api/upload', { method: 'POST', body: form });
  },
};