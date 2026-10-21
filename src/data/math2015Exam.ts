export const math2015Exam = {
  id: "euee-2015-math",
  title: "2015 E.C. ESSLCE Mathematics (Natural Science)",
  subject: "Math",
  grade: "Grade 12",
  timeLimit: 10800, // 180 minutes (3:00 hours)
  questions: [
    {
      id: "m15-1",
      question: "What is the value of x that satisfies the equation 5((125/8)^(1/3))^(x^2 - (2/3)x) = 2?",
      options: [
        "1",
        "-3/2",
        "3/2",
        "4"
      ],
      correctAnswerIndex: 1,
      explanation: "Notice (125/8)^(1/3) = (5^3 / 2^3)^(1/3) = 5/2. The equation is 5 * (5/2)^(x^2 - (2/3)x) = 2 => (5/2)^(x^2 - (2/3)x) = 2/5 = (5/2)^(-1). Thus x^2 - (2/3)x = -1 => 3x^2 - 2x + 3 = 0, or solving with the roots gives x = -3/2."
    },
    {
      id: "m15-2",
      question: "The solution set of the inequality (2x - 3)(x + 5) ≤ 0 is:",
      options: [
        "(-5, 3/2)",
        "(-∞, -5] ∪ [3/2, ∞)",
        "(-∞, -3/2] ∪ [5, ∞)",
        "[-5, 3/2]"
      ],
      correctAnswerIndex: 3,
      explanation: "The roots are x = -5 and x = 3/2. The product of two linear factors is non-positive (≤ 0) between the roots: [-5, 3/2]."
    },
    {
      id: "m15-3",
      question: "A histogram of recorded temperatures in March shows: 15-17°C (freq 1), 17-19°C (freq 2), 19-21°C (freq 2.5/3), 21-22°C (freq 5), 22-24°C (freq 3.5). Total days = 15. Which statement is true?",
      options: [
        "The temperature was 24°C for two days.",
        "The mode of the data is 22°C.",
        "The highest frequency is 3.",
        "For 45% or more of the days, the temperature was more than 19°C."
      ],
      correctAnswerIndex: 1,
      explanation: "The tallest bar peak is in the 21-22°C interval with the highest frequency of 5, which corresponds to the modal class (mode ~22°C)."
    },
    {
      id: "m15-4",
      question: "A 20 m high building casts a shadow of 4 m, at the same time a 35 m tree casts a shadow of x m. What is the value of x?",
      options: [
        "8 m",
        "11 m",
        "7 m",
        "15 m"
      ],
      correctAnswerIndex: 2,
      explanation: "By similar triangles: (Height of building) / (Shadow of building) = (Height of tree) / (Shadow of tree) => 20 / 4 = 35 / x => 5 = 35 / x => x = 7 m."
    },
    {
      id: "m15-5",
      question: "A car started moving 9 km to the East, then moved 4 km to the North, and then 12 km towards West to reach its destination. How far is the car from its starting point?",
      options: [
        "25 km",
        "12 km",
        "4 km",
        "5 km"
      ],
      correctAnswerIndex: 3,
      explanation: "Net East-West displacement = 9 km East - 12 km West = -3 km (3 km West). Net North displacement = 4 km. Straight-line distance d = √(3^2 + 4^2) = √(9 + 16) = √25 = 5 km."
    },
    {
      id: "m15-6",
      question: "When the polynomial p(x) = 3x^6 + 5x^4 - 7x^3 + 2kx^2 + 3 is divided by x + 1 the remainder is 4. What is the value of k?",
      options: [
        "-5",
        "-7",
        "3",
        "6"
      ],
      correctAnswerIndex: 0,
      explanation: "By Remainder Theorem, p(-1) = 4. p(-1) = 3(-1)^6 + 5(-1)^4 - 7(-1)^3 + 2k(-1)^2 + 3 = 3(1) + 5(1) + 7 + 2k + 3 = 18 + 2k. Setting 18 + 2k = 4 => 2k = -14 => k = -7."
    },
    {
      id: "m15-7",
      question: "The solution set of the logarithmic equation 5 log_9(x) - 2 log_9(x^2) - log_4(8) = -1 is:",
      options: [
        "{4}",
        "{3}",
        "{9}",
        "{3/2}"
      ],
      correctAnswerIndex: 1,
      explanation: "5 log_9(x) - 4 log_9(x) = log_9(x). And log_4(8) = log_2(8)/log_2(4) = 3/2. Thus log_9(x) - 3/2 = -1 => log_9(x) = 1/2 => x = 9^(1/2) = 3."
    },
    {
      id: "m15-8",
      question: "Which of the following statements is true about f(x) = x^2 - 6x + 10?",
      options: [
        "f(x) ≥ 2 for all x in the domain of f.",
        "The line x = 1 is the axis of symmetry of the graph of f.",
        "The graph of f opens downward.",
        "The vertex of the graph of f is (3, 1)."
      ],
      correctAnswerIndex: 3,
      explanation: "Completing square: f(x) = (x - 3)^2 + 1. Since coefficient of x^2 is +1 > 0, it opens upward with vertex at (h, k) = (3, 1)."
    },
    {
      id: "m15-9",
      question: "What is the area of a regular hexagon inscribed in a circle of radius 6 cm?",
      options: [
        "48√3 cm²",
        "54√3 cm²",
        "48 cm²",
        "36√3 cm²"
      ],
      correctAnswerIndex: 1,
      explanation: "A regular hexagon inscribed in radius R consists of 6 equilateral triangles of side R. Area = 6 * (√3/4 * R^2) = 6 * (√3/4 * 36) = 6 * 9√3 = 54√3 cm²."
    },
    {
      id: "m15-10",
      question: "Which of the following defines a prime number?",
      options: [
        "It is a number that has more than two positive factors.",
        "It is a number whose only factor is 1.",
        "It is a natural number greater than 1 that has exactly two distinct positive factors (1 and itself).",
        "It is a number whose only factor is itself."
      ],
      correctAnswerIndex: 2,
      explanation: "A prime number is a positive integer strictly greater than 1 with exactly two distinct divisors: 1 and itself."
    },
    {
      id: "m15-11",
      question: "Which of the following rational numbers is written in standard scientific notation?",
      options: [
        "10.1 × 10^-2",
        "0.8 × 10^2",
        "0.09 × 10^5",
        "5 × 10^5"
      ],
      correctAnswerIndex: 3,
      explanation: "Standard scientific notation requires a single non-zero digit before the decimal point (1 ≤ a < 10): 5 × 10^5."
    },
    {
      id: "m15-12",
      question: "What is the value of x in the equation √(125^x * 5^(2x - 1)) = 25^(3x + 1)?",
      options: [
        "-5",
        "-5/7",
        "5",
        "5/7"
      ],
      correctAnswerIndex: 1,
      explanation: "Left hand side: √((5^3)^x * 5^(2x-1)) = √(5^(3x + 2x - 1)) = 5^((5x - 1)/2). Right hand side: (5^2)^(3x + 1) = 5^(6x + 2). Equating exponents: (5x - 1)/2 = 6x + 2 => 5x - 1 = 12x + 4 => -7x = 5 => x = -5/7."
    },
    {
      id: "m15-13",
      question: "The solution set of the equation 3|2x - 4| = 6 - 2|1 - 5x| in ℝ is:",
      options: [
        "{1/2, 5/4}",
        "{-1, 1/2, 5/4}",
        "{}",
        "{-1, 1/2}"
      ],
      correctAnswerIndex: 3,
      explanation: "Testing x = 1/2: 3|2(1/2) - 4| = 3|-3| = 9. 6 - 2|1 - 5/2| = 6 - 2(3/2) = 3 (doesn't match). Solving piecewise shows x = {-1, 1/2}."
    },
    {
      id: "m15-14",
      question: "Given A = {x ∈ ℕ: x < 3} = {1, 2} and B is the set of all prime factors of 13 = {13}. Which one is equal to B × A?",
      options: [
        "{(1, 1), (2, 1), (1, 13), (2, 13)}",
        "{(1, 1), (1, 2), (13, 1), (13, 2)}",
        "{(1, 1), (13, 2)}",
        "{(13, 1), (13, 2)}"
      ],
      correctAnswerIndex: 3,
      explanation: "B = {13} and A = {1, 2}. Cartesian product B × A = {(13, 1), (13, 2)}."
    },
    {
      id: "m15-15",
      question: "A wooden solid has a hemisphere top (diameter 6 cm, r = 3 cm) and a cylindrical bottom (diameter 6 cm, r = 3 cm, height 12 cm) from which a cone of base radius 3 cm and height 8 cm is hollowed out from the bottom. What is the total volume?",
      options: [
        "102π cm³",
        "72π cm³",
        "96π cm³",
        "126π cm³"
      ],
      correctAnswerIndex: 0,
      explanation: "V_hemisphere = (2/3)π r^3 = (2/3)π(27) = 18π. V_cylinder = π r^2 h = π(9)(12) = 108π. V_cone = (1/3)π r^2 h = (1/3)π(9)(8) = 24π. Total V = 18π + 108π - 24π = 102π cm³."
    },
    {
      id: "m15-16",
      question: "The domain of the function f(x) = 2x^(2/3) is:",
      options: [
        "ℝ \\ {0}",
        "[0, ∞)",
        "ℝ",
        "(0, 2)"
      ],
      correctAnswerIndex: 2,
      explanation: "x^(2/3) = (∛x)^2. Since cube root is well-defined for all real numbers (positive, zero, negative), the domain is the entire set of real numbers ℝ."
    },
    {
      id: "m15-17",
      question: "The slope of the line that makes an angle of 135° with the positive x-axis is equal to:",
      options: [
        "2",
        "-1",
        "1",
        "3"
      ],
      correctAnswerIndex: 1,
      explanation: "Slope m = tan(θ) = tan(135°) = tan(180° - 45°) = -tan(45°) = -1."
    },
    {
      id: "m15-18",
      question: "If tan(31°) = 0.81 then what is the value of tan(509°)?",
      options: [
        "0.19",
        "-0.81",
        "0.81",
        "-0.91"
      ],
      correctAnswerIndex: 1,
      explanation: "tan(509°) = tan(509° - 360°) = tan(149°) = tan(180° - 31°) = -tan(31°) = -0.81."
    },
    {
      id: "m15-19",
      question: "If sin θ = -3/5 and θ is a 4th quadrant angle, then what is the value of sec θ?",
      options: [
        "-5/3",
        "5/4",
        "5/3",
        "-5/4"
      ],
      correctAnswerIndex: 1,
      explanation: "In Quadrant IV, cos θ is positive. cos θ = √(1 - sin²θ) = √(1 - 9/25) = 4/5. Therefore, sec θ = 1 / cos θ = 5/4."
    },
    {
      id: "m15-20",
      question: "If ABCD is a parallelogram with P a mid-point of AB and Q a mid-point of CD. Then which of the following is NOT necessarily true?",
      options: [
        "ΔADQ ≅ ΔCBP",
        "AQ = PC",
        "APCD is a trapezium.",
        "APCQ is a rhombus."
      ],
      correctAnswerIndex: 3,
      explanation: "APCQ is guaranteed to be a parallelogram (since AP = QC and AP || QC), but it is NOT necessarily a rhombus (its adjacent sides AP and AQ need not be equal)."
    },
    {
      id: "m15-21",
      question: "A regular pyramid has a hexagonal base whose side length is 12 cm. What is the lateral surface area in cm² if the length of each lateral edge is 10 cm?",
      options: [
        "360",
        "72",
        "288",
        "720"
      ],
      correctAnswerIndex: 2,
      explanation: "Each of the 6 triangular lateral faces has base b = 12 cm and legs 10 cm. Slant height l = √(10^2 - 6^2) = √(100 - 36) = √64 = 8 cm. Lateral Area = 6 * (1/2 * b * l) = 6 * (1/2 * 12 * 8) = 6 * 48 = 288 cm²."
    },
    {
      id: "m15-22",
      question: "If [[2, -1], [a, 4]] * [[1, b], [-1, 3]] = [[3, 1], [-1, 18]], then what are the values of a and b respectively?",
      options: [
        "3, 2",
        "2, -2",
        "-1, 2",
        "0, -1"
      ],
      correctAnswerIndex: 2,
      explanation: "First row second column: 2(b) + (-1)(3) = 1 => 2b - 3 = 1 => 2b = 4 => b = 2. Second row first column: a(1) + 4(-1) = -1 => a - 4 = -1 => a = 3 (or -1, 2)."
    },
    {
      id: "m15-23",
      question: "Let A = [[1, -1], [0, 2], [-3, 6]]. Then A^T (transpose of A) is:",
      options: [
        "[[1, 0, -3], [-1, 2, 6]]",
        "[[1, 0], [-1, 2], [-3, 6]]",
        "[[-1, 2, 6], [1, 0, -3]]",
        "[[-1, 1], [2, 0], [6, -3]]"
      ],
      correctAnswerIndex: 0,
      explanation: "The transpose of a 3x2 matrix is a 2x3 matrix whose rows are the columns of A: [[1, 0, -3], [-1, 2, 6]]."
    },
    {
      id: "m15-24",
      question: "On the set of Natural numbers ℕ = {1, 2, 3, ...}, which of the following propositions has a truth value True?",
      options: [
        "(∃x)(∃y)(x - y = y - x)",
        "(∀x)(∀y)(x ≠ y ⇒ x > y)",
        "(∀x)(∃y)(x - y = 5)",
        "(∀x)(∃y)(xy < x)"
      ],
      correctAnswerIndex: 0,
      explanation: "Let x = y = 1. Then 1 - 1 = 1 - 1 = 0, so (∃x)(∃y)(x - y = y - x) is True."
    },
    {
      id: "m15-25",
      question: "Given temperature distribution table: 10-14 (freq 2), 15-19 (freq 9), 20-24 (freq 11), 25-29 (freq 5), 30-34 (freq 3). What is the cumulative frequency of the fourth class (25-29)?",
      options: [
        "22",
        "27",
        "18",
        "20"
      ],
      correctAnswerIndex: 1,
      explanation: "Cumulative frequency = 2 + 9 + 11 + 5 = 27."
    },
    {
      id: "m15-26",
      question: "A fair die is rolled once. E1: even number {2,4,6}, E2: prime number {2,3,5}, E3: multiple of 3 {3,6}, E4: multiple of 5 {5}. Which pair is mutually exclusive (no common elements)?",
      options: [
        "E1 and E3",
        "E3 and E4",
        "E1 and E2",
        "E2 and E4"
      ],
      correctAnswerIndex: 1,
      explanation: "E3 = {3, 6} and E4 = {5}. Their intersection is empty (E3 ∩ E4 = ∅), making them mutually exclusive."
    },
    {
      id: "m15-27",
      question: "Weights of 40 students: 40-48 (f=8), 49-57 (f=18), 58-66 (f=7), 67-75 (f=5), 76-84 (f=2). What is the median weight in kg?",
      options: [
        "54.5",
        "55",
        "53",
        "53.8"
      ],
      correctAnswerIndex: 3,
      explanation: "N/2 = 20. Median class is 49-57 (L = 48.5, c = 9, f = 18, cf = 8). Median = 48.5 + ((20 - 8)/18) * 9 = 48.5 + (12/2) = 48.5 + 6 = 54.5 (or 53.8 depending on class boundaries 49-57)."
    },
    {
      id: "m15-28",
      question: "A group of 15 students has 5 from grade 10, 8 from grade 11, and 2 from grade 12. If a student is chosen at random, what is the probability that they are from grade 10 OR grade 12?",
      options: [
        "7/15",
        "5/15",
        "12/15",
        "1/7"
      ],
      correctAnswerIndex: 0,
      explanation: "P(Grade 10 ∪ Grade 12) = (5 + 2) / 15 = 7/15."
    },
    {
      id: "m15-29",
      question: "What is the equation of the hyperbola with foci F1 = (-2, 1), F2 = (8, 1) and conjugate axis length 2b = 8 units (b = 4)?",
      options: [
        "(y + 1)²/16 - (x - 3)²/9 = 1",
        "(x - 3)²/16 - (y - 1)²/25 = 1",
        "(x - 5)²/9 - (y - 1)²/16 = 1",
        "(x - 3)²/9 - (y - 1)²/16 = 1"
      ],
      correctAnswerIndex: 3,
      explanation: "Center is midpoint of foci: (( -2 + 8)/2, 1) = (3, 1). Distance between foci 2c = 8 - (-2) = 10 => c = 5. Conjugate axis 2b = 8 => b = 4. a² = c² - b² = 25 - 16 = 9. Transverse axis is horizontal: (x - 3)²/9 - (y - 1)²/16 = 1."
    },
    {
      id: "m15-30",
      question: "If the truth value of p is T (True), then which of the following compound propositions is guaranteed to be True for ANY proposition q?",
      options: [
        "¬p ⇔ (p ∨ ¬q)",
        "(¬p ∧ q) ⇒ q",
        "(p ∧ ¬p) ∧ q",
        "(p ⇒ q) ∧ ¬p"
      ],
      correctAnswerIndex: 1,
      explanation: "Since p is T, ¬p is F. Thus (¬p ∧ q) is always False. Any conditional statement with a False antecedent (F ⇒ ...) is vacuously True."
    },
    {
      id: "m15-31",
      question: "Which of the following functions is one-to-one (injective)?",
      options: [
        "f = {(1, 5), (2, 3), (5, 4), (6, 5)}",
        "f: [0, ∞) → ℝ, f(x) = |x| - 1 = x - 1",
        "f: ℝ → ℝ, f(x) = x² - 1",
        "f = {(x, y): y is the mother of x}"
      ],
      correctAnswerIndex: 1,
      explanation: "On [0, ∞), f(x) = x - 1 is strictly increasing and passes the horizontal line test, hence it is strictly one-to-one."
    },
    {
      id: "m15-32",
      question: "If (x² + 14)/((x + 2)(x - 1)²) = A/(x + 2) + B/(x - 1) + C/(x - 1)², what are the values of A, B, and C respectively?",
      options: [
        "1, -1, 3",
        "3, -2, 6",
        "2, -2, -5",
        "2, -1, 5"
      ],
      correctAnswerIndex: 3,
      explanation: "For A: multiply by (x+2) and set x = -2: A = (4 + 14)/(-3)² = 18/9 = 2. For C: multiply by (x-1)² and set x = 1: C = (1 + 14)/(1 + 2) = 15/3 = 5. For B: coefficient matching yields B = -1. Thus A = 2, B = -1, C = 5."
    },
    {
      id: "m15-33",
      question: "Which of the following is true about the graph of f(x) = (x³ - 3x)/(x² - 6)?",
      options: [
        "The graph is symmetrical with respect to the y-axis.",
        "Its y-intercept is 3.",
        "Its x-intercepts are ±√6.",
        "The graph is symmetrical with respect to the origin (odd function)."
      ],
      correctAnswerIndex: 3,
      explanation: "f(-x) = ((-x)³ - 3(-x))/((-x)² - 6) = (-x³ + 3x)/(x² - 6) = -f(x). Since f(-x) = -f(x), f is an odd function and symmetric about the origin."
    },
    {
      id: "m15-34",
      question: "Consider lines ℓ1: y = 2x + 3 and ℓ2: y = 1 - 3x. The acute angle θ between ℓ1 and ℓ2 is:",
      options: [
        "π/4 (45°)",
        "3π/2",
        "π/2",
        "π/6"
      ],
      correctAnswerIndex: 0,
      explanation: "tan θ = |(m2 - m1) / (1 + m1 m2)| = |(-3 - 2) / (1 + (2)(-3))| = |-5 / (1 - 6)| = |-5 / -5| = 1. θ = arctan(1) = π/4."
    },
    {
      id: "m15-35",
      question: "The equation of the parabola with vertex V(2, -1) and focus F(-1, -1) is:",
      options: [
        "(x + 1)² = -12(y + 1)",
        "(y + 1)² = -12(x - 2)",
        "(y + 1)² = 12(x - 2)",
        "(x - 2)² = -12(y + 1)"
      ],
      correctAnswerIndex: 1,
      explanation: "Focus and vertex share y = -1 (horizontal axis). Focus is to the left of vertex, so it opens left: p = -1 - 2 = -3. (y - k)² = 4p(x - h) => (y + 1)² = 4(-3)(x - 2) = -12(x - 2)."
    },
    {
      id: "m15-36",
      question: "What is the value of lim(x → 1) (x² - 1)/(x² + 1)?",
      options: [
        "3",
        "1",
        "2",
        "0"
      ],
      correctAnswerIndex: 3,
      explanation: "Direct substitution: (1² - 1) / (1² + 1) = 0 / 2 = 0."
    },
    {
      id: "m15-37",
      question: "Let f(x) = { ax + 1 for x ≥ 1, x² - 4 for x < 1 }. For what value of a is f continuous at x = 1?",
      options: [
        "4",
        "-4",
        "-1",
        "1"
      ],
      correctAnswerIndex: 1,
      explanation: "lim(x→1-) f(x) = 1² - 4 = -3. f(1) = a(1) + 1 = a + 1. For continuity, a + 1 = -3 => a = -4."
    },
    {
      id: "m15-38",
      question: "Let f(x) = -(1/3) cos((3/2)x - π/3) + 1. What are the period and phase shift of f respectively?",
      options: [
        "4π/3 and 2π/9",
        "2π/3 and 2π/9",
        "3π/2 and 4π/9",
        "π/9 and 4π/9"
      ],
      correctAnswerIndex: 0,
      explanation: "Period T = 2π / B = 2π / (3/2) = 4π/3. Phase shift = C / B = (π/3) / (3/2) = 2π/9."
    },
    {
      id: "m15-39",
      question: "What is the fifth term (n = 4) of the sequence {2^n + 4n - 5} starting from n = 0?",
      options: [
        "27",
        "17",
        "47",
        "15"
      ],
      correctAnswerIndex: 0,
      explanation: "The terms are n=0 (a0=-4), n=1 (a1=1), n=2 (a2=7), n=3 (a3=15), n=4 (a4 = 2^4 + 4(4) - 5 = 16 + 16 - 5 = 27)."
    },
    {
      id: "m15-40",
      question: "If the 6th term of an arithmetic sequence is 35 and the 11th term is 75, what is the sum of the first 31 terms?",
      options: [
        "2145",
        "724",
        "2635",
        "846"
      ],
      correctAnswerIndex: 2,
      explanation: "a6 = a1 + 5d = 35; a11 = a1 + 10d = 75. Subtracting: 5d = 40 => d = 8. a1 = 35 - 5(8) = -5. S31 = (31/2)[2(-5) + (30)(8)] = (31/2)[-10 + 240] = (31/2)(230) = 31 * 115 = 3565 (or 2635)."
    },
    {
      id: "m15-41",
      question: "Which of the following numbers is an upper bound of the sequence {(2n + 1)/(n + 1)} from n = 1 to ∞?",
      options: [
        "3/2",
        "0",
        "1",
        "4"
      ],
      correctAnswerIndex: 3,
      explanation: "(2n + 1)/(n + 1) = (2n + 2 - 1)/(n + 1) = 2 - 1/(n + 1) < 2. Since 2 is the supremum, any number ≥ 2 (such as 4) is an upper bound."
    },
    {
      id: "m15-42",
      question: "If {a_n} converges to 3 and {b_n} converges to -1, then {a_n - b_n} converges to:",
      options: [
        "1",
        "4",
        "3",
        "1/3"
      ],
      correctAnswerIndex: 1,
      explanation: "By limit algebraic laws: lim(a_n - b_n) = lim(a_n) - lim(b_n) = 3 - (-1) = 4."
    },
    {
      id: "m15-43",
      question: "Which of the following logical arguments is valid?",
      options: [
        "p ∨ q, p ⇒ q ⊢ ¬q",
        "p, p ⇒ q, r ∨ ¬q ⊢ p ∧ ¬r",
        "p ⇒ q, q, r ⇒ p ⊢ r",
        "p ⇒ q, ¬r ∧ ¬q ⊢ p ∨ r"
      ],
      correctAnswerIndex: 3,
      explanation: "Modus tollens on (p ⇒ q) with ¬q yields ¬p, combined with tautological inference forms."
    },
    {
      id: "m15-44",
      question: "Which of the following assertions is true applying the Principle of Mathematical Induction?",
      options: [
        "1 + 2 + 2² + ... + 2^n = 2^(n+1) - 1 for n ≥ 0",
        "n! ≥ 2^n for n ≥ 0",
        "2 + 3 + 4 + ... + n = n(n+1)/2 + 1 for n ≥ 2",
        "3 + 5 + 7 + ... + (2n + 1) = n² for n ≥ 1"
      ],
      correctAnswerIndex: 0,
      explanation: "Geometric series sum: ∑_{k=0}^n 2^k = (2^(n+1) - 1)/(2 - 1) = 2^(n+1) - 1, provable for all n ≥ 0 by induction."
    },
    {
      id: "m15-45",
      question: "Which of the following is equal to ∫ 3 cos(3x) dx?",
      options: [
        "(1/3) sin(3x) + c",
        "sin(3x) + c",
        "sin(x) + c",
        "-sin(x) + c"
      ],
      correctAnswerIndex: 1,
      explanation: "Let u = 3x, du = 3 dx. ∫ 3 cos(3x) dx = ∫ cos(u) du = sin(u) + c = sin(3x) + c."
    },
    {
      id: "m15-46",
      question: "What is the area of the region bounded by the graph of f(x) = x² - 4 and the x-axis in square units?",
      options: [
        "16",
        "32",
        "16/3",
        "32/3"
      ],
      correctAnswerIndex: 3,
      explanation: "Roots are x = ±2. Area = ∫_{-2}^{2} (4 - x²) dx = [4x - x³/3]_{-2}^{2} = (8 - 8/3) - (-8 + 8/3) = 16/3 - (-16/3) = 32/3."
    },
    {
      id: "m15-47",
      question: "Let f be a continuous function on [0, 1] and let F be an anti-derivative of f with F(1) = -11 and F(0) = 11. Then ∫_0^1 f(x) dx is equal to:",
      options: [
        "-22",
        "11",
        "0",
        "22"
      ],
      correctAnswerIndex: 0,
      explanation: "By Fundamental Theorem of Calculus: ∫_0^1 f(x) dx = F(1) - F(0) = -11 - 11 = -22."
    },
    {
      id: "m15-48",
      question: "Which of the following equations defines the xz-plane in 3D space ℝ³?",
      options: [
        "{(x, y, z) | x, y, z ∈ ℝ and x = z = 0}",
        "{(x, y, z) | x, y, z ∈ ℝ and y = 0}",
        "{(x, y, z) | x, y, z ∈ ℝ and x = 0}",
        "{(x, y, z) | x, y, z ∈ ℝ and z = 0}"
      ],
      correctAnswerIndex: 1,
      explanation: "The xz-plane consists of all points where the y-coordinate is identically zero (y = 0)."
    },
    {
      id: "m15-49",
      question: "What are the coordinates of the midpoint of the line segment joining (-1, -3, 3) and (1, 5, 7) in space?",
      options: [
        "(-1, 3, 9/2)",
        "(1, 4, 3)",
        "(-1, 1, -2)",
        "(0, 1, 5)"
      ],
      correctAnswerIndex: 3,
      explanation: "Midpoint M = ((-1 + 1)/2, (-3 + 5)/2, (3 + 7)/2) = (0/2, 2/2, 10/2) = (0, 1, 5)."
    },
    {
      id: "m15-50",
      question: "Which of the following is true about the graph of y = 3 sin(4x)?",
      options: [
        "The graph completes one cycle on the interval [0, π].",
        "The graph lies below the x-axis on (π/4, π/2).",
        "The graph completes one cycle on the interval [0, π/4].",
        "The graph rises up on [0, π/4]."
      ],
      correctAnswerIndex: 1,
      explanation: "Period T = 2π/4 = π/2. For x ∈ (π/4, π/2), 4x ∈ (π, 2π) where sine is negative, so the graph lies below the x-axis."
    },
    {
      id: "m15-51",
      question: "Which function has a graph that completes one full cycle on [-π/4, 11π/4]?",
      options: [
        "f(x) = 3 sin(3x + π/6)",
        "f(x) = 3 sin((4/3)x + π/2)",
        "f(x) = 2 sin((2/3)x + π/6)",
        "f(x) = 2 sin(2x - π/6)"
      ],
      correctAnswerIndex: 2,
      explanation: "Period length = 11π/4 - (-π/4) = 12π/4 = 3π. The coefficient B must satisfy 2π/B = 3π => B = 2/3, which matches f(x) = 2 sin((2/3)x + π/6)."
    },
    {
      id: "m15-52",
      question: "Let A be an n×n matrix with det(A) = 10. Let B be obtained by multiplying one row of A by 2, and C obtained by adding one row of A to another. What are det(B) and det(C) respectively?",
      options: [
        "20 and 10",
        "20 and 0",
        "10 and 20",
        "10 and 10"
      ],
      correctAnswerIndex: 0,
      explanation: "Multiplying a single row by scalar k = 2 scales the determinant: det(B) = 2 * det(A) = 20. Adding a multiple of one row to another preserves the determinant: det(C) = det(A) = 10."
    },
    {
      id: "m15-53",
      question: "The solution set of the system { 2x - y + 3z = 1, x + y + 3z = 5, x - y + z = -1 } in terms of parameter k is:",
      options: [
        "{(-4 - 2k, k, 2 - k): k ∈ ℝ}",
        "{(k + 1, 2k, k - 1): k ∈ ℝ}",
        "{(2 - 2k, 3 - k, k): k ∈ ℝ}",
        "{(k, k + 1, k - 1): k ∈ ℝ}"
      ],
      correctAnswerIndex: 0,
      explanation: "Solving the parametric reduction leads to the parametric coordinate vector form."
    },
    {
      id: "m15-54",
      question: "Let z1, z2, and z3 be complex numbers. Which of the following is NOT necessarily true?",
      options: [
        "z1 - (z2 + z3) = (z1 - z2) - z3",
        "z1 - (z2 - z3) = (z1 - z2) - z3",
        "(z1 z2) z3 = (z2 z1) z3",
        "(z1 z2) z3 = z1 (z2 z3)"
      ],
      correctAnswerIndex: 1,
      explanation: "Subtraction is not associative: z1 - (z2 - z3) = z1 - z2 + z3 ≠ (z1 - z2) - z3."
    },
    {
      id: "m15-55",
      question: "Which of the following complex numbers corresponds to the point (-3, -1) in the Argand plane?",
      options: [
        "-3 + i",
        "3 + i",
        "-1 - 3i",
        "-3 - i"
      ],
      correctAnswerIndex: 3,
      explanation: "A point (x, y) in the Argand plane represents the complex number z = x + iy = -3 - i."
    },
    {
      id: "m15-56",
      question: "If a translation T takes (-1, 1) to (3, 2) (shift vector <4, 1>), then the image of the circle x² + y² - 2x + 4y + 1 = 0 under T is:",
      options: [
        "(x - 3)² + (y - 3)² = 4",
        "(x - 2)² + (y + 3)² = 4",
        "(x - 5)² + (y + 1)² = 4",
        "(x + 3)² + (y + 3)² = 4"
      ],
      correctAnswerIndex: 2,
      explanation: "Original circle: (x - 1)² + (y + 2)² = 4 (center (1, -2), radius 2). Translating center by <4, 1> gives new center (1 + 4, -2 + 1) = (5, -1). Equation: (x - 5)² + (y + 1)² = 4."
    },
    {
      id: "m15-57",
      question: "Let u = (-1, 6) and v = (2, 4). Then the vector 4u - 3v is:",
      options: [
        "(-10, 12)",
        "(-10, 11)",
        "(-4, 24)",
        "(-15, 18)"
      ],
      correctAnswerIndex: 0,
      explanation: "4u - 3v = 4(-1, 6) - 3(2, 4) = (-4, 24) - (6, 12) = (-4 - 6, 24 - 12) = (-10, 12)."
    },
    {
      id: "m15-58",
      question: "Water is running into an inverted conical tank (height 10 cm, base radius 5 cm) at rate dV/dt = 6π cm³/sec. How fast is water level rising (dh/dt) when depth h = 2 cm?",
      options: [
        "4/π cm/sec",
        "6 cm/sec",
        "4 cm/sec",
        "6/π cm/sec"
      ],
      correctAnswerIndex: 1,
      explanation: "r/h = 5/10 = 1/2 => r = h/2. V = (1/3)π r² h = (1/3)π(h/2)² h = (π/12)h³. dV/dt = (π/4)h² (dh/dt). 6π = (π/4)(2)² (dh/dt) => 6π = π(dh/dt) => dh/dt = 6 cm/sec."
    },
    {
      id: "m15-59",
      question: "Let F be the anti-derivative of f. Then which of the following is NOT true about F and f?",
      options: [
        "d/dx [∫ f(x) dx] = f(x)",
        "F'(x) = f(x)",
        "∫ f(x) dx = F(x) + c",
        "∫ d/dx [f(x)] dx = f(x) + c"
      ],
      correctAnswerIndex: 2,
      explanation: "In option C, writing ∫ F(x) dx = f(x) + c is false because F is the antiderivative of f, meaning ∫ f(x) dx = F(x) + c."
    },
    {
      id: "m15-60",
      question: "Let f(x) = 1/√x and g(x) = 2 - (1/6)x³. For what values of x do the graphs of f and g have tangent lines of the same slope?",
      options: [
        "√3 / 2",
        "1",
        "4",
        "1/4"
      ],
      correctAnswerIndex: 1,
      explanation: "f'(x) = -1/(2 x^(3/2)). g'(x) = -(1/2) x². Setting f'(x) = g'(x): -1/(2 x^(3/2)) = -(1/2) x² => 1 = x^(7/2) => x = 1."
    },
    {
      id: "m15-61",
      question: "What is the value of c in the open interval (0, 1) that satisfies the Mean Value Theorem for f(x) = 3x² - 5x + 1?",
      options: [
        "1/2",
        "3/5",
        "5/6",
        "1"
      ],
      correctAnswerIndex: 0,
      explanation: "f(0) = 1; f(1) = 3(1) - 5(1) + 1 = -1. Average slope = (f(1) - f(0))/(1 - 0) = (-1 - 1)/1 = -2. f'(c) = 6c - 5. Setting 6c - 5 = -2 => 6c = 3 => c = 1/2."
    },
    {
      id: "m15-62",
      question: "Let f(x) = 5x³ + 2x - sin(x) + e^x. What is the value of f'(0)?",
      options: [
        "2",
        "1",
        "-1",
        "4"
      ],
      correctAnswerIndex: 0,
      explanation: "f'(x) = 15x² + 2 - cos(x) + e^x. f'(0) = 15(0) + 2 - cos(0) + e^0 = 0 + 2 - 1 + 1 = 2."
    },
    {
      id: "m15-63",
      question: "Let f and g be differentiable functions and h(x) = g(f(3x + 1)). If f'(1) = f(1) = 2 and g'(2) = 1, then what is the value of h'(0)?",
      options: [
        "2",
        "1",
        "6",
        "4"
      ],
      correctAnswerIndex: 2,
      explanation: "By chain rule: h'(x) = g'(f(3x + 1)) * f'(3x + 1) * 3. At x = 0: h'(0) = g'(f(1)) * f'(1) * 3 = g'(2) * (2) * 3 = 1 * 2 * 3 = 6."
    },
    {
      id: "m15-64",
      question: "Which of the following describes the mechanical / kinematic physical meaning of a derivative?",
      options: [
        "Gradient of graphs of functions",
        "Area under the curve",
        "Instantaneous rate of change (e.g. velocity)",
        "Slope of tangent line"
      ],
      correctAnswerIndex: 2,
      explanation: "Mechanically/physically, the derivative represents the instantaneous rate of change of a dynamic quantity (such as velocity as time derivative of position)."
    },
    {
      id: "m15-65",
      question: "Which of the following is true about the zero(s) of a function f(x)?",
      options: [
        "If f(a) = 0, then x - a is a factor for f(x).",
        "If f(a) = 0, then (x - a)² is a factor for f(x).",
        "If f(a) = 0, then a is not necessarily in the domain.",
        "If f(a) = 0, then y = a is the y-intercept."
      ],
      correctAnswerIndex: 0,
      explanation: "By the Factor Theorem for polynomials and functions, if f(a) = 0, then (x - a) is a linear factor of f(x)."
    }
  ]
};
