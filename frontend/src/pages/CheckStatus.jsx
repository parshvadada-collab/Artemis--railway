import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const GOLD = '#D4AF37';
const BG = '#0A0A0A';
const CARD = 'rgba(255,255,255,0.04)';
const BORDER = 'rgba(255,255,255,0.1)';
const GOLD_BORDER = 'rgba(212,175,55,0.3)';

export default function CheckStatus() {
  const location = useLocation();
  const [pnr, setPnr] = useState('WLT109145');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (location.state?.pnr) setPnr(location.state.pnr);
  }, [location.state]);

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!pnr) return;
    setLoading(true); setResult(null); setError(null);
    try {
      const res = await fetch(`http://localhost:5000/api/predictions/${pnr}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Prediction failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const probPercent = result ? Math.round(result.confirmation_probability * 100) : 0;
  const confidenceColor = result?.confidence === 'high' ? '#4ade80' : result?.confidence === 'medium' ? '#facc15' : '#f87171';

  return (
    <div style={{ minHeight: '100vh', background: BG, color: 'white', padding: '2.5rem 1.5rem 5rem' }}>
      <div style={{ maxWidth: '36rem', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span style={{
            display: 'inline-block', padding: '0.25rem 0.875rem', borderRadius: '9999px',
            background: 'rgba(212,175,55,0.1)', border: `1px solid ${GOLD_BORDER}`,
            color: GOLD, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', marginBottom: '1rem'
          }}>Waitlist Intelligence</span>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 0.75rem' }}>
            Check Waitlist <span style={{ color: GOLD }}>Prediction</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', margin: 0 }}>
            Enter your PNR to see real-time AI probability of confirmation.
          </p>
        </div>

        {/* Search Card */}
        <div style={{
          background: CARD, border: `1px solid ${BORDER}`, borderRadius: '1.5rem',
          padding: '2rem', marginBottom: '1.5rem',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)'
        }}>
          <form onSubmit={handleCheck}>
            <label style={{
              display: 'block', fontSize: '0.7rem', fontWeight: 700,
              color: 'rgba(212,175,55,0.8)', marginBottom: '0.5rem',
              letterSpacing: '0.1em', textTransform: 'uppercase'
            }}>PNR Code</label>
            <input
              type="text"
              placeholder="e.g. WLT123456"
              value={pnr}
              onChange={e => setPnr(e.target.value.toUpperCase())}
              required
              style={{
                width: '100%', padding: '1rem 1.25rem',
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${BORDER}`,
                borderRadius: '0.875rem', color: 'white',
                fontSize: '1.4rem', fontWeight: 700, outline: 'none',
                textAlign: 'center', letterSpacing: '0.3em', boxSizing: 'border-box',
                textTransform: 'uppercase'
              }}
            />
            <button type="submit" disabled={loading || !pnr} style={{
              width: '100%', marginTop: '1rem',
              background: loading ? 'rgba(212,175,55,0.4)' : GOLD,
              color: '#0A0A0A', border: 'none',
              padding: '0.9rem', borderRadius: '0.875rem',
              fontSize: '1rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s', letterSpacing: '0.03em'
            }}>
              {loading ? '🧠 Analyzing with AI...' : 'Check Status'}
            </button>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: '1rem', padding: '1rem 1.25rem',
            color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.75rem'
          }}>
            <span style={{ fontSize: '1.25rem' }}>⚠️</span> {error}
          </div>
        )}

        {/* Result Card */}
        {result && (
          <div style={{
            background: CARD, border: `1px solid ${BORDER}`, borderRadius: '1.5rem',
            padding: '2rem', backdropFilter: 'blur(12px)',
            animation: 'fadeIn 0.4s ease'
          }}>
            {/* Status Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Current Status</span>
              <span style={{
                padding: '0.375rem 1rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 700,
                background: result.status === 'confirmed' ? 'rgba(74,222,128,0.1)' : 'rgba(250,204,21,0.1)',
                color: result.status === 'confirmed' ? '#4ade80' : '#facc15',
                border: `1px solid ${result.status === 'confirmed' ? 'rgba(74,222,128,0.3)' : 'rgba(250,204,21,0.3)'}`
              }}>
                {result.status.toUpperCase()}
              </span>
            </div>

            {/* Big Probability */}
            <div style={{ textAlign: 'center', margin: '0 0 2rem' }}>
              {/* Circular Progress */}
              <div style={{ position: 'relative', width: '10rem', height: '10rem', margin: '0 auto 1.25rem' }}>
                <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="80" cy="80" r="66" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
                  <circle cx="80" cy="80" r="66" fill="none" stroke={confidenceColor} strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 66}`}
                    strokeDashoffset={`${2 * Math.PI * 66 * (1 - result.confirmation_probability)}`}
                    style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.3s' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white', lineHeight: 1 }}>{probPercent}%</span>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '0.25rem' }}>Probability</span>
                </div>
              </div>

              <span style={{
                display: 'inline-block', padding: '0.5rem 1.25rem', borderRadius: '9999px',
                background: `${confidenceColor}15`, color: confidenceColor,
                border: `1px solid ${confidenceColor}40`,
                fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.05em'
              }}>
                {result.label?.toUpperCase()}
              </span>
            </div>

            {/* Progress Bar */}
            <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '9999px', height: '0.5rem', overflow: 'hidden' }}>
              <div style={{
                width: `${probPercent}%`, height: '100%',
                background: `linear-gradient(to right, ${confidenceColor}88, ${confidenceColor})`,
                borderRadius: '9999px', transition: 'width 1s ease'
              }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>0%</span>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>100%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
