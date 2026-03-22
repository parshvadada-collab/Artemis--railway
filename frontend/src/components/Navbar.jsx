import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const GOLD = '#D4AF37';

export default function Navbar() {
  const location = useLocation();
  const path = location.pathname;

  const linkStyle = (route) => ({
    color: path === route ? GOLD : 'rgba(255,255,255,0.7)',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '0.9rem',
    transition: 'color 0.2s',
    letterSpacing: '0.02em',
  });

  return (
    <nav style={{
      padding: '0.875rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid rgba(212,175,55,0.15)',
      background: 'rgba(10,10,10,0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{
          width: '2rem', height: '2rem', backgroundColor: GOLD,
          borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="18" height="18" fill="none" stroke="#0A0A0A" viewBox="0 0 24 24">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
          </svg>
        </div>
        <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'white', letterSpacing: '-0.04em' }}>RailWise</span>
      </Link>

      {/* Nav Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <Link to="/book" style={linkStyle('/book')}>Book Ticket</Link>
        <Link to="/status" style={linkStyle('/status')}>Check PNR</Link>
        <Link to="/alternatives" style={linkStyle('/alternatives')}>Smart Routes</Link>
      </div>
    </nav>
  );
}
