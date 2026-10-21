import { type Question } from '../services/geminiService';

export const math2016Exam = {
  id: "euee-2016-math",
  title: "2016 E.C. ESSLCE Mathematics Examination",
  subject: "Math",
  grade: "Grade 12",
  timeLimit: 10800, // 180 minutes (3:00 hours)
  questions: [
    {
      id: "math16-1",
      question: "Let f(x) = (x + 1)/(x - 1) and g(x) = √(x + 2) be two functions. Which one of the following is true about the combination values of f and g at x = 2?",
      options: [
        "(f · g)(2) = 6",
        "(f / g)(2) = 2/3",
        "(f + g)(2) = 3",
        "(f - g)(2) = -1"
      ],
      correctAnswerIndex: 0,
      explanation: "f(2) = (2 + 1)/(2 - 1) = 3/1 = 3. g(2) = √(2 + 2) = √4 = 2. Therefore, (f · g)(2) = f(2) · g(2) = 3 · 2 = 6."
    },
    {
      id: "math16-2",
      question: "Which one of the following defines an exponential function?",
      options: [
        "f: R -> (0, ∞) defined by f(x) = b^x, where b > 0 and b ≠ 1.",
        "f: R -> (0, ∞) defined by f(x) = x^b, where b > 0 and b ≠ 1.",
        "f: (0, ∞) -> R defined by f(x) = b^x, where b > 0 and b ≠ 1.",
        "f: (0, ∞) -> R defined by f(x) = x^b, where b > 0 and b ≠ 1."
      ],
      correctAnswerIndex: 0,
      explanation: "An exponential function is a function f: R -> (0, ∞) of the form f(x) = b^x where the base b is a positive real constant with b ≠ 1."
    },
    {
      id: "math16-3",
      question: "Let f be differentiable function at a number 'a' for a ∈ Domain f. In the expression (f(a + h) - f(a)) / h for h ≠ 0, as h gets closer and closer to zero from both directions, the expression becomes closer to f'(a) which is equal to:",
      options: [
        "The gradient of the normal line to the graph of f at a point (a, f(a)).",
        "The gradient of the vertical line to the graph of f at a point (a, f(a)).",
        "The gradient of the secant line to the graph of f at a point (a, f(a)).",
        "The gradient of the tangent line to the graph of f at a point (a, f(a))."
      ],
      correctAnswerIndex: 3,
      explanation: "The derivative f'(a) represents the instantaneous rate of change and the geometrical gradient (slope) of the tangent line to y = f(x) at x = a."
    },
    {
      id: "math16-4",
      question: "In a circle with center O, secants AB and AC intersect the circle at D and E respectively. If m(∠ACD) = 30° and m(∠BEC) = 50°, what is m(∠BAC)?",
      options: [
        "70°",
        "80°",
        "20°",
        "30°"
      ],
      correctAnswerIndex: 2,
      explanation: "In triangle AEC, ∠BEC is an exterior angle at vertex E. Thus m(∠BEC) = m(∠BAC) + m(∠ACE) => 50° = m(∠BAC) + 30° => m(∠BAC) = 50° - 30° = 20°."
    },
    {
      id: "math16-5",
      question: "Let p and q be propositions. Which one of the following propositions is a tautology?",
      options: [
        "(p => ¬q) <=> (p ∧ q)",
        "(¬p => q) => (p ∧ q)",
        "(p ∧ q) => (p ∨ q)",
        "(p ∨ q) => (p ∧ q)"
      ],
      correctAnswerIndex: 2,
      explanation: "If both p and q are true (p ∧ q = True), then at least one is true (p ∨ q = True). Since True => True is always true, and whenever p ∧ q is False the implication False => anything is trivially True, (p ∧ q) => (p ∨ q) is a tautology."
    },
    {
      id: "math16-6",
      question: "If 180 individuals can complete a job in 15 days by working 10 hours a day, how many individuals are needed to complete the job in 10 days if they work 12 hours a day?",
      options: [
        "200",
        "144",
        "225",
        "220"
      ],
      correctAnswerIndex: 2,
      explanation: "Total work = 180 * 15 * 10 = 27,000 man-hours. Number of workers needed N = 27,000 / (10 * 12) = 27,000 / 120 = 225 individuals."
    },
    {
      id: "math16-7",
      question: "If the measure of each interior angle of a regular polygon is 135°, then which one of the following is the number of lines of symmetry of the polygon?",
      options: [
        "7",
        "6",
        "9",
        "8"
      ],
      correctAnswerIndex: 3,
      explanation: "Exterior angle = 180° - 135° = 45°. Number of sides n = 360° / 45° = 8 (regular octagon). Any regular n-gon has exactly n lines of symmetry, so 8."
    },
    {
      id: "math16-8",
      question: "An exponential function graph passes through (0, -1), (1, 0), and (2, 2) with horizontal asymptote y = -2. Which function represents this graph?",
      options: [
        "f(x) = (2)^{x - 2}",
        "f(x) = (1/2)^{x - 2}",
        "f(x) = (2)^x - 2",
        "f(x) = (1/2)^x - 2"
      ],
      correctAnswerIndex: 2,
      explanation: "Testing f(x) = 2^x - 2: f(0) = 2^0 - 2 = 1 - 2 = -1; f(1) = 2^1 - 2 = 0; f(2) = 2^2 - 2 = 2. As x -> -∞, f(x) -> -2."
    },
    {
      id: "math16-9",
      question: "What is the perimeter of a regular hexagon of radius 6 cm?",
      options: [
        "18√3 cm",
        "18 cm",
        "36 cm",
        "36√3 cm"
      ],
      correctAnswerIndex: 2,
      explanation: "For a regular hexagon, the side length equals the circumradius: s = r = 6 cm. Perimeter P = 6 * s = 6 * 6 = 36 cm."
    },
    {
      id: "math16-10",
      question: "Which one of the following is a quantitative data?",
      options: [
        "Measuring the heights of each students in the given class.",
        "Determining the tastes of foods in a restaurant.",
        "Identifying the social status of individuals.",
        "Checking the quality of a new product."
      ],
      correctAnswerIndex: 0,
      explanation: "Height is a numerical, continuous measurement expressing an amount or quantity (quantitative data), whereas taste, social status, and quality ratings are qualitative/categorical."
    },
    {
      id: "math16-11",
      question: "Which one of the following is true about the integral of a function f(x) with respect to a variable x?",
      options: [
        "∫ f'(x)dx is the set of all anti-derivatives of f'.",
        "∫ f'(x)dx is the set of all derivatives of f.",
        "∫ f(x)dx is the set of all anti-derivatives of f.",
        "∫ f(x)dx is the set of all derivatives of f."
      ],
      correctAnswerIndex: 2,
      explanation: "The indefinite integral ∫ f(x) dx represents the family/set of all anti-derivatives F(x) + C whose derivative equals f(x)."
    },
    {
      id: "math16-12",
      question: "Which one of the following is NOT a valid reason for saving?",
      options: [
        "For betting in football",
        "For vacation",
        "To maximize interest",
        "For the time of retirement"
      ],
      correctAnswerIndex: 0,
      explanation: "Gambling/sports betting is a high-risk speculative expenditure and is not a prudent or valid reason for financial saving."
    },
    {
      id: "math16-13",
      question: "A relation R is defined by the region bounded between lines x - y + 1 = 0 and x + y = 0 for x ≤ -1/2. What are the domain and range of R?",
      options: [
        "(-∞, -1/2] and R",
        "R and (-∞, -1/2]",
        "[-1/2, ∞) and R",
        "(-∞, -1/2) and R"
      ],
      correctAnswerIndex: 0,
      explanation: "The two boundary lines intersect where y = x + 1 and y = -x => x + 1 = -x => 2x = -1 => x = -1/2. The shaded region extends indefinitely to the left and across all vertical y values: Domain is (-∞, -1/2] and Range is R."
    },
    {
      id: "math16-14",
      question: "Which one of the following statements is the polynomial division theorem?",
      options: [
        "Let f is a non-constant polynomial with integer coefficients. If rational number c/d is root, c is factor of constant term and d is factor of leading coefficient.",
        "If f(x) and d(x) are polynomials such that d(x) ≠ 0 and degree(d(x)) ≤ degree(f(x)), then there exist unique polynomials q(x) and r(x) such that f(x) = d(x)q(x) + r(x), where r(x) = 0 or degree of r(x) < degree of d(x).",
        "If f is a non-constant polynomial and c is a real number, then the remainder when f(x) divided by x - c is f(c).",
        "If f is a non-constant polynomial and c is a real number, then x - c is a factor of f(x) if and only if f(c) = 0."
      ],
      correctAnswerIndex: 1,
      explanation: "The Polynomial Division Algorithm states that for f(x) and non-zero d(x), there exist unique quotient q(x) and remainder r(x) satisfying f(x) = d(x)q(x) + r(x) where r(x) = 0 or deg(r) < deg(d)."
    },
    {
      id: "math16-15",
      question: "Which one of the following is equal to cot(1755°)?",
      options: [
        "√3",
        "-√3",
        "1",
        "-1"
      ],
      correctAnswerIndex: 3,
      explanation: "1755° = 4 * 360° + 315° = 315°. cot(315°) = cot(360° - 45°) = -cot(45°) = -1."
    },
    {
      id: "math16-16",
      question: "Let p and q be propositions with truth values True and False respectively. Which one of the following statements is NOT correct?",
      options: [
        "p => q is false.",
        "p <=> q is true.",
        "p ∧ q is false.",
        "p ∨ q is true."
      ],
      correctAnswerIndex: 1,
      explanation: "A biconditional (p <=> q) is true only when both propositions share the same truth value. Since p is True and q is False, p <=> q is False; thus asserting it is True is incorrect."
    },
    {
      id: "math16-17",
      question: "Which one of the following is equal to the sum ∑_{n=1}^5 2n^2?",
      options: [
        "2 + 8 + 16 + 32 + 64",
        "2 + 4 + 8 + 16 + 32",
        "2 + 4 + 6 + 8 + 10",
        "2 + 8 + 18 + 32 + 50"
      ],
      correctAnswerIndex: 3,
      explanation: "For n=1: 2(1)^2 = 2; n=2: 2(4) = 8; n=3: 2(9) = 18; n=4: 2(16) = 32; n=5: 2(25) = 50. Sum is 2 + 8 + 18 + 32 + 50 = 110."
    },
    {
      id: "math16-18",
      question: "A company produces black and white shirts. Available: 6000 units polyester, 3000 units cotton. Black shirt requires 5 polyester and 4 cotton; white shirt requires 3 polyester and 3 cotton. Profit: 120 Birr per black shirt, 200 Birr per white shirt. What is the maximum profit?",
      options: [
        "Birr 144,000",
        "Birr 120,000",
        "Birr 344,000",
        "Birr 200,000"
      ],
      correctAnswerIndex: 3,
      explanation: "Corner points of feasible region: (0,0) -> 0; (750, 0) -> 120*750 = 90,000; intersection (0, 1000) for white shirts (since 3*1000=3000 cotton, 3*1000=3000 ≤ 6000 polyester) -> Profit = 200 * 1000 = Birr 200,000."
    },
    {
      id: "math16-19",
      question: "Let S, R and T be any three sets. Which one of the following is NOT true about the union of the sets?",
      options: [
        "(S ∪ R) ∪ T = T ∪ (R ∪ S)",
        "S ∪ S = S",
        "S ∪ R = R ∪ S",
        "S ∪ T = T"
      ],
      correctAnswerIndex: 3,
      explanation: "S ∪ T = T is only true if S is a subset of T (S ⊆ T). It is not true in general for arbitrary sets S and T."
    },
    {
      id: "math16-20",
      question: "Which one of the following is equal to the polynomial function f(x) = x^2 + 4x + 4?",
      options: [
        "k(x) = (x - 2)(x + 2)",
        "l(x) = (x^2 + 10x + 3) + (-6x + 1)",
        "g(x) = (x^4 + 4x^2 + 4) / (x^2 + 2)",
        "h(x) = (x^2 + 6x + 8) - (2x - 4)"
      ],
      correctAnswerIndex: 1,
      explanation: "Expanding option B: l(x) = x^2 + 10x + 3 - 6x + 1 = x^2 + (10x - 6x) + (3 + 1) = x^2 + 4x + 4 = f(x)."
    },
    {
      id: "math16-21",
      question: "Which one of the following is true about the function f(x) = tan x?",
      options: [
        "f is a periodic function with period π/2.",
        "The graph of f intersects y-axis at (π/2, 0).",
        "The domain of f is R \\ (-π/2, π/2).",
        "The range of f is the set of real numbers, R."
      ],
      correctAnswerIndex: 3,
      explanation: "The tangent function maps all allowed angles onto the entire real line: Range(tan x) = (-∞, ∞) = R. Its fundamental period is π."
    },
    {
      id: "math16-22",
      question: "Which one of the following is an equation of the parabola with vertex V(0, 0) and focus F(2, 0)?",
      options: [
        "x^2 = 8y",
        "x^2 = (1/8)y",
        "y^2 = 8x",
        "y^2 = (1/8)x"
      ],
      correctAnswerIndex: 2,
      explanation: "A parabola with vertex (0,0) and focus on positive x-axis (p, 0) where p = 2 has standard equation y^2 = 4px => y^2 = 4(2)x = 8x."
    },
    {
      id: "math16-23",
      question: "Which one of the following is equal to the sum ∑_{k=1}^7 729(3^{1 - k})?",
      options: [
        "1088",
        "1079",
        "1093",
        "1092"
      ],
      correctAnswerIndex: 2,
      explanation: "First term a1 = 729(3^0) = 729. Common ratio r = 1/3. Sum S7 = a1(1 - r^7)/(1 - r) = 729(1 - 1/2187)/(2/3) = (729 - 1/3) * (3/2) = (2186/3) * (3/2) = 1093."
    },
    {
      id: "math16-24",
      question: "What is the maximum value of z = 2x + 3y subjected to the constraints: x + y ≤ 6, 2x - y ≤ 6, x ≥ 0, y ≥ 0?",
      options: [
        "18",
        "22",
        "12",
        "14"
      ],
      correctAnswerIndex: 0,
      explanation: "Corner points: (0, 0) -> z = 0; (3, 0) -> z = 6; (4, 2) -> z = 2(4) + 3(2) = 14; (0, 6) -> z = 2(0) + 3(6) = 18. The maximum value is 18."
    },
    {
      id: "math16-25",
      question: "Which one of the following numbers is a common multiple of 324 and 1152?",
      options: [
        "13824",
        "20736",
        "5184",
        "7776"
      ],
      correctAnswerIndex: 1,
      explanation: "Prime factorizations: 324 = 2^2 * 3^4 = 4 * 81. 1152 = 2^7 * 3^2 = 128 * 9. LCM = 2^7 * 3^4 = 128 * 81 = 10368. Common multiples are k * 10368. For k = 2: 2 * 10368 = 20736."
    },
    {
      id: "math16-26",
      question: "Consider a circle with center O and chords AB, AC, and BC. If m(∠ABC) = 60° and m(∠ACB) = 40°, what is m(∠BOC)?",
      options: [
        "120°",
        "160°",
        "100°",
        "80°"
      ],
      correctAnswerIndex: 1,
      explanation: "In triangle ABC, inscribed angle m(∠BAC) = 180° - (60° + 40°) = 80°. The central angle subtending the same arc BC is twice the inscribed angle: m(∠BOC) = 2 * m(∠BAC) = 2 * 80° = 160°."
    },
    {
      id: "math16-27",
      question: "Which one of the following is the solution of the equation (243)^{2x - 3} = (81)^{-3x + 2} / 3 in the set of real numbers?",
      options: [
        "2",
        "-2",
        "-1",
        "1"
      ],
      correctAnswerIndex: 3,
      explanation: "Expressing in base 3: (3^5)^{2x - 3} = (3^4)^{-3x + 2} / 3^1 => 3^{10x - 15} = 3^{-12x + 8 - 1} = 3^{-12x + 7}. Equating exponents: 10x - 15 = -12x + 7 => 22x = 22 => x = 1."
    },
    {
      id: "math16-28",
      question: "What is the total surface area of a regular square pyramid with slant height 8 cm and base area 25 cm^2?",
      options: [
        "80 cm^2",
        "65 cm^2",
        "105 cm^2",
        "90 cm^2"
      ],
      correctAnswerIndex: 2,
      explanation: "Base side length s = √25 = 5 cm. Lateral area = 4 * (1/2 * s * l) = 4 * (1/2 * 5 * 8) = 80 cm^2. Total Surface Area = Base Area + Lateral Area = 25 + 80 = 105 cm^2."
    },
    {
      id: "math16-29",
      question: "Scores table: 31-40 (10), 41-50 (9), 51-60 (15), 61-70 (12), 71-80 (10), 81-90 (4), 91-100 (2). What is the median of the data?",
      options: [
        "58.5",
        "60.5",
        "50.5",
        "55.5"
      ],
      correctAnswerIndex: 0,
      explanation: "Total n = 62. Position = 31. Cumulative frequencies: 10, 19, 34 (median class is 51-60). Lower boundary L = 50.5, previous CF = 19, f = 15, class width w = 10. Median = 50.5 + ((31 - 19) / 15) * 10 = 50.5 + 8 = 58.5."
    },
    {
      id: "math16-30",
      question: "What is the area of the region bounded by the graph of f(x) = x^3 and the x-axis on the interval [-4, 2]?",
      options: [
        "120 Square units",
        "136 Square units",
        "60 Square units",
        "68 Square units"
      ],
      correctAnswerIndex: 3,
      explanation: "Total Area = ∫_{-4}^0 (-x^3) dx + ∫_0^2 (x^3) dx = [-x^4 / 4]_{-4}^0 + [x^4 / 4]_0^2 = (0 - (-256/4)) + (16/4 - 0) = 64 + 4 = 68 square units."
    },
    {
      id: "math16-31",
      question: "If a = 2 - 3√5 and b = 3 + 3√5, which one of the following is true?",
      options: [
        "ab = 36",
        "11a + b = -36 + 13√5",
        "a + b = 5",
        "a - b = -1 - √5"
      ],
      correctAnswerIndex: 2,
      explanation: "a + b = (2 - 3√5) + (3 + 3√5) = 2 + 3 + (-3√5 + 3√5) = 5."
    },
    {
      id: "math16-32",
      question: "A sector of a circle of diameter 8 cm (radius = 4 cm) is formed by a central angle of 45°. What is the area of the sector?",
      options: [
        "8π cm^2",
        "2π cm^2",
        "π cm^2",
        "(2π + 8) cm^2"
      ],
      correctAnswerIndex: 1,
      explanation: "Area of sector = (θ / 360°) * π r^2 = (45° / 360°) * π * 4^2 = (1/8) * 16π = 2π cm^2."
    },
    {
      id: "math16-33",
      question: "Which one of the following intervals is the solution set of the inequality |3 - (1/2)x| < 5?",
      options: [
        "(-16, 4)",
        "(-4, 16)",
        "(-8, 2)",
        "(-2, 8)"
      ],
      correctAnswerIndex: 1,
      explanation: "-5 < 3 - (1/2)x < 5 => -8 < -(1/2)x < 2 => multiply by -2 (reversing inequalities): 16 > x > -4 => -4 < x < 16, i.e., (-4, 16)."
    },
    {
      id: "math16-34",
      question: "The altitude of a frustum of a regular square pyramid is 9 cm. If side length of upper base is 6 cm and lower base is 10 cm, what is the volume?",
      options: [
        "108 cm^3",
        "324 cm^3",
        "588 cm^3",
        "196 cm^3"
      ],
      correctAnswerIndex: 2,
      explanation: "Upper base area A1 = 6^2 = 36 cm^2. Lower base area A2 = 10^2 = 100 cm^2. Volume V = (h/3) * (A1 + A2 + √(A1 * A2)) = (9/3) * (36 + 100 + 60) = 3 * 196 = 588 cm^3."
    },
    {
      id: "math16-35",
      question: "Which one of the following numbers is the coefficient of x^6 y^4 in the expansion of (x + y)^10?",
      options: [
        "4860",
        "1260",
        "210",
        "240"
      ],
      correctAnswerIndex: 2,
      explanation: "By the Binomial Theorem, the coefficient of x^6 y^4 is C(10, 4) = 10! / (4! 6!) = (10 * 9 * 8 * 7) / (4 * 3 * 2 * 1) = 210."
    },
    {
      id: "math16-36",
      question: "Which one of the following is true about the Range and Interquartile Range of a given data?",
      options: [
        "Both are considering only the middle 50% of the data.",
        "Both are measures of variation of the data.",
        "Both are affected by extreme values in the data.",
        "Both are measures of the variability of each item in the data."
      ],
      correctAnswerIndex: 1,
      explanation: "Both Range (Max - Min) and Interquartile Range (Q3 - Q1) are statistical measures of dispersion/variation describing data spread."
    },
    {
      id: "math16-37",
      question: "Which one of the following is equal to the expression ((125)^{2/3} · (81)^{-3/4}) / ((27)^{-2/3} · (625)^{3/4})?",
      options: [
        "1/15",
        "15",
        "3/5",
        "5/3"
      ],
      correctAnswerIndex: 0,
      explanation: "125^{2/3} = (5^3)^{2/3} = 25. 81^{-3/4} = (3^4)^{-3/4} = 1/27. 27^{-2/3} = (3^3)^{-2/3} = 1/9. 625^{3/4} = (5^4)^{3/4} = 125. Numerator = 25 * (1/27) = 25/27. Denominator = (1/9) * 125 = 125/9. Value = (25/27) / (125/9) = (25/27) * (9/125) = 1 / 15."
    },
    {
      id: "math16-38",
      question: "If the length of the sides of a triangle are 8 cm, 6 cm and 4 cm, what is the area of the triangle?",
      options: [
        "3√15 cm^2",
        "1.5√15 cm^2",
        "24 cm^2",
        "12 cm^2"
      ],
      correctAnswerIndex: 0,
      explanation: "Semi-perimeter s = (8 + 6 + 4)/2 = 9 cm. By Heron's formula: Area = √(9 * (9-8) * (9-6) * (9-4)) = √(9 * 1 * 3 * 5) = 3√15 cm^2."
    },
    {
      id: "math16-39",
      question: "A quadratic parabola opens downward with x-intercepts at -4 and 0. What is the solution set of f(x) ≤ 0?",
      options: [
        "{x : x ≤ 0 and x ≥ -4}",
        "{x : x ≤ -4 or x ≥ 0}",
        "{x : x ≤ 2 or x ≥ 6}",
        "{x : x ≥ 2 and x ≤ 6}"
      ],
      correctAnswerIndex: 1,
      explanation: "For a downward-opening parabola with roots at -4 and 0, the curve lies below or on the x-axis outside the roots: {x : x ≤ -4 or x ≥ 0}."
    },
    {
      id: "math16-40",
      question: "Which one of the following is an onto (surjective) function from R onto R?",
      options: [
        "f(x) = 2x - 3x^2",
        "f(x) = 5x^3 + 1",
        "f(x) = |x - 1|",
        "f(x) = √(x^2 + 1)"
      ],
      correctAnswerIndex: 1,
      explanation: "The cubic polynomial f(x) = 5x^3 + 1 is continuous, strictly increasing, and has range (-∞, ∞) = R, covering all real values (surjective/onto)."
    },
    {
      id: "math16-41",
      question: "Let M = [[9, 24, 6], [-12, 18, 15], [0, 27, 3]]. Which matrix equals (2/3)M?",
      options: [
        "[[6, 16, 2], [-8, 12, 10], [0, 18, 2]]",
        "[[6, 16, 4], [-8, 12, 10], [0, 18, 2]]",
        "[[3, 8, 2], [-4, 6, 5], [0, 9, 1]]",
        "[[6, 8, 4], [-8, 6, 10], [0, 9, 2]]"
      ],
      correctAnswerIndex: 1,
      explanation: "Multiplying each entry by 2/3: (2/3)*9=6, (2/3)*24=16, (2/3)*6=4; (2/3)*(-12)=-8, (2/3)*18=12, (2/3)*15=10; (2/3)*0=0, (2/3)*27=18, (2/3)*3=2."
    },
    {
      id: "math16-42",
      question: "Given data set: 10, 8, 10, 2, 12, 6, 12, 18, 3, 7, 10, 8, 8. What is the coefficient of range?",
      options: [
        "5/4",
        "20",
        "16",
        "4/5"
      ],
      correctAnswerIndex: 3,
      explanation: "Maximum value L = 18, Minimum value S = 2. Coefficient of range = (L - S) / (L + S) = (18 - 2) / (18 + 2) = 16 / 20 = 4/5."
    },
    {
      id: "math16-43",
      question: "Let r1 and r2 be roots of ax^2 + bx + c = 0 such that r1 + r2 = -2.5 and r1·r2 = 1.5. Which can be the values of a, b, and c?",
      options: [
        "1, 6 and 5",
        "2, 3 and 5",
        "1, 5, and 6",
        "2, 5 and 3"
      ],
      correctAnswerIndex: 3,
      explanation: "Sum of roots -b/a = -2.5 = -5/2 => b/a = 5/2. Product of roots c/a = 1.5 = 3/2. For a = 2: b = 5, c = 3."
    },
    {
      id: "math16-44",
      question: "Scores of 10 students: 6, 10, 8, 5, 9, 8, 5, 10, 10, 9. What is the standard deviation?",
      options: [
        "3.6",
        "√3.6",
        "5.8",
        "√5.8"
      ],
      correctAnswerIndex: 1,
      explanation: "Mean = 80/10 = 8. Deviations squared: 4, 4, 0, 9, 1, 0, 9, 4, 4, 1. Sum = 36. Variance = 36/10 = 3.6. Standard deviation = √3.6."
    },
    {
      id: "math16-45",
      question: "Which of the following pairs of lines with given equations are parallel?",
      options: [
        "l1: x - y + 3 = 0 and l2: -x + y - 9 = 0",
        "l1: 4x - y = 2 and l2: -x + 4y - 3 = 0",
        "l1: 2x + 3y = 5 and l2: 3x + 2y = 4",
        "l1: x - 2y + 1 = 0 and l2: x + 2y - 1 = 0"
      ],
      correctAnswerIndex: 0,
      explanation: "For l1: y = x + 3 (slope m1 = 1). For l2: y = x + 9 (slope m2 = 1). Since m1 = m2, the two lines are parallel."
    },
    {
      id: "math16-46",
      question: "Which one of the following is the range of the rational function f(x) = (2x - 1)/(x + 3)?",
      options: [
        "R \\ {-3}",
        "R \\ {2}",
        "R \\ {-1/3}",
        "R \\ {1/2}"
      ],
      correctAnswerIndex: 1,
      explanation: "As x -> ±∞, the horizontal asymptote is y = 2/1 = 2. Since (2x - 1)/(x + 3) = 2 has no solution (-1 = 6 is false), the range is R \\ {2}."
    },
    {
      id: "math16-47",
      question: "Let z = -a + 2i and w = 5 - bi be two complex numbers. If z = w, what are the values of a and b respectively?",
      options: [
        "5 and -2",
        "-5 and 2",
        "5 and 2",
        "-5 and -2"
      ],
      correctAnswerIndex: 3,
      explanation: "Equating real parts: -a = 5 => a = -5. Equating imaginary parts: 2 = -b => b = -2."
    },
    {
      id: "math16-48",
      question: "Annual traffic accidents: 2019 (3500), 2020 (2750), 2021 (2850), 2022 (3500), 2023 (3750). What is the average number of accidents per year?",
      options: [
        "3250",
        "3270",
        "3200",
        "3210"
      ],
      correctAnswerIndex: 1,
      explanation: "Sum = 3500 + 2750 + 2850 + 3500 + 3750 = 16,350. Average = 16,350 / 5 = 3270."
    },
    {
      id: "math16-49",
      question: "Which one of the following is the solution set of the equation (√16)^{2x + 1} = (3√4096)^{3x - 5}?",
      options: [
        "{9/4}",
        "{9/2}",
        "{2/9}",
        "{11/4}"
      ],
      correctAnswerIndex: 3,
      explanation: "√16 = 4. 3√4096 = 16 = 4^2. Thus 4^{2x + 1} = (4^2)^{3x - 5} = 4^{6x - 10} => 2x + 1 = 6x - 10 => 4x = 11 => x = 11/4."
    },
    {
      id: "math16-50",
      question: "Which one of the following is a primary data?",
      options: [
        "The data obtained from a chart prepared by Ministry of Health regarding the spread of HIV/AIDS.",
        "The data obtained by reading a journal regarding the opinion of the society about holidays.",
        "The data obtained by measuring the weights of students in a certain school.",
        "The data obtained from a document prepared by the MOE regarding achievements in National Examination."
      ],
      correctAnswerIndex: 2,
      explanation: "Primary data is firsthand data collected directly by the researcher from original sources (such as directly measuring student weights)."
    },
    {
      id: "math16-51",
      question: "Which ordered pair gives the coordinates of the point that divides the line segment with endpoints A(1, 1) and B(-6, 8) internally in the ratio of 3:4?",
      options: [
        "(2, -4)",
        "(-2, -4)",
        "(2, 4)",
        "(-2, 4)"
      ],
      correctAnswerIndex: 3,
      explanation: "Section formula: x = (3(-6) + 4(1)) / (3 + 4) = (-18 + 4)/7 = -14/7 = -2. y = (3(8) + 4(1)) / (3 + 4) = (24 + 4)/7 = 28/7 = 4. Point is (-2, 4)."
    },
    {
      id: "math16-52",
      question: "Which pair of functions are inverses of each other in their respective domains?",
      options: [
        "f(x) = √(x + 3) and g(x) = x^2 - 9",
        "f(x) = x^5 and g(x) = 1/x^5",
        "f(x) = x^3 - 1 and g(x) = 3√(x + 1)",
        "f(x) = (x + 1)/(x - 1) and g(x) = (x - 1)/(x + 1)"
      ],
      correctAnswerIndex: 2,
      explanation: "For f(x) = x^3 - 1, let y = x^3 - 1 => x^3 = y + 1 => x = 3√(y + 1) = g(y)."
    },
    {
      id: "math16-53",
      question: "What is the determinant of the matrix M = [[1, 2, 3], [4, 5, 6], [7, 8, 10]]?",
      options: [
        "-3",
        "6",
        "-6",
        "3"
      ],
      correctAnswerIndex: 0,
      explanation: "det(M) = 1(50 - 48) - 2(40 - 42) + 3(32 - 35) = 1(2) - 2(-2) + 3(-3) = 2 + 4 - 9 = -3."
    },
    {
      id: "math16-54",
      question: "Which one of the following is a simple random sampling?",
      options: [
        "First the population is divided into homogenous groups and a sample is selected from each homogenous group.",
        "First divide a city into ten groups and choose secondary school principals from randomly selected 3 groups.",
        "Selecting five students from grade 12 students of the same school randomly.",
        "Selecting a group randomly from groups formed by dividing the population into groups."
      ],
      correctAnswerIndex: 2,
      explanation: "In simple random sampling, every individual student in the defined population has an equal and independent probability of selection."
    },
    {
      id: "math16-55",
      question: "Let A and B be two sets that contain 15 and 17 elements respectively. If A ∩ B contains 10 elements, what is the number of elements in A ∪ B?",
      options: [
        "22",
        "12",
        "42",
        "32"
      ],
      correctAnswerIndex: 0,
      explanation: "n(A ∪ B) = n(A) + n(B) - n(A ∩ B) = 15 + 17 - 10 = 22."
    },
    {
      id: "math16-56",
      question: "Which one of the following is the position vector of the vector with initial point A(1, -1) and terminal point B(2, -3)?",
      options: [
        "3i + 4j",
        "i - 4j",
        "3i - 4j",
        "i - 2j"
      ],
      correctAnswerIndex: 3,
      explanation: "Vector AB = (x2 - x1)i + (y2 - y1)j = (2 - 1)i + (-3 - (-1))j = i - 2j."
    },
    {
      id: "math16-57",
      question: "Let θ be an angle in standard position and P(-3, 4) be a point on its terminal side. Which one of the following is true?",
      options: [
        "cos θ = -3/5",
        "sin θ = -4/5",
        "sin θ = 3/5",
        "cos θ = 4/5"
      ],
      correctAnswerIndex: 0,
      explanation: "r = √((-3)^2 + 4^2) = 5. cos θ = x / r = -3 / 5, sin θ = y / r = 4 / 5."
    },
    {
      id: "math16-58",
      question: "Which one of the following conic section is defined by \"the set of points in a plane such that the sum of the distances from two given points is constant\"?",
      options: [
        "Ellipse",
        "Hyperbola",
        "Parabola",
        "Circle"
      ],
      correctAnswerIndex: 0,
      explanation: "An ellipse is the geometric locus of points in a plane for which the sum of distances to two fixed foci is constant (equal to 2a)."
    },
    {
      id: "math16-59",
      question: "If the fifth and the tenth terms of a geometric sequence are 640 and 20 respectively, what are the first term and the common ratio?",
      options: [
        "1024 and 2",
        "1024 and 1/2",
        "10240 and 2",
        "10240 and 1/2"
      ],
      correctAnswerIndex: 3,
      explanation: "a10 / a5 = r^5 = 20 / 640 = 1/32 => r = 1/2. First term a1 = a5 / r^4 = 640 / (1/2)^4 = 640 * 16 = 10,240."
    },
    {
      id: "math16-60",
      question: "Which system of linear inequalities represents the shaded region bounded by 2x + y = 4 and 3x - y = 6 containing origin (0, 0)?",
      options: [
        "{ 2x + y ≤ 4, 3x - y ≤ 6 }",
        "{ 2x + y ≥ 4, 3x - y ≤ 6 }",
        "{ 2x + y ≥ 4, 3x - y ≥ 6 }",
        "{ 2x + y ≤ 4, 3x - y ≥ 6 }"
      ],
      correctAnswerIndex: 0,
      explanation: "Testing (0, 0): 2(0) + 0 = 0 ≤ 4 (True) and 3(0) - 0 = 0 ≤ 6 (True). Thus the system is 2x + y ≤ 4 and 3x - y ≤ 6."
    }
  ]
};
