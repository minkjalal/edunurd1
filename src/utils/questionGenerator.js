/**
 * =============================================================================
 * EduNerd - Dynamic Question Generator & Shuffle Engine (questionGenerator.js)
 * =============================================================================
 * Features:
 * 1. Fisher-Yates Shuffle Algorithm for unbiased, random permutations.
 * 2. Dynamic procedural question generation with randomized parameters.
 * 3. Dynamic scaling based on `classLevel` (1-12) and `competitionLevel`
 *    ("Foundation", "Intermediate", "Advanced", "JEE", "NEET", "UPSC/SSC", etc.).
 * 4. Preserves standard return structure:
 *    [questionText, [opt0, opt1, opt2, opt3], correctIndex, topic]
 * =============================================================================
 */

/**
 * Standard Fisher-Yates Shuffle algorithm for true randomness.
 * @template T
 * @param {T[]} array - The array to shuffle.
 * @returns {T[]} A new, randomly shuffled copy of the array.
 */
export function fisherYatesShuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

/**
 * Helper to produce randomized distractor options and track correct index.
 * @param {string|number} correctAnswer
 * @param {(string|number)[]} distractors
 * @returns {{ options: string[], correctIndex: number }}
 */
function createShuffledOptions(correctAnswer, distractors) {
  const all = [
    { text: String(correctAnswer), isCorrect: true },
    ...distractors.slice(0, 3).map(d => ({ text: String(d), isCorrect: false }))
  ];
  const shuffled = fisherYatesShuffle(all);
  const correctIndex = shuffled.findIndex(item => item.isCorrect);
  return {
    options: shuffled.map(item => item.text),
    correctIndex: correctIndex === -1 ? 0 : correctIndex
  };
}

/**
 * Procedural generators for dynamic math & physics problems.
 * Calculates answers dynamically from random numeric inputs.
 */
const PROCEDURAL_FACTORIES = [
  // 1. Force = Mass x Acceleration
  ({ classLevel, competitionLevel }) => {
    const m = Math.floor(Math.random() * 15) + 2; // 2 to 16 kg
    const a = Math.floor(Math.random() * 8) + 2;  // 2 to 9 m/s^2
    const f = m * a;
    const { options, correctIndex } = createShuffledOptions(`${f} N`, [
      `${f + m} N`,
      `${f - a > 0 ? f - a : f + 12} N`,
      `${m + a} N`
    ]);
    return [
      `A body of mass ${m} kg accelerates uniformly at ${a} m/s². What net force is exerted on the body?`,
      options,
      correctIndex,
      "Mechanics"
    ];
  },

  // 2. Ohm's Law (V = I * R)
  ({ classLevel, competitionLevel }) => {
    const i = Math.floor(Math.random() * 6) + 1; // 1 to 6 A
    const r = Math.floor(Math.random() * 20) + 5; // 5 to 24 ohms
    const v = i * r;
    const { options, correctIndex } = createShuffledOptions(`${v} V`, [
      `${v + 5} V`,
      `${Math.max(2, v - i * 2)} V`,
      `${(v * 1.5).toFixed(0)} V`
    ]);
    return [
      `A current of ${i} A flows through an electrical resistor of ${r} Ω. What is the potential difference across it?`,
      options,
      correctIndex,
      "Current Electricity"
    ];
  },

  // 3. Kinetic Energy (1/2 m v^2)
  ({ classLevel, competitionLevel }) => {
    const m = (Math.floor(Math.random() * 5) + 1) * 2; // Even mass 2, 4, 6, 8, 10 kg
    const v = Math.floor(Math.random() * 7) + 2;      // Velocity 2 to 8 m/s
    const ke = 0.5 * m * v * v;
    const { options, correctIndex } = createShuffledOptions(`${ke} J`, [
      `${ke * 2} J`,
      `${ke + 10} J`,
      `${Math.round(m * v)} J`
    ]);
    return [
      `Calculate the kinetic energy of an object with mass ${m} kg travelling at a steady speed of ${v} m/s.`,
      options,
      correctIndex,
      "Work, Energy & Power"
    ];
  },

  // 4. Calculus Derivative: d/dx(x^n) at x = a
  ({ classLevel, competitionLevel }) => {
    const n = Math.floor(Math.random() * 3) + 2; // 2, 3, or 4
    const x = Math.floor(Math.random() * 3) + 2; // 2, 3, or 4
    const ans = n * Math.pow(x, n - 1);
    const { options, correctIndex } = createShuffledOptions(String(ans), [
      String(ans + n),
      String(Math.pow(x, n)),
      String(ans * 2)
    ]);
    const powerSymbols = { 2: "²", 3: "³", 4: "⁴" };
    return [
      `What is the value of the derivative d/dx (x${powerSymbols[n] || "^" + n}) evaluated at x = ${x}?`,
      options,
      correctIndex,
      "Calculus"
    ];
  },

  // 5. Quadratic Roots discriminant
  ({ classLevel, competitionLevel }) => {
    const b = (Math.floor(Math.random() * 4) + 2) * 2; // even: 4, 6, 8, 10
    const c = Math.floor(Math.random() * 5) + 1;
    const disc = b * b - 4 * 1 * c;
    const nature = disc > 0 ? "Real and distinct" : disc === 0 ? "Real and equal" : "Complex conjugate";
    const { options, correctIndex } = createShuffledOptions(nature, [
      disc > 0 ? "Real and equal" : "Real and distinct",
      "Purely imaginary only",
      "No roots exist in algebra"
    ]);
    return [
      `For the quadratic equation x² + ${b}x + ${c} = 0, what is the nature of its roots?`,
      options,
      correctIndex,
      "Algebra"
    ];
  },

  // 6. pH Calculation / Chemistry
  ({ classLevel, competitionLevel }) => {
    const pOH = Math.floor(Math.random() * 5) + 1; // 1 to 5
    const pH = 14 - pOH;
    const { options, correctIndex } = createShuffledOptions(String(pH), [
      String(pOH),
      String(pH + 1),
      String(Math.max(1, pH - 2))
    ]);
    return [
      `At 25°C, an aqueous solution is measured with pOH = ${pOH}. What is the corresponding pH of this solution?`,
      options,
      correctIndex,
      "Chemical Equilibrium"
    ];
  },

  // 7. Work Done = F * d * cos(theta)
  ({ classLevel, competitionLevel }) => {
    const f = (Math.floor(Math.random() * 8) + 2) * 5; // 10, 15, 20...
    const d = Math.floor(Math.random() * 6) + 2;       // 2 to 7 m
    const w = f * d;
    const { options, correctIndex } = createShuffledOptions(`${w} J`, [
      `${w / 2} J`,
      `${w + f} J`,
      `0 J`
    ]);
    return [
      `A constant force of ${f} N acts along the direction of motion, displacing a crate by ${d} m. What is the total work done?`,
      options,
      correctIndex,
      "Thermodynamics & Work"
    ];
  }
];

