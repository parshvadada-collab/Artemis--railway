import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getPredictionByPNR } from '../services/apiService';

const GOLD = '#D4AF37';
const BG   = '#0A0A0A';
const CARD = 'rgba(255,255,255,0.04)';
const BORDER= 'rgba(255,255,255,0.1)';
const GOLD_BORDER = 'rgba(212,175,55,0.3)';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  * { box-sizing: border-box; }
  body { font-family: 'Plus Jakarta Sans', sans-serif; }
  @keyframes fadeSlideUp {
    from { opacity:0; transform:translateY(20px); }
    to   { opacity:1; transform:translateY(0);    }
  }
  @keyframes pulse-ring {
    0%   { box-shadow: 0 0 0 0   rgba(212,175,55,0.35); }
    70%  { box-shadow: 0 0 0 12px rgba(212,175,55,0);    }
    100% { box-shadow: 0 0 0 0   rgba(212,175,55,0);     }
  }
  @keyframes spin { to { transform:rotate(360deg); } }
  .result-enter { animation: fadeSlideUp 0.45s ease both; }
  .factor-card:hover { border-color: rgba(212,175,55,0.4) !important; background: rgba(255,255,255,0.07) !important; }
`;

// ── Helpers ──────────────────────────────────────────────────────────────────
const formatTime = (raw) => {
  if (!raw) return '--:--';
  const timePart = (raw.includes('T') ? raw.split('T')[1] : raw).slice(0, 5);
  const [h, m] = timePart.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${period}`;
};

const formatDate = (raw) => {
  if (!raw) return '–';
  const d = new Date(raw);
  return d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
};

const QUOTA_LABELS = {
  GNWL: { full:'General Waitlist', desc:'Railways\' most common quota — highest cancellation probability' },
  RLWL: { full:'Remote Location WL', desc:'Smaller stations — lower cancellations, harder to confirm'   },
  TQWL: { full:'Tatkal Quota WL',    desc:'Tatkal berths — limited availability, moderate chance'       },
  PQWL: { full:'Pooled Quota WL',    desc:'Shared quota — depends on multiple stations\' cancellations' },
};

// ── Sub-components ───────────────────────────────────────────────────────────
function InfoRow({ label, value, highlight }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
      padding:'0.75rem 0', borderBottom:`1px solid ${BORDER}` }}>
      <span style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.82rem' }}>{label}</span>
      <span style={{ color: highlight ? GOLD : 'white', fontWeight:600, fontSize:'0.9rem' }}>{value}</span>
    </div>
  );
}

