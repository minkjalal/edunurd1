/**
 * EduNerd - Visual Learning Simulations Directory
 * ===============================================
 * Contains 11 interactive STEM simulations:
 * - Real physics equations (kinematics, pendulums, waves, Ohm's law)
 * - Chemistry models (ideal gas kinetics, Bohr electron shells)
 * - Mathematics visualizations (trigonometric unit circle, quadratic roots)
 * - Biology graphics (DNA double helix)
 * - Geography (axial tilt and solar seasons)
 * - Computer Science (Bubble sort algorithm visualizer)
 */

const drawPoint = (ctx, x, y, radius, color) => {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 6.283);
  ctx.fill();
};

export const SIMULATIONS = [
  {
    n: "Projectile motion", e: "🏹", s: "Physics", t: "Launch angle and range",
    c: [["v", "Launch speed (m/s)", 5, 40, 22, 1], ["a", "Angle (°)", 5, 85, 45, 1], ["g", "Gravity (m/s²)", 1, 25, 9.8, 0.1]],
    k: "Horizontal speed stays constant while gravity pulls the ball down. Maximum range is achieved at 45°.",
    f: p => {
      const th = (p.a * Math.PI) / 180;
      return `R = v²sin2θ/g = ${(p.v * p.v * Math.sin(2 * th) / p.g).toFixed(1)} m · Peak = ${(Math.pow(p.v * Math.sin(th), 2) / (2 * p.g)).toFixed(1)} m · T = ${(2 * p.v * Math.sin(th) / p.g).toFixed(2)} s`;
    },
    d: (x, w, h, t, p) => {
      const th = (p.a * Math.PI) / 180, vx = p.v * Math.cos(th), vy = p.v * Math.sin(th);
      const T = (2 * vy) / p.g, R = vx * T, H = (vy * vy) / (2 * p.g);
      const sc = Math.min((w - 40) / Math.max(R, 1), (h - 40) / Math.max(H * 1.3, 1));
      const ox = 20, oy = h - 20;
      const P = k => [ox + vx * k * sc, oy - (vy * k - 0.5 * p.g * k * k) * sc];

      x.strokeStyle = "#334155";
      x.beginPath(); x.moveTo(0, oy); x.lineTo(w, oy); x.stroke();
      x.strokeStyle = "#8b5cf6";
      x.beginPath();
      for (let i = 0; i <= 60; i++) {
        const pt = P((T * i) / 60);
        i ? x.lineTo(pt[0], pt[1]) : x.moveTo(pt[0], pt[1]);
      }
      x.stroke();
      const curPt = P(Math.min(t % (T + 0.8), T));
      drawPoint(x, curPt[0], curPt[1], 7, "#22d3ee");
    }
  },
  {
    n: "Simple pendulum", e: "🕰️", s: "Physics", t: "Time period and gravity",
    c: [["L", "Length (m)", 0.3, 3, 1.5, 0.1], ["g", "Gravity (m/s²)", 1, 25, 9.8, 0.1]],
    k: "The period depends on length and gravity, not on the mass of the pendulum bob.",
    f: p => `T = 2π√(L/g) = ${(2 * Math.PI * Math.sqrt(p.L / p.g)).toFixed(2)} s`,
    d: (x, w, h, t, p) => {
      const T = 2 * Math.PI * Math.sqrt(p.L / p.g);
      const th = 0.52 * Math.cos((2 * Math.PI * t) / T);
      const sc = (h - 70) / 3.2, px = w / 2, py = 30;
      const bx = px + Math.sin(th) * p.L * sc, by = py + Math.cos(th) * p.L * sc;
      x.strokeStyle = "#cbd5e1";
      x.beginPath(); x.moveTo(px, py); x.lineTo(bx, by); x.stroke();
      drawPoint(x, bx, by, 12, "#8b5cf6");
      drawPoint(x, px, py, 4, "#fff");
    }
  },
  {
    n: "Wave motion", e: "🌊", s: "Physics", t: "Wavelength, frequency, speed",
    c: [["l", "Wavelength (cm)", 40, 220, 120, 5], ["A", "Amplitude", 5, 60, 35, 1], ["f", "Frequency (Hz)", 0.2, 3, 1, 0.1]],
    k: "Wave speed equals frequency times wavelength (v = fλ). Individual particles oscillate up and down while the pattern propagates.",
    f: p => `v = fλ = ${p.f} × ${p.l} = ${(p.f * p.l).toFixed(0)} cm/s`,
    d: (x, w, h, t, p) => {
      x.strokeStyle = "#22d3ee";
      x.lineWidth = 2;
      x.beginPath();
      for (let i = 0; i <= w; i += 3) {
        const y = h / 2 - p.A * Math.sin(2 * Math.PI * (i / p.l - p.f * t));
        i ? x.lineTo(i, y) : x.moveTo(i, y);
      }
      x.stroke();
      drawPoint(x, w * 0.5, h / 2 - p.A * Math.sin(2 * Math.PI * ((w * 0.5) / p.l - p.f * t)), 6, "#f59e0b");
    }
  },
  {
    n: "Ohm's law circuit", e: "⚡", s: "Physics", t: "Voltage, current, resistance",
    c: [["V", "Voltage (V)", 1, 12, 6, 1], ["R", "Resistance (Ω)", 1, 20, 6, 1]],
    k: "Greater voltage drives higher current. Higher resistance restricts flow and dissipates energy as heat.",
    f: p => `I = V/R = ${(p.V / p.R).toFixed(2)} A · Power = ${(p.V * p.V / p.R).toFixed(1)} W`,
    d: (x, w, h, t, p) => {
      const I = p.V / p.R, pad = 30, W = w - 2 * pad, H = h - 2 * pad, P = I * I * p.R;
      x.strokeStyle = "#64748b";
      x.strokeRect(pad, pad, W, H);
      x.fillStyle = "#13131c";
      x.fillRect(pad - 14, h / 2 - 22, 28, 44);
      x.fillStyle = "#22d3ee";
      x.fillRect(pad - 10, h / 2 - 14, 20, 3);
      x.fillRect(pad - 10, h / 2 + 8, 20, 3);
      x.fillStyle = `rgba(245,158,11,${Math.min(1, P / 60)})`;
      x.fillRect(w - pad - 16, h / 2 - 24, 32, 48);
      x.strokeStyle = "#f59e0b";
      x.strokeRect(w - pad - 16, h / 2 - 24, 32, 48);

      for (let i = 0; i < 24; i++) {
        const u = ((i / 24 + t * I * 0.04) % 1) * (2 * W + 2 * H);
        const q = u < W ? [pad + u, pad] : u < W + H ? [pad + W, pad + u - W] : u < 2 * W + H ? [pad + W - (u - W - H), pad + H] : [pad, pad + H - (u - 2 * W - H)];
        drawPoint(x, q[0], q[1], 3, "#22d3ee");
      }
    }
  },
  {
    n: "Unit circle: sin & cos", e: "📐", s: "Maths", t: "Trigonometry on a circle",
    c: [["a", "Angle θ (°)", 0, 360, 40, 1]],
    k: "The point height is sin θ and its horizontal projection is cos θ. Rotating θ draws the sine wave on the right.",
    f: p => {
      const rad = (p.a * Math.PI) / 180;
      return `sin θ = ${Math.sin(rad).toFixed(2)} · cos θ = ${Math.cos(rad).toFixed(2)} · tan θ = ${Math.abs(Math.cos(rad)) < 0.01 ? "∞" : Math.tan(rad).toFixed(2)}`;
    },
    d: (x, w, h, t, p) => {
      const cx = w * 0.28, cy = h / 2, r = Math.min(h / 2 - 25, w * 0.22);
      const rad = (p.a * Math.PI) / 180;
      const px = cx + r * Math.cos(rad), py = cy - r * Math.sin(rad);

      x.strokeStyle = "#475569";
      x.beginPath();
      x.arc(cx, cy, r, 0, 6.283);
      x.moveTo(cx - r - 10, cy); x.lineTo(cx + r + 10, cy);
      x.moveTo(cx, cy - r - 10); x.lineTo(cx, cy + r + 10);
      x.stroke();

      x.lineWidth = 2;
      x.strokeStyle = "#8b5cf6";
      x.beginPath(); x.moveTo(cx, cy); x.lineTo(px, py); x.stroke();
      x.strokeStyle = "#22d3ee";
      x.beginPath(); x.moveTo(px, py); x.lineTo(px, cy); x.stroke();
      x.strokeStyle = "#f59e0b";
      x.beginPath(); x.moveTo(cx, cy); x.lineTo(px, cy); x.stroke();
      x.lineWidth = 1;
      drawPoint(x, px, py, 6, "#fff");

      const gx = w * 0.6, gw = w * 0.36;
      x.strokeStyle = "#334155";
      x.beginPath(); x.moveTo(gx, cy); x.lineTo(gx + gw, cy); x.stroke();
      x.strokeStyle = "#22d3ee";
      x.beginPath();
      for (let i = 0; i <= p.a; i += 3) {
        const X = gx + (gw * i) / 360, Y = cy - r * Math.sin((i * Math.PI) / 180);
        i ? x.lineTo(X, Y) : x.moveTo(X, Y);
      }
      x.stroke();
      drawPoint(x, gx + (gw * p.a) / 360, py, 5, "#22d3ee");
    }
  },
  {
    n: "Quadratic graph", e: "📈", s: "Maths", t: "Parabola, vertex and roots",
    c: [["a", "a", -3, 3, 1, 0.1], ["b", "b", -6, 6, 0, 0.1], ["c", "c", -6, 6, -3, 0.1]],
    k: "y = ax² + bx + c. Orange dot = vertex, cyan dots = real roots where the curve intersects the x-axis.",
    f: p => {
      const D = p.b * p.b - 4 * p.a * p.c;
      return Math.abs(p.a) < 0.05
        ? "a ≈ 0, straight line"
        : `Vertex (${(-p.b / (2 * p.a)).toFixed(2)}, ${(p.c - p.b * p.b / (4 * p.a)).toFixed(2)}) · D = ${D.toFixed(2)} → ${D > 0.001 ? "2 real roots" : D > -0.001 ? "1 root" : "no real roots"}`;
    },
    d: (x, w, h, t, p) => {
      const sc = Math.min(w, h) / 14, ox = w / 2, oy = h / 2;
      x.strokeStyle = "#475569";
      x.beginPath();
      x.moveTo(0, oy); x.lineTo(w, oy);
      x.moveTo(ox, 0); x.lineTo(ox, h);
      x.stroke();

      x.strokeStyle = "#8b5cf6";
      x.lineWidth = 2;
      x.beginPath();
      let first = true;
      for (let px = 0; px <= w; px += 3) {
        const X = (px - ox) / sc;
        const py = oy - (p.a * X * X + p.b * X + p.c) * sc;
        if (py < -50 || py > h + 50) { first = true; continue; }
        first ? x.moveTo(px, py) : x.lineTo(px, py);
        first = false;
      }
      x.stroke();
      x.lineWidth = 1;

      const D = p.b * p.b - 4 * p.a * p.c;
      if (Math.abs(p.a) > 0.05) {
        const vx = -p.b / (2 * p.a);
        drawPoint(x, ox + vx * sc, oy - (p.a * vx * vx + p.b * vx + p.c) * sc, 5, "#f59e0b");
        if (D >= 0) {
          [1, -1].forEach(sign => {
            drawPoint(x, ox + ((-p.b + sign * Math.sqrt(D)) / (2 * p.a)) * sc, oy, 5, "#22d3ee");
          });
        }
      }
    }
  },
  {
    n: "Gas particles", e: "🎈", s: "Chemistry", t: "Temperature and pressure",
    c: [["N", "Number of particles", 10, 120, 60, 1], ["T", "Temperature (K)", 100, 800, 300, 10]],
    k: "Hotter gas particles move faster, impacting walls with greater frequency and force (PV = nRT).",
    f: p => `Pressure ∝ nT = ${(p.N * p.T / 1000).toFixed(1)} (arbitrary units) · Speed ∝ √T`,
    init: () => ({ particles: Array.from({ length: 120 }, () => ({ x: Math.random(), y: Math.random(), a: Math.random() * 6.283 })) }),
    d: (x, w, h, t, p, dt, st) => {
      const speed = Math.sqrt(p.T) * 16;
      x.strokeStyle = "#64748b";
      x.strokeRect(4, 4, w - 8, h - 8);

      for (let i = 0; i < p.N; i++) {
        const pt = st.particles[i];
        pt.x += (Math.cos(pt.a) * speed * dt) / w;
        pt.y += (Math.sin(pt.a) * speed * dt) / h;
        if (pt.x < 0 || pt.x > 1) { pt.a = Math.PI - pt.a; pt.x = Math.min(1, Math.max(0, pt.x)); }
        if (pt.y < 0 || pt.y > 1) { pt.a = -pt.a; pt.y = Math.min(1, Math.max(0, pt.y)); }
        drawPoint(x, 6 + pt.x * (w - 12), 6 + pt.y * (h - 12), 3, p.T > 500 ? "#ef4444" : p.T > 250 ? "#f59e0b" : "#22d3ee");
      }
    }
  },
  {
    n: "Bohr atom", e: "⚛️", s: "Chemistry", t: "Electron energy levels",
    c: [["n", "Energy level n", 1, 6, 2, 1]],
    k: "Electrons occupy quantized circular orbits. Higher energy levels are farther from the nucleus.",
    f: p => `Eₙ = −13.6/n² = ${(-13.6 / (p.n * p.n)).toFixed(2)} eV · Radius ∝ n²`,
    d: (x, w, h, t, p) => {
      const cx = w / 2, cy = h / 2, maxR = Math.min(w, h) / 2 - 12;
      drawPoint(x, cx, cy, 8, "#ef4444");

      for (let n = 1; n <= 6; n++) {
        const r = 14 + ((maxR - 14) * (n * n - 1)) / 35;
        x.strokeStyle = n === p.n ? "#8b5cf6" : "#334155";
        x.beginPath();
        x.arc(cx, cy, r, 0, 6.283);
        x.stroke();
        if (n === p.n) {
          const angle = (t * 5) / Math.pow(n, 1.5);
          drawPoint(x, cx + r * Math.cos(angle), cy + r * Math.sin(angle), 6, "#22d3ee");
        }
      }
    }
  },
  {
    n: "DNA double helix", e: "🧬", s: "Biology", t: "Base pairs and helical twist",
    c: [["s", "Spin speed", 0.2, 3, 1, 0.1], ["w", "Helix width", 20, 80, 50, 1]],
    k: "Two antiparallel strands twist in a double helix. Base pairs link them: A with T, and G with C.",
    f: p => "A–T and G–C hydrogen bonds hold the double-stranded structure together",
    d: (x, w, h, t, p) => {
      const numRungs = 26, cx = w / 2;
      for (let i = 0; i < numRungs; i++) {
        const y = 18 + (i * (h - 36)) / (numRungs - 1);
        const phase = t * p.s * 2 + i * 0.45;
        const s = Math.sin(phase), c = Math.cos(phase);
        const x1 = cx + s * p.w * 1.6, x2 = cx - s * p.w * 1.6;

        x.strokeStyle = i % 2 ? "#f59e0b" : "#22c55e";
        x.globalAlpha = 0.55;
        x.beginPath(); x.moveTo(x1, y); x.lineTo(x2, y); x.stroke();
        x.globalAlpha = 1;
        drawPoint(x, x1, y, 4 + c * 2.5, "#8b5cf6");
        drawPoint(x, x2, y, 4 - c * 2.5, "#22d3ee");
      }
    }
  },
  {
    n: "Earth's seasons", e: "🌍", s: "Geography", t: "Tilt and orbital progression",
    c: [["m", "Month (0 = Jan)", 0, 11.9, 5.7, 0.1]],
    k: "Seasons are caused by Earth's 23.5° axial tilt relative to its orbital plane, not proximity to the Sun.",
    f: p => {
      const m = p.m;
      const season = m >= 5.7 && m < 8.7 ? "summer" : m >= 8.7 && m < 11.7 ? "autumn" : m >= 2.7 && m < 5.7 ? "spring" : "winter";
      const opposite = { summer: "winter", winter: "summer", spring: "autumn", autumn: "spring" }[season];
      return `Northern Hemisphere: ${season} · Southern Hemisphere: ${opposite}`;
    },
    d: (x, w, h, t, p) => {
      const cx = w / 2, cy = h / 2, orbitR = Math.min(w / 2 - 40, h / 2 - 30);
      const phase = Math.PI + (2 * Math.PI * (p.m - 5.7)) / 12;
      const ex = cx + orbitR * Math.cos(phase), ey = cy + orbitR * Math.sin(phase);
      const tiltAngle = (23.5 * Math.PI) / 180;

      x.strokeStyle = "#334155";
      x.beginPath(); x.arc(cx, cy, orbitR, 0, 6.283); x.stroke();

      const sunGrad = x.createRadialGradient(cx, cy, 2, cx, cy, 26);
      sunGrad.addColorStop(0, "#fde047");
      sunGrad.addColorStop(1, "#f59e0b");
      x.fillStyle = sunGrad;
      x.beginPath(); x.arc(cx, cy, 24, 0, 6.283); x.fill();

      x.strokeStyle = "#22d3ee";
      x.lineWidth = 2;
      x.beginPath();
      x.moveTo(ex - Math.sin(tiltAngle) * 30, ey + Math.cos(tiltAngle) * 30);
      x.lineTo(ex + Math.sin(tiltAngle) * 30, ey - Math.cos(tiltAngle) * 30);
      x.stroke();
      x.lineWidth = 1;

      drawPoint(x, ex, ey, 13, "#3b82f6");
      x.fillStyle = "#e2e8f0";
      x.fillText("N", ex + Math.sin(tiltAngle) * 34 - 4, ey - Math.cos(tiltAngle) * 34 - 2);
    }
  },
  {
    n: "Bubble sort", e: "📊", s: "Computer Science", t: "Algorithm step-by-step sorting",
    c: [["n", "Array size (bars)", 8, 40, 20, 1], ["s", "Steps per second", 2, 60, 15, 1]],
    k: "Bubble sort iteratively steps through the array, comparing adjacent elements and swapping them if out of order.",
    f: p => `Worst-case time complexity: O(n²) ≈ ${p.n * p.n} operations`,
    init: () => ({ n: 0 }),
    d: (x, w, h, t, p, dt, st) => {
      if (st.n !== p.n) {
        st.n = p.n;
        st.arr = Array.from({ length: p.n }, (_, idx) => idx + 1).sort(() => Math.random() - 0.5);
        st.i = 0; st.j = 0; st.accum = 0; st.done = false; st.pause = 0;
      }

      const arr = st.arr;
      if (!st.done) {
        st.accum += dt * p.s;
        while (st.accum >= 1 && !st.done) {
          st.accum -= 1;
          if (arr[st.j] > arr[st.j + 1]) {
            [arr[st.j], arr[st.j + 1]] = [arr[st.j + 1], arr[st.j]];
          }
          st.j++;
          if (st.j >= arr.length - 1 - st.i) {
            st.j = 0;
            st.i++;
            if (st.i >= arr.length - 1) st.done = true;
          }
        }
      } else {
        st.pause += dt;
        if (st.pause > 1.8) st.n = 0; // restart
      }

      const barWidth = (w - 20) / arr.length;
      arr.forEach((val, idx) => {
        x.fillStyle = st.done || idx >= arr.length - st.i ? "#22c55e" : idx === st.j || idx === st.j + 1 ? "#f59e0b" : "#8b5cf6";
        const barHeight = (val / arr.length) * (h - 30);
        x.fillRect(10 + idx * barWidth + 1, h - 10 - barHeight, barWidth - 2, barHeight);
      });
    }
  }
];
