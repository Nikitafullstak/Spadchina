import { useEffect, useMemo, useState } from 'react';
import { useUser } from '../contexts/UserContext.jsx';

const shopItems = [
  {
    id: 'mir-castle-card',
    type: 'NFT-карточка',
    title: 'Хранитель Мирского замка',
    description: 'Профильная карточка с замковым стилем и синей рамкой.',
    price: 80,
    preview: 'МИР',
    theme: 'blue',
  },
  {
    id: 'nesvizh-gold',
    type: 'NFT-карточка',
    title: 'Золото Несвижа',
    description: 'Тёплая карточка для тех, кто любит дворцы и легенды.',
    price: 120,
    preview: 'Н',
    theme: 'gold',
  },
  {
    id: 'brest-fortress',
    type: 'Стикер',
    title: 'Крепость-герой',
    description: 'Стикер стойкости для профиля после исторических викторин.',
    price: 70,
    preview: 'БРЕСТ',
    theme: 'steel',
  },
  {
    id: 'bison-badge',
    type: 'Стикер',
    title: 'Зубр Беловежья',
    description: 'Знак природного маршрута и спокойной силы.',
    price: 60,
    preview: 'ЗУБР',
    theme: 'green',
  },
  {
    id: 'braslav-water',
    type: 'Фон профиля',
    title: 'Браславская вода',
    description: 'Мягкий бирюзовый фон для профиля и карточки пользователя.',
    price: 95,
    preview: 'ОЗЁРА',
    theme: 'aqua',
  },
  {
    id: 'kalozha-stone',
    type: 'Рамка',
    title: 'Камни Каложи',
    description: 'Минималистичная рамка с мотивом древней кладки.',
    price: 110,
    preview: 'XII',
    theme: 'violet',
  },
  {
    id: 'duel-champion-frame',
    type: 'Редкая рамка',
    title: 'Победитель дуэли',
    description: 'Выдаётся только за победу в культурной дуэли.',
    price: 0,
    preview: 'VS',
    theme: 'gold',
  },
];

function getShopState(username) {
  const raw = localStorage.getItem(`cultcode_shop_${username}`);
  if (!raw) {
    return { owned: [], active: null, spent: 0 };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      owned: Array.isArray(parsed.owned) ? parsed.owned : [],
      active: parsed.active || null,
      spent: Number(parsed.spent) || 0,
    };
  } catch {
    return { owned: [], active: null, spent: 0 };
  }
}

function saveShopState(username, state) {
  localStorage.setItem(`cultcode_shop_${username}`, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent('cultcode-decoration-change'));
}

export default function Shop({ onLoginOpen }) {
  const { user } = useUser();
  const [message, setMessage] = useState(null);
  const [shopState, setShopState] = useState(() => (
    user ? getShopState(user.username) : { owned: [], active: null, spent: 0 }
  ));

  useEffect(() => {
    setShopState(user ? getShopState(user.username) : { owned: [], active: null, spent: 0 });
  }, [user]);

  const activeItem = useMemo(
    () => shopItems.find((item) => item.id === shopState.active),
    [shopState.active]
  );

  if (!user) {
    return (
      <section className="section">
        <div className="container">
          <div className="shop-gate">
            <span className="section-kicker">Магазин</span>
            <h2 className="section-title">Украшения покупаются за баллы</h2>
            <p className="section-subtitle">
              Войди в аккаунт, проходи задания и трать заработанные баллы на NFT-карточки,
              стикеры и рамки для профиля.
            </p>
            <button className="btn-primary btn-large" onClick={onLoginOpen}>
              Войти и открыть магазин
            </button>
          </div>
        </div>
      </section>
    );
  }

  const balance = Math.max(user.points - shopState.spent, 0);

  const updateState = (nextState) => {
    setShopState(nextState);
    saveShopState(user.username, nextState);
  };

  const handleBuy = (item) => {
    if (shopState.owned.includes(item.id)) {
      return;
    }

    if (balance < item.price) {
      setMessage(`Не хватает ${item.price - balance} баллов.`);
      return;
    }

    const nextState = {
      owned: [...shopState.owned, item.id],
      active: item.id,
      spent: shopState.spent + item.price,
    };

    updateState(nextState);
    setMessage(`Покупка готова: «${item.title}» теперь украшает профиль.`);
  };

  const handleActivate = (item) => {
    const nextState = { ...shopState, active: item.id };
    updateState(nextState);
    setMessage(`Активировано украшение «${item.title}».`);
  };

  return (
    <section className="section shop-page">
      <div className="container">
        <div className="shop-hero">
          <div>
            <span className="section-kicker">Магазин наград</span>
            <h2 className="section-title">Покупай украшения за баллы</h2>
            <p className="section-subtitle">
              Баллы ты получаешь за правильные ответы. Здесь их можно обменять на
              декоративные карточки, стикеры и рамки для профиля.
            </p>
          </div>

          <div className="shop-wallet">
            <span>Доступно</span>
            <strong>{balance}</strong>
            <small>из {user.points} заработанных баллов</small>
          </div>
        </div>

        {message && <div className="alert success">{message}</div>}

        <div className="profile-preview">
          <div className={`profile-preview-card ${activeItem ? `shop-theme-${activeItem.theme}` : ''}`}>
            <div className="profile-avatar">{user.username.slice(0, 1).toUpperCase()}</div>
            <div>
              <span className="muted">Твой профиль</span>
              <h3>{user.username}</h3>
              <p>{activeItem ? activeItem.title : 'Пока без украшения'}</p>
            </div>
          </div>
          <div className="profile-preview-info">
            <strong>Как это работает</strong>
            <span>Купленный предмет остаётся в инвентаре браузера. Активный предмет показывается в шапке рядом с именем.</span>
          </div>
        </div>

        <div className="shop-grid">
          {shopItems.map((item) => {
            const owned = shopState.owned.includes(item.id);
            const active = shopState.active === item.id;
            const canBuy = balance >= item.price;

            return (
              <article key={item.id} className={`shop-item shop-theme-${item.theme}`}>
                <div className="shop-item-preview">
                  <span>{item.preview}</span>
                </div>
                <div className="shop-item-body">
                  <span className="shop-item-type">{item.type}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <div className="shop-item-footer">
                    <strong>{item.price} баллов</strong>
                    {owned ? (
                      <button
                        className={active ? 'btn-secondary' : 'btn-primary'}
                        disabled={active}
                        onClick={() => handleActivate(item)}
                      >
                        {active ? 'Активно' : 'Надеть'}
                      </button>
                    ) : (
                      <button
                        className="btn-primary"
                        disabled={!canBuy}
                        onClick={() => handleBuy(item)}
                      >
                        {canBuy ? 'Купить' : 'Не хватает'}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
