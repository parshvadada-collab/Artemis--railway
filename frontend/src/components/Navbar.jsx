import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <nav style={{ 
      padding: '20px 40px', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      borderBottom: '1px solid var(--glass-border)',
      background: 'rgba(10, 14, 26, 0.8)',
      backdropFilter: 'blur(10px)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{ fontWeight: 'bold', fontSize: '1.5rem', fontFamily: 'var(--font-display)' }}>
        <Link to="/" style={{ color: 'var(--accent)', textDecoration: 'none' }}>RailWise</Link>
      </div>
      <div style={{ display: 'flex', gap: '24px' }}>
        <Link to="/book" style={{ color: path === '/book' ? 'var(--accent)' : 'var(--text-primary)', textDecoration: 'none', fontWeight: 600 }}>Book Ticket</Link>
        <Link to="/status" style={{ color: path === '/status' ? 'var(--accent)' : 'var(--text-primary)', textDecoration: 'none', fontWeight: 600 }}>Check Status (PNR)</Link>
        <Link to="/alternatives" style={{ color: path === '/alternatives' ? 'var(--accent)' : 'var(--text-primary)', textDecoration: 'none', fontWeight: 600 }}>Smart Alternatives</Link>
      </div>
    </nav>
  );
}
