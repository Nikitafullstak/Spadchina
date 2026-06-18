import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useUser } from '../contexts/UserContext.jsx';

export default function Progress() {
  const { user } = useUser();
  const [articles, setArticles] = useState([]);
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    Promise.all([api.getArticles(), api.getMyResults(), api.getProgress()])
      .then(([articlesData, resultsData, progressData]) => {
        setArticles(articlesData.map((a) => ({
          ...a,
          content: typeof a.content === 'string' ? JSON.parse(a.content || '[]') : a.content,
        })));
        setResults(resultsData);
        setProgress(progressData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <section className="section">
        <div className="container">
          <div className="login-gate">
            <span className="section-kicker">Профиль</span>
            <h2 className="section-title">Прогресс сохраняется в аккаунте</h2>
            <p className="section-subtitle">Войди, чтобы видеть пройденные достопримечательности, баллы и результаты викторин.</p>
          </div>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <div className="container section">
        <div className="loading-state">
          <span className="spinner" />
          Загрузка прогресса
        </div>
      </div>
    );
  }

  if (error) return <div className="container section error">Ошибка: {error}</div>;

  const percent = progress?.total ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="section-kicker">Личный кабинет</span>
            <h2 className="section-title">Твой прогресс</h2>
            <p className="section-subtitle">Следи за прочитанными материалами и результатами по каждой теме.</p>
          </div>
        </div>

        <div className="progress-overview">
          <div className="progress-circle">
            <svg viewBox="0 0 36 36">
              <path
                className="progress-circle-bg"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="progress-circle-fill"
                strokeDasharray={`${percent}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="progress-circle-text">
              <span>{percent}%</span>
            </div>
          </div>

          <div className="progress-info">
            <div className="progress-stat">
              <span>Изучено мест</span>
              <strong>{progress.completed} из {progress.total}</strong>
            </div>
            <div className="progress-stat">
              <span>Набрано баллов</span>
              <strong>{progress.points}</strong>
            </div>
            <div className="progress-stat">
              <span>Пользователь</span>
              <strong>{user.username}</strong>
            </div>
          </div>
        </div>

        <h3>Список достопримечательностей</h3>
        <div className="progress-list">
          {articles.map((article) => {
            const completed = (results || []).find((c) => c.article_id === article.id);
            return (
              <div key={article.id} className={`progress-item ${completed ? 'done' : ''}`}>
                <span className="progress-item-title">{article.title}</span>
                <span className="progress-item-status">
                  {completed ? `${completed.score}/${completed.max_score}` : 'Не пройдено'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
