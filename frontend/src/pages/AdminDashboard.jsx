import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';

const GOLD = '#D4AF37';
const BG = '#0A0A0A';
const CARD = 'rgba(255,255,255,0.04)';
const BORDER = 'rgba(255,255,255,0.1)';
const GOLD_BORDER = 'rgba(212,175,55,0.3)';

const tooltipStyle = {
  contentStyle: { background: '#111', border: `1px solid ${BORDER}`, borderRadius: '0.75rem', color: 'white' },
  itemStyle: { color: 'rgba(255,255,255,0.8)' }
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [trains, setTrains] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [stRes, rtRes, trRes, rcRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/api/admin/stats`),
          axios.get(`${import.meta.env.VITE_API_URL}/api/admin/routes`),
          axios.get(`${import.meta.env.VITE_API_URL}/api/admin/trains`),
          axios.get(`${import.meta.env.VITE_API_URL}/api/admin/recent`),
        ]);
        setStats(stRes.data); setRoutes(rtRes.data);
        setTrains(trRes.data); setRecent(rcRes.data);
      } catch (err) { console.error('Error fetching admin data:', err); }
      finally { setLoading(false); }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: BG, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '3rem', height: '3rem', border: `3px solid ${GOLD_BORDER}`, borderTopColor: GOLD, borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 0.8s linear infinite' }}></div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  const pieData = stats ? [
    { name: 'Confirmed', value: Number(stats.confirmedCount) || 0, color: '#4ade80' },
    { name: 'Waitlisted', value: Number(stats.waitlistedCount) || 0, color: GOLD },
    { name: 'Cancelled', value: Number(stats.cancelledCount) || 0, color: '#f87171' }
  ] : [];

  const statCards = stats ? [
    { label: 'Total Bookings', value: stats.totalBookings, color: '#818cf8', icon: '🎫' },
    { label: 'Confirmed', value: stats.confirmedCount, color: '#4ade80', icon: '✅' },
    { label: 'Waitlisted', value: stats.waitlistedCount, color: GOLD, icon: '⏳' },
    { label: 'Revenue', value: `₹${Number(stats.totalRevenue).toLocaleString()}`, color: '#c084fc', icon: '💰' }
  ] : [];

  return (
    <div style={{ minHeight: '100vh', background: BG, color: 'white', padding: '2.5rem 1.5rem 5rem' }}>
      <div style={{ maxWidth: '75rem', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <span style={{
            display: 'inline-block', padding: '0.25rem 0.875rem', borderRadius: '9999px',
            background: 'rgba(212,175,55,0.1)', border: `1px solid ${GOLD_BORDER}`,
            color: GOLD, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', marginBottom: '1rem'
          }}>Operator View</span>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 0.5rem' }}>
            Terminal Operations
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', margin: 0 }}>
            Real-time overview of bookings, waitlists, and train utilization.
          </p>
        </div>

        {/* Stat Cards */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
            {statCards.map((stat, i) => (
              <div key={i} style={{
                background: CARD, padding: '1.75rem', borderRadius: '1.25rem',
                border: `1px solid ${BORDER}`, backdropFilter: 'blur(8px)',
                transition: 'border-color 0.2s'
              }}
                onMouseOver={e => e.currentTarget.style.borderColor = GOLD_BORDER}
                onMouseOut={e => e.currentTarget.style.borderColor = BORDER}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{stat.label}</p>
                  <span style={{ fontSize: '1.25rem' }}>{stat.icon}</span>
                </div>
                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '1.25rem', marginBottom: '1.25rem' }}>

          {/* Pie Chart */}
          <div style={{ background: CARD, padding: '1.75rem', borderRadius: '1.25rem', border: `1px solid ${BORDER}`, backdropFilter: 'blur(8px)' }}>
            <h3 style={{ color: 'white', marginTop: 0, marginBottom: '1.5rem', fontSize: '1rem', fontWeight: 700 }}>Booking Distribution</h3>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={105} paddingAngle={5} dataKey="value">
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Routes Bar Chart */}
          <div style={{ background: CARD, padding: '1.75rem', borderRadius: '1.25rem', border: `1px solid ${BORDER}`, backdropFilter: 'blur(8px)' }}>
            <h3 style={{ color: 'white', marginTop: 0, marginBottom: '1.5rem', fontSize: '1rem', fontWeight: 700 }}>Top 5 Busiest Routes</h3>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={routes} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="routeName" stroke="rgba(255,255,255,0.3)" fontSize={11} tickFormatter={(val) => val.split(' ?? ')[0]?.slice(0, 10)} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="bookingCount" fill={GOLD} radius={[4, 4, 0, 0]} name="Bookings" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Utilization Chart */}
        <div style={{ background: CARD, padding: '1.75rem', borderRadius: '1.25rem', border: `1px solid ${BORDER}`, backdropFilter: 'blur(8px)', marginBottom: '1.25rem' }}>
          <h3 style={{ color: 'white', marginTop: 0, marginBottom: '1.5rem', fontSize: '1rem', fontWeight: 700 }}>Seat Utilization (%) by Train</h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trains} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="trainNumber" stroke="rgba(255,255,255,0.3)" fontSize={11} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} domain={[0, 100]} />
                <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="utilization" fill="#818cf8" radius={[4, 4, 0, 0]} name="Utilization %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Bookings Table */}
        <div style={{ background: CARD, borderRadius: '1.25rem', border: `1px solid ${BORDER}`, backdropFilter: 'blur(8px)', overflow: 'hidden' }}>
          <div style={{ padding: '1.75rem 1.75rem 1.25rem' }}>
            <h3 style={{ color: 'white', margin: 0, fontSize: '1rem', fontWeight: 700 }}>Recent 10 Bookings</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}`, background: 'rgba(0,0,0,0.2)' }}>
                  {['PNR', 'Passenger', 'Route', 'Train', 'Class', 'Status'].map(h => (
                    <th key={h} style={{ padding: '0.875rem 1.5rem', color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((b, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid rgba(255,255,255,0.05)`, backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 700, color: GOLD, letterSpacing: '0.05em', fontSize: '0.875rem' }}>{b.pnr}</td>
                    <td style={{ padding: '1rem 1.5rem', color: 'white', fontSize: '0.9rem' }}>{b.passengerName}</td>
                    <td style={{ padding: '1rem 1.5rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>{b.route.replace('??', '→')}</td>
                    <td style={{ padding: '1rem 1.5rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>{b.trainName}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ background: 'rgba(255,255,255,0.07)', padding: '0.15rem 0.6rem', borderRadius: '0.375rem', border: `1px solid ${BORDER}`, fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>{b.class}</span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700,
                        background: b.status === 'confirmed' ? 'rgba(74,222,128,0.1)' : b.status === 'waitlisted' ? 'rgba(212,175,55,0.1)' : 'rgba(248,113,113,0.1)',
                        color: b.status === 'confirmed' ? '#4ade80' : b.status === 'waitlisted' ? GOLD : '#f87171',
                        border: `1px solid ${b.status === 'confirmed' ? 'rgba(74,222,128,0.3)' : b.status === 'waitlisted' ? GOLD_BORDER : 'rgba(248,113,113,0.3)'}`
                      }}>
                        {b.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
