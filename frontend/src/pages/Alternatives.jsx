import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const STATIONS = [
  'Ahmedabad', 'Bangalore', 'Bhubaneswar', 'Chennai',
  'Delhi', 'Hyderabad', 'Indore', 'Jaipur',
  'Kolkata', 'Lucknow', 'Mumbai', 'Nagpur',
  'Patna', 'Pune', 'Surat'
];

const PREFERENCES = [
  { id: 'fastest', label: '⚡ Fastest Duration' },
  { id: 'cheapest', label: '💰 Cheapest Fare' },
  { id: 'fewest_transfers', label: '🚶 Fewest Transfers' }
];

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
    if (form.source && form.destination && form.date) {
      searchAlternatives(preference);
    }
  }, []);

  const searchAlternatives = async (pref) => {
    if (!form.source || !form.destination || !form.date) {
      setError('Please fill in source, destination and date');
      return;
    }
    if (form.source === form.destination) {
      setError('Source and destination cannot be the same');
      return;
    }
    setLoading(true); setError(''); setSearched(false);

    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/alternatives`, {
        params: { source: form.source, destination: form.destination, date: form.date, preference: pref }
      });
      setResults(res.data.alternatives || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const swapStations = () => {
    setForm(j => ({ ...j, source: j.destination, destination: j.source }));
  };

  const handlePreferenceChange = (pref) => {
    setPreference(pref);
    searchAlternatives(pref);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', padding: '0 0 60px' }}>
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1e293b 100%)', padding: '40px 20px 0', borderBottom: '3px solid #3b82f6' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 28 }}>🔀</span>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: 0 }}>Smart Alternatives</h1>
          </div>
          <p style={{ color: '#94a3b8', marginBottom: 28, fontSize: 14 }}>
            Dynamic multi-leg routing when direct trains are fully booked or unavailable.
          </p>

          <div style={{ background: '#fff', borderRadius: '16px 16px 0 0', padding: '24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>FROM</label>
                <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} style={selectStyle}>
                  <option value="">Select Source</option>
                  {STATIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              <button onClick={swapStations} style={{
                marginTop: 18, width: 36, height: 36, borderRadius: '50%',
                background: '#3b82f6', border: 'none', cursor: 'pointer',
                fontSize: 18, color: '#fff', flexShrink: 0
              }}>⇄</button>

              <div style={{ flex: 1 }}>
                <label style={labelStyle}>TO</label>
                <select value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} style={selectStyle}>
                  <option value="">Select Destination</option>
                  {STATIONS.filter(s => s !== form.source).map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <label style={labelStyle}>DATE OF JOURNEY</label>
                <input type="date" value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  style={selectStyle} />
              </div>
            </div>

            {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 10 }}>⚠ {error}</p>}

            <button onClick={() => searchAlternatives(preference)} disabled={loading} style={{
              background: '#3b82f6', color: '#fff', border: 'none',
              padding: '13px 48px', borderRadius: 8, fontSize: 16,
              fontWeight: 700, cursor: 'pointer', letterSpacing: 0.5
            }}>
              {loading ? 'Searching...' : '🔍 Find Routes'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
        
        {/* Preferences Toggle */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {PREFERENCES.map(p => (
            <button key={p.id} onClick={() => handlePreferenceChange(p.id)}
              style={{
                flex: 1, padding: '12px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14,
                border: preference === p.id ? '2px solid #3b82f6' : '1px solid #334155',
                background: preference === p.id ? '#1e3a5f' : '#1e293b',
                color: preference === p.id ? '#60a5fa' : '#94a3b8',
                transition: 'all 0.2s',
              }}>
              {p.label}
            </button>
          ))}
        </div>

        {searched && results.length === 0 && (
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>😔</div>
            <h3 style={{ color: '#f1f5f9', marginBottom: 8 }}>No alternatives found</h3>
            <p style={{ color: '#94a3b8', margin: 0 }}>Try changing the date or route preferences to find more options.</p>
          </div>
        )}

        {results.map((alt) => (
          <div key={alt.rank} style={{ background: '#1e293b', borderRadius: 12, padding: '24px', marginBottom: 16, border: '1px solid #334155' }}>
            
            {/* Card Header stats */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid #334155', paddingBottom: 16 }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                 <div style={{ background: '#3b82f6', color: '#fff', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    #{alt.rank}
                 </div>
                 <div>
                    <span style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 18 }}>{Math.floor(alt.total_duration_minutes / 60)}h {alt.total_duration_minutes % 60}m</span>
                    <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>Total Duration</p>
                 </div>
               </div>
               
               <div style={{ textAlign: 'center' }}>
                 <span style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 18 }}>₹{alt.total_fare}</span>
                 <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>Est. Fare</p>
               </div>

               <div style={{ textAlign: 'center' }}>
                 <span style={{ fontWeight: 800, color: '#60a5fa', fontSize: 18 }}>{alt.transfers}</span>
                 <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>Transfers</p>
               </div>

               <div>
                 <button onClick={() => navigate('/book')} style={{
                    background: '#22c55e', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14
                 }}>Book Route</button>
               </div>
            </div>

            {/* Legs breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {alt.legs.map((leg, idx) => (
                 <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ background: '#0f172a', padding: '10px 16px', borderRadius: 8, border: '1px solid #334155', minWidth: 100, textAlign: 'center' }}>
                       <span style={{ color: '#f1f5f9', fontWeight: 'bold', display: 'block' }}>{leg.train_number}</span>
                       <span style={{ color: '#94a3b8', fontSize: 11 }}>[{leg.class_available}]</span>
                    </div>

                    <div style={{ flex: 1 }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f1f5f9' }}>
                          <span style={{ fontWeight: 600 }}>{leg.departure?.slice(11, 16)}</span>
                          <span style={{ color: '#64748b', fontSize: 12 }}>→</span>
                          <span style={{ fontWeight: 600 }}>{leg.arrival?.slice(11, 16)}</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
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

const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4, letterSpacing: 1 };
const selectStyle = { width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, background: '#fff', color: '#1e293b', outline: 'none' };
