// Connection: offlineTutor.js is consumed by AITutorView and OfflineView so both surfaces share one browser-only answer engine.
// Function: Produces deterministic, honest study responses without FastAPI, Groq, Gemini, or network access.

/**
 * Local answer snippets cover common study prompts while the generic path
 * keeps unknown questions useful without pretending that a model or source
 * was consulted. Every response uses the same shape as an online verdict so
 * the existing tutor renderer can display it unchanged.
 */
const LOCAL_KNOWLEDGE = [
  {
    match: /newton|force|motion|action\s+and\s+reaction/i,
    topic: "Newton's laws",
    answer: "Newton's third law says that interacting bodies exert equal and opposite forces on one another. If body 1 pushes body 2 with $F_{12}$, body 2 pushes body 1 with $F_{21}=-F_{12}$. The pair acts on different bodies, so the forces do not cancel on a single free-body diagram.",
    steps: [
      "Draw the two interacting bodies separately.",
      "Label the force from body 1 on body 2 and the reaction force from body 2 on body 1.",
      "Check that the magnitudes match and the directions are opposite."
    ]
  },
  {
    match: /speed\s+and\s+velocity|velocity\s+and\s+speed/i,
    topic: "Speed and velocity",
    answer: "Speed is a scalar: it tells how much distance is covered per unit time. Velocity is a vector: it tells displacement per unit time and includes direction.",
    steps: [
      "Use speed = total distance ÷ total time.",
      "Use average velocity = displacement ÷ total time.",
      "A round trip can have non-zero speed but zero displacement and average velocity."
    ]
  },
  {
    match: /ohm|voltage|current|resistance/i,
    topic: "Ohm's law",
    answer: "For an ohmic conductor at constant temperature, voltage, current, and resistance obey $V=IR$. Increasing resistance lowers current when the applied voltage stays fixed.",
    steps: [
      "Write the known values with units.",
      "Rearrange $V=IR$ for the quantity requested.",
      "Substitute the values and check the final unit."
    ]
  },
  {
    match: /photosynthesis|chlorophyll|plant\s+food/i,
    topic: "Photosynthesis",
    answer: "Photosynthesis stores light energy as chemical energy. In simplified form, plants use carbon dioxide and water to make glucose and oxygen: $6CO_2+6H_2O\\rightarrow C_6H_{12}O_6+6O_2$.",
    steps: [
      "Light is absorbed mainly by chlorophyll in chloroplasts.",
      "Water is split during the light-dependent reactions.",
      "The Calvin cycle uses stored chemical energy to build sugars from carbon dioxide."
    ]
  },
  {
    match: /derivative|differentiat|d\/dx|calculus/i,
    topic: "A basic derivative",
    answer: "For a power function, the power rule is $\\frac{d}{dx}(x^n)=nx^{n-1}$. The exponent moves in front and decreases by one.",
    steps: [
      "Identify the exponent n.",
      "Multiply the coefficient by n.",
      "Reduce the power of x by one and evaluate at the requested value, if given."
    ]
  }
];

const GENERIC_STEPS = [
  "Identify exactly what the question asks you to find or explain.",
  "List the given information, units, definitions, and assumptions.",
  "Choose the rule, definition, or formula that connects those givens to the target.",
  "Work through one step at a time and keep the units or evidence visible.",
  "Substitute the result back into the question and check that it answers the original target."
];

export function generateOfflineTutorResponse(query) {
  const text = String(query ?? "").trim().slice(0, 4096);
  const match = LOCAL_KNOWLEDGE.find(item => item.match.test(text));
  const topic = match?.topic || "your question";
  const answer = match?.answer || "No matching local concept pack is available, so use the checkable framework below instead of treating an unverified guess as fact.";
  const steps = match?.steps || GENERIC_STEPS;

  return {
    status: "Questioned",
    confidence_score: match ? 65 : 35,
    final_answer: `**Offline mode · ${topic}**\n\n${text ? `Question received: “${text}”\n\n` : ""}${answer}\n\n${steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}`,
    audit_explanation: "This response was generated locally in the browser from EduNerd's deterministic study packs. No external model, API, or source verification was used.",
    contradictions: [],
    verified_sources: [],
    flashcard_export: [],
    gamification_triggers: {
      student_accuracy_score: 0,
      xp_awarded: 0,
      prompt_community_share: false
    },
    model_used: "Offline local tutor"
  };
}
