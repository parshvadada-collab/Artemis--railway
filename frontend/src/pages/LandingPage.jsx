import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CSS = `
  body {
    background-color: #0A0A0A;
    overflow-x: hidden;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }

  .glass-card {
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .parallax-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    z-index: 0;
    overflow: hidden;
  }

  .train-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
  }

  #train-1 {
    /* Wider than viewport so there's content to pan across */
    width: 220%;
    left: -10%;
    background-image: url('/train-asset-1.jpeg');
    background-size: cover;
    background-position: left center;
    z-index: 2;
    animation: trainMove 40s linear infinite;
    will-change: transform;
  }

  #train-2 {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    z-index: 1;
  }

  .text-luxury-gold {
    color: #D4AF37;
  }

  .bg-luxury-gold {
    background-color: #D4AF37;
  }

  .border-luxury-gold {
    border-color: #D4AF37;
  }

  .hover-luxury-gold:hover {
    color: #D4AF37;
  }

  @keyframes bounce-slow {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }

  .animate-bounce-slow {
    animation: bounce-slow 2s ease-in-out infinite;
  }

  /* Train panning — slides image left then resets seamlessly */
  @keyframes trainMove {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-45%); }
  }

  @keyframes gradient-shift {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }

  .text-gradient {
    background: linear-gradient(90deg, #D4AF37, #f5e7a3, #D4AF37);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: gradient-shift 4s linear infinite;
  }

  section {
    position: relative;
    z-index: 1;
  }

  main {
    position: relative;
    z-index: 1;
  }

  nav {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    z-index: 50;
    padding: 1rem 1.5rem;
  }

  footer {
    position: relative;
    z-index: 1;
  }

  button {
    cursor: pointer;
    border: none;
    background: none;
  }

  @keyframes birdFly {
    0%   { transform: translateX(-120px) scaleX(1); }
    49%  { transform: translateX(calc(100vw + 120px)) scaleX(1); }
    50%  { transform: translateX(calc(100vw + 120px)) scaleX(-1); }
    100% { transform: translateX(-120px) scaleX(-1); }
  }
`;

const LandingPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const train2 = document.getElementById('train-2');
      const heroContent = document.getElementById('hero-content');

      // train-1 uses its own CSS animation (trainMove) — don't override it here
      if (train2) train2.style.transform = `translateY(${scrolled * 0.05}px)`;
      if (heroContent) {
        heroContent.style.transform = `translateY(${scrolled * -0.3}px)`;
        heroContent.style.opacity = Math.max(0, 1 - scrolled * 0.003);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div style={{ color: 'white', minHeight: '100vh' }}>
      <style>{CSS}</style>

      {/* Parallax Background */}
      <div className="parallax-container" id="parallax-bg">
        <div className="train-layer" id="train-2"></div>
        <div className="train-layer" id="train-1"></div>
        {/* Dark overlay for readability */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.2), rgba(0,0,0,0.8))',
          zIndex: 10
        }}></div>

        {/* Animated Birds */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 11, pointerEvents: 'none', overflow: 'hidden' }}>
          {[
            { top: '12%',  dur: '18s', delay: '0s',    scale: 1,    opacity: 0.8 },
            { top: '8%',   dur: '24s', delay: '-6s',   scale: 0.65, opacity: 0.55 },
            { top: '18%',  dur: '20s', delay: '-10s',  scale: 0.8,  opacity: 0.65 },
            { top: '6%',   dur: '30s', delay: '-3s',   scale: 0.45, opacity: 0.4  },
            { top: '22%',  dur: '15s', delay: '-14s',  scale: 1.1,  opacity: 0.7  },
            { top: '14%',  dur: '22s', delay: '-18s',  scale: 0.5,  opacity: 0.45 },
          ].map((b, i) => (
            <svg
              key={i}
              viewBox="0 0 80 30"
              width={80 * b.scale}
              height={30 * b.scale}
              fill="none"
              style={{
                position: 'absolute',
                top: b.top,
                left: 0,
                opacity: b.opacity,
                animation: `birdFly ${b.dur} ${b.delay} linear infinite`,
                filter: 'drop-shadow(0 0 4px rgba(212,175,55,0.3))',
              }}
            >
              {/* Classic M-shape flying bird silhouette */}
              <path
                d="M40 15 C30 5, 10 2, 0 8 C10 6, 25 12, 40 15 C55 12, 70 6, 80 8 C70 2, 50 5, 40 15Z"
                fill="rgba(212,175,55,0.85)"
              />
            </svg>
          ))}
        </div>
      </div>


      {/* Navigation */}
      <nav style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 50, padding: '1rem 1.5rem' }}>
        <div className="glass-card" style={{
          maxWidth: '1280px', margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.75rem 1.5rem', borderRadius: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '2.5rem', height: '2.5rem',
              backgroundColor: '#D4AF37', borderRadius: '0.5rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <svg width="24" height="24" fill="none" stroke="#0A0A0A" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.05em' }}>RailWise</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <button onClick={() => navigate('/book')} style={{ fontSize: '0.875rem', fontWeight: 500, color: 'rgba(255,255,255,0.8)', transition: 'color 0.2s' }}
              onMouseOver={e => e.target.style.color = '#D4AF37'} onMouseOut={e => e.target.style.color = 'rgba(255,255,255,0.8)'}>
              Book Ticket
            </button>
            <button onClick={() => navigate('/status')} style={{ fontSize: '0.875rem', fontWeight: 500, color: 'rgba(255,255,255,0.8)', transition: 'color 0.2s' }}
              onMouseOver={e => e.target.style.color = '#D4AF37'} onMouseOut={e => e.target.style.color = 'rgba(255,255,255,0.8)'}>
              Check Status
            </button>
            <button onClick={() => navigate('/alternatives')} style={{ fontSize: '0.875rem', fontWeight: 500, color: 'rgba(255,255,255,0.8)', transition: 'color 0.2s' }}
              onMouseOver={e => e.target.style.color = '#D4AF37'} onMouseOut={e => e.target.style.color = 'rgba(255,255,255,0.8)'}>
              Smart Routes
            </button>
          </div>

          <button onClick={() => navigate('/login')} style={{
            backgroundColor: 'rgba(255,255,255,0.1)', color: 'white',
            padding: '0.5rem 1.25rem', borderRadius: '0.75rem',
            fontSize: '0.875rem', fontWeight: 600,
            border: '1px solid rgba(255,255,255,0.1)',
            transition: 'all 0.2s'
          }}
            onMouseOver={e => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
            onMouseOut={e => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}>
            Operator Dashboard
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ position: 'relative', zIndex: 1 }}>
        {/* Hero Section */}
        <section style={{ position: 'relative', zIndex: 1, height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 1.5rem', textAlign: 'center' }}>
          <div id="hero-content" style={{ maxWidth: '56rem', display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '5rem' }}>
            <span style={{
              display: 'inline-block', padding: '0.375rem 1rem',
              borderRadius: '9999px', backgroundColor: 'rgba(212,175,55,0.15)',
              border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37',
              fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase'
            }}>
              AI-Powered Travel Intelligence
            </span>

            <h1 style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, margin: 0 }}>
              The Future of <br />
              <span className="text-gradient">Railway Bookings</span>
            </h1>

            <p style={{ fontSize: '1.25rem', color: 'rgba(209,213,219,1)', maxWidth: '42rem', margin: '0 auto', lineHeight: 1.7 }}>
              Experience seamless travel with real-time waitlist predictions, smart alternative routing,
              and AI-driven itinerary management — all in one place.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', paddingTop: '1rem' }}>
              <button onClick={() => navigate('/book')} style={{
                padding: '1rem 2rem', backgroundColor: 'white', color: 'black',
                fontWeight: 700, borderRadius: '1rem', fontSize: '1rem',
                transition: 'all 0.2s', transform: 'scale(1)'
              }}
                onMouseOver={e => { e.target.style.backgroundColor = '#D4AF37'; e.target.style.transform = 'scale(1.05)'; }}
                onMouseOut={e => { e.target.style.backgroundColor = 'white'; e.target.style.transform = 'scale(1)'; }}>
                Book a Ticket
              </button>
              <button onClick={() => navigate('/status')} className="glass-card" style={{
                padding: '1rem 2rem', color: 'white',
                fontWeight: 700, borderRadius: '1rem', fontSize: '1rem',
                transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.2)'
              }}
                onMouseOver={e => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                onMouseOut={e => e.target.style.backgroundColor = 'transparent'}>
                Check Waitlist Probability
              </button>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="animate-bounce-slow" style={{ position: 'absolute', bottom: '2.5rem', opacity: 0.5 }}>
            <div style={{ width: '1.5rem', height: '2.5rem', border: '2px solid white', borderRadius: '9999px', display: 'flex', justifyContent: 'center', padding: '0.25rem' }}>
              <div style={{ width: '0.375rem', height: '0.375rem', backgroundColor: 'white', borderRadius: '50%' }}></div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section style={{ position: 'relative', zIndex: 1, minHeight: '100vh', padding: '8rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(to bottom, transparent 0%, rgba(10,10,10,0.85) 15%, rgba(10,10,10,0.85) 100%)' }}>
          <div style={{ maxWidth: '80rem', width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            {[
              {
                icon: (
                  <svg width="24" height="24" fill="none" stroke="#D4AF37" viewBox="0 0 24 24">
                    <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                ),
                title: 'Predictive Analytics',
                desc: 'Our neural networks analyze booking patterns to predict waitlist confirmation with high accuracy.'
              },
              {
                icon: (
                  <svg width="24" height="24" fill="none" stroke="#D4AF37" viewBox="0 0 24 24">
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                ),
                title: 'Time Optimization',
                desc: 'Find the fastest connections and alternative stations to save hours on your journeys.'
              },
              {
                icon: (
                  <svg width="24" height="24" fill="none" stroke="#D4AF37" viewBox="0 0 24 24">
                    <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.143-7.714L1 12l7.714-2.143L11 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                ),
                title: 'Smart Alternatives',
                desc: 'Instantly discover alternate routes and dates when your first choice is unavailable.'
              }
            ].map((feature, i) => (
              <div key={i} className="glass-card" style={{
                padding: '2rem', borderRadius: '1.5rem',
                display: 'flex', flexDirection: 'column', gap: '1rem',
                transition: 'border-color 0.2s', background: 'rgba(255, 255, 255, 0.03)'
              }}
                onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)'}
                onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}>
                <div style={{
                  width: '3rem', height: '3rem', backgroundColor: 'rgba(212,175,55,0.1)',
                  borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem'
                }}>
                  {feature.icon}
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{feature.title}</h3>
                <p style={{ color: 'rgba(156,163,175,1)', lineHeight: 1.6, margin: 0 }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section style={{ position: 'relative', zIndex: 1, minHeight: '60vh', padding: '8rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(to bottom, rgba(10,10,10,0.85) 0%, rgba(10,10,10,0.95) 100%)' }}>
          <div className="glass-card" style={{
            maxWidth: '48rem', width: '100%', textAlign: 'center',
            padding: 'clamp(2rem, 5vw, 5rem)', borderRadius: '3rem',
            display: 'flex', flexDirection: 'column', gap: '2rem',
            borderColor: 'rgba(212,175,55,0.2)'
          }}>
            <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, margin: 0 }}>Ready to depart?</h2>
            <p style={{ fontSize: '1.2rem', color: 'rgba(156,163,175,1)', margin: 0 }}>
              Join smart travelers who never worry about waitlists.
            </p>
            <form
              style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', maxWidth: '32rem', margin: '0 auto', width: '100%' }}
              onSubmit={(e) => {
                e.preventDefault();
                const pnr = e.target.pnr.value.trim();
                navigate('/status', pnr ? { state: { pnr } } : undefined);
              }}
            >
              <input
                name="pnr"
                style={{
                  flex: 1, minWidth: '200px',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '1rem', padding: '1rem 1.5rem',
                  color: 'white', outline: 'none', fontSize: '1rem'
                }}
                placeholder="Enter PNR for prediction"
                type="text"
              />
              <button
                type="submit"
                style={{
                  backgroundColor: '#D4AF37', color: 'black',
                  fontWeight: 700, padding: '1rem 2rem',
                  borderRadius: '1rem', whiteSpace: 'nowrap',
                  transition: 'all 0.2s', fontSize: '1rem'
                }}
                onMouseOver={e => e.target.style.backgroundColor = '#e6c84a'}
                onMouseOut={e => e.target.style.backgroundColor = '#D4AF37'}>
                Check Status
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ position: 'relative', zIndex: 1, padding: '3rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'black' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '2rem', height: '2rem', backgroundColor: '#D4AF37', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" fill="none" stroke="#0A0A0A" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.05em' }}>RailWise</span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'rgba(107,114,128,1)', margin: 0 }}>
            © 2026 RailWise Intelligence. Built for the modern traveler.
          </p>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <span style={{ color: 'rgba(156,163,175,1)', fontSize: '0.875rem', cursor: 'pointer' }}>Privacy Policy</span>
            <span style={{ color: 'rgba(156,163,175,1)', fontSize: '0.875rem', cursor: 'pointer' }}>Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
