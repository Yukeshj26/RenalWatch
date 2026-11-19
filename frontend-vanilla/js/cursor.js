/* ===================================================================
   RenalWatch – Cursor Trail Effect
   Teal water-droplet particles that follow the pointer
   =================================================================== */

(function () {
  'use strict';

  // Respect prefers-reduced-motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById('trail');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H;
  const particles = [];

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Spawn droplets on pointer move
  function onMove(e) {
    const x = e.clientX;
    const y = e.clientY;
    const count = 2 + Math.floor(Math.random() * 2); // 2-3 particles
    for (let i = 0; i < count; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        r: 5 + Math.random() * 5,          // radius 5-10
        vx: (Math.random() - 0.5) * 1.2,   // slight random horizontal drift
        vy: 0.3 + Math.random() * 0.8,      // gentle downward drift
        o: 0.45 + Math.random() * 0.1       // opacity ~0.45-0.55
      });
    }
  }
  window.addEventListener('pointermove', onMove, { passive: true });

  // Animation loop
  let raf;
  function tick() {
    ctx.clearRect(0, 0, W, H);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      // Update
      p.x += p.vx;
      p.y += p.vy;
      p.r *= 0.95;
      p.o *= 0.93;

      // Remove dead particles
      if (p.o < 0.02 || p.r < 0.5) {
        particles.splice(i, 1);
        continue;
      }

      // Draw droplet
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(15,124,138,${p.o})`;
      ctx.fill();

      // Add a subtle highlight on each droplet
      if (p.r > 2) {
        ctx.beginPath();
        ctx.arc(p.x - p.r * 0.25, p.y - p.r * 0.25, p.r * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.o * 0.5})`;
        ctx.fill();
      }
    }

    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  // Cleanup on page unload
  window.addEventListener('beforeunload', function () {
    cancelAnimationFrame(raf);
    window.removeEventListener('pointermove', onMove);
  });
})();
