import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useUser } from '../contexts/UserContext.jsx';
import Icon from './Icon.jsx';

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
  const menuRef = useRef(null);
  const burgerRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shopState, setShopState] = useState(() => getShopState(user?.username));
  const [unreadCount, setUnreadCount] = useState(0);

  const activeDecoration = decorationItems[shopState.active] || null;
  const displayName = user?.name || user?.username || '';
  const profileEmail = user?.email || '';
  const ownedDecorations = shopState.owned
    .map((id) => decorationItems[id])
    .filter(Boolean);

  const tabs = [
    { id: 'home', label: 'Главная' },
    { id: 'library', label: 'Места' },
    { id: 'progress', label: 'Прогресс' },
    { id: 'leaderboard', label: 'Лидеры' },
    { id: 'chat', label: 'Чат' },
    { id: 'duels', label: 'Батлы' },
    { id: 'teams', label: 'Команды' },
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
      if (
        !menuRef.current?.contains(event.target) &&
        !burgerRef.current?.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };

    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setProfileOpen(false);
        setMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handleClick);
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
            <Icon name="map" size={22} />
          </span>
          <span className="logo-text">Спадчына</span>
        </div>

        <nav className={`nav ${menuOpen ? 'nav-open' : ''}`} ref={menuRef}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(tab.id);
                setMenuOpen(false);
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <button
          ref={burgerRef}
          className="burger"
          type="button"
          aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Icon name={menuOpen ? 'xmark' : 'bars'} size={22} />
        </button>

        <div className="user-panel">
          {user ? (
            <div className="profile-menu" ref={profileRef}>
              {unreadCount > 0 && (
                <button
                  className="notification-bell has-unread"
                  type="button"
                  aria-label={`Новые сообщения: ${unreadCount}`}
                  onClick={() => {
                    onOpenChat?.();
                    setProfileOpen(false);
                  }}
                >
                  <Icon name="bell" size={18} />
                  <strong>{unreadCount}</strong>
                </button>
              )}
              <button
                className={`profile-trigger ${activeDecoration ? 'decorated' : ''}`}
                onClick={() => setProfileOpen((open) => !open)}
                aria-expanded={profileOpen}
                aria-label="Открыть профиль"
              >
                <span className="profile-avatar-small">
                  {displayName.slice(0, 1).toUpperCase()}
                  {unreadCount > 0 && <strong className="profile-unread-dot">{unreadCount}</strong>}
                </span>
                <span className="profile-trigger-info">
                  <span>{displayName}</span>
                </span>
              </button>

              {profileOpen && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-scroll">
                    <div className={`profile-card-mini ${activeDecoration ? 'has-decoration' : ''}`}>
                      <span className="profile-avatar-large">{displayName.slice(0, 1).toUpperCase()}</span>
                      <div>
                        <strong>{displayName}</strong>
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
                        className="btn-ghost btn-full profile-message-action"
                        onClick={() => {
                          onOpenChat?.();
                          setProfileOpen(false);
                        }}
                      >
                        <Icon name="bell" size={17} />
                        Сообщения {unreadCount > 0 ? `(${unreadCount})` : ''}
                      </button>
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
                    {profileEmail && (
                      <div className="profile-email">
                        <span>Почта</span>
                        <strong>{profileEmail}</strong>
                      </div>
                    )}
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
