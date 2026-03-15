import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="page fade-in" style={{ textAlign: 'center', marginTop: '10vh' }}>
      <h1 style={{ marginBottom: '16px' }}>The Future of <span style={{ color: 'var(--accent)' }}>Railway Bookings</span></h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto 40px' }}>
        No more waitlist anxiety. RailWise predicts your confirmation chances with military precision, automatically reallocates seats, and suggests smart alternatives.
      </p>
      
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
        <button onClick={() => navigate('/book')} className="btn btn-primary" style={{ padding: '16px 32px', fontSize: '1.1rem' }}>
          Book a Ticket
        </button>
        <button onClick={() => navigate('/status')} className="btn btn-outline" style={{ padding: '16px 32px', fontSize: '1.1rem' }}>
          Check Waitlist Probability
        </button>
      </div>

      <div className="grid-3" style={{ marginTop: '80px', textAlign: 'left' }}>
        <div className="card" style={{ padding: '30px' }}>
          <h3 style={{ color: 'var(--accent)', marginBottom: '12px' }}>AI Probability Engine</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Predicts waitlist confirmation chances before you even book.</p>
        </div>
        <div className="card" style={{ padding: '30px' }}>
          <h3 style={{ color: 'var(--accent)', marginBottom: '12px' }}>Dynamic Allocation</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Auto-promotes waitlisted users fairly the second a seat is cancelled.</p>
        </div>
        <div className="card" style={{ padding: '30px' }}>
          <h3 style={{ color: 'var(--accent)', marginBottom: '12px' }}>Smart Routing</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Can't get a direct train? We automatically find alternative multi-leg routes.</p>
        </div>
      </div>
    </div>
  );
}
