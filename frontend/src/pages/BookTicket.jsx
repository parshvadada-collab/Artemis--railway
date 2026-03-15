import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const STATIONS = [
  'Ahmedabad', 'Bangalore', 'Bhubaneswar', 'Chennai',
  'Delhi', 'Hyderabad', 'Indore', 'Jaipur',
  'Kolkata', 'Lucknow', 'Mumbai', 'Nagpur',
  'Patna', 'Pune', 'Surat'
];

const CLASSES = [
  { code: 'SL', label: 'Sleeper (SL)', icon: '🛏' },
  { code: '3A', label: 'AC 3 Tier (3A)', icon: '❄' },
  { code: '2A', label: 'AC 2 Tier (2A)', icon: '❄❄' },
  { code: '1A', label: 'AC First Class (1A)', icon: '👑' },
];

const QUOTAS = ['General', 'Ladies', 'Senior Citizen', 'Tatkal'];

export default function BookTicket() {
  const navigate = useNavigate();
  const [trains, setTrains] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [selectedTrain, setSelectedTrain] = useState(null);
  const [showPassenger, setShowPassenger] = useState(false);

  const [journey, setJourney] = useState({
    source: '', destination: '', date: '', class: 'SL', quota: 'General'
  });
  const [passenger, setPassenger] = useState({
    name: '', age: '', contact: ''
  });

  const swapStations = () => {
    setJourney(j => ({ ...j, source: j.destination, destination: j.source }));
    setTrains([]); setSearched(false); setSelectedTrain(null);
  };

  const searchTrains = async () => {
    if (!journey.source || !journey.destination || !journey.date) {
      setError('Please fill source, destination and date'); return;
    }
    if (journey.source === journey.destination) {
      setError('Source and destination cannot be same'); return;
    }
    setError(''); setLoading(true); setSearched(false);
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/trains/search`,
        { params: { source: journey.source, destination: journey.destination, date: journey.date } }
      );
      setTrains(res.data.trains || []);
      setSearched(true);
    } catch {
      setTrains([]); setSearched(true);
    } finally { setLoading(false); }
  };

  const selectTrain = (train) => {
    setSelectedTrain(train);
    setShowPassenger(true);
    setError('');
  };

  const handleBook = async () => {
    const { name, age, contact } = passenger;
    if (!name || !age || !contact) { setError('All passenger fields required'); return; }
    if (isNaN(age) || age < 1 || age > 120) { setError('Enter valid age'); return; }
    setBooking(true); setError('');
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/bookings`, {
        name, age: parseInt(age), contact,
        train_id: selectedTrain.id, seat_class: journey.class
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Booking failed');
    } finally { setBooking(false); }
  };

  if (result) return <SuccessCard result={result} passenger={passenger} navigate={navigate}
    onReset={() => { setResult(null); setSelectedTrain(null); setShowPassenger(false); setSearched(false); setTrains([]); }} />;

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', padding: '0 0 60px' }}>

      {/* Hero Banner */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1e293b 100%)', padding: '40px 20px 0', borderBottom: '3px solid #f97316' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 28 }}>🚂</span>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: 0 }}>Book Train Tickets</h1>
          </div>
          <p style={{ color: '#94a3b8', marginBottom: 28, fontSize: 14 }}>
            AI-powered waitlist prediction · Real-time seat availability · Smart alternatives
          </p>

          {/* Search Box */}
          <div style={{ background: '#fff', borderRadius: '16px 16px 0 0', padding: '24px 28px' }}>

            {/* Station Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>FROM</label>
                <select value={journey.source} onChange={e => setJourney({ ...journey, source: e.target.value })} style={selectStyle}>
                  <option value="">Select Source</option>
                  {STATIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              <button onClick={swapStations} style={{
                marginTop: 18, width: 36, height: 36, borderRadius: '50%',
                background: '#f97316', border: 'none', cursor: 'pointer',
                fontSize: 18, color: '#fff', flexShrink: 0
              }}>⇄</button>

              <div style={{ flex: 1 }}>
                <label style={labelStyle}>TO</label>
                <select value={journey.destination} onChange={e => setJourney({ ...journey, destination: e.target.value })} style={selectStyle}>
                  <option value="">Select Destination</option>
                  {STATIONS.filter(s => s !== journey.source).map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <label style={labelStyle}>DATE OF JOURNEY</label>
                <input type="date" value={journey.date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setJourney({ ...journey, date: e.target.value })}
                  style={selectStyle} />
              </div>

              <div style={{ flex: 1 }}>
                <label style={labelStyle}>CLASS</label>
                <select value={journey.class} onChange={e => setJourney({ ...journey, class: e.target.value })} style={selectStyle}>
                  {CLASSES.map(c => <option key={c.code} value={c.code}>{c.icon} {c.label}</option>)}
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <label style={labelStyle}>QUOTA</label>
                <select value={journey.quota} onChange={e => setJourney({ ...journey, quota: e.target.value })} style={selectStyle}>
                  {QUOTAS.map(q => <option key={q}>{q}</option>)}
                </select>
              </div>
            </div>

            {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 10 }}>⚠ {error}</p>}

            <button onClick={searchTrains} disabled={loading} style={{
              background: '#f97316', color: '#fff', border: 'none',
              padding: '13px 48px', borderRadius: 8, fontSize: 16,
              fontWeight: 700, cursor: 'pointer', letterSpacing: 0.5
            }}>
              {loading ? 'Searching...' : '🔍 Search Trains'}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
        {searched && trains.length === 0 && (
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>😔</div>
            <h3 style={{ color: '#f1f5f9', marginBottom: 8 }}>No trains available</h3>
            <p style={{ color: '#94a3b8', marginBottom: 20 }}>No trains found for this route on selected date.</p>
            <button onClick={() => navigate(`/alternatives?source=${journey.source}&destination=${journey.destination}&date=${journey.date}`)}
              style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
              🔀 Find Smart Alternatives
            </button>
          </div>
        )}

        {trains.map(train => (
          <div key={train.id} style={{
            background: '#1e293b', borderRadius: 12, padding: '20px 24px',
            marginBottom: 12, border: selectedTrain?.id === train.id ? '2px solid #f97316' : '1px solid #334155'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontWeight: 800, fontSize: 17, color: '#f1f5f9' }}>{train.train_number}</span>
                  <span style={{ background: '#1e3a5f', color: '#60a5fa', padding: '2px 10px', borderRadius: 20, fontSize: 12 }}>
                    {journey.class}
                  </span>
                </div>
                <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>{train.source} → {train.destination}</p>
              </div>

              <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: '#94a3b8', fontSize: 11, margin: '0 0 2px' }}>DEPARTURE</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                    {train.departure_time?.slice(11, 16) || '--:--'}
                  </p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 60, height: 2, background: '#334155', position: 'relative' }}>
                    <span style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: '#64748b' }}>🚂</span>
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: '#94a3b8', fontSize: 11, margin: '0 0 2px' }}>ARRIVAL</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                    {train.arrival_time?.slice(11, 16) || '--:--'}
                  </p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: '#94a3b8', fontSize: 11, margin: '0 0 4px' }}>AVAILABILITY</p>
                  <span style={{
                    padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                    background: train.available_seats > 10 ? '#14532d' : train.available_seats > 0 ? '#713f12' : '#7f1d1d',
                    color: train.available_seats > 10 ? '#4ade80' : train.available_seats > 0 ? '#fbbf24' : '#f87171'
                  }}>
                    {train.available_seats > 0 ? `AVBL ${train.available_seats}` : 'WL'}
                  </span>
                </div>
                <button onClick={() => selectTrain(train)} style={{
                  background: '#f97316', color: '#fff', border: 'none',
                  padding: '10px 22px', borderRadius: 8, fontWeight: 700,
                  cursor: 'pointer', fontSize: 14
                }}>
                  Book Now
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Passenger Form */}
        {showPassenger && selectedTrain && (
          <div style={{ background: '#1e293b', borderRadius: 12, padding: '24px 28px', marginTop: 8, border: '1px solid #f97316' }}>
            <h3 style={{ color: '#f1f5f9', marginBottom: 20, fontSize: 18 }}>👤 Passenger Details</h3>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 2 }}>
                <label style={labelStyle}>FULL NAME</label>
                <input placeholder="Enter passenger name" value={passenger.name}
                  onChange={e => setPassenger({ ...passenger, name: e.target.value })}
                  style={darkInputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>AGE</label>
                <input type="number" placeholder="Age" value={passenger.age}
                  onChange={e => setPassenger({ ...passenger, age: e.target.value })}
                  style={darkInputStyle} />
              </div>
              <div style={{ flex: 2 }}>
                <label style={labelStyle}>MOBILE NUMBER</label>
                <input placeholder="10-digit mobile" value={passenger.contact}
                  onChange={e => setPassenger({ ...passenger, contact: e.target.value })}
                  style={darkInputStyle} />
              </div>
            </div>

            {error && <p style={{ color: '#ef4444', fontSize: 13, margin: '8px 0' }}>⚠ {error}</p>}

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button onClick={handleBook} disabled={booking} style={{
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                color: '#fff', border: 'none', padding: '14px 32px',
                borderRadius: 8, fontWeight: 700, fontSize: 16, cursor: 'pointer',
                opacity: booking ? 0.6 : 1
              }}>
                {booking ? 'Processing...' : '🎫 Confirm Booking'}
              </button>
              <button onClick={() => { setShowPassenger(false); setSelectedTrain(null); }}
                style={{ background: '#334155', color: '#94a3b8', border: 'none', padding: '14px 24px', borderRadius: 8, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SuccessCard({ result, passenger, navigate, onReset }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#1e293b', borderRadius: 16, padding: 40, maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, background: result.status === 'confirmed' ? '#14532d' : '#713f12',
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, margin: '0 auto 20px' }}>
          {result.status === 'confirmed' ? '✅' : '⏳'}
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>
          {result.status === 'confirmed' ? 'Booking Confirmed!' : 'Added to Waitlist'}
        </h2>
        <p style={{ color: '#94a3b8', marginBottom: 28 }}>
          {result.status === 'confirmed' ? 'Your seat has been reserved.' : 'Our ML engine is tracking your confirmation probability.'}
        </p>

        <div style={{ background: '#0f172a', borderRadius: 12, padding: '20px 24px', marginBottom: 20, border: '1px dashed #334155' }}>
          <p style={{ color: '#64748b', fontSize: 11, margin: '0 0 6px', letterSpacing: 2 }}>PNR NUMBER</p>
          <p style={{ fontSize: 32, fontWeight: 900, letterSpacing: 6, color: '#f97316', margin: 0 }}>{result.pnr_code}</p>
        </div>

        <div style={{ textAlign: 'left', marginBottom: 24 }}>
          {[
            ['Passenger', passenger.name],
            ['Status', result.status?.toUpperCase()],
            ['Class', result.class],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1e293b' }}>
              <span style={{ color: '#64748b', fontSize: 14 }}>{k}</span>
              <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14 }}>{v}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => navigate('/status?pnr=' + result.pnr_code)}
            style={{ flex: 1, background: '#f97316', color: '#fff', border: 'none', padding: '13px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
            Check ML Prediction
          </button>
          <button onClick={onReset}
            style={{ flex: 1, background: '#334155', color: '#94a3b8', border: 'none', padding: '13px', borderRadius: 8, cursor: 'pointer' }}>
            Book Another
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4, letterSpacing: 1 };
const selectStyle = { width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, background: '#fff', color: '#1e293b', outline: 'none' };
const darkInputStyle = { width: '100%', padding: '10px 12px', background: '#0f172a', border: '1.5px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