function FactorCard({ factor }) {
  const bg = factor.impact === 'positive'
    ? 'rgba(74,222,128,0.06)'
    : factor.impact === 'negative'
    ? 'rgba(248,113,113,0.06)'
    : 'rgba(250,204,21,0.06)';
  const border = factor.impact === 'positive'
    ? 'rgba(74,222,128,0.2)'
    : factor.impact === 'negative'
    ? 'rgba(248,113,113,0.2)'
    : 'rgba(250,204,21,0.2)';
  const textColor = factor.impact === 'positive' ? '#4ade80' : factor.impact === 'negative' ? '#f87171' : '#facc15';

  return (
    <div className="factor-card" style={{
      background: bg, border:`1px solid ${border}`, borderRadius:'0.875rem',
      padding:'0.875rem 1rem', display:'flex', gap:'0.75rem', alignItems:'flex-start',
      transition:'all 0.2s'
    }}>
      <span style={{ fontSize:'1.1rem', flexShrink:0 }}>{factor.icon}</span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:700, fontSize:'0.85rem', color:textColor, marginBottom:'0.2rem' }}>
          {factor.label}
        </div>
        <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.5)', lineHeight:1.4 }}>
          {factor.detail}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CheckStatus() {
  const location = useLocation();
  const navigate  = useNavigate();
  const [pnr, setPnr]         = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState(null);

  // Auto-fill PNR from navigation state or URL query param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qPnr = params.get('pnr') || location.state?.pnr;
    if (qPnr) setPnr(qPnr.toUpperCase());
  }, [location]);

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!pnr.trim()) return;
    setLoading(true); setResult(null); setError(null);
    try {
      const data = await getPredictionByPNR(pnr.trim());
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  const [displayProb, setDisplayProb] = useState(0);
  useEffect(() => {
    if (result) {
      setDisplayProb(0); // reset if PNR changes
      const t = setTimeout(() => setDisplayProb(result.confirmation_probability), 100);
      return () => clearTimeout(t);
    } else {
      setDisplayProb(0);
    }
  }, [result]);

  const probPercent     = result ? Math.round(displayProb * 100) : 0;
  const isConfirmed     = result?.status === 'confirmed';
  const isWaitlisted    = result?.status === 'waitlisted';
  const confidenceColor = isConfirmed
    ? '#4ade80'
    : result?.confidence === 'high'   ? '#4ade80'
    : result?.confidence === 'medium' ? '#facc15'
    : '#f87171';

  const quotaInfo = QUOTA_LABELS[result?.quota] || {};

  return (
    <div style={{ minHeight:'100vh', background: 'transparent', color:'white', padding:'2.5rem 1rem 6rem' }}>
      <style>{CSS}</style>

      <div style={{ maxWidth:'40rem', margin:'0 auto' }}>

        {/* ── Header ── */}
        <div style={{ textAlign:'center', marginBottom:'2.5rem' }}>
          <span style={{
            display:'inline-flex', alignItems:'center', gap:'0.4rem',
            padding:'0.3rem 1rem', borderRadius:'9999px',
            background:'rgba(212,175,55,0.1)', border:`1px solid ${GOLD_BORDER}`,
            color:GOLD, fontSize:'0.65rem', fontWeight:700,
            letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:'1.25rem'
          }}>
            <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:GOLD,
              animation:'pulse-ring 2s infinite', display:'inline-block' }} />
            Live Waitlist Intelligence
          </span>
          <h1 style={{ fontSize:'clamp(1.8rem,5vw,2.5rem)', fontWeight:900,
            letterSpacing:'-0.03em', margin:'0 0 0.75rem',lineHeight:1.1 }}>
            Check Waitlist{' '}
            <span style={{ color:GOLD }}>Prediction</span>
          </h1>
          <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.95rem', margin:0, lineHeight:1.6 }}>
            AI-powered confirmation probability with explainable factors
          </p>
        </div>

        {/* ── PNR Search Card ── */}
        <div style={{
          background:CARD, border:`1px solid ${BORDER}`, borderRadius:'1.5rem',
          padding:'2rem', marginBottom:'1.5rem',
          backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)'
        }}>
          <form onSubmit={handleCheck}>
            <label style={{
              display:'block', fontSize:'0.65rem', fontWeight:800,
              color:'rgba(212,175,55,0.8)', marginBottom:'0.6rem',
              letterSpacing:'0.15em', textTransform:'uppercase'
            }}>PNR Number</label>
            <input
              type="text"
              placeholder="e.g. WLT123456"
              value={pnr}
              onChange={e => setPnr(e.target.value.toUpperCase())}
              maxLength={10}
              required
              style={{
                width:'100%', padding:'1rem 1.25rem',
                background:'rgba(255,255,255,0.05)',
                border:`1px solid ${BORDER}`,
                borderRadius:'0.875rem', color:'white',
                fontSize:'1.5rem', fontWeight:800, outline:'none',
                textAlign:'center', letterSpacing:'0.35em', boxSizing:'border-box',
                textTransform:'uppercase', fontFamily:'inherit'
              }}
            />
            <button type="submit" disabled={loading || !pnr.trim()} style={{
              width:'100%', marginTop:'1rem',
              background: loading ? 'rgba(212,175,55,0.35)' : GOLD,
              color:'#0A0A0A', border:'none',
              padding:'1rem', borderRadius:'0.875rem',
              fontSize:'1rem', fontWeight:800, cursor: loading ? 'not-allowed' : 'pointer',
              transition:'all 0.2s', letterSpacing:'0.04em',
              display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem'
            }}>
              {loading
                ? <><span style={{ width:18, height:18, border:'2px solid rgba(0,0,0,0.3)',
                    borderTopColor:'#0A0A0A', borderRadius:'50%', animation:'spin 0.7s linear infinite',
                    display:'inline-block' }} />Analyzing…</>
                : '🧠 Check Prediction'}
            </button>
          </form>
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{
            background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.3)',
            borderRadius:'1rem', padding:'1rem 1.25rem',
            color:'#f87171', display:'flex', alignItems:'center', gap:'0.75rem',
            marginBottom:'1.5rem'
          }}>
            <span style={{ fontSize:'1.3rem' }}>⚠️</span>
            <span style={{ fontSize:'0.9rem', lineHeight:1.5 }}>{error}</span>
          </div>
        )}

        {/* ── Result Panel ── */}
        {result && (
          <div className="result-enter">

            {/* ── 1. Probability Card ── */}
            <div style={{
              background:CARD, border:`1px solid ${isConfirmed ? 'rgba(74,222,128,0.3)' : BORDER}`,
              borderRadius:'1.5rem', padding:'2rem', marginBottom:'1rem',
              backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)'
            }}>
              {/* Status row */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.75rem' }}>
                <div>
                  <div style={{ fontSize:'0.65rem', fontWeight:800, color:'rgba(255,255,255,0.4)',
                    letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:'0.2rem' }}>
                    PNR Status
                  </div>
                  <div style={{ fontSize:'1.3rem', fontWeight:900, color:'white', letterSpacing:'0.15em' }}>{result.pnr}</div>
                </div>
                <span style={{
                  padding:'0.5rem 1.1rem', borderRadius:'9999px', fontSize:'0.8rem', fontWeight:800,
                  background: isConfirmed ? 'rgba(74,222,128,0.12)' : isWaitlisted ? 'rgba(250,204,21,0.12)' : 'rgba(248,113,113,0.12)',
                  color: isConfirmed ? '#4ade80' : isWaitlisted ? '#facc15' : '#f87171',
                  border:`1px solid ${isConfirmed ? 'rgba(74,222,128,0.35)' : isWaitlisted ? 'rgba(250,204,21,0.35)' : 'rgba(248,113,113,0.35)'}`,
                  letterSpacing:'0.08em'
                }}>
                  {(result.status || '').toUpperCase()}
                </span>
              </div>

              {/* Circular gauge */}
              <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
                <div style={{ position:'relative', width:'11.5rem', height:'11.5rem', margin:'0 auto 1.25rem' }}>
                  <svg width="184" height="184" viewBox="0 0 184 184" style={{ transform:'rotate(-90deg)' }}>
                    <circle cx="92" cy="92" r="78" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
                    <circle cx="92" cy="92" r="78" fill="none" stroke={displayProb === 0 ? 'transparent' : confidenceColor} strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 78}`}
                      strokeDashoffset={`${2 * Math.PI * 78 * (1 - displayProb)}`}
                      style={{ transition:'stroke-dashoffset 1.3s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.4s' }}
                    />
                  </svg>
                  <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
                    alignItems:'center', justifyContent:'center' }}>
                    <span style={{ fontSize:'2.75rem', fontWeight:900, color:'white', lineHeight:1 }}>{probPercent}%</span>
                    <span style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.4)',
                      letterSpacing:'0.1em', textTransform:'uppercase', marginTop:'0.3rem' }}>Probability</span>
                  </div>
                </div>

                <span style={{
                  display:'inline-block', padding:'0.5rem 1.5rem', borderRadius:'9999px',
                  background:`${confidenceColor}18`, color:confidenceColor,
                  border:`1px solid ${confidenceColor}45`,
                  fontSize:'0.9rem', fontWeight:700, letterSpacing:'0.06em',
                  textTransform:'uppercase'
                }}>
                  {result.label}
                </span>
              </div>

              {/* Gradient progress bar */}
              <div>
                <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:'9999px',
                  height:'0.5rem', overflow:'hidden', marginBottom:'0.5rem' }}>
                  <div style={{
                    width:`${probPercent}%`, height:'100%',
                    background:`linear-gradient(to right, ${confidenceColor}60, ${confidenceColor})`,
                    borderRadius:'9999px', transition:'width 1.2s ease'
                  }} />
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.25)' }}>0% Unlikely</span>
                  <span style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.25)' }}>100% Confirmed</span>
                </div>
              </div>
            </div>

            {/* ── 2. Booking Details Card ── */}
            {(result.train_name || result.source) && (
              <div style={{
                background:CARD, border:`1px solid ${BORDER}`, borderRadius:'1.5rem',
                padding:'1.75rem', marginBottom:'1rem',
                backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)'
              }}>
                <div style={{ fontSize:'0.65rem', fontWeight:800, color:'rgba(255,255,255,0.35)',
                  letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:'1.25rem' }}>
                  📋 Booking Details
                </div>

                {/* Route timeline */}
                {result.source && result.destination && (
                  <div style={{ display:'flex', alignItems:'center', gap:'0.75rem',
                    marginBottom:'1.5rem', padding:'1rem',
                    background:'rgba(212,175,55,0.05)', borderRadius:'0.875rem',
                    border:`1px solid ${GOLD_BORDER}` }}>
                    <div style={{ textAlign:'center', flex:1 }}>
                      <div style={{ fontSize:'1.1rem', fontWeight:800, color:'white' }}>{result.source}</div>
                      <div style={{ fontSize:'0.85rem', color:GOLD, fontWeight:700 }}>{formatTime(result.departure_time)}</div>
                      <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.4)', marginTop:'0.1rem' }}>{formatDate(result.departure_time)}</div>
                    </div>
                    <div style={{ flex:1, textAlign:'center', padding:'0 0.5rem' }}>
                      <div style={{ fontSize:'1rem' }}>🚂</div>
                      <div style={{ height:'1px', background:BORDER, margin:'0.35rem 0', position:'relative' }}>
                        <div style={{ position:'absolute', inset:0,
                          background:`linear-gradient(to right, transparent, ${GOLD}, transparent)` }} />
                      </div>
                      {result.train_number && (
                        <div style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.4)', letterSpacing:'0.05em' }}>
                          {result.train_number}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign:'center', flex:1 }}>
                      <div style={{ fontSize:'1.1rem', fontWeight:800, color:'white' }}>{result.destination}</div>
                      <div style={{ fontSize:'0.85rem', color:GOLD, fontWeight:700 }}>{formatTime(result.arrival_time)}</div>
                      <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.4)', marginTop:'0.1rem' }}>{formatDate(result.arrival_time)}</div>
                    </div>
                  </div>
                )}

                {result.train_name && <InfoRow label="Train" value={result.train_name} />}
                {result.passenger_name && <InfoRow label="Passenger" value={result.passenger_name} />}
                {result.seat_class && <InfoRow label="Class" value={result.seat_class} highlight />}
                {result.waitlist_position != null && (
                  <InfoRow label="Waitlist Position" value={`#${result.waitlist_position}`} highlight />
                )}
                {result.days_to_departure != null && (
                  <InfoRow label="Days to Departure" value={
                    result.days_to_departure === 0 ? 'Today' : `${result.days_to_departure} days`
                  } />
                )}
              </div>
            )}

            {/* ── 3. Quota Info Card ── */}
            {result.quota && (
              <div style={{
                background:CARD, border:`1px solid ${BORDER}`, borderRadius:'1.5rem',
                padding:'1.75rem', marginBottom:'1rem',
                backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)'
              }}>
                <div style={{ fontSize:'0.65rem', fontWeight:800, color:'rgba(255,255,255,0.35)',
                  letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:'1.25rem' }}>
                  🎫 Quota Information
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                  <div style={{
                    padding:'0.5rem 1rem', borderRadius:'0.625rem', flexShrink:0,
                    background:'rgba(212,175,55,0.1)', border:`1px solid ${GOLD_BORDER}`,
                    fontSize:'1.1rem', fontWeight:900, color:GOLD, letterSpacing:'0.1em'
                  }}>
                    {result.quota}
                  </div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:'0.9rem', color:'white', marginBottom:'0.2rem' }}>
                      {quotaInfo.full || result.quota}
                    </div>
                    <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.45)', lineHeight:1.5 }}>
                      {quotaInfo.desc || ''}
                    </div>
                  </div>
                </div>

                {/* Quota model indicator */}
                <div style={{ marginTop:'1.25rem', padding:'0.75rem 1rem',
                  background:'rgba(255,255,255,0.03)', borderRadius:'0.75rem',
                  border:'1px solid rgba(255,255,255,0.07)',
                  display:'flex', alignItems:'center', gap:'0.5rem' }}>
                  <span style={{ fontSize:'0.75rem' }}>🤖</span>
                  <span style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.5)' }}>
                    Prediction uses quota-specific model tuned for <strong style={{ color:'rgba(255,255,255,0.75)' }}>{result.quota}</strong> cancellation patterns
                  </span>
                </div>
              </div>
            )}

            {/* ── 4. Explainable AI Factors ── */}
            {result.factors?.length > 0 && (
              <div style={{
                background:CARD, border:`1px solid ${BORDER}`, borderRadius:'1.5rem',
                padding:'1.75rem', marginBottom:'1rem',
                backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)'
              }}>
                <div style={{ fontSize:'0.65rem', fontWeight:800, color:'rgba(255,255,255,0.35)',
                  letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:'0.5rem' }}>
                  🧠 Why This Probability?
                </div>
                <div style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.4)', marginBottom:'1.25rem' }}>
                  Factors driving this AI prediction
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.625rem' }}>
                  {result.factors.map((f, i) => <FactorCard key={i} factor={f} />)}
                </div>
              </div>
            )}

            {/* ── 5. Actions ── */}
            <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap' }}>
              {isWaitlisted && result.source && result.destination && (
                <button onClick={() => navigate(`/alternatives?source=${result.source}&destination=${result.destination}&date=${result.departure_time?.slice(0,10)}&preference=fastest`)}
                  style={{
                    flex:'1 1 auto', background:'transparent', color:GOLD,
                    border:`1px solid ${GOLD}`, padding:'0.875rem 1.5rem',
                    borderRadius:'0.875rem', fontWeight:700, fontSize:'0.9rem',
                    cursor:'pointer', transition:'all 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(212,175,55,0.1)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                  🔀 Find Alternatives
                </button>
              )}
              <button onClick={() => { setResult(null); setError(null); setPnr(''); }}
                style={{
                  flex:'1 1 auto', background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.6)',
                  border:`1px solid ${BORDER}`, padding:'0.875rem 1.5rem',
                  borderRadius:'0.875rem', fontWeight:600, fontSize:'0.9rem',
                  cursor:'pointer', transition:'all 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}>
                🔄 Check Another PNR
              </button>
            </div>

            {/* Live update note */}
            <div style={{ marginTop:'1.25rem', display:'flex', alignItems:'center', gap:'0.5rem',
              justifyContent:'center', color:'rgba(255,255,255,0.3)', fontSize:'0.75rem' }}>
              <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#4ade80',
                display:'inline-block', animation:'pulse-ring 2s infinite', flexShrink:0 }} />
              Probability updates live as cancellations happen on this route
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
