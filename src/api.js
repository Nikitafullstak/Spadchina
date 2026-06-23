import { articles as localArticles } from './data/articles.js';

const API_URL = import.meta.env.VITE_API_URL || '';
const DEMO_DB_KEY = 'spadchina_demo_db';
const FORCE_DEMO = window.location.hostname.endsWith('github.io');

function getToken() {
  return localStorage.getItem('cultcode_token');
}

function readDemoDB() {
  const fallback = {
    users: [
      { id: 0, username: 'admin', name: 'admin', email: 'n4963959@gmail.com', password: 'admin123', role: 'admin', points: 100 },
      { id: 1, username: 'Nikita', name: 'Nikita', email: 'nikita@demo.test', password: 'demo', role: 'user', points: 20 },
      { id: 2, username: 'andrew', name: 'andrew', email: 'andrew@demo.test', password: 'demo', role: 'user', points: 60 },
    ],
    results: [],
    messages: [],
    duels: [],
    teamBattles: [],
  };

  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(DEMO_DB_KEY) || '{}') };
  } catch {
    return fallback;
  }
}

function writeDemoDB(db) {
  localStorage.setItem(DEMO_DB_KEY, JSON.stringify(db));
}

function currentDemoUser(db = readDemoDB()) {
  const token = getToken();
  if (!token?.startsWith('demo:')) return null;
  const id = Number(token.slice(5));
  return db.users.find((user) => user.id === id) || null;
}

function publicUser(user) {
  if (!user) return null;
  const safeUser = { ...user };
  delete safeUser.password;
  return safeUser;
}

function requireDemoUser(db) {
  const user = currentDemoUser(db);
  if (!user) throw new Error('missing token');
  return user;
}

function getJSONBody(options) {
  return options.body ? JSON.parse(options.body) : {};
}

function normalizeArticle(article) {
  return {
    ...article,
    category_label: article.categoryLabel,
    difficulty_label: article.difficultyLabel,
    read_time: article.readTime,
  };
}

function demoProgress(db, user) {
  const results = db.results.filter((item) => item.user_id === user.id);
  return {
    completed: results.length,
    total: localArticles.length,
    points: user.points || 0,
  };
}

function demoLeaderboard(db) {
  return db.users
    .map((user) => {
      const results = db.results.filter((item) => item.user_id === user.id);
      return {
        username: user.username,
        name: user.name,
        points: user.points || 0,
        completed_count: results.length,
        correct_count: results.reduce((sum, item) => sum + (item.score || 0), 0),
      };
    })
    .sort((a, b) => b.points - a.points);
}

async function demoRequest(path, options = {}) {
  const db = readDemoDB();
  const method = options.method || 'GET';

  if (path === '/api/register' && method === 'POST') {
    const body = getJSONBody(options);
    const email = String(body.email || '').trim().toLowerCase();
    const username = String(body.name || email.split('@')[0] || 'user').trim();
    if (!email || !body.password) throw new Error('Заполни email и пароль');
    const existing = db.users.find((user) => user.email === email || user.username === username);
    if (existing) {
      existing.password = String(body.password);
      existing.name = existing.name || username;
      writeDemoDB(db);
      return { token: `demo:${existing.id}`, user: publicUser(existing) };
    }
    const user = {
      id: Date.now(),
      username,
      name: username,
      email,
      password: String(body.password),
      role: email === 'n4963959@gmail.com' ? 'admin' : 'user',
      points: 0,
    };
    db.users.push(user);
    writeDemoDB(db);
    return { token: `demo:${user.id}`, user: publicUser(user) };
  }

  if (path === '/api/login' && method === 'POST') {
    const body = getJSONBody(options);
    const email = String(body.email || '').trim().toLowerCase();
    let user = db.users.find((item) => item.email === email);
    if (!user) {
      user = {
        id: Date.now(),
        username: email.split('@')[0] || 'user',
        name: email.split('@')[0] || 'user',
        email,
        password: String(body.password),
        role: email === 'n4963959@gmail.com' ? 'admin' : 'user',
        points: 0,
      };
      db.users.push(user);
      writeDemoDB(db);
    }
    return { token: `demo:${user.id}`, user: publicUser(user) };
  }

  if (path === '/api/me') return publicUser(requireDemoUser(db));
  if (path === '/api/articles') return localArticles.map(normalizeArticle);

  if (path.startsWith('/api/articles/')) {
    const id = Number(path.split('/').pop());
    const article = localArticles.find((item) => item.id === id);
    if (!article) throw new Error('Статья не найдена');
    return normalizeArticle(article);
  }

  if (path === '/api/results' && method === 'POST') {
    const user = requireDemoUser(db);
    const body = getJSONBody(options);
    const existing = db.results.find((item) => item.user_id === user.id && item.article_id === body.article_id);
    const result = {
      id: existing?.id || Date.now(),
      user_id: user.id,
      article_id: body.article_id,
      score: body.score,
      max_score: body.max_score,
    };
    if (existing) Object.assign(existing, result);
    else db.results.push(result);
    user.points = db.results
      .filter((item) => item.user_id === user.id)
      .reduce((sum, item) => sum + (item.score || 0) * 10, 0);
    writeDemoDB(db);
    return { status: 'saved', points: user.points };
  }

  if (path === '/api/results/my') {
    const user = requireDemoUser(db);
    return db.results.filter((item) => item.user_id === user.id);
  }

  if (path === '/api/progress') return demoProgress(db, requireDemoUser(db));
  if (path === '/api/leaderboard') return demoLeaderboard(db);
  if (path === '/api/suggestions' && method === 'POST') return { status: 'sent' };

  if (path === '/api/chat/unread') return { unread_count: 0 };

  if (path === '/api/chat/conversations') {
    const user = requireDemoUser(db);
    return db.users
      .filter((item) => item.id !== user.id)
      .map((item) => ({
        username: item.username,
        points: item.points || 0,
        last_message: db.messages.findLast?.((msg) => (
          (msg.sender === user.username && msg.receiver === item.username)
          || (msg.sender === item.username && msg.receiver === user.username)
        ))?.text || `${item.points || 0} баллов`,
        unread_count: 0,
      }));
  }

  if (path.startsWith('/api/chat/messages') && method === 'GET') {
    const user = requireDemoUser(db);
    const peer = new URLSearchParams(path.split('?')[1] || '').get('peer');
    return db.messages.filter((msg) => (
      (msg.sender === user.username && msg.receiver === peer)
      || (msg.sender === peer && msg.receiver === user.username)
    ));
  }

  if (path === '/api/chat/messages' && method === 'POST') {
    const user = requireDemoUser(db);
    const body = getJSONBody(options);
    const message = {
      id: Date.now(),
      sender: user.username,
      receiver: body.to,
      text: body.text,
      created_at: new Date().toISOString(),
    };
    db.messages.push(message);
    writeDemoDB(db);
    return message;
  }

  if (path === '/api/duels' && method === 'POST') return { status: 'created' };
  if (path === '/api/duels') return db.duels;
  if (path.startsWith('/api/duels/')) return { status: 'ok', questions: [] };

  if (path === '/api/team-battles/categories') {
    return [
      { category: 'history', category_label: 'История' },
      { category: 'culture', category_label: 'Культура' },
      { category: 'nature', category_label: 'Природа' },
    ];
  }
  if (path.startsWith('/api/team-battles')) return { status: 'ok', participants: [], questions: [] };

  if (path === '/api/admin/users') return db.users.map(publicUser);
  if (path === '/api/admin/articles') return localArticles.map(normalizeArticle);
  if (path.startsWith('/api/admin/')) return { status: 'ok' };

  throw new Error('Демо-режим: этот API пока недоступен');
}

