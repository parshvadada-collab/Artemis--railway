import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const GOLD = '#D4AF37';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
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

  const mobileLinkStyle = (route) => ({
    ...linkStyle(route),
    fontSize: '1.25rem',
    display: 'block',
    padding: '1rem 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)'
  });

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <>
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
        <Link to="/" onClick={closeMenu} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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

        {/* Desktop Nav Links */}
        <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link to="/book" style={linkStyle('/book')}>Book Ticket</Link>
          <Link to="/status" style={linkStyle('/status')}>Check PNR</Link>
          <Link to="/alternatives" style={linkStyle('/alternatives')}>Smart Routes</Link>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="mobile-only" onClick={toggleMenu} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '5px', width: '24px', zIndex: 101 }}>
          <div style={{ width: '100%', height: '2px', backgroundColor: 'white', transition: 'all 0.3s', transformOrigin: 'left', transform: isOpen ? 'rotate(45deg)' : 'rotate(0)' }} />
          <div style={{ width: '100%', height: '2px', backgroundColor: 'white', transition: 'all 0.3s', opacity: isOpen ? 0 : 1 }} />
          <div style={{ width: '100%', height: '2px', backgroundColor: 'white', transition: 'all 0.3s', transformOrigin: 'left', transform: isOpen ? 'rotate(-45deg)' : 'rotate(0)' }} />
        </div>
      </nav>

      {/* Mobile Dropdown Menu */}
      <div style={{
        position: 'fixed', top: '3.75rem', left: 0, width: '100%', maxHeight: isOpen ? '250px' : 0, 
        backgroundColor: 'rgba(10,10,10,0.95)', borderBottom: isOpen ? '1px solid rgba(212,175,55,0.2)' : 'none',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', zIndex: 99,
        overflow: 'hidden', transition: 'max-height 0.3s ease-in-out',
        padding: isOpen ? '1rem 2rem 2rem' : '0 2rem'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', opacity: isOpen ? 1 : 0, transition: 'opacity 0.2s', transitionDelay: isOpen ? '0.1s' : '0s' }}>
          <Link to="/book" onClick={closeMenu} style={mobileLinkStyle('/book')}>Book Ticket</Link>
          <Link to="/status" onClick={closeMenu} style={mobileLinkStyle('/status')}>Check PNR</Link>
          <Link to="/alternatives" onClick={closeMenu} style={mobileLinkStyle('/alternatives')}>Smart Routes</Link>
        </div>
      </div>
    </>
  );
}
