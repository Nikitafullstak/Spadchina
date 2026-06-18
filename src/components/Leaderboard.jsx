import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useUser } from '../contexts/UserContext.jsx';

export default function Leaderboard({ onMessageUser, onBattleUser }) {
  const { user } = useUser();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    api.getLeaderboard()
      .then(setEntries)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selectedProfile) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setSelectedProfile(null);
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedProfile]);

  const leaderPoints = entries[0]?.points || 0;

  const selectedRank = useMemo(() => {
    if (!selectedProfile) return 0;
    return entries.findIndex((entry) => entry.username === selectedProfile.username) + 1;
  }, [entries, selectedProfile]);

  const getProfileAchievements = (entry, rank) => [
    {
      title: 'Первые шаги',
      text: 'Прошёл хотя бы одну статью',
      unlocked: entry.completed_count > 0,
    },
    {
      title: 'Меткий ответ',
      text: 'Набрал правильные ответы в заданиях',
      unlocked: entry.correct_count > 0,
    },
    {
      title: 'В топе',
      text: 'Попал в первую тройку лидеров',
      unlocked: rank > 0 && rank <= 3,
    },
    {
      title: 'Сильный темп',
      text: 'Собрал 100+ баллов',
      unlocked: entry.points >= 100,
    },
  ];

  const getAccuracy = (entry) => {
    const maxKnownAnswers = Math.max(entry.completed_count * 3, entry.correct_count);
    return maxKnownAnswers ? Math.round((entry.correct_count / maxKnownAnswers) * 100) : 0;
  };

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="section-kicker">Соревнование</span>
            <h2 className="section-title">Таблица лидеров</h2>
            <p className="section-subtitle">Те, кто справляются с заданиями без ошибок.</p>
          </div>
          <button
            className="btn-secondary leaderboard-refresh"
            onClick={load}
            disabled={loading}
          >
            {loading ? 'Обновление…' : 'Обновить'}
          </button>
        </div>

        {error && <div className="alert error">Ошибка загрузки: {error}</div>}

        {loading && !entries.length ? (
          <div className="loading-state">
            <span className="spinner" />
            Загрузка таблицы лидеров
          </div>
        ) : (
          <div className="leaderboard-card">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Место</th>
                  <th>Участник</th>
                  <th>Правильно сделано</th>
                  <th>Пройдено статей</th>
                  <th>Баллы</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => {
                  const place = index + 1;
                  const isMe = user && user.username === entry.username;
                  return (
                    <tr
                      key={entry.username}
                      className={`leaderboard-row ${isMe ? 'current-user' : ''}`}
                      onClick={() => setSelectedProfile(entry)}
                      tabIndex={0}
                      role="button"
                      aria-label={`Открыть профиль ${entry.username}`}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedProfile(entry);
                        }
                      }}
                    >
                      <td className="leaderboard-place">
                        {place <= 3 ? (
                          <span className={`leaderboard-medal place-${place}`}>{place}</span>
                        ) : (
                          place
                        )}
                      </td>
                      <td className="leaderboard-name">
                        {entry.username}
                        {isMe && <span className="leaderboard-you">ты</span>}
                      </td>
                      <td className="leaderboard-perfect">{entry.correct_count}</td>
                      <td className="leaderboard-completed">{entry.completed_count}</td>
                      <td className="leaderboard-points">{entry.points}</td>
                    </tr>
                  );
                })}
                {!entries.length && !loading && (
                  <tr>
                    <td colSpan="5" className="leaderboard-empty">
                      Пока никто не прошёл ни одного задания. Стань первым!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {selectedProfile && (
          <div
            className="leader-profile-overlay"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setSelectedProfile(null);
            }}
          >
            <article className="leader-profile-modal" role="dialog" aria-modal="true">
              <button
                className="leader-profile-close"
                type="button"
                onClick={() => setSelectedProfile(null)}
                aria-label="Закрыть профиль"
              >
                x
              </button>

              <div className="leader-profile-hero">
                <div className="leader-profile-avatar">
                  {selectedProfile.username.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <span className="section-kicker">Профиль лидера</span>
                  <h3>{selectedProfile.username}</h3>
                  <p>
                    {selectedRank > 0 ? `${selectedRank} место` : 'Участник'} в таблице лидеров
                    {user?.username === selectedProfile.username ? ' · это ты' : ''}
                  </p>
                </div>
              </div>

              <div className="leader-profile-stats">
                <div>
                  <span>Баллы</span>
                  <strong>{selectedProfile.points}</strong>
                </div>
                <div>
                  <span>Пройдено статей</span>
                  <strong>{selectedProfile.completed_count}</strong>
                </div>
                <div>
                  <span>Правильные ответы</span>
                  <strong>{selectedProfile.correct_count}</strong>
                </div>
                <div>
                  <span>Точность</span>
                  <strong>{getAccuracy(selectedProfile)}%</strong>
                </div>
              </div>

              <div className="leader-profile-progress">
                <div>
                  <span>Прогресс до лидера</span>
                  <strong>
                    {leaderPoints > 0
                      ? `${Math.min(100, Math.round((selectedProfile.points / leaderPoints) * 100))}%`
                      : '0%'}
                  </strong>
                </div>
                <div className="leader-profile-bar">
                  <span
                    style={{
                      width: `${leaderPoints > 0
                        ? Math.min(100, Math.round((selectedProfile.points / leaderPoints) * 100))
                        : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="leader-profile-columns">
                <div>
                  <h4>Достижения</h4>
                  <div className="leader-profile-achievements">
                    {getProfileAchievements(selectedProfile, selectedRank).map((achievement) => (
                      <span
                        key={achievement.title}
                        className={achievement.unlocked ? 'unlocked' : 'locked'}
                        title={achievement.text}
                      >
                        {achievement.title}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4>Решённые задачи</h4>
                  <ul className="leader-profile-list">
                    <li>{selectedProfile.completed_count} статей закрыто</li>
                    <li>{selectedProfile.correct_count} правильных ответов</li>
                    <li>{selectedProfile.points} баллов в общем зачёте</li>
                  </ul>
                </div>
              </div>

              <div className="leader-profile-actions">
                <button
                  className="btn-primary"
                  type="button"
                  onClick={() => onMessageUser?.(selectedProfile.username)}
                  disabled={user?.username === selectedProfile.username}
                >
                  Написать
                </button>
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => onBattleUser?.(selectedProfile.username)}
                  disabled={user?.username === selectedProfile.username}
                >
                  Батл
                </button>
              </div>
            </article>
          </div>
        )}
      </div>
    </section>
  );
}