/**
 * Question templates categorized by class level and competition level.
 */
const SCALED_QUESTION_POOLS = {
  // Foundation: Class 6 to 9
  foundation: [
    [
      "Which component of blood is primarily responsible for transporting oxygen throughout the human body?",
      ["Hemoglobin in red blood cells", "Blood platelets", "White blood cells", "Blood plasma proteins"],
      0,
      "Biology"
    ],
    [
      "What is the chemical formula for ordinary table salt?",
      ["NaCl", "KCl", "CaCl₂", "Na₂SO₄"],
      0,
      "Chemistry"
    ],
    [
      "What is the value of the speed of light in vacuum?",
      ["3 × 10⁸ m/s", "3 × 10⁶ m/s", "3 × 10¹⁰ m/s", "3 × 10⁵ m/s"],
      0,
      "Physics"
    ],
    [
      "Which planet in our solar system is known as the Red Planet due to iron oxide on its surface?",
      ["Mars", "Venus", "Jupiter", "Mercury"],
      0,
      "Astronomy"
    ],
    [
      "What type of mirror is commonly used as a rear-view mirror in motor vehicles?",
      ["Convex mirror", "Concave mirror", "Plane mirror", "Parabolic mirror"],
      0,
      "Optics"
    ]
  ],

  // Secondary: Class 10 & Intermediate Competitions (NTSE, Olympiad, Foundation)
  intermediate: [
    [
      "During cellular respiration, in which organelle does the Krebs (citric acid) cycle take place?",
      ["Mitochondrial matrix", "Cytoplasm", "Endoplasmic reticulum", "Ribosome"],
      0,
      "Cell Biology"
    ],
    [
      "What is the SI unit of magnetic flux density (B)?",
      ["Tesla (T)", "Weber (Wb)", "Henry (H)", "Gauss (G)"],
      0,
      "Electromagnetism"
    ],
    [
      "What type of chemical bond involves the equal sharing of electron pairs between identical atoms?",
      ["Non-polar covalent bond", "Ionic electrovalent bond", "Coordinate covalent bond", "Hydrogen bond"],
      0,
      "Chemical Bonding"
    ],
    [
      "According to Mendeleev's periodic law, properties of elements are a periodic function of their:",
      ["Atomic mass", "Atomic number", "Valence electrons", "Nuclear charge"],
      0,
      "Inorganic Chemistry"
    ],
    [
      "What is the normal resting blood pressure of a healthy adult human?",
      ["120/80 mmHg", "140/90 mmHg", "100/60 mmHg", "130/85 mmHg"],
      0,
      "Human Physiology"
    ]
  ],

  // Senior Secondary: Class 11-12 & Advanced Competitions (JEE, NEET, GATE, UPSC)
  advanced: [
    [
      "What is the hybridisation of xenon in xenon tetrafluoride (XeF₄)?",
      ["sp³d²", "sp³d", "sp³", "dsp²"],
      0,
      "Chemical Bonding"
    ],
    [
      "In quantum mechanics, Heisenberg's uncertainty principle is formulated as Δx · Δp ≥:",
      ["ℏ / 2", "h / 2", "ℏ", "2ℏ"],
      0,
      "Modern Physics"
    ],
    [
      "Which enzyme synthesizes DNA strands in the 5' to 3' direction during replication?",
      ["DNA Polymerase III", "DNA Ligase", "RNA Helicase", "Topoisomerase"],
      0,
      "Molecular Genetics"
    ],
    [
      "Under Article 32 of the Constitution of India, which writ is issued to release a person unlawfully detained?",
      ["Habeas Corpus", "Mandamus", "Quo Warranto", "Certiorari"],
      0,
      "Indian Polity"
    ],
    [
      "What is the total entropy change (ΔS_universe) for a reversible cyclic Carnot engine?",
      ["Zero", "Always positive", "Always negative", "Infinite"],
      0,
      "Thermodynamics"
    ]
  ]
};

