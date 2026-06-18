const API_URL = '';

function getToken() {
  return localStorage.getItem('cultcode_token');
}

async function request(path, options = {}) {
  const url = `${API_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    throw new Error('Бэкенд недоступен. Перезапусти Go-сервер на 127.0.0.1:8081.');
  }
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || 'Invalid response' };
  }

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return data;
}

export const api = {
  // Auth
  register: (username, password) =>
    request('/api/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  login: (username, password) =>
    request('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  me: () => request('/api/me'),

  // Articles
  getArticles: () => request('/api/articles'),
  getArticle: (id) => request(`/api/articles/${id}`),

  // Results
  saveResult: (articleId, score, maxScore) =>
    request('/api/results', {
      method: 'POST',
      body: JSON.stringify({ article_id: articleId, score, max_score: maxScore }),
    }),

  getMyResults: () => request('/api/results/my'),
  getProgress: () => request('/api/progress'),

  // Leaderboard
  getLeaderboard: () => request('/api/leaderboard'),

  // Chat
  getConversations: () => request('/api/chat/conversations'),
  getMessages: (peer) => request(`/api/chat/messages?peer=${encodeURIComponent(peer)}`),
  sendMessage: (to, text) =>
    request('/api/chat/messages', {
      method: 'POST',
      body: JSON.stringify({ to, text }),
    }),
  getUnreadCount: () => request('/api/chat/unread'),

  // Duels
  getDuels: () => request('/api/duels'),
  createDuel: (opponent) =>
    request('/api/duels', {
      method: 'POST',
      body: JSON.stringify({ opponent }),
    }),
  getDuel: (id) => request(`/api/duels/${id}`),
  acceptDuel: (id) =>
    request(`/api/duels/${id}/accept`, {
      method: 'POST',
    }),
  declineDuel: (id) =>
    request(`/api/duels/${id}/decline`, {
      method: 'POST',
    }),
  finishDuel: (id, answers) =>
    request(`/api/duels/${id}/finish`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),

  // Admin
  createArticle: (article) =>
    request('/api/admin/articles', {
      method: 'POST',
      body: JSON.stringify(article),
    }),

  updateArticle: (id, article) =>
    request(`/api/admin/articles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(article),
    }),

  deleteArticle: (id) =>
    request(`/api/admin/articles/${id}`, {
      method: 'DELETE',
    }),

  getUsers: () => request('/api/admin/users'),

  deleteUser: (id) =>
    request(`/api/admin/users/${id}`, {
      method: 'DELETE',
    }),
};
