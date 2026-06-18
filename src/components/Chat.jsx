import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { api } from '../api.js';
import { useUser } from '../contexts/UserContext.jsx';

export default function Chat({ initialPeer, onLoginOpen }) {
  const { user } = useUser();
  const [conversations, setConversations] = useState([]);
  const [activePeer, setActivePeer] = useState(initialPeer || '');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [voiceLanguage, setVoiceLanguage] = useState('ru-RU');
  const listRef = useRef(null);
  const transcriptBaseRef = useRef('');
  const {
    interimTranscript,
    finalTranscript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  const activeConversation = useMemo(
    () => conversations.find((item) => item.username === activePeer),
    [activePeer, conversations],
  );

  const loadConversations = useCallback(() => {
    if (!user) return Promise.resolve();
    return api.getConversations()
      .then((data) => {
        setConversations(data);
        if (!activePeer && data.length > 0) setActivePeer(data[0].username);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [activePeer, user]);

  const loadMessages = useCallback((peer) => {
    if (!peer || !user) return Promise.resolve();
    setMessagesLoading(true);
    return api.getMessages(peer)
      .then((data) => {
        setMessages(data);
        window.dispatchEvent(new Event('cultcode-chat-read'));
      })
      .catch((err) => setError(err.message))
      .finally(() => setMessagesLoading(false));
  }, [user]);

  useEffect(() => {
    setActivePeer(initialPeer || '');
  }, [initialPeer]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return undefined;
    }

    loadConversations();
    const timer = window.setInterval(loadConversations, 8000);
    return () => window.clearInterval(timer);
  }, [loadConversations, user]);

  useEffect(() => {
    if (!activePeer || !user) return undefined;

    loadMessages(activePeer);
    const timer = window.setInterval(() => loadMessages(activePeer), 5000);
    return () => window.clearInterval(timer);
  }, [activePeer, loadMessages, user]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!listening && !finalTranscript) return;
    const spokenText = `${finalTranscript} ${interimTranscript}`.trim();
    const nextText = `${transcriptBaseRef.current} ${spokenText}`.trim();
    setDraft(nextText);
  }, [finalTranscript, interimTranscript, listening]);

  const toggleVoiceInput = () => {
    if (!browserSupportsSpeechRecognition) {
      setError('Браузер не поддерживает голосовой ввод. Попробуй Chrome или Edge.');
      return;
    }

    if (listening) {
      SpeechRecognition.stopListening();
      return;
    }

    transcriptBaseRef.current = draft.trim();
    resetTranscript();
    SpeechRecognition.startListening({
      continuous: false,
      language: voiceLanguage,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !activePeer) return;

    SpeechRecognition.stopListening();
    resetTranscript();
    setDraft('');
    try {
      await api.sendMessage(activePeer, text);
      await Promise.all([loadMessages(activePeer), loadConversations()]);
    } catch (err) {
      setError(err.message);
      setDraft(text);
    }
  };

  if (!user) {
    return (
      <section className="section">
        <div className="container">
          <div className="login-gate">
            <span className="section-kicker">Чат</span>
            <h2 className="section-title">Сообщения доступны после входа</h2>
            <p className="section-subtitle">Войди, чтобы писать другим участникам и отвечать на новые сообщения.</p>
            <button className="btn-primary" onClick={onLoginOpen}>Войти</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="section-kicker">Сообщения</span>
            <h2 className="section-title">Чат участников</h2>
            <p className="section-subtitle">Обсуждай задания, договаривайся о батлах и поддерживай других игроков.</p>
          </div>
        </div>

        {error && <div className="alert error">Ошибка чата: {error}</div>}

        <div className="chat-shell">
          <aside className="chat-sidebar">
            <div className="chat-sidebar-head">
              <strong>Диалоги</strong>
              {loading && <span>обновление</span>}
            </div>
            <div className="chat-peers">
              {conversations.map((item) => (
                <button
                  key={item.username}
                  className={`chat-peer ${activePeer === item.username ? 'active' : ''}`}
                  onClick={() => setActivePeer(item.username)}
                >
                  <span className="chat-peer-avatar">{item.username.slice(0, 1).toUpperCase()}</span>
                  <span className="chat-peer-main">
                    <strong>{item.username}</strong>
                    <small>{item.last_message || `${item.points} баллов`}</small>
                  </span>
                  {item.unread_count > 0 && <span className="chat-unread">{item.unread_count}</span>}
                </button>
              ))}
              {!conversations.length && !loading && (
                <p className="chat-empty">Пока нет других участников для диалога.</p>
              )}
            </div>
          </aside>

          <div className="chat-panel">
            {activePeer ? (
              <>
                <div className="chat-panel-head">
                  <span className="chat-peer-avatar">{activePeer.slice(0, 1).toUpperCase()}</span>
                  <div>
                    <strong>{activePeer}</strong>
                    <small>{activeConversation ? `${activeConversation.points} баллов` : 'Новый диалог'}</small>
                  </div>
                </div>

                <div className="chat-messages" ref={listRef}>
                  {messagesLoading && !messages.length ? (
                    <div className="loading-state compact">
                      <span className="spinner" />
                      Загрузка сообщений
                    </div>
                  ) : (
                    messages.map((message) => {
                      const mine = message.sender === user.username;
                      return (
                        <div key={message.id} className={`chat-message ${mine ? 'mine' : 'theirs'}`}>
                          <p>{message.text}</p>
                          <span>{mine ? 'Вы' : message.sender}</span>
                        </div>
                      );
                    })
                  )}
                  {!messages.length && !messagesLoading && (
                    <div className="chat-empty-state">
                      <strong>Начни диалог</strong>
                      <span>Напиши первое сообщение, чтобы договориться о совместном прогрессе или батле.</span>
                    </div>
                  )}
                </div>

                <form className="chat-compose" onSubmit={handleSubmit}>
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={`Сообщение для ${activePeer}`}
                    maxLength={1000}
                  />
                  <div className="chat-language-switch" aria-label="Язык голосового ввода">
                    {[
                      ['ru-RU', 'RU'],
                      ['be-BY', 'BY'],
                      ['en-US', 'EN'],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        className={voiceLanguage === value ? 'active' : ''}
                        type="button"
                        onClick={() => setVoiceLanguage(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <button
                    className={`chat-voice-btn ${listening ? 'recording' : ''}`}
                    type="button"
                    onClick={toggleVoiceInput}
                    title={browserSupportsSpeechRecognition ? 'Голосовой ввод' : 'Голосовой ввод не поддерживается'}
                    aria-label={listening ? 'Остановить голосовой ввод' : 'Начать голосовой ввод'}
                  >
                    <span />
                  </button>
                  <button className="btn-primary" type="submit" disabled={!draft.trim()}>
                    Отправить
                  </button>
                </form>
              </>
            ) : (
              <div className="chat-empty-state">
                <strong>Выбери участника</strong>
                <span>Открой профиль в лидерах или выбери диалог слева.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
