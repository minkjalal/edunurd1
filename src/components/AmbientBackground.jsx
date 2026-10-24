// Connection: src/components/AmbientBackground.jsx is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Renders the animated network background shared by application views.
/**
 * EduNerd - Ambient Particle Background (React Canvas)
 * ====================================================
 * High-performance full-viewport particle network with interactive cursor physics,
 * spring elasticity, click shockwave ripples, and proximity connections.
 */

import React, { useEffect, useRef } from "react";

export default function AmbientBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: -999, y: -999, down: false, vx: 0, vy: 0 };
    const particles = [];
    const trails = [];
    const ripples = [];
    const colors = ["#8b5cf6", "#22d3ee", "#22c55e", "#f59e0b", "#ec4899", "#ef4444", "#3b82f6", "#a3e635"];
    let width = 0, height = 0;
    let animId = 0;

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // Seed particles
    for (let i = 0; i < 90; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 2.2,
        vy: (Math.random() - 0.5) * 2.2,
        r: 1.5 + Math.random() * 1.5,
        c: colors[i % colors.length]
      });
    }

    const onPointerMove = e => {
      mouse.vx = mouse.x < 0 ? 0 : e.clientX - mouse.x;
      mouse.vy = mouse.y < 0 ? 0 : e.clientY - mouse.y;
      mouse.x = e.clientX;
      mouse.y = e.clientY;

      if (Math.hypot(mouse.vx, mouse.vy) > 2 || mouse.down) {
        for (let k = 0; k < (mouse.down ? 3 : 1); k++) {
          trails.push({
            x: mouse.x,
            y: mouse.y,
            vx: (Math.random() - 0.5) * 2 + mouse.vx * 0.05,
            vy: (Math.random() - 0.5) * 2 + mouse.vy * 0.05,
            l: 1,
            c: colors[(Math.random() * colors.length) | 0]
          });
        }
      }
      if (trails.length > 180) trails.splice(0, trails.length - 180);
    };

    const onPointerDown = e => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.down = true;
      ripples.push({ x: mouse.x, y: mouse.y, r: 0, a: 1 });
    };

    const onPointerUp = e => {
      if (mouse.down) {
        mouse.down = false;
        ripples.push({ x: mouse.x, y: mouse.y, r: 0, a: 1 });
        for (const p of particles) {
          const dx = p.x - mouse.x, dy = p.y - mouse.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < 280) {
            const force = ((280 - d) / 280) * 9;
            p.vx += (dx / d) * force;
            p.vy += (dy / d) * force;
          }
        }
      }
      if (e.pointerType === "touch") mouse.x = mouse.y = -999;
    };

    const onPointerCancel = () => {
      mouse.down = false;
      mouse.x = mouse.y = -999;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);

    // Animation Render Loop
    const frame = () => {
      ctx.clearRect(0, 0, width, height);

      // Render shockwave ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.r += 6;
        r.a -= 0.03;
        if (r.a <= 0) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = `rgba(34, 211, 238, ${r.a.toFixed(2)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, 6.283);
        ctx.stroke();
      }

      // Connecting lines between nearby particles
      ctx.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i], p2 = particles[j];
          const dx = p1.x - p2.x, dy = p1.y - p2.y;
          if (dx > 90 || dx < -90 || dy > 90 || dy < -90) continue;
          const dist = Math.hypot(dx, dy);
          if (dist < 90) {
            ctx.strokeStyle = `rgba(139, 92, 246, ${(0.16 * (1 - dist / 90)).toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      // Sparkle trails
      for (let i = trails.length - 1; i >= 0; i--) {
        const t = trails[i];
        t.x += t.vx;
        t.y += t.vy;
        t.l -= 0.025;
        if (t.l <= 0) {
          trails.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = t.l;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 1.5 + t.l * 2.5, 0, 6.283);
        ctx.fillStyle = t.c;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Update & render particles with physics
      for (const p of particles) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        const radiusLimit = mouse.down ? 220 : 130;

        if (dist < radiusLimit && dist > 0) {
          if (mouse.down) {
            const factor = ((radiusLimit - dist) / radiusLimit) * 0.7;
            p.vx += ((-dx * 0.5 - dy * 1.2) / dist) * factor;
            p.vy += ((-dy * 0.5 + dx * 1.2) / dist) * factor;
            ctx.strokeStyle = `rgba(236, 72, 153, ${(0.55 * (1 - dist / radiusLimit)).toFixed(2)})`;
          } else {
            const factor = ((radiusLimit - dist) / radiusLimit) * 1.3;
            p.vx += (dx / dist) * factor;
            p.vy += (dy / dist) * factor;
            ctx.strokeStyle = `rgba(139, 92, 246, ${(0.45 * (1 - dist / radiusLimit)).toFixed(2)})`;
          }
          ctx.beginPath();
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }

        p.vx *= 0.985;
        p.vy *= 0.985;
        const speed = Math.hypot(p.vx, p.vy);
        if (speed < 0.8) {
          if (speed < 0.05) {
            p.vx = Math.random() - 0.5;
            p.vy = Math.random() - 0.5;
          } else {
            p.vx *= 1.06;
            p.vy *= 1.06;
          }
        } else if (speed > 6) {
          p.vx *= 0.9;
          p.vy *= 0.9;
        }

        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width; else if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height; else if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.283);
        ctx.fillStyle = p.c;
        ctx.fill();
      }

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
    };
  }, []);

  return (
    <div id="bgf">
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
