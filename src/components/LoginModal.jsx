import { useState } from 'react';
import { useUser } from '../contexts/UserContext.jsx';

export default function LoginModal({ isOpen, onClose }) {
  const { login, register, error } = useUser();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLocalError(null);

    const ok = mode === 'login'
      ? await login(email, password)
      : await register(name, email, password);

    setLoading(false);

    if (ok) {
      setName('');
      setEmail('');
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
            ? 'Введи почту и пароль, чтобы продолжить обучение.'
            : 'Создай аккаунт: имя будет отображаться в профиле.'}
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
          {mode === 'register' && (
            <label className="form-row">
              <span className="muted">Имя</span>
              <input
                type="text"
                placeholder="Как тебя показывать в профиле"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </label>
          )}
          <label className="form-row">
            <span className="muted">Почта</span>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus={mode === 'login'}
            />
          </label>
          <label className="form-row">
            <span className="muted">Пароль</span>
            <input
              type="password"
              placeholder="Минимум 6 символов"
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
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !email || !password || (mode === 'register' && !name)}
            >
              {loading ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
