import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useUser } from '../contexts/UserContext.jsx';

const decorationItems = {
  'mir-castle-card': { title: 'Хранитель Мирского замка', short: 'Мир' },
  'nesvizh-gold': { title: 'Золото Несвижа', short: 'Н' },
  'brest-fortress': { title: 'Крепость-герой', short: 'Брест' },
  'bison-badge': { title: 'Зубр Беловежья', short: 'Зубр' },
  'braslav-water': { title: 'Браславская вода', short: 'Озёра' },
  'kalozha-stone': { title: 'Камни Каложи', short: 'XII' },
  'duel-champion-frame': { title: 'Победитель дуэли', short: 'VS' },
};

function getShopState(username) {
  if (!username) return { owned: [], active: null };

  try {
    const state = JSON.parse(localStorage.getItem(`cultcode_shop_${username}`) || '{}');
    return {
      owned: Array.isArray(state.owned) ? state.owned : [],
      active: state.active || null,
    };
  } catch {
    return { owned: [], active: null };
  }
}

export default function Header({ activeTab, setActiveTab, onLoginOpen, onOpenChat, onOpenDuel }) {
  const { user, logout, isAdmin } = useUser();
  const profileRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [shopState, setShopState] = useState(() => getShopState(user?.username));
  const [unreadCount, setUnreadCount] = useState(0);

  const activeDecoration = decorationItems[shopState.active] || null;
  const ownedDecorations = shopState.owned
    .map((id) => decorationItems[id])
    .filter(Boolean);

  const tabs = [
    { id: 'home', label: 'Главная' },
    { id: 'library', label: 'Достопримечательности' },
    { id: 'progress', label: 'Прогресс' },
    { id: 'achievements', label: 'Достижения' },
    { id: 'leaderboard', label: 'Лидеры' },
    { id: 'chat', label: 'Чат' },
    { id: 'duels', label: 'Батлы' },
    { id: 'shop', label: 'Магазин' },
  ];

  useEffect(() => {
    const syncDecoration = () => setShopState(getShopState(user?.username));
    syncDecoration();
    window.addEventListener('cultcode-decoration-change', syncDecoration);
    window.addEventListener('storage', syncDecoration);
    return () => {
      window.removeEventListener('cultcode-decoration-change', syncDecoration);
      window.removeEventListener('storage', syncDecoration);
    };
  }, [user?.username]);

  useEffect(() => {
    const handleClick = (event) => {
      if (!profileRef.current?.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return undefined;
    }

    const loadUnread = () => {
      api.getUnreadCount()
        .then((data) => setUnreadCount(data.unread_count || 0))
        .catch(() => setUnreadCount(0));
    };

    loadUnread();
    const timer = window.setInterval(loadUnread, 7000);
    window.addEventListener('cultcode-chat-read', loadUnread);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('cultcode-chat-read', loadUnread);
    };
  }, [user]);

  if (isAdmin()) {
    tabs.push({ id: 'admin', label: 'Админка' });
  }

  return (
    <header className="header">
      <div className="container header-inner">
        <div className="logo" onClick={() => setActiveTab('home')}>
          <span className="logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M4 21H20V11H18V6L12 2L6 6V11H4V21Z"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M9 21V15H15V21" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 9H14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="logo-text">Спадчына</span>
        </div>

        <nav className="nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="user-panel">
          {user ? (
            <div className="profile-menu" ref={profileRef}>
              <button
                className={`notification-bell ${unreadCount > 0 ? 'has-unread' : ''}`}
                type="button"
                onClick={() => {
                  onOpenChat?.();
                  setProfileOpen(false);
                }}
                aria-label="Открыть непрочитанные сообщения"
              >
                <span>!</span>
                {unreadCount > 0 && <strong>{unreadCount}</strong>}
              </button>
              <button
                className={`profile-trigger ${activeDecoration ? 'decorated' : ''}`}
                onClick={() => setProfileOpen((open) => !open)}
                aria-expanded={profileOpen}
                aria-label="Открыть профиль"
              >
                <span className="profile-avatar-small">{user.username.slice(0, 1).toUpperCase()}</span>
                <span className="profile-trigger-info">
                  <span>{user.username}</span>
                </span>
              </button>

              {profileOpen && (
                <div className="profile-dropdown">
                  <div className={`profile-card-mini ${activeDecoration ? 'has-decoration' : ''}`}>
                    <span className="profile-avatar-large">{user.username.slice(0, 1).toUpperCase()}</span>
                    <div>
                      <strong>{user.username}</strong>
                      <span>{activeDecoration ? activeDecoration.title : 'Профиль без украшения'}</span>
                    </div>
                  </div>

                  <div className="profile-stats-mini">
                    <div>
                      <span>Баллы</span>
                      <strong>{user.points}</strong>
                    </div>
                    <div>
                      <span>NFT и стикеры</span>
                      <strong>{ownedDecorations.length}</strong>
                    </div>
                  </div>

                  <div className="profile-nft-list">
                    <span className="profile-dropdown-label">Коллекция</span>
                    {ownedDecorations.length > 0 ? (
                      <div className="profile-nft-grid">
                        {ownedDecorations.slice(0, 4).map((item) => (
                          <span key={item.title} title={item.title}>{item.short}</span>
                        ))}
                      </div>
                    ) : (
                      <p>Пока пусто. Купи первое украшение в магазине.</p>
                    )}
                  </div>

                  <div className="profile-actions">
                    <button
                      className="btn-primary btn-full"
                      onClick={() => {
                        setActiveTab('shop');
                        setProfileOpen(false);
                      }}
                    >
                      Открыть магазин
                    </button>
                    <button
                      className="btn-ghost btn-full"
                      onClick={() => {
                        setActiveTab('progress');
                        setProfileOpen(false);
                      }}
                    >
                      Мой прогресс
                    </button>
                    <button
                      className="btn-ghost btn-full"
                      onClick={() => {
                        onOpenChat?.();
                        setProfileOpen(false);
                      }}
                    >
                      Сообщения {unreadCount > 0 ? `(${unreadCount})` : ''}
                    </button>
                    <button
                      className="btn-ghost btn-full"
                      onClick={() => {
                        onOpenDuel?.();
                        setProfileOpen(false);
                      }}
                    >
                      Мои батлы
                    </button>
                    <button
                      className="btn-ghost btn-full"
                      onClick={() => {
                        logout();
                        setProfileOpen(false);
                      }}
                    >
                      Выйти
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button className="btn-primary" onClick={onLoginOpen}>
              Войти
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
