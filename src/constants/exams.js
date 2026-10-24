// Connection: src/constants/exams.js is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Defines class, subject, exam, and previous-year question presets.
/**
 * EduNerd - Exam Banks & Directory
 * =================================
 * Includes:
 * 1. Preloaded MCQ question bank for major entrance tests.
 * 2. Directory of 35+ national & state competitive exams.
 * 3. School subjects mapping for Class 1 to 12.
 */

/** Built-in high-yield questions for standard exams [Question, Options, CorrectIndex, Topic] */
export const EXAM_PRESETS = {
  JEE: [
    ["What is the derivative of x³ at x = 2?", ["6", "12", "8", "3"], 1, "Calculus"],
    ["What is the unit of impulse in SI?", ["N·s", "N/s", "J", "W"], 0, "Mechanics"],
    ["Hybridisation of carbon in methane (CH₄)?", ["sp", "sp²", "sp³", "dsp²"], 2, "Chemical Bonding"],
    ["What is the value of sin 30°?", ["1/2", "√3/2", "1", "0"], 0, "Trigonometry"]
  ],
  NEET: [
    ["Which organelle is the powerhouse of the cell?", ["Nucleus", "Mitochondria", "Ribosome", "Golgi"], 1, "Cell Biology"],
    ["Normal human blood pH is approximately?", ["6.4", "7.4", "8.4", "5.4"], 1, "Human Physiology"],
    ["In DNA, Adenine (A) pairs with?", ["Guanine", "Cytosine", "Thymine", "Uracil"], 2, "Genetics"],
    ["Which vitamin helps in blood clotting?", ["Vitamin A", "Vitamin C", "Vitamin K", "Vitamin D"], 2, "Nutrition"]
  ],
  Olympiad: [
    ["Find the next term in sequence: 2, 6, 12, 20, 30, ?", ["40", "42", "44", "46"], 1, "Number Patterns"],
    ["What is the sum of interior angles in a triangle?", ["90°", "180°", "270°", "360°"], 1, "Geometry"]
  ],
  "UPSC/SSC": [
    ["Who is the constitutional head of the Republic of India?", ["Prime Minister", "President", "Chief Justice", "Lok Sabha Speaker"], 1, "Polity"],
    ["Under Article 21 of the Indian Constitution, what is protected?", ["Right to Property", "Life and personal liberty", "Freedom of Speech", "Freedom of Religion"], 1, "Polity"],
    ["What is the capital city of Karnataka?", ["Mysuru", "Hubballi", "Bengaluru", "Mangaluru"], 2, "Geography"]
  ]
};

/** Directory of major competitive exams */
export const EXAMS_LIST = [
  "JEE", "NEET", "Olympiad", "UPSC/SSC", "JEE Main", "JEE Advanced",
  "NEET UG", "NEET PG", "UPSC CSE", "UPSC NDA", "UPSC CDS", "SSC CGL",
  "SSC CHSL", "SSC MTS", "SSC GD", "IBPS PO", "IBPS Clerk", "SBI PO",
  "SBI Clerk", "RBI Grade B", "RRB NTPC", "RRB Group D", "GATE", "CAT",
  "CLAT", "CUET", "AFCAT", "CA Foundation", "UGC NET", "CTET", "State PSC",
  "NTSE", "BITSAT", "NIFT", "NID DAT", "LIC AAO"
];

/** Return subject list tailored to standard school curricula */
export const getSubjectsByClass = grade => {
  if (grade <= 5) {
    return ["Maths", "EVS", "English", "Hindi"];
  }
  if (grade <= 10) {
    return ["Maths", "Science", "Social Science", "English", "Hindi"];
  }
  return ["Physics", "Chemistry", "Maths", "Biology", "English", "Economics", "Accountancy"];
};

/** 10 Years historical years list for PYQ search */
export const PAST_YEARS = Array.from({ length: 10 }, (_, i) => 2026 - i);
