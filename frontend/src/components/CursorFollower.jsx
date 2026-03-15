import { useEffect, useRef } from 'react';

export default function CursorFollower() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let raf;

    const onMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      // Dot snaps immediately
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${mouseX - 4}px, ${mouseY - 4}px)`;
      }
    };

    const lerp = (a, b, t) => a + (b - a) * t;

    const animate = () => {
      // Ring follows with smooth lag (lerp factor = 0.1)
      ringX = lerp(ringX, mouseX, 0.1);
      ringY = lerp(ringY, mouseY, 0.1);

      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ringX - 20}px, ${ringY - 20}px)`;
      }

      raf = requestAnimationFrame(animate);
    };

    // Expand ring on hover over clickable elements
    const onMouseOver = (e) => {
      if (e.target.closest('button, a, [role="button"], input, select')) {
        ringRef.current?.classList.add('cursor-ring--hover');
        dotRef.current?.classList.add('cursor-dot--hide');
      }
    };
    const onMouseOut = (e) => {
      if (e.target.closest('button, a, [role="button"], input, select')) {
        ringRef.current?.classList.remove('cursor-ring--hover');
        dotRef.current?.classList.remove('cursor-dot--hide');
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseover', onMouseOver);
    window.addEventListener('mouseout', onMouseOut);

    raf = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseover', onMouseOver);
      window.removeEventListener('mouseout', onMouseOut);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      {/* Small dot — tracks cursor exactly */}
      <div
        ref={dotRef}
        className="cursor-dot"
        style={{
          position: 'fixed', top: 0, left: 0,
          width: 8, height: 8, borderRadius: '50%',
          backgroundColor: '#D4AF37',
          pointerEvents: 'none', zIndex: 99999,
          willChange: 'transform',
          mixBlendMode: 'difference',
          transition: 'opacity 0.2s',
        }}
      />
      {/* Larger ring — lags behind */}
      <div
        ref={ringRef}
        className="cursor-ring"
        style={{
          position: 'fixed', top: 0, left: 0,
          width: 40, height: 40, borderRadius: '50%',
          border: '1.5px solid rgba(212,175,55,0.6)',
          pointerEvents: 'none', zIndex: 99998,
          willChange: 'transform',
          boxShadow: '0 0 12px rgba(212,175,55,0.2)',
          transition: 'width 0.3s, height 0.3s, opacity 0.2s, border-color 0.2s',
        }}
      />

      <style>{`
        body { cursor: none !important; }
        a, button, [role="button"], input, select, textarea { cursor: none !important; }
        .cursor-ring--hover {
          width: 56px !important;
          height: 56px !important;
          border-color: rgba(212,175,55,0.9) !important;
          box-shadow: 0 0 20px rgba(212,175,55,0.35) !important;
          margin-left: -8px;
          margin-top: -8px;
        }
        .cursor-dot--hide { opacity: 0 !important; }
      `}</style>
    </>
  );
}
