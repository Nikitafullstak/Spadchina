import { useState, useEffect, useMemo } from 'react';
import { api } from '../api.js';
import { useUser } from '../contexts/UserContext.jsx';

const allAchievements = [
  {
    id: 'first_steps',
    title: 'Первые шаги',
    description: 'Пройди первую статью',
    icon: '👣',
    progress: (data) => ({ current: Math.min(data.completed, 1), total: 1 }),
    isUnlocked: (data) => data.completed >= 1,
  },
  {
    id: 'explorer_bronze',
    title: 'Искатель',
    description: 'Пройди 5 статей',
    icon: '🧭',
    progress: (data) => ({ current: Math.min(data.completed, 5), total: 5 }),
    isUnlocked: (data) => data.completed >= 5,
  },
  {
    id: 'explorer_silver',
    title: 'Путешественник',
    description: 'Пройди 15 статей',
    icon: '🗺️',
    progress: (data) => ({ current: Math.min(data.completed, 15), total: 15 }),
    isUnlocked: (data) => data.completed >= 15,
  },
  {
    id: 'explorer_gold',
    title: 'Исследователь',
    description: 'Пройди все статьи',
    icon: '🏆',
    progress: (data) => ({ current: Math.min(data.completed, data.total), total: data.total }),
    isUnlocked: (data) => data.completed >= data.total,
  },
  {
    id: 'accuracy_bronze',
    title: 'Внимательный',
    description: 'Дай 10 правильных ответов',
    icon: '🎯',
    progress: (data) => ({ current: Math.min(data.correct, 10), total: 10 }),
    isUnlocked: (data) => data.correct >= 10,
  },
  {
    id: 'accuracy_silver',
    title: 'Эрудит',
    description: 'Дай 50 правильных ответов',
    icon: '📚',
    progress: (data) => ({ current: Math.min(data.correct, 50), total: 50 }),
    isUnlocked: (data) => data.correct >= 50,
  },
  {
    id: 'accuracy_gold',
    title: 'Эксперт',
    description: 'Дай 100 правильных ответов',
    icon: '🎓',
    progress: (data) => ({ current: Math.min(data.correct, 100), total: 100 }),
    isUnlocked: (data) => data.correct >= 100,
  },
  {
    id: 'perfect_score',
    title: 'Безупречно',
    description: 'Пройди одну статью на 100%',
    icon: '⭐',
    progress: (data) => ({ current: Math.min(data.perfect, 1), total: 1 }),
    isUnlocked: (data) => data.perfect >= 1,
  },
  {
    id: 'perfect_master',
    title: 'Мастер идеала',
    description: 'Пройди 5 статей на 100%',
    icon: '💯',
    progress: (data) => ({ current: Math.min(data.perfect, 5), total: 5 }),
    isUnlocked: (data) => data.perfect >= 5,
  },
  {
    id: 'points_bronze',
    title: 'Новичок',
    description: 'Заработай 100 баллов',
    icon: '🥉',
    progress: (data) => ({ current: Math.min(data.points, 100), total: 100 }),
    isUnlocked: (data) => data.points >= 100,
  },
  {
    id: 'points_silver',
    title: 'Профи',
    description: 'Заработай 500 баллов',
    icon: '🥈',
    progress: (data) => ({ current: Math.min(data.points, 500), total: 500 }),
    isUnlocked: (data) => data.points >= 500,
  },
  {
    id: 'points_gold',
    title: 'Легенда',
    description: 'Заработай 1000 баллов',
    icon: '🥇',
    progress: (data) => ({ current: Math.min(data.points, 1000), total: 1000 }),
    isUnlocked: (data) => data.points >= 1000,
  },
];

function useAchievementData(user, results, progress) {
  return useMemo(() => {
    if (!user || !progress) {
      return { completed: 0, total: 0, correct: 0, perfect: 0, points: 0 };
    }

    const completed = progress.completed || 0;
    const total = progress.total || 0;
    const correct = results.reduce((sum, r) => sum + (r.score || 0), 0);
    const perfect = results.filter((r) => r.score === r.max_score && r.max_score > 0).length;
    const points = user.points || 0;

    return { completed, total, correct, perfect, points };
  }, [user, results, progress]);
}

export default function Achievements() {
  const { user } = useUser();
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    Promise.all([api.getMyResults(), api.getProgress()])
      .then(([resultsData, progressData]) => {
        setResults(resultsData);
        setProgress(progressData);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const data = useAchievementData(user, results, progress);

  const achievementsWithState = useMemo(() => {
    return allAchievements.map((ach) => {
      const unlocked = ach.isUnlocked(data);
      const progressInfo = ach.progress(data);
      const percent = progressInfo.total > 0
        ? Math.round((progressInfo.current / progressInfo.total) * 100)
        : 0;
      return { ...ach, unlocked, progressInfo, percent };
    });
  }, [data]);

  const unlockedCount = achievementsWithState.filter((a) => a.unlocked).length;

  if (!user) {
    return (
      <section className="section">
        <div className="container">
          <div className="login-gate">
            <span className="section-kicker">Награды</span>
            <h2 className="section-title">Достижения откроются после входа</h2>
            <p className="section-subtitle">
              Изучай достопримечательности и проходи викторины, чтобы собирать личные награды.
            </p>
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
          Загрузка достижений
        </div>
      </div>
    );
  }

  return (
    <section className="section achievements-section">
      <div className="container">
        <div className="section-head achievements-head">
          <div>
            <span className="section-kicker">Награды</span>
            <h2 className="section-title">Достижения</h2>
            <p className="section-subtitle">
              Выполняй задания, получай награды и становись настоящим знатоком Беларуси.
            </p>
          </div>
          <div className="achievements-counter">
            <span>{unlockedCount}</span>
            <span>из {achievementsWithState.length}</span>
          </div>
        </div>

        <div className="achievements-grid">
          {achievementsWithState.map((ach) => (
            <div
              key={ach.id}
              className={`achievement-card ${ach.unlocked ? 'unlocked' : 'locked'}`}
            >
              <div className="achievement-icon">{ach.icon}</div>
              <div className="achievement-body">
                <h3>{ach.title}</h3>
                <p>{ach.description}</p>
                <div className="achievement-progress">
                  <div className="achievement-progress-bar">
                    <span style={{ width: `${ach.percent}%` }} />
                  </div>
                  <span className="achievement-progress-text">
                    {ach.progressInfo.current} / {ach.progressInfo.total}
                  </span>
                </div>
              </div>
              <div className="achievement-status">
                {ach.unlocked ? (
                  <>
                    <span>Разблокировано</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </>
                ) : (
                  <span>В процессе</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
