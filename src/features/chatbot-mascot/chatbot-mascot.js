/* Animated chatbot mascot. Self-contained: no libraries, no images, no CSS needed.
   Usage:  const bot = ChatbotMascot.mount("#ai-tutor-mascot", { input:"#chat-input", log:"#chat-log" });
   States: bot.setState("idle" | "typing" | "thinking" | "listening" | "happy" | "error")
   Remove: bot.destroy() */
(function (g) {
  var NS = "http://www.w3.org/2000/svg";
  var FORCE_MOTION = true; // true: always animate gently. false: follow the system "reduce motion" setting.
  function mk(tag, a, p) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
  function mount(target, o) {
    o = o || {};
    var host = typeof target === "string" ? document.querySelector(target) : target;
    if (!host) { console.warn("ChatbotMascot: container not found"); return null; }
    var reduce = !FORCE_MOTION && window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    var svg = mk("svg", { viewBox: "0 0 240 270", width: "100%", "aria-hidden": "true", focusable: "false" });
    svg.style.cssText = "display:block;max-width:" + (o.size || 190) + "px;pointer-events:auto;cursor:pointer;overflow:visible";
    var d = mk("defs", {}, svg);
    var gr = mk("linearGradient", { id: "cmb", x1: 0, y1: 0, x2: 0, y2: 1 }, d); mk("stop", { offset: 0, "stop-color": "#fbefe6" }, gr); mk("stop", { offset: 1, "stop-color": "#e3c3ae" }, gr);
    var root = mk("g", {}, svg);
    mk("ellipse", { cx: 120, cy: 150, rx: 100, ry: 110, fill: "#22d3ee", opacity: .1 }, root);
    var cableP = mk("path", { d: "M205 128 C225 150 195 165 212 190 C222 205 205 215 200 232", fill: "none", stroke: "#2b2430", "stroke-width": 4, "stroke-linecap": "round" }, root);
    var wl = mk("g", {}, root), wr = mk("g", {}, root), wheels = [[wl, 68], [wr, 172]];
    wheels.forEach(function (w) { mk("circle", { cx: w[1], cy: 232, r: 26, fill: "#2b2430" }, w[0]); for (var i = 0; i < 10; i++) { var a = i * 36 * Math.PI / 180; mk("line", { x1: w[1] + Math.cos(a) * 17, y1: 232 + Math.sin(a) * 17, x2: w[1] + Math.cos(a) * 25, y2: 232 + Math.sin(a) * 25, stroke: "#5a4d55", "stroke-width": 4, "stroke-linecap": "round" }, w[0]); } mk("circle", { cx: w[1], cy: 232, r: 11, fill: "#22d3ee" }, w[0]); mk("circle", { cx: w[1], cy: 232, r: 5, fill: "#bff6ff" }, w[0]); });
    mk("rect", { x: 76, y: 160, width: 88, height: 68, rx: 30, fill: "url(#cmb)" }, root);
    mk("rect", { x: 92, y: 172, width: 56, height: 14, rx: 7, fill: "#14394a" }, root);
    var lights = []; for (var i = 0; i < 6; i++) lights.push(mk("circle", { cx: 99 + i * 8.4, cy: 179, r: 2.4, fill: "#4ee0c1" }, root));
    [100, 140].forEach(function (x) { mk("circle", { cx: x, cy: 206, r: 10, fill: "#3a2f33" }, root); mk("circle", { cx: x, cy: 206, r: 5, fill: "#6b5c63" }, root); });
    mk("circle", { cx: 120, cy: 204, r: 3, fill: "#22d3ee" }, root);
    mk("rect", { x: 108, y: 150, width: 24, height: 14, rx: 5, fill: "#2b2430" }, root);
    var head = mk("g", {}, root);
    mk("circle", { cx: 50, cy: 100, r: 15, fill: "#3a2f33", stroke: "#22d3ee", "stroke-width": 2 }, head);
    var horn = mk("g", {}, head);
    mk("path", { d: "M186 84 C214 70 228 96 220 126 C214 142 196 140 188 124 Z", fill: "#2b2430", stroke: "#22d3ee", "stroke-width": 3 }, horn);
    var waves = [0, 1, 2].map(function (i) { return mk("path", { d: "M" + (226 + i * 8) + " " + (96 - i * 4) + " q8 14 0 " + (28 + i * 8), fill: "none", stroke: "#22d3ee", "stroke-width": 3, "stroke-linecap": "round", opacity: 0 }, head); });
    mk("ellipse", { cx: 120, cy: 100, rx: 72, ry: 60, fill: "url(#cmb)" }, head);
    mk("ellipse", { cx: 120, cy: 104, rx: 58, ry: 45, fill: "#12304a", stroke: "#22d3ee", "stroke-width": 2, "stroke-opacity": .6 }, head);
    mk("ellipse", { cx: 96, cy: 78, rx: 26, ry: 8, fill: "#fff", opacity: .18 }, head);
    function eye(cx) { var grp = mk("g", {}, head); mk("circle", { cx: cx, cy: 104, r: 19, fill: "#1c9aa6" }, grp); mk("circle", { cx: cx, cy: 104, r: 19, fill: "none", stroke: "#0e6670", "stroke-width": 3 }, grp);
      var pu = mk("g", {}, grp); mk("circle", { cx: cx, cy: 104, r: 10, fill: "#07121d" }, pu); mk("circle", { cx: cx - 4, cy: 99, r: 3.6, fill: "#fff" }, pu); return { grp: grp, pu: pu, cx: cx, cy: 104 }; }
    var E = [eye(96), eye(144)];
    var mouth = mk("path", { d: "M110 131 Q120 140 130 131", fill: "none", stroke: "#fbefe6", "stroke-width": 3.5, "stroke-linecap": "round" }, head);
    var bub = mk("g", {}, root);
    mk("path", { d: "M30 8 h56 a12 12 0 0 1 12 12 v22 a12 12 0 0 1 -12 12 h-22 l-12 14 l-2 -14 h-20 a12 12 0 0 1 -12 -12 v-22 a12 12 0 0 1 12 -12 z", fill: "#3aa7e0" }, bub);
    var dots = [0, 1, 2].map(function (i) { return mk("circle", { cx: 44 + i * 18, cy: 31, r: 6, fill: "#fff" }, bub); });
    host.appendChild(svg);

    var st = "idle", stT = 0, happyUntil = 0, mx = 0, my = 0, lx = 0, ly = 0, blinkAt = performance.now() + 1500, blinkStart = -1, wAng = 0, raf, alive = true;
    function setState(s) { st = s; if (s === "happy") happyUntil = performance.now() + 1500; }
    function onMove(e) { var r = svg.getBoundingClientRect(), cx = r.left + r.width * .5, cy = r.top + r.height * .4, dx = e.clientX - cx, dy = e.clientY - cy, m = Math.hypot(dx, dy) || 1, k = Math.min(1, m / 160); mx = dx / m * 6 * k; my = dy / m * 5 * k; }
    addEventListener("pointermove", onMove);
    svg.addEventListener("pointerdown", function () { setState("happy"); });
    var tm, inp = o.input && document.querySelector(o.input), log = o.log && document.querySelector(o.log), mo;
    function onType() { setState("typing"); clearTimeout(tm); tm = setTimeout(function () { if (st === "typing") setState("idle"); }, 1800); }
    if (inp) inp.addEventListener("input", onType);
    if (log && window.MutationObserver) { mo = new MutationObserver(function () { setState("happy"); }); mo.observe(log, { childList: true, subtree: true }); }

    function frame(t) {
      if (!alive) return; raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      var cur = st; if (cur === "happy" && t > happyUntil) { st = cur = "idle"; }
      var amp = reduce ? 0 : 1, bob = Math.sin(t / 650) * 4 * amp, sx = 0, sy = 0, wob = 0;
      if (cur === "happy") bob -= Math.abs(Math.sin((happyUntil - t) / 120)) * 10 * amp;
      if (cur === "error") sx = Math.sin(t / 40) * 3 * amp;
      if (cur === "typing") wob = Math.sin(t / 300) * 2 * amp;
      root.setAttribute("transform", "translate(" + sx + " " + bob + ")");
      head.setAttribute("transform", "rotate(" + (wob + Math.sin(t / 1400) * 1.2 * amp) + " 120 150)");
      var tx = mx, ty = my; if (cur === "typing") { tx = -2; ty = 6; } else if (cur === "thinking") { tx = Math.sin(t / 500) * 4; ty = -6; } else if (cur === "error") { tx = 0; ty = 2; }
      lx += (tx - lx) * .18; ly += (ty - ly) * .18;
      if (blinkStart < 0 && t > blinkAt) blinkStart = t;
      var s = 1; if (blinkStart >= 0) { var p = (t - blinkStart) / 160; if (p >= 1) { blinkStart = -1; blinkAt = t + 1800 + Math.random() * 3200; } else s = 1 - Math.sin(p * Math.PI) * .94; }
      if (cur === "happy") s = Math.min(s, .78);
      E.forEach(function (e) { e.grp.setAttribute("transform", "translate(" + e.cx + " " + e.cy + ") scale(1 " + s + ") translate(" + -e.cx + " " + -e.cy + ")"); e.pu.setAttribute("transform", "translate(" + lx + " " + ly + ")"); });
      mouth.setAttribute("d", cur === "happy" ? "M106 129 Q120 148 134 129" : cur === "error" ? "M110 136 Q120 131 130 136" : cur === "thinking" ? "M112 133 Q120 133 128 133" : "M110 131 Q120 140 130 131");
      var speed = cur === "thinking" ? 5 : cur === "typing" ? 1 : .3; wAng += speed;
      wheels.forEach(function (w) { w[0].setAttribute("transform", "rotate(" + wAng + " " + w[1] + " 232)"); });
      var rate = cur === "thinking" ? 160 : cur === "typing" ? 280 : 700;
      dots.forEach(function (d, i) { var on = Math.floor(t / rate) % 3 === i; d.setAttribute("opacity", cur === "idle" || cur === "happy" ? (reduce ? 1 : .75 + .25 * Math.sin(t / 500 + i)) : on ? 1 : .35); d.setAttribute("r", on && cur !== "idle" ? 7 : 6); });
      lights.forEach(function (l, i) { l.setAttribute("opacity", .45 + .55 * Math.max(0, Math.sin(t / 380 - i * .7))); });
      waves.forEach(function (w, i) { w.setAttribute("opacity", cur === "listening" ? .3 + .7 * Math.max(0, Math.sin(t / 220 - i)) : 0); });
      horn.setAttribute("opacity", cur === "listening" ? .75 + .25 * Math.sin(t / 150) : 1);
    }
    raf = requestAnimationFrame(frame);
    return { setState: setState, destroy: function () { alive = false; cancelAnimationFrame(raf); removeEventListener("pointermove", onMove); if (inp) inp.removeEventListener("input", onType); if (mo) mo.disconnect(); svg.remove(); } };
  }
  g.ChatbotMascot = { mount: mount };
})(window);
