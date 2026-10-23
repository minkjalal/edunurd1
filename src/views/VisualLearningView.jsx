/**
 * EduNerd - Visual Learning Simulations View
 * ==========================================
 * Interactive 2D/3D canvas simulations demonstrating key principles in:
 * - Physics: Projectile motion, Pendulum, Wave interference, Ohm's law
 * - Maths: Unit circle trigonometry, Quadratic roots & vertex
 * - Chemistry: Kinetic gas particle collisions, Bohr atomic orbitals
 * - Biology: Helical DNA strand twisting
 * - Geography: Orbital seasonal progression
 * - Computer Science: Bubble sort algorithm visualizer
 */

import React, { useState, useEffect, useRef } from "react";
import { SIMULATIONS } from "../constants/simulations";
import { makeYouTubeLectureUrl } from "../utils/helpers";
import { useApp } from "../context/AppContext";

export default function VisualLearningView() {
  const { navigateTo, startQuiz } = useApp();

  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedSimIndex, setSelectedSimIndex] = useState(-1);
  const [params, setParams] = useState({});
  const [formulaText, setFormulaText] = useState("");

  const canvasRef = useRef(null);
  const animFrameRef = useRef(0);

  const categories = ["All", "Physics", "Maths", "Chemistry", "Biology", "Geography", "Computer Science"];

  // Initialize controls when a simulation is selected
  useEffect(() => {
    if (selectedSimIndex >= 0) {
      const sim = SIMULATIONS[selectedSimIndex];
      const initialParams = {};
      sim.c.forEach(ctrl => {
        initialParams[ctrl[0]] = ctrl[4];
      });
      setParams(initialParams);
      setFormulaText(sim.f(initialParams));
    }
  }, [selectedSimIndex]);

  // Main Canvas Render Loop
  useEffect(() => {
    if (selectedSimIndex < 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const sim = SIMULATIONS[selectedSimIndex];
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const canvasHeight = 280;
    const simState = sim.init ? sim.init() : {};

    let canvasWidth = canvas.clientWidth || 320;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const startTime = performance.now();
    let prevTime = startTime;

    const renderLoop = currTime => {
      const dt = Math.min(0.05, (currTime - prevTime) / 1000);
      prevTime = currTime;

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.lineWidth = 1;
      ctx.font = "13px system-ui";

      sim.d(ctx, canvasWidth, canvasHeight, (currTime - startTime) / 1000, params, dt, simState);
      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [selectedSimIndex, params]);

  const handleSliderChange = (key, val) => {
    const updated = { ...params, [key]: +val };
    setParams(updated);
    if (selectedSimIndex >= 0) {
      setFormulaText(SIMULATIONS[selectedSimIndex].f(updated));
    }
  };

  // ── Grid Directory View ──
  if (selectedSimIndex < 0) {
    return (
      <div className="pg">
        <h1>Visual learning</h1>
        <p className="mu">Interactive simulations. Adjust sliders to observe formulas and concepts dynamically.</p>

        <div>
          {categories.map(cat => (
            <button
              key={cat}
              className="chip"
              style={{ borderColor: activeCategory === cat ? "var(--ac2)" : undefined }}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div style={{ marginTop: "10px" }}>
          {SIMULATIONS.map((sim, idx) => {
            if (activeCategory !== "All" && sim.s !== activeCategory) return null;
            return (
              <button
                key={sim.n}
                className="tile card"
                onClick={() => setSelectedSimIndex(idx)}
              >
                <b>{sim.e} {sim.n}</b>
                <span className="mu">{sim.s} · {sim.t}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Active Simulation View ──
  const currentSim = SIMULATIONS[selectedSimIndex];

  return (
    <div className="pg">
      <button className="alt" onClick={() => setSelectedSimIndex(-1)}>
        ‹ All simulations
      </button>

      <h1 style={{ marginTop: "10px" }}>{currentSim.e} {currentSim.n}</h1>

      <div className="card" style={{ padding: "8px" }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "280px", display: "block" }} />
      </div>

      <div className="card" style={{ color: "var(--ac2)", fontWeight: 600 }}>
        {formulaText}
      </div>

      {/* Real-time parameter controls */}
      <div className="card">
        {currentSim.c.map(ctrl => (
          <div key={ctrl[0]} style={{ margin: "8px 0" }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="mu">{ctrl[1]}</span>
              <b>{params[ctrl[0]] ?? ctrl[4]}</b>
            </div>
            <input
              type="range"
              min={ctrl[2]}
              max={ctrl[3]}
              step={ctrl[5]}
              value={params[ctrl[0]] ?? ctrl[4]}
              onChange={e => handleSliderChange(ctrl[0], e.target.value)}
              style={{ width: "100%", accentColor: "#8b5cf6" }}
            />
          </div>
        ))}
      </div>

      <div className="card">
        <b>Key Idea</b>
        <div className="mu">{currentSim.k}</div>
      </div>

      <div className="card">
        <button
          onClick={() => {
            navigateTo("ai");
            setTimeout(() => {
              const input = document.getElementById("q");
              if (input) input.value = `Explain ${currentSim.n} in simple steps with key formulas and one practical example.`;
            }, 100);
          }}
        >
          🤖 Explain this
        </button>{" "}
        <button
          className="alt"
          onClick={() => {
            // Generate a 5-question mock for this topic
            const sampleQuestions = [
              [`What is the governing formula in ${currentSim.n}?`, ["Formula A", "Formula B", "Formula C", "Formula D"], 0, currentSim.s],
              [`In ${currentSim.n}, what happens when parameter increases?`, ["Increases proportionally", "Decreases", "Stays constant", "Oscillates"], 0, currentSim.s]
            ];
            startQuiz(currentSim.n, sampleQuestions);
          }}
        >
          📝 Quick quiz
        </button>
      </div>

      <div className="card">
        <b>Related Video Lectures</b>
        <div style={{ marginTop: "6px" }}>
          <a
            className="chip"
            href={makeYouTubeLectureUrl(currentSim.n)}
            target="_blank"
            rel="noopener noreferrer"
          >
            ▶️ Watch lectures on YouTube
          </a>
        </div>
      </div>
    </div>
  );
}
