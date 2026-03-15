import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const GOLD = '#D4AF37';
const BG = '#0A0A0A';
const CARD = 'rgba(255,255,255,0.04)';
const BORDER = 'rgba(255,255,255,0.1)';
const GOLD_BORDER = 'rgba(212,175,55,0.3)';

const STATIONS = [
  'Ahmedabad', 'Bangalore', 'Bhubaneswar', 'Chennai',
  'Delhi', 'Hyderabad', 'Indore', 'Jaipur',
  'Kolkata', 'Lucknow', 'Mumbai', 'Nagpur',
  'Patna', 'Pune', 'Surat'
];

const PREFERENCES = [
  { id: 'fastest', label: '⚡ Fastest', full: 'Fastest Duration' },
  { id: 'cheapest', label: '💰 Cheapest', full: 'Cheapest Fare' },
  { id: 'fewest_transfers', label: '🚶 Fewest Transfers', full: 'Fewest Transfers' }
];

const inputStyle = {
  width: '100%', padding: '0.75rem 1rem',
  background: 'rgba(255,255,255,0.05)',
  border: `1px solid ${BORDER}`,
  borderRadius: '0.75rem', color: 'white',
  fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block', fontSize: '0.7rem', fontWeight: 700,
  color: 'rgba(212,175,55,0.8)', marginBottom: '0.4rem',
  letterSpacing: '0.1em', textTransform: 'uppercase',
};

