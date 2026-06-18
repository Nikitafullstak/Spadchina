import { useState, useEffect } from 'react';
import { api } from '../api.js';

const emptyArticle = {
  title: '',
  category: 'history',
  categoryLabel: 'История',
  difficulty: 'easy',
  difficultyLabel: 'Лёгкий',
  readTime: 4,
  image: '',
  content: '[{"type":"lead","text":""}]',
  questions: '[]',
};

export default function AdminPanel() {
  const [articles, setArticles] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('articles');
  const [form, setForm] = useState({ ...emptyArticle });
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    Promise.all([api.getArticles(), api.getUsers()])
      .then(([arts, usrs]) => {
        setArticles(arts);
        setUsers(usrs);
      })
      .catch((err) => setError(err.message));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    try {
      if (editingId) {
        await api.updateArticle(editingId, form);
        setMessage('Статья обновлена');
      } else {
        await api.createArticle(form);
        setMessage('Статья создана');
      }
      setForm({ ...emptyArticle });
      setEditingId(null);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (article) => {
    setForm({
      title: article.title,
      category: article.category,
      categoryLabel: article.categoryLabel,
      difficulty: article.difficulty,
      difficultyLabel: article.difficultyLabel,
      readTime: article.readTime,
      image: article.image,
      content: article.content,
      questions: article.questions,
    });
    setEditingId(article.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteArticle = async (id) => {
    if (!confirm('Удалить статью?')) return;
    try {
      await api.deleteArticle(id);
      loadData();
      setMessage('Статья удалена');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('Удалить пользователя?')) return;
    try {
      await api.deleteUser(id);
      loadData();
      setMessage('Пользователь удалён');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="section-kicker">Управление</span>
            <h2 className="section-title">Панель администратора</h2>
            <p className="section-subtitle">Добавляй материалы, редактируй викторины и управляй пользователями.</p>
          </div>
        </div>

        {message && <div className="alert success">{message}</div>}
        {error && <div className="alert error">{error}</div>}

        <div className="admin-tabs">
          <button
            className={activeTab === 'articles' ? 'active' : ''}
            onClick={() => setActiveTab('articles')}
          >
            Статьи
          </button>
          <button
            className={activeTab === 'users' ? 'active' : ''}
            onClick={() => setActiveTab('users')}
          >
            Пользователи
          </button>
        </div>

        {activeTab === 'articles' && (
          <>
            <div className="admin-form-card">
              <h3>{editingId ? 'Редактировать статью' : 'Добавить статью'}</h3>
              <form onSubmit={handleSubmit} className="admin-form">
                <label className="form-row">
                  <span className="muted">Заголовок</span>
                  <input name="title" value={form.title} onChange={handleChange} placeholder="Заголовок" required />
                </label>
                <div className="form-row grid-2">
                  <label className="form-row">
                    <span className="muted">Категория</span>
                    <select name="category" value={form.category} onChange={handleChange}>
                      <option value="history">history</option>
                      <option value="culture">culture</option>
                      <option value="nature">nature</option>
                      <option value="traditions">traditions</option>
                    </select>
                  </label>
                  <label className="form-row">
                    <span className="muted">Название категории</span>
                    <input name="categoryLabel" value={form.categoryLabel} onChange={handleChange} placeholder="Название категории" required />
                  </label>
                </div>
                <div className="form-row grid-2">
                  <label className="form-row">
                    <span className="muted">Сложность</span>
                    <select name="difficulty" value={form.difficulty} onChange={handleChange}>
                      <option value="easy">easy</option>
                      <option value="medium">medium</option>
                      <option value="hard">hard</option>
                    </select>
                  </label>
                  <label className="form-row">
                    <span className="muted">Название сложности</span>
                    <input name="difficultyLabel" value={form.difficultyLabel} onChange={handleChange} placeholder="Название сложности" required />
                  </label>
                </div>
                <div className="form-row grid-2">
                  <label className="form-row">
                    <span className="muted">Время чтения, мин</span>
                    <input name="readTime" type="number" value={form.readTime} onChange={handleChange} placeholder="Время чтения" required />
                  </label>
                  <label className="form-row">
                    <span className="muted">URL изображения</span>
                    <input name="image" value={form.image} onChange={handleChange} placeholder="URL изображения" required />
                  </label>
                </div>
                <label className="form-row">
                  <span className="muted">Контент, JSON массив</span>
                  <textarea name="content" value={form.content} onChange={handleChange} rows="6" placeholder="Контент (JSON массив)" required />
                </label>
                <label className="form-row">
                  <span className="muted">Вопросы, JSON массив</span>
                  <textarea name="questions" value={form.questions} onChange={handleChange} rows="6" placeholder="Вопросы (JSON массив)" required />
                </label>
                <div className="form-actions">
                  <button type="submit" className="btn-primary">
                    {editingId ? 'Сохранить' : 'Создать'}
                  </button>
                  {editingId && (
                    <button type="button" className="btn-ghost" onClick={() => { setEditingId(null); setForm({ ...emptyArticle }); }}>
                      Отмена
                    </button>
                  )}
                </div>
              </form>
            </div>

            <h3>Список статей</h3>
            <div className="admin-list">
              {articles.map((article) => (
                <div key={article.id} className="admin-list-item">
                  <div>
                    <strong>{article.title}</strong>
                    <span className="admin-list-meta">{article.categoryLabel} • {article.difficultyLabel}</span>
                  </div>
                  <div className="admin-list-actions">
                    <button className="btn-ghost" onClick={() => handleEdit(article)}>Редактировать</button>
                    <button className="btn-danger" onClick={() => handleDeleteArticle(article.id)}>Удалить</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'users' && (
          <div className="admin-list">
            {users.map((user) => (
              <div key={user.id} className="admin-list-item">
                <div>
                  <strong>{user.username}</strong>
                  <span className="admin-list-meta">{user.role} • {user.points} баллов</span>
                </div>
                {user.role !== 'admin' && (
                  <button className="btn-danger" onClick={() => handleDeleteUser(user.id)}>
                    Удалить
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