/**
 * Primary Dynamic Question Generator.
 *
 * @param {object} options
 * @param {number} [options.classLevel=10] - Student class level (1-12).
 * @param {string} [options.competitionLevel="Intermediate"] - Difficulty or exam tier ("Foundation", "Intermediate", "Advanced", "JEE", "NEET", "Olympiad", "UPSC/SSC").
 * @param {number} [options.count=10] - Number of questions to generate.
 * @param {string} [options.subject] - Optional subject filter.
 * @param {string} [options.examName] - Target exam name if applicable.
 * @param {string} [options.testKind="mock"] - "mock" | "sample" | "pyq".
 * @returns {Array<[string, string[], number, string]>} Dynamic questions array in standard format.
 */
export function generateDynamicQuestions({
  classLevel = 10,
  competitionLevel = "Intermediate",
  count = 10,
  subject = "",
  examName = "",
  testKind = "mock"
} = {}) {
  const resolvedClass = parseInt(classLevel, 10) || 10;
  const compStr = String(competitionLevel || examName || "").toLowerCase();

  // 1. Determine tier category based on classLevel and competitionLevel
  let tierKey = "intermediate";
  if (resolvedClass <= 8 || compStr.includes("foundation") || compStr.includes("school")) {
    tierKey = "foundation";
  } else if (
    resolvedClass >= 11 ||
    compStr.includes("jee") ||
    compStr.includes("neet") ||
    compStr.includes("advanced") ||
    compStr.includes("upsc") ||
    compStr.includes("gate")
  ) {
    tierKey = "advanced";
  }

  // 2. Dynamically instantiate procedural math & physics generators
  const dynamicGenerated = [];
  const proceduralShuffled = fisherYatesShuffle(PROCEDURAL_FACTORIES);

  for (const factory of proceduralShuffled) {
    try {
      const qItem = factory({ classLevel: resolvedClass, competitionLevel });
      if (qItem && Array.isArray(qItem) && qItem.length === 4) {
        dynamicGenerated.push(qItem);
      }
    } catch (e) {
      // Continue to next factory on error
    }
  }

  // 3. Assemble pool from scaled static bank according to tier
  const tierBank = (SCALED_QUESTION_POOLS[tierKey] || SCALED_QUESTION_POOLS.intermediate).map(q => {
    // Shuffle the options of the static bank as well so option position is completely non-static
    const text = q[0];
    const opts = q[1];
    const correctIdx = q[2];
    const top = q[3];
    const correctVal = opts[correctIdx];
    const distractors = opts.filter((_, idx) => idx !== correctIdx);
    const { options: shuffledOpts, correctIndex: newCorrectIdx } = createShuffledOptions(correctVal, distractors);
    return [text, shuffledOpts, newCorrectIdx, top];
  });

  // 4. Combine procedural dynamic problems and shuffled tier pool
  let combined = [...dynamicGenerated, ...tierBank];

  // Optional subject filter if caller requested a specific subject
  if (subject && subject !== "All" && subject !== "General") {
    const subLower = subject.toLowerCase();
    const filtered = combined.filter(item => (item[3] || "").toLowerCase().includes(subLower));
    if (filtered.length >= 3) {
      combined = filtered;
    }
  }

  // 5. Apply Fisher-Yates Shuffle to the final question selection
  const finalShuffled = fisherYatesShuffle(combined);

  // If requested count exceeds pool, dynamically generate unique numeric variants
  const result = finalShuffled.slice(0, Math.max(1, count));
  let counter = 1;
  while (result.length < count) {
    const factory = PROCEDURAL_FACTORIES[counter % PROCEDURAL_FACTORIES.length];
    const dynamicExtra = factory({ classLevel: resolvedClass, competitionLevel });
    result.push(dynamicExtra);
    counter++;
  }

  // Return strictly in standard structure: [questionText, optionsArray, correctIndex, topic]
  return result.slice(0, count);
}

/**
 * Return format helper: convert question array to JSON object format {q, o, a, t}.
 */
export function formatQuestionsAsJSON(questionsArray) {
  return questionsArray.map(([q, o, a, t]) => ({
    q: String(q),
    o: Array.isArray(o) ? o : ["A", "B", "C", "D"],
    a: typeof a === "number" ? a : 0,
    t: String(t || "General")
  }));
}
