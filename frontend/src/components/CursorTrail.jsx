import React, { useEffect, useRef } from 'react';

export default function CursorTrail() {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H;
    let particles = [];
    let raf;

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function onPointerMove(e) {
      const count = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: e.clientX + (Math.random() - 0.5) * 8,
          y: e.clientY + (Math.random() - 0.5) * 8,
          r: 5 + Math.random() * 5,
          vx: (Math.random() - 0.5) * 1.1,
          vy: 0.3 + Math.random() * 0.7,
          o: 0.45 + Math.random() * 0.1,
        });
      }
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    function tick() {
      ctx.clearRect(0, 0, W, H);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.r *= 0.95;
        p.o *= 0.93;

        if (p.o < 0.02 || p.r < 0.5) {
          particles.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(15, 124, 138, ${p.o})`;
        ctx.fill();

        if (p.r > 2) {
          ctx.beginPath();
          ctx.arc(p.x - p.r * 0.25, p.y - p.r * 0.25, p.r * 0.3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${p.o * 0.5})`;
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-[9999]"
      aria-hidden="true"
    />
  );
}
