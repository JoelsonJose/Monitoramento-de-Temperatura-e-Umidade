import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';

const MAX_MESSAGES = 12;

function ChatIcon({ close = false }) {
  return close ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m18 6-12 12M6 6l12 12" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
    </svg>
  );
}

export default function ChatWidget({ token }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [draft, setDraft] = useState('');
  const [pendingText, setPendingText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, pendingText, open]);

  async function sendMessage(event) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || loading) return;
    if (content.length > 1500) {
      setError('A mensagem pode ter no máximo 1500 caracteres.');
      return;
    }

    const requestMessages = [...history, { role: 'user', content }];
    if (requestMessages.length > MAX_MESSAGES) {
      setError('Esta conversa chegou ao limite. Inicie uma nova conversa para continuar.');
      return;
    }

    setDraft('');
    setError('');
    setPendingText(content);
    setLoading(true);
    try {
      const response = await api('/api/v1/chat', {
        token,
        method: 'POST',
        body: { messages: requestMessages },
      });
      const answer = { role: 'assistant', content: response.resposta };
      setHistory([...requestMessages, answer]);
      setMessages((current) => [...current, requestMessages.at(-1), answer]);
      setPendingText('');
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível consultar o assistente. Tente novamente.');
      setDraft(content);
      setPendingText('');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function startNewConversation() {
    setMessages([]);
    setHistory([]);
    setError('');
    setDraft('');
    inputRef.current?.focus();
  }

  return (
    <div className="chat-widget">
      {open ? (
        <section className="chat-panel" aria-labelledby="chat-title" aria-live="polite">
          <header className="chat-header">
            <div className="chat-heading">
              <span className="chat-avatar" aria-hidden="true">🥭</span>
              <div>
                <h2 id="chat-title">Assistente Manga Trace</h2>
                <p>Agronomia da manga</p>
              </div>
            </div>
            <div className="chat-header-actions">
              {messages.length > 0 ? (
                <button className="chat-new" type="button" onClick={startNewConversation}>Nova conversa</button>
              ) : null}
              <button className="chat-close" type="button" aria-label="Fechar chat" onClick={() => setOpen(false)}>
                <ChatIcon close />
              </button>
            </div>
          </header>

          <div className="chat-messages" role="log" aria-label="Mensagens da conversa">
            {messages.length === 0 ? (
              <div className="chat-welcome">
                <span aria-hidden="true">🌱</span>
                <strong>Olá! Como posso ajudar com a sua mangueira?</strong>
                <p>Pergunte sobre manejo, irrigação, pragas, colheita ou conservação da manga.</p>
              </div>
            ) : null}
            {messages.map((message, index) => (
              <p className={`chat-message ${message.role}`} key={`${index}-${message.role}`}>
                {message.content}
              </p>
            ))}
            {pendingText ? <p className="chat-message user">{pendingText}</p> : null}
            {loading ? <p className="chat-thinking" role="status">Assistente está respondendo…</p> : null}
            {error ? <p className="chat-error" role="alert">{error}</p> : null}
            <div ref={endRef} />
          </div>

          <form className="chat-form" onSubmit={sendMessage}>
            <label className="chat-input-label" htmlFor="chat-input">Sua pergunta</label>
            <textarea
              id="chat-input"
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Escreva sua pergunta sobre mangas…"
              rows={2}
              maxLength={1500}
              disabled={loading}
            />
            <div className="chat-form-footer">
              <span>{draft.length}/1500</span>
              <button className="chat-send" type="submit" disabled={loading || !draft.trim()}>
                {loading ? 'Enviando…' : 'Enviar'}
              </button>
            </div>
          </form>
          <p className="chat-disclaimer">Para recomendações de doses e defensivos, consulte um engenheiro agrônomo.</p>
        </section>
      ) : null}
      <button
        className="chat-fab"
        type="button"
        aria-label={open ? 'Fechar assistente de agronomia' : 'Abrir assistente de agronomia'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <ChatIcon close={open} />
        {!open ? <span className="chat-fab-label">Assistente</span> : null}
      </button>
    </div>
  );
}
