import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

const CLASSES = [
  { code: 'SL', label: 'Sleeper (SL)', icon: '🛏' },
  { code: '3A', label: 'AC 3 Tier (3A)', icon: '❄' },
  { code: '2A', label: 'AC 2 Tier (2A)', icon: '❄❄' },
  { code: '1A', label: 'AC First Class (1A)', icon: '👑' },
];

// ── IST Helpers & Time Formatters ─────────────────────────────────────────
const getTodayIST = () => {
  const nowUTC = new Date();
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(nowUTC.getTime() + IST_OFFSET_MS);
  const y = nowIST.getUTCFullYear();
  const mo = String(nowIST.getUTCMonth() + 1).padStart(2, '0');
  const d = String(nowIST.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
};

const getNowISTMinutes = () => {
  const nowUTC = new Date();
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(nowUTC.getTime() + IST_OFFSET_MS);
  return nowIST.getUTCHours() * 60 + nowIST.getUTCMinutes();
};

const filterDepartedTrains = (trains, selectedDate) => {
  if (selectedDate !== getTodayIST()) return trains;
  const nowMinutes = getNowISTMinutes();
  return trains.filter(train => {
    const raw = train.departure_time || '';
    const timePart = raw.includes('T') ? raw.split('T')[1] : raw;
    const [h, m] = timePart.split(':').map(Number);
    return (h * 60 + m) > nowMinutes;
  });
};

const formatTime = (raw) => {
  if (!raw) return '--:--';
  const timePart = raw.includes('T') ? raw.split('T')[1] : raw;
  const [h, m] = timePart.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
};

const inputStyle = {
  width: '100%', padding: '0.75rem 1rem',
  background: 'rgba(255,255,255,0.05)',
  border: `1px solid ${BORDER}`,
  borderRadius: '0.75rem', color: 'white',
  fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

const labelStyle = {
  display: 'block', fontSize: '0.7rem', fontWeight: 700,
  color: 'rgba(212,175,55,0.8)', marginBottom: '0.4rem',
  letterSpacing: '0.1em', textTransform: 'uppercase',
};

export default function BookTicket() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [trains, setTrains] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [selectedTrain, setSelectedTrain] = useState(null);
  const [showPassenger, setShowPassenger] = useState(false);

  const [journey, setJourney] = useState({
    source: searchParams.get('source') || '',
    destination: searchParams.get('destination') || '',
    date: searchParams.get('date') || '',
    class: searchParams.get('class') || 'SL'
  });
  const [passenger, setPassenger] = useState({ name: '', age: '', contact: '' });

  const hasAutoSearched = useRef(false);

  useEffect(() => {
    if (journey.source && journey.destination && journey.date && !hasAutoSearched.current) {
      hasAutoSearched.current = true;
      searchTrainsObj(journey);
    }
  }, [journey]);

  const swapStations = () => {
    setJourney(j => ({ ...j, source: j.destination, destination: j.source }));
    setTrains([]); setSearched(false); setSelectedTrain(null);
  };

  const searchTrainsObj = async (jrn) => {
    if (!jrn.source || !jrn.destination || !jrn.date) {
      setError('Please fill source, destination and date'); return;
    }
    if (jrn.source === jrn.destination) {
      setError('Source and destination cannot be same'); return;
    }
    setError(''); setLoading(true); setSearched(false);
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/trains/search`,
        { params: { source: jrn.source, destination: jrn.destination, date: jrn.date } }
      );
      const allTrains = res.data.trains || [];
      const filtered = filterDepartedTrains(allTrains, jrn.date);
      setTrains(filtered);
      if (filtered.length === 0 && allTrains.length > 0) {
        setError('All trains for today have already departed. Please select a future date.');
      }
      setSearched(true);
    } catch {
      setTrains([]); setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const searchTrains = () => searchTrainsObj(journey);

  const selectTrain = (train) => { setSelectedTrain(train); setShowPassenger(true); setError(''); };

  const handleBook = async () => {
    const { name, age, contact } = passenger;
    if (!name || !age || !contact) { setError('All passenger fields required'); return; }
    if (isNaN(age) || age < 1 || age > 120) { setError('Enter valid age'); return; }
    setBooking(true); setError('');
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/bookings`, {
        name, age: parseInt(age), contact, train_id: selectedTrain.id, seat_class: journey.class
      });
      res.data.seat_class = journey.class;
      res.data.passenger_name = passenger.name;
      setResult(res.data);
    } catch (err) { setError(err.response?.data?.error || 'Booking failed'); }
    finally { setBooking(false); }
  };

  if (result) return <SuccessCard result={result} passenger={passenger} navigate={navigate}
    onReset={() => { setResult(null); setSelectedTrain(null); setShowPassenger(false); setSearched(false); setTrains([]); }} />;

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
          }}>Ticket Booking</span>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 0.5rem' }}>
            Book Train Tickets
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', margin: 0 }}>
            AI-powered waitlist prediction · Real-time seat availability · Smart alternatives
          </p>
        </div>

        {/* Search Panel */}
        <div style={{
          background: CARD, border: `1px solid ${BORDER}`, borderRadius: '1.5rem',
          padding: '2rem', marginBottom: '1.5rem',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)'
        }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 160px' }}>
              <label style={labelStyle}>From</label>
              <select value={journey.source} onChange={e => setJourney({ ...journey, source: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="" style={{ background: '#111' }}>Select Station</option>
                {STATIONS.map(s => <option key={s} style={{ background: '#111' }}>{s}</option>)}
              </select>
            </div>

            <button onClick={swapStations} style={{
              width: '2.5rem', height: '2.5rem', borderRadius: '50%',
              background: GOLD_BORDER, border: `1px solid ${GOLD_BORDER}`,
              cursor: 'pointer', color: GOLD, fontSize: '1.1rem', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '0.1rem'
            }}>⇄</button>

            <div style={{ flex: '1 1 160px' }}>
              <label style={labelStyle}>To</label>
              <select value={journey.destination} onChange={e => setJourney({ ...journey, destination: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="" style={{ background: '#111' }}>Select Station</option>
                {STATIONS.filter(s => s !== journey.source).map(s => <option key={s} style={{ background: '#111' }}>{s}</option>)}
              </select>
            </div>

            <div style={{ flex: '1 1 140px' }}>
              <label style={labelStyle}>Date</label>
              <input type="date" value={journey.date}
                min={getTodayIST()}
                onChange={e => setJourney({ ...journey, date: e.target.value })}
                style={{ ...inputStyle, colorScheme: 'dark' }} />
            </div>

            <div style={{ flex: '1 1 140px' }}>
              <label style={labelStyle}>Class</label>
              <select value={journey.class} onChange={e => setJourney({ ...journey, class: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                {CLASSES.map(c => <option key={c.code} value={c.code} style={{ background: '#111' }}>{c.icon} {c.label}</option>)}
              </select>
            </div>
          </div>

          {error && <p style={{ color: '#f87171', fontSize: '0.85rem', marginTop: '1rem', marginBottom: 0 }}>⚠ {error}</p>}

          <button onClick={searchTrains} disabled={loading} style={{
            width: '100%', marginTop: '1.5rem', background: loading ? 'rgba(212,175,55,0.4)' : GOLD,
            color: '#0A0A0A', border: 'none', padding: '0.875rem 2.5rem',
            borderRadius: '0.875rem', fontSize: '0.95rem', fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.03em',
            transition: 'all 0.2s'
          }}>
            {loading ? '🔍 Searching...' : '🔍 Search Trains'}
          </button>
        </div>

        {/* No Results */}
        {searched && trains.length === 0 && (
          <div style={{
            background: CARD, border: `1px solid ${BORDER}`, borderRadius: '1.5rem',
            padding: '3rem', textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😔</div>
            <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>No trains available</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem' }}>No trains found for this route on selected date.</p>
            <button onClick={() => navigate(`/alternatives?source=${journey.source}&destination=${journey.destination}&date=${journey.date}`)}
              style={{
                background: 'transparent', color: GOLD, border: `1px solid ${GOLD}`,
                padding: '0.75rem 1.75rem', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: 600
              }}>
              🔀 Find Smart Alternatives
            </button>
          </div>
        )}

        {/* Train Results */}
        {trains.map(train => (
          <div key={train.id} style={{
            background: CARD, borderRadius: '1.25rem', padding: '1.5rem',
            marginBottom: '1rem',
            border: selectedTrain?.id === train.id ? `1px solid ${GOLD}` : `1px solid ${BORDER}`,
            backdropFilter: 'blur(8px)', transition: 'border-color 0.2s'
          }}>
            {/* Train Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'white' }}>{train.train_number}</span>
              <span style={{
                background: 'rgba(212,175,55,0.1)', color: GOLD,
                padding: '0.125rem 0.5rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 700,
                border: `1px solid ${GOLD_BORDER}`
              }}>{journey.class}</span>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginLeft: 'auto', fontSize: '0.95rem' }}>
                {train.train_name || 'Express'}
              </span>
            </div>

            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: '0 0 1rem' }}>
              {train.source} → {train.destination}
            </p>

            {/* Time Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>{formatTime(train.departure_time)}</span>
              <div style={{ flex: 1, height: '1px', background: BORDER, position: 'relative' }}>
                <span style={{ position: 'absolute', top: '-0.75rem', left: '50%', transform: 'translateX(-50%)' }}>🚂</span>
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>{formatTime(train.arrival_time)}</span>
            </div>

            {/* Fares */}
            <div style={{
              display: 'flex', gap: '1rem', background: 'rgba(0,0,0,0.3)',
              padding: '0.875rem 1rem', borderRadius: '0.75rem', marginBottom: '1.25rem'
            }}>
              {['SL', '3A', '2A', '1A'].map(cls => {
                const fareKey = `base_fare_${cls.toLowerCase()}`;
                const fareAmount = train[fareKey];
                const isSelected = journey.class === cls;
                return (
                  <div key={cls} style={{ flex: 1, textAlign: 'center', borderRight: cls !== '1A' ? `1px solid ${BORDER}` : 'none' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isSelected ? GOLD : 'rgba(255,255,255,0.4)', marginBottom: '0.15rem' }}>{cls}</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: isSelected ? 'white' : 'rgba(255,255,255,0.6)' }}>
                      {fareAmount === 0 ? 'N/A' : fareAmount ? `₹${fareAmount}` : '--'}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                padding: '0.375rem 0.875rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 700,
                background: train.available_seats > 10 ? 'rgba(74,222,128,0.1)' : train.available_seats > 0 ? 'rgba(250,204,21,0.1)' : 'rgba(248,113,113,0.1)',
                color: train.available_seats > 10 ? '#4ade80' : train.available_seats > 0 ? '#facc15' : '#f87171',
                border: `1px solid ${train.available_seats > 10 ? 'rgba(74,222,128,0.3)' : train.available_seats > 0 ? 'rgba(250,204,21,0.3)' : 'rgba(248,113,113,0.3)'}`
              }}>
                {train.available_seats > 0 ? `AVBL ${train.available_seats}` : 'WAITLISTED'}
              </span>
              <button onClick={() => selectTrain(train)} style={{
                background: selectedTrain?.id === train.id ? 'rgba(212,175,55,0.15)' : GOLD,
                color: selectedTrain?.id === train.id ? GOLD : '#0A0A0A',
                border: `1px solid ${selectedTrain?.id === train.id ? GOLD : 'transparent'}`,
                padding: '0.625rem 1.75rem', borderRadius: '0.75rem',
                fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s'
              }}>
                {selectedTrain?.id === train.id ? '✓ Selected' : 'Book Now'}
              </button>
            </div>
          </div>
        ))}

        {/* Passenger Form */}
        {showPassenger && selectedTrain && (
          <div style={{
            background: CARD, borderRadius: '1.25rem', padding: '2rem', marginTop: '0.5rem',
            border: `1px solid ${GOLD}`, backdropFilter: 'blur(8px)'
          }}>
            <h3 style={{ color: 'white', marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 700 }}>
              👤 Passenger Details
            </h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: '2 1 200px' }}>
                <label style={labelStyle}>Full Name</label>
                <input placeholder="Enter passenger name" value={passenger.name}
                  onChange={e => setPassenger({ ...passenger, name: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ flex: '1 1 90px' }}>
                <label style={labelStyle}>Age</label>
                <input type="number" placeholder="Age" value={passenger.age}
                  onChange={e => setPassenger({ ...passenger, age: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ flex: '2 1 180px' }}>
                <label style={labelStyle}>Mobile Number</label>
                <input placeholder="10-digit mobile" value={passenger.contact}
                  onChange={e => setPassenger({ ...passenger, contact: e.target.value })} style={inputStyle} />
              </div>
            </div>

            {error && <p style={{ color: '#f87171', fontSize: '0.85rem', margin: '0.75rem 0 0' }}>⚠ {error}</p>}

            <div style={{ display: 'flex', gap: '0.875rem', marginTop: '1.5rem' }}>
              <button onClick={handleBook} disabled={booking} style={{
                background: booking ? 'rgba(212,175,55,0.4)' : GOLD, color: '#0A0A0A',
                border: 'none', padding: '0.875rem 2rem',
                borderRadius: '0.875rem', fontWeight: 700, fontSize: '1rem', cursor: booking ? 'not-allowed' : 'pointer',
              }}>
                {booking ? 'Processing...' : '🎫 Confirm Booking'}
              </button>
              <button onClick={() => { setShowPassenger(false); setSelectedTrain(null); }}
                style={{
                  background: 'transparent', color: 'rgba(255,255,255,0.5)',
                  border: `1px solid ${BORDER}`, padding: '0.875rem 1.5rem',
                  borderRadius: '0.875rem', cursor: 'pointer', fontWeight: 600
                }}>
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
  const isConfirmed = result.status === 'confirmed';
  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{
        background: CARD, borderRadius: '2rem', padding: '3rem 2.5rem',
        maxWidth: '28rem', width: '100%', textAlign: 'center',
        border: `1px solid ${isConfirmed ? 'rgba(74,222,128,0.3)' : GOLD_BORDER}`,
        backdropFilter: 'blur(16px)'
      }}>
        <div style={{
          width: '5rem', height: '5rem',
          background: isConfirmed ? 'rgba(74,222,128,0.1)' : 'rgba(212,175,55,0.1)',
          border: `2px solid ${isConfirmed ? 'rgba(74,222,128,0.5)' : GOLD}`,
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', margin: '0 auto 1.5rem'
        }}>
          {isConfirmed ? '✅' : '⏳'}
        </div>

        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>
          {isConfirmed ? 'Booking Confirmed!' : 'Added to Waitlist'}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '2rem', fontSize: '0.95rem' }}>
          {isConfirmed ? 'Your seat has been reserved successfully.' : 'Our ML engine is tracking your confirmation probability.'}
        </p>

        {/* PNR Display */}
        <div style={{
          background: 'rgba(0,0,0,0.4)', borderRadius: '1rem', padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem', border: `1px dashed rgba(212,175,55,0.4)`
        }}>
          <p style={{ color: 'rgba(212,175,55,0.7)', fontSize: '0.65rem', margin: '0 0 0.5rem', letterSpacing: '0.2em', fontWeight: 700 }}>PNR NUMBER</p>
          <p style={{ fontSize: '2.25rem', fontWeight: 900, letterSpacing: '0.2em', color: GOLD, margin: 0 }}>{result.pnr_code}</p>
        </div>

        {/* Details */}
        <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
          {[['Passenger', passenger.name], ['Status', result.status?.toUpperCase()], ['Class', result.seat_class]].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>{k}</span>
              <span style={{ color: 'white', fontWeight: 600, fontSize: '0.875rem' }}>{v}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => navigate('/status?pnr=' + result.pnr_code)} style={{
            flex: 1, background: GOLD, color: '#0A0A0A', border: 'none',
            padding: '0.875rem', borderRadius: '0.875rem', fontWeight: 700, cursor: 'pointer'
          }}>
            Check Prediction
          </button>
          <button onClick={onReset} style={{
            flex: 1, background: 'transparent', color: 'rgba(255,255,255,0.6)',
            border: `1px solid ${BORDER}`, padding: '0.875rem',
            borderRadius: '0.875rem', cursor: 'pointer', fontWeight: 600
          }}>
            Book Another
          </button>
        </div>
      </div>
    </div>
  );
}
