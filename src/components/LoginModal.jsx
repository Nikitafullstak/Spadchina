import { useState } from 'react';
import { useUser } from '../contexts/UserContext.jsx';

export default function LoginModal({ isOpen, onClose }) {
  const { login, register, error } = useUser();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLocalError(null);

    const ok = mode === 'login'
      ? await login(username, password)
      : await register(username, password);

    setLoading(false);

    if (ok) {
      setUsername('');
      setPassword('');
      onClose();
    } else {
      setLocalError(error || 'Ошибка авторизации');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{mode === 'login' ? 'Вход' : 'Регистрация'}</h2>
        <p>
          {mode === 'login'
            ? 'Введи логин и пароль, чтобы продолжить обучение.'
            : 'Создай аккаунт, чтобы сохранять прогресс.'}
        </p>

        <div className="auth-toggle">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => setMode('login')}
          >
            Вход
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'active' : ''}
            onClick={() => setMode('register')}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="form-row">
            <span className="muted">Логин</span>
          <input
            type="text"
            placeholder="Логин"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
          />
          </label>
          <label className="form-row">
            <span className="muted">Пароль</span>
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          </label>

          {(localError || error) && (
            <div className="auth-error">{localError || error}</div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="btn-primary" disabled={loading || !username || !password}>
              {loading ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
