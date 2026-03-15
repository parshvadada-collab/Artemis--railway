import React, { useState } from 'react';

export default function CheckStatus() {
  const [pnr, setPnr] = useState('WLT109145');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!pnr) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch(`http://localhost:5000/api/predictions/${pnr}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Prediction failed');
      }
      
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page fade-in">
      <div className="page-header" style={{ textAlign: 'center' }}>
        <h2>Check Waitlist <span style={{ color: 'var(--accent)' }}>Prediction</span></h2>
        <p>Enter your PNR to instantly see the real-time AI probability of it confirming.</p>
      </div>

      <div className="card" style={{ maxWidth: '600px', margin: '0 auto', padding: '40px' }}>
        <form onSubmit={handleCheck} className="form-group" style={{ gap: '20px' }}>
          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>PNR Code</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. WLT123456" 
              value={pnr}
              onChange={(e) => setPnr(e.target.value)}
              required
              style={{ fontSize: '1.2rem', textAlign: 'center', letterSpacing: '2px', textTransform: 'uppercase' }}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading || !pnr}>
            {loading ? 'Analyzing with Neural Network...' : 'Check Status'}
          </button>
        </form>

        {error && (
          <div className="alert alert-error" style={{ marginTop: '24px' }}>
            <span style={{ fontSize: '1.2rem' }}>⚠️</span> {error}
          </div>
        )}

        {result && (
          <div className="fade-in" style={{ marginTop: '30px', padding: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span className="form-label">CURRENT STATUS</span>
              <span className={`badge ${result.status === 'confirmed' ? 'badge-confirmed' : 'badge-waitlisted'}`}>
                {result.status.toUpperCase()}
              </span>
            </div>
            
            <div style={{ textAlign: 'center', margin: '30px 0 20px' }}>
              <div style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                {(result.confirmation_probability * 100).toFixed(0)}%
              </div>
              <div style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '5px', fontSize: '0.9rem' }}>
                Confirmation Probability
              </div>
            </div>

            <div className="prob-bar-container">
              <div 
                className={`prob-bar-fill prob-${result.confidence || 'low'}`} 
                style={{ width: `${result.confirmation_probability * 100}%` }}
              ></div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <span className="badge" style={{ 
                background: result.confidence === 'high' ? 'rgba(34,197,94,0.1)' : result.confidence === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                color: result.confidence === 'high' ? 'var(--success)' : result.confidence === 'medium' ? 'var(--warning)' : 'var(--danger)',
                fontSize: '1rem',
                padding: '8px 16px'
              }}>
                {result.label.toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
