import { useMemo } from 'react';
import { articles } from '../data/articles.js';
import { useUser } from '../contexts/UserContext.jsx';

const categoryMeta = {
  history: { label: 'История', emoji: '🏰' },
  culture: { label: 'Культура', emoji: '🎭' },
  nature: { label: 'Природа', emoji: '🌲' },
  traditions: { label: 'Традиции', emoji: '🎪' },
  architecture: { label: 'Архитектура', emoji: '🏛️' },
  memorial: { label: 'Память', emoji: '🕯️' },
};

const steps = [
  { title: 'Выбери тему', text: 'Фильтруй материалы по интересам.' },
  { title: 'Читай и изучай', text: 'Короткие статьи с ключевыми фактами.' },
  { title: 'Проходи челленджи', text: 'Отвечай на вопросы и зарабатывай баллы.' },
];

export default function Hero({ onStart, onSelectArticle }) {
  const { user } = useUser();
  const totalQuestions = articles.reduce((sum, article) => sum + article.questions.length, 0);
  const featuredPlaces = articles.slice(0, 3);
  const placeOfDay = useMemo(
    () => articles[Math.floor(Math.random() * articles.length)],
    []
  );

  return (
    <>
      <section className="hero">
        <div className="container hero-content">
          <div className="hero-text">
            {user && <span className="hero-welcome">Привет, {user.username}</span>}
            <span className="hero-label">Интерактивный гид по Беларуси</span>
            <h1>Узнай свою страну не&nbsp;по&nbsp;учебнику</h1>
            <p className="hero-subtitle">
              Замки, древние храмы, национальные парки и городские легенды.
              Изучай Беларусь через короткие материалы и мини-викторины.
            </p>
            <div className="hero-actions">
              <button className="btn-primary btn-large" onClick={onStart}>
                Начать исследование
              </button>
              <button className="btn-ghost btn-large" onClick={onStart}>
                Смотреть каталог
              </button>
            </div>
          </div>

          <div className="hero-spotlight">
            <span className="spotlight-label">Место дня</span>
            <article
              className="spotlight-card"
              style={{ backgroundImage: `url(${placeOfDay.image})` }}
            >
              <div>
                <span className={`badge badge-${placeOfDay.category}`}>{placeOfDay.categoryLabel}</span>
                <h3>{placeOfDay.title}</h3>
                <p>{placeOfDay.region}</p>
              </div>
            </article>
          </div>
        </div>

        <div className="hero-metrics">
          <div className="container metrics-inner">
            <div className="metric">
              <strong>{articles.length}</strong>
              <span>достопримечательностей</span>
            </div>
            <div className="metric">
              <strong>{totalQuestions}</strong>
              <span>вопросов</span>
            </div>
            <div className="metric">
              <strong>6</strong>
              <span>направлений</span>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section categories-section">
        <div className="container">
          <div className="section-head section-head-center">
            <span className="section-kicker">Категории</span>
            <h2 className="section-title">Выбери направление</h2>
          </div>
          <div className="categories-grid clean">
            {Object.entries(categoryMeta).map(([key, meta]) => (
              <button
                key={key}
                className="category-card clean"
                onClick={onStart}
              >
                <span className="category-emoji">{meta.emoji}</span>
                <div>
                  <strong>{meta.label}</strong>
                  <span>{articles.filter((a) => a.category === key).length} мест</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section featured-section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="section-kicker">Популярное</span>
              <h2 className="section-title">С чего начать</h2>
            </div>
          </div>

          <div className="featured-grid">
            {featuredPlaces.map((place) => (
            <article
              className="featured-card"
              key={place.id}
              style={{ backgroundImage: `url(${place.image})` }}
              onClick={() => onSelectArticle?.(place)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectArticle?.(place);
                }
              }}
            >
                <div>
                  <span className={`badge badge-${place.category}`}>{place.categoryLabel}</span>
                  <h3>{place.title}</h3>
                  <p>{place.region} · {place.questions.length} заданий</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section steps-section">
        <div className="container">
          <div className="section-head section-head-center">
            <span className="section-kicker">Как это работает</span>
            <h2 className="section-title">Три шага к знанию</h2>
          </div>
          <div className="steps-grid clean">
            {steps.map((step, index) => (
              <div key={index} className="step-card clean">
                <span className="step-number">0{index + 1}</span>
                <strong>{step.title}</strong>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
