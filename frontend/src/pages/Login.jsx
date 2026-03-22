import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const GOLD = '#D4AF37';
const BG = '#0A0A0A';
const CARD = 'rgba(255,255,255,0.03)';
const BORDER = 'rgba(255,255,255,0.1)';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  
  .login-container {
    font-family: 'Plus Jakarta Sans', sans-serif;
    min-height: 100vh;
    background: ${BG};
    color: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    position: relative;
    overflow: hidden;
  }

  .login-card {
    background: ${CARD};
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid ${BORDER};
    border-radius: 1.5rem;
    padding: 3rem;
    width: 100%;
    max-width: 28rem;
    z-index: 10;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
    animation: fadeSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .login-input {
    width: 100%;
    background: rgba(0,0,0,0.4);
    border: 1px solid rgba(255,255,255,0.1);
    color: white;
    padding: 1rem 1.25rem;
    border-radius: 0.75rem;
    font-family: inherit;
    font-size: 1rem;
    outline: none;
    transition: all 0.2s;
  }
  .login-input:focus {
    border-color: ${GOLD};
    box-shadow: 0 0 0 2px rgba(212,175,55,0.2);
  }

  .login-bg-element {
    position: absolute;
    width: 40vmax;
    height: 40vmax;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(212,175,55,0.05) 0%, transparent 70%);
    z-index: 1;
    pointer-events: none;
  }
`;

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Please fill all fields');
      return;
    }

    setLoading(true);
    // Simulate network delay
    setTimeout(() => {
      // Hardcoded validation for assignment simplicity
      if (username.toLowerCase() === 'admin' && password === 'admin123') {
        sessionStorage.setItem('isAdmin', 'true');
        navigate('/admin');
      } else {
        setError('Invalid admin credentials. (Hint: admin / admin123)');
        setLoading(false);
      }
    }, 800);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="login-container">
        
        {/* Decorative BG Elements */}
        <div className="login-bg-element" style={{ top: '-10vmax', left: '-10vmax' }} />
        <div className="login-bg-element" style={{ bottom: '-20vmax', right: '-10vmax', background: 'radial-gradient(circle, rgba(255,255,255,0.02) 0%, transparent 70%)' }} />

        {/* Home Link */}
        <Link to="/" style={{ position: 'absolute', top: '2rem', left: '2rem', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, zIndex: 20, transition: 'color 0.2s' }} onMouseOver={e=>e.currentTarget.style.color=GOLD} onMouseOut={e=>e.currentTarget.style.color='rgba(255,255,255,0.5)'}>
          ← Back to Home
        </Link>

        {/* Login Card */}
        <div className="login-card">
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ width: '3rem', height: '3rem', background: GOLD, borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
              <svg width="24" height="24" fill="none" stroke="#0A0A0A" viewBox="0 0 24 24">
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.03em' }}>Operator Login</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '0.95rem' }}>Authenticate to access terminal dashboard</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Username</label>
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)}
                className="login-input" 
                placeholder="Enter admin username"
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="login-input" 
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p style={{ color: '#f87171', fontSize: '0.85rem', margin: '0.25rem 0', fontWeight: 500 }}>⚠ {error}</p>
            )}

            <button type="submit" disabled={loading} style={{
              background: loading ? 'rgba(212,175,55,0.4)' : GOLD,
              color: '#0A0A0A', border: 'none', padding: '1.1rem',
              borderRadius: '0.75rem', fontWeight: 800, fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
              marginTop: '0.5rem'
            }}>
              {loading ? 'Authenticating...' : 'Secure Login'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