async function request(path, options = {}) {
  if (FORCE_DEMO) return demoRequest(path, options);

  const url = `${API_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(url, { ...options, headers });
    const text = await res.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: text || 'Invalid response' };
    }

    if (res.ok) return data;
    if (res.status !== 404) throw new Error(data.error || `HTTP ${res.status}`);
  } catch (error) {
    if (!API_URL) throw error;
  }

  return demoRequest(path, options);
}

export const api = {
  register: (name, email, password) =>
    request('/api/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),
  login: (email, password) =>
    request('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request('/api/me'),
  getArticles: () => request('/api/articles'),
  getArticle: (id) => request(`/api/articles/${id}`),
  saveResult: (articleId, score, maxScore) =>
    request('/api/results', {
      method: 'POST',
      body: JSON.stringify({ article_id: articleId, score, max_score: maxScore }),
    }),
  getMyResults: () => request('/api/results/my'),
  getProgress: () => request('/api/progress'),
  getLeaderboard: () => request('/api/leaderboard'),
  sendSuggestion: (message, user = {}) =>
    request('/api/suggestions', {
      method: 'POST',
      body: JSON.stringify({ message, name: user.name || user.username || '', email: user.email || '' }),
    }),
  getConversations: () => request('/api/chat/conversations'),
  getMessages: (peer) => request(`/api/chat/messages?peer=${encodeURIComponent(peer)}`),
  sendMessage: (to, text) =>
    request('/api/chat/messages', {
      method: 'POST',
      body: JSON.stringify({ to, text }),
    }),
  getUnreadCount: () => request('/api/chat/unread'),
  getDuels: () => request('/api/duels'),
  createDuel: (opponent) =>
    request('/api/duels', {
      method: 'POST',
      body: JSON.stringify({ opponent }),
    }),
  getDuel: (id) => request(`/api/duels/${id}`),
  acceptDuel: (id) => request(`/api/duels/${id}/accept`, { method: 'POST' }),
  declineDuel: (id) => request(`/api/duels/${id}/decline`, { method: 'POST' }),
  finishDuel: (id, answers) =>
    request(`/api/duels/${id}/finish`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),
  getTeamBattleCategories: () => request('/api/team-battles/categories'),
  checkTeamBattleCode: (code) => request(`/api/team-battles/check?code=${encodeURIComponent(code)}`),
  getTeamBattle: (code) => request(`/api/team-battles/${encodeURIComponent(code)}`),
  createTeamBattle: (code, category, questionCount) =>
    request('/api/team-battles', {
      method: 'POST',
      body: JSON.stringify({ code, category, question_count: questionCount }),
    }),
  joinTeamBattle: (code) => request(`/api/team-battles/${encodeURIComponent(code)}/join`, { method: 'POST' }),
  startTeamBattle: (code) => request(`/api/team-battles/${encodeURIComponent(code)}/start`, { method: 'POST' }),
  finishTeamBattle: (code, answers) =>
    request(`/api/team-battles/${encodeURIComponent(code)}/finish`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),
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
  deleteArticle: (id) => request(`/api/admin/articles/${id}`, { method: 'DELETE' }),
  getUsers: () => request('/api/admin/users'),
  deleteUser: (id) => request(`/api/admin/users/${id}`, { method: 'DELETE' }),
};
