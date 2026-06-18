import { useUser } from '../contexts/UserContext.jsx';
import { api } from '../api.js';

export default function QuizResult({ article, score, onBack }) {
  const { user } = useUser();
  const maxScore = article.questions.length;
  const percent = Math.round((score / maxScore) * 100);

  const getMessage = () => {
    if (percent === 100) return 'Идеально! Ты настоящий знаток.';
    if (percent >= 75) return 'Отличный результат. Уверенно идешь дальше.';
    if (percent >= 50) return 'Неплохо, но есть куда расти.';
    return 'Попробуй перечитать статью и пройти тест снова.';
  };

  const handleSave = async () => {
    try {
      await api.saveResult(article.id, score, maxScore);
      onBack();
    } catch (err) {
      alert('Ошибка сохранения: ' + err.message);
    }
  };

  return (
    <section className="section">
      <div className="container result-container">
        <div className="result-card">
          <div className={`result-score ${percent === 100 ? 'perfect' : ''}`}>
            <span className="result-number">{score}</span>
            <span className="result-divider">/</span>
            <span className="result-max">{maxScore}</span>
          </div>

          <h2>Результат викторины</h2>
          <p className="result-message">{getMessage()}</p>

          <div className="result-details">
            <div className="result-detail">
              <span>Правильных ответов</span>
              <strong>{percent}%</strong>
            </div>
            <div className="result-detail">
              <span>Заработано баллов</span>
              <strong>+{score * 10 + (percent === 100 ? 20 : percent >= 70 ? 10 : 0)}</strong>
            </div>
          </div>

          <div className="result-actions">
            {user ? (
              <button className="btn-primary btn-large" onClick={handleSave}>
                Сохранить результат
              </button>
            ) : (
              <button className="btn-primary btn-large" onClick={onBack}>
                Вернуться к каталогу
              </button>
            )}
            {user && (
              <button className="btn-ghost" onClick={onBack}>
                Не сохранять
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
