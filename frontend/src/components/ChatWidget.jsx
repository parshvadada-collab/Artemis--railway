import React, { useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { sendChatMessage } from '../services/apiService';

const GOLD = '#D4AF37';
const PANEL = 'rgba(10,10,10,0.95)';
const BORDER = 'rgba(255,255,255,0.1)';

const initialMessages = [
  {
    id: 'welcome',
    role: 'assistant',
    text: 'Hi, I am the RailWise assistant. Ask me about booking tickets, checking PNR status, smart routes, or admin access.',
    suggestions: [
      { label: 'Book Ticket', path: '/book' },
      { label: 'Check PNR', path: '/status' },
      { label: 'Smart Routes', path: '/alternatives' },
    ],
  },
];

export default function ChatWidget() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const listRef = useRef(null);

  const hiddenOnRoutes = useMemo(() => ['/login'], []);
  if (hiddenOnRoutes.includes(location.pathname)) return null;

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    });
  };

  const pushMessage = (message) => {
    setMessages(prev => [...prev, message]);
    scrollToBottom();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    pushMessage({ id: `user-${Date.now()}`, role: 'user', text });
    setLoading(true);

    try {
      const res = await sendChatMessage(text);
      pushMessage({
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: res.reply,
        suggestions: res.suggestions || [],
      });
    } catch (err) {
      pushMessage({
        id: `assistant-error-${Date.now()}`,
        role: 'assistant',
        text: err?.response?.data?.error || 'The assistant is unavailable right now. Please try again in a moment.',
        suggestions: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const bubbleStyle = (role) => ({
    alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
    maxWidth: '85%',
    padding: '0.8rem 0.95rem',
    borderRadius: role === 'user' ? '1rem 1rem 0.35rem 1rem' : '1rem 1rem 1rem 0.35rem',
    background: role === 'user' ? GOLD : 'rgba(255,255,255,0.06)',
    color: role === 'user' ? '#0A0A0A' : 'white',
    border: role === 'user' ? 'none' : `1px solid ${BORDER}`,
    fontSize: '0.9rem',
    lineHeight: 1.5,
  });

  return (
    <div style={{ position: 'fixed', right: '1.25rem', bottom: '1.25rem', zIndex: 120 }}>
      {open && (
        <div style={{
          width: 'min(24rem, calc(100vw - 2rem))',
          height: '32rem',
          background: PANEL,
          border: `1px solid ${BORDER}`,
          borderRadius: '1.25rem',
          backdropFilter: 'blur(18px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          marginBottom: '0.9rem',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1rem 0.9rem',
            borderBottom: `1px solid ${BORDER}`,
          }}>
            <div>
              <div style={{ color: 'white', fontWeight: 800, fontSize: '0.95rem' }}>RailWise Assistant</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem' }}>Booking help and guided navigation</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '1.1rem', cursor: 'pointer' }}
            >
              ×
            </button>
          </div>

          <div
            ref={listRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            {messages.map((message) => (
              <div key={message.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={bubbleStyle(message.role)}>{message.text}</div>
                {message.suggestions?.length > 0 && message.role === 'assistant' && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {message.suggestions.map((item) => (
                      <button
                        key={`${message.id}-${item.label}`}
                        type="button"
                        onClick={() => {
                          navigate(item.path);
                          setOpen(false);
                        }}
                        style={{
                          background: 'rgba(212,175,55,0.12)',
                          color: GOLD,
                          border: '1px solid rgba(212,175,55,0.22)',
                          borderRadius: '9999px',
                          padding: '0.45rem 0.8rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={bubbleStyle('assistant')}>
                Thinking...
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '0.9rem', borderTop: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about booking, PNR, routes..."
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${BORDER}`,
                  borderRadius: '0.9rem',
                  color: 'white',
                  padding: '0.85rem 0.95rem',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: GOLD,
                  color: '#0A0A0A',
                  border: 'none',
                  borderRadius: '0.9rem',
                  padding: '0 1rem',
                  fontWeight: 800,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                Send
              </button>
            </div>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        style={{
          width: '3.6rem',
          height: '3.6rem',
          borderRadius: '50%',
          border: 'none',
          background: GOLD,
          color: '#0A0A0A',
          fontSize: '1.35rem',
          fontWeight: 900,
          boxShadow: '0 14px 32px rgba(212,175,55,0.3)',
          cursor: 'pointer',
        }}
      >
        {open ? '-' : 'Chat'}
      </button>
    </div>
  );
}
