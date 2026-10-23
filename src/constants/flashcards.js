/**
 * EduNerd - Flashcard Decks & Spaced Repetition Presets
 * ====================================================
 * High-yield core concept cards categorized by subject.
 */

export const FLASHCARD_PRESETS = {
  Physics: [
    { q: "Newton's 2nd Law of Motion formula", a: "F = m · a (Force = mass × acceleration) or F = dp/dt", t: "Mechanics" },
    { q: "Kinetic Energy formula", a: "KE = ½ · m · v²", t: "Work & Energy" },
    { q: "Ohm's Law equation", a: "V = I · R (Voltage = Current × Resistance)", t: "Electricity" },
    { q: "De Broglie Wavelength formula", a: "λ = h / p = h / (m · v)", t: "Modern Physics" },
    { q: "Time Period of a Simple Pendulum", a: "T = 2π √(L / g)", t: "Oscillations" },
    { q: "Coulomb's Law (Electrostatics)", a: "F = (1 / 4πε₀) · (|q₁ · q₂| / r²)", t: "Electrostatics" }
  ],
  Chemistry: [
    { q: "Ideal Gas Law equation", a: "P · V = n · R · T (Pressure × Volume = moles × R × Temp)", t: "States of Matter" },
    { q: "Hybridisation of Methane (CH₄)", a: "sp³ hybridised (Tetrahedral, 109.5° bond angle)", t: "Chemical Bonding" },
    { q: "Avogadro's Constant value", a: "N_A ≈ 6.022 × 10²³ particles / mol", t: "Mole Concept" },
    { q: "Definition & formula of pH", a: "pH = -log₁₀[H⁺]", t: "Equilibrium" },
    { q: "OIL RIG mnemonic in Redox", a: "Oxidation Is Loss; Reduction Is Gain of electrons", t: "Redox Reactions" }
  ],
  Biology: [
    { q: "Powerhouse of the eukaryotic cell", a: "Mitochondria (site of ATP production via cellular respiration)", t: "Cell Biology" },
    { q: "DNA base pairing rule", a: "Adenine (A) pairs with Thymine (T); Guanine (G) pairs with Cytosine (C)", t: "Genetics" },
    { q: "Functional filtration unit of the Kidney", a: "Nephron", t: "Human Physiology" },
    { q: "Universal Blood Donor blood group", a: "O negative (O-)", t: "Circulatory System" }
  ],
  Maths: [
    { q: "Quadratic formula for ax² + bx + c = 0", a: "x = (-b ± √(b² - 4ac)) / (2a)", t: "Algebra" },
    { q: "Core Trigonometric Identity", a: "sin²θ + cos²θ = 1", t: "Trigonometry" },
    { q: "Derivative of sin(x) and cos(x)", a: "d/dx[sin(x)] = cos(x); d/dx[cos(x)] = -sin(x)", t: "Calculus" },
    { q: "Euler's Identity", a: "e^(iπ) + 1 = 0", t: "Complex Numbers" }
  ],
  Polity: [
    { q: "Article 21 of the Indian Constitution", a: "Protection of Life and Personal Liberty", t: "Fundamental Rights" },
    { q: "Chief architect of the Indian Constitution", a: "Dr. B. R. Ambedkar", t: "Constituent Assembly" },
    { q: "Total Fundamental Rights in Indian Constitution", a: "6 Fundamental Rights (Part III)", t: "Constitution" }
  ]
};

export const FLASHCARD_DECK_NAMES = ["All", "Physics", "Chemistry", "Biology", "Maths", "Polity", "Custom"];