export default function Alternatives() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    source: searchParams.get('source') || '',
    destination: searchParams.get('destination') || '',
    date: searchParams.get('date') || ''
  });
  const [preference, setPreference] = useState(searchParams.get('preference') || 'fastest');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (form.source && form.destination && form.date) searchAlternatives(preference);
  }, []);

  const searchAlternatives = async (pref) => {
    if (!form.source || !form.destination || !form.date) { setError('Please fill in source, destination and date'); return; }
    if (form.source === form.destination) { setError('Source and destination cannot be the same'); return; }
    setLoading(true); setError(''); setSearched(false);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/alternatives`, {
        params: { source: form.source, destination: form.destination, date: form.date, preference: pref }
      });
      setResults(res.data.alternatives || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Search failed');
      setResults([]);
    } finally { setLoading(false); setSearched(true); }
  };

  const swapStations = () => setForm(f => ({ ...f, source: f.destination, destination: f.source }));

  const handlePreferenceChange = (pref) => {
    setPreference(pref);
    searchAlternatives(pref);
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, color: 'white', padding: '2.5rem 1.5rem 5rem' }}>
      <div style={{ maxWidth: '56rem', margin: '0 auto' }}>

        {/* Page Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <span style={{
            display: 'inline-block', padding: '0.25rem 0.875rem', borderRadius: '9999px',
            background: 'rgba(212,175,55,0.1)', border: `1px solid ${GOLD_BORDER}`,
            color: GOLD, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', marginBottom: '1rem'
          }}>Smart Routing</span>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 0.5rem' }}>
            Smart Alternatives
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', margin: 0 }}>
            Dynamic multi-leg routing when direct trains are fully booked or unavailable.
          </p>
        </div>

        {/* Search Panel */}
        <div style={{
          background: CARD, border: `1px solid ${BORDER}`, borderRadius: '1.5rem',
          padding: '2rem', marginBottom: '1.5rem', backdropFilter: 'blur(12px)'
        }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 160px' }}>
              <label style={labelStyle}>From</label>
              <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="" style={{ background: '#111' }}>Select Source</option>
                {STATIONS.map(s => <option key={s} style={{ background: '#111' }}>{s}</option>)}
              </select>
            </div>

            <button onClick={swapStations} style={{
              width: '2.5rem', height: '2.5rem', borderRadius: '50%',
              background: GOLD_BORDER, border: `1px solid ${GOLD_BORDER}`,
              cursor: 'pointer', color: GOLD, fontSize: '1.1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>⇄</button>

            <div style={{ flex: '1 1 160px' }}>
              <label style={labelStyle}>To</label>
              <select value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="" style={{ background: '#111' }}>Select Destination</option>
                {STATIONS.filter(s => s !== form.source).map(s => <option key={s} style={{ background: '#111' }}>{s}</option>)}
              </select>
            </div>

            <div style={{ flex: '1 1 140px' }}>
              <label style={labelStyle}>Date</label>
              <input type="date" value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                style={{ ...inputStyle, colorScheme: 'dark' }} />
            </div>
          </div>

          {error && <p style={{ color: '#f87171', fontSize: '0.85rem', marginTop: '1rem', marginBottom: 0 }}>⚠ {error}</p>}

          <button onClick={() => searchAlternatives(preference)} disabled={loading} style={{
            marginTop: '1.5rem',
            background: loading ? 'rgba(212,175,55,0.4)' : GOLD,
            color: '#0A0A0A', border: 'none', padding: '0.875rem 2.5rem',
            borderRadius: '0.875rem', fontSize: '0.95rem', fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.03em'
          }}>
            {loading ? '🔍 Searching...' : '🔍 Find Routes'}
          </button>
        </div>

        {/* Preference Tabs */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {PREFERENCES.map(p => (
            <button key={p.id} onClick={() => handlePreferenceChange(p.id)} style={{
              flex: '1 1 0px', padding: '0.75rem 1rem', borderRadius: '0.875rem',
              cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
              border: preference === p.id ? `1px solid ${GOLD}` : `1px solid ${BORDER}`,
              background: preference === p.id ? 'rgba(212,175,55,0.1)' : CARD,
              color: preference === p.id ? GOLD : 'rgba(255,255,255,0.5)',
              transition: 'all 0.2s', backdropFilter: 'blur(8px)'
            }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* No Results */}
        {searched && results.length === 0 && (
          <div style={{
            background: CARD, border: `1px solid ${BORDER}`, borderRadius: '1.5rem',
            padding: '3rem', textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😔</div>
            <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>No alternatives found</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>Try changing the date or route preferences to find more options.</p>
          </div>
        )}

        {/* Route Cards */}
        {results.map((alt) => (
          <div key={alt.rank} style={{
            background: CARD, borderRadius: '1.25rem', padding: '1.75rem',
            marginBottom: '1rem', border: `1px solid ${BORDER}`,
            backdropFilter: 'blur(8px)', transition: 'border-color 0.2s'
          }}
            onMouseOver={e => e.currentTarget.style.borderColor = GOLD_BORDER}
            onMouseOut={e => e.currentTarget.style.borderColor = BORDER}>

            {/* Card Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1.25rem', borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  background: 'rgba(212,175,55,0.15)', color: GOLD,
                  width: '2.25rem', height: '2.25rem', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '0.9rem', border: `1px solid ${GOLD_BORDER}`, flexShrink: 0
                }}>
                  #{alt.rank}
                </div>
                <div>
                  <span style={{ fontWeight: 800, color: 'white', fontSize: '1.2rem' }}>
                    {Math.floor(alt.total_duration_minutes / 60)}h {alt.total_duration_minutes % 60}m
                  </span>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Total Duration</p>
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <span style={{ fontWeight: 800, color: 'white', fontSize: '1.2rem' }}>₹{alt.total_fare}</span>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Est. Fare</p>
              </div>

              <div style={{ textAlign: 'center' }}>
                <span style={{ fontWeight: 800, color: GOLD, fontSize: '1.2rem' }}>{alt.transfers}</span>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Transfers</p>
              </div>

              <button onClick={() => navigate('/book')} style={{
                background: GOLD, color: '#0A0A0A', border: 'none',
                padding: '0.625rem 1.5rem', borderRadius: '0.75rem',
                fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem',
                transition: 'opacity 0.2s'
              }}>Book Route</button>
            </div>

            {/* Legs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {alt.legs.map((leg, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    background: 'rgba(0,0,0,0.4)', padding: '0.625rem 1rem',
                    borderRadius: '0.625rem', border: `1px solid ${BORDER}`,
                    minWidth: '6rem', textAlign: 'center', flexShrink: 0
                  }}>
                    <span style={{ color: 'white', fontWeight: 700, display: 'block', fontSize: '0.9rem' }}>{leg.train_number}</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>[{leg.class_available}]</span>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'white', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 700 }}>{leg.departure?.slice(11, 16)}</span>
                      <span style={{ color: 'rgba(255,255,255,0.3)' }}>→</span>
                      <span style={{ fontWeight: 700 }}>{leg.arrival?.slice(11, 16)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                      <span>{new Date(leg.departure).toLocaleDateString('en-GB')}</span>
                      <span>{new Date(leg.arrival).toLocaleDateString('en-GB')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
