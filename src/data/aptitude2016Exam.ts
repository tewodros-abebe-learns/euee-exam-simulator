import { type Question } from '../services/geminiService';

export const aptitude2016Exam = {
  id: "euee-2016-aptitude",
  title: "2016 E.C. ESSLCE Scholastic Aptitude Test (SAT)",
  subject: "Aptitude",
  grade: "Grade 12",
  timeLimit: 7200, // 120 minutes (2:00 hours)
  questions: [
    {
      id: "apt16-1",
      question: "In the phrase, \"the planet's well-being\", what does \"the planet\" refer to?",
      options: [
        "The earth",
        "The sun",
        "The moon",
        "The nine planets"
      ],
      correctAnswerIndex: 0,
      explanation: "In environmental literature, 'the planet' specifically refers to Earth and its living biosphere."
    },
    {
      id: "apt16-2",
      question: "According to the passage on air pollution, how can an air pollution-free environment be created for the new generation?",
      options: [
        "By planting trees every year",
        "By restricting private use of car",
        "By devising rules and regulations",
        "Tackling the causes of air pollution from the source"
      ],
      correctAnswerIndex: 3,
      explanation: "The passage emphasizes addressing and mitigating the root causes of emissions directly at their source."
    },
    {
      id: "apt16-3",
      question: "As used in the passage, what is the meaning of the word \"imperative\"?",
      options: [
        "compulsory / essential",
        "tentative",
        "conditional",
        "optional"
      ],
      correctAnswerIndex: 0,
      explanation: "'Imperative' denotes an essential, urgent, or compulsory requirement that must be carried out."
    },
    {
      id: "apt16-4",
      question: "Which one of the following is NOT an air pollutant?",
      options: [
        "smog",
        "carpooling",
        "ground-level ozone",
        "particulate matter"
      ],
      correctAnswerIndex: 1,
      explanation: "Carpooling is an eco-friendly transportation practice that reduces vehicle emissions, not a harmful air pollutant."
    },
    {
      id: "apt16-5",
      question: "Choose the word that is most nearly OPPOSITE in meaning to DAUNTING:",
      options: [
        "Discouraging",
        "Intimidating",
        "Frightening",
        "Entertaining / Encouraging"
      ],
      correctAnswerIndex: 3,
      explanation: "Daunting means intimidating or discouraging; its antonym is encouraging or welcoming/entertaining."
    },
    {
      id: "apt16-6",
      question: "Choose the word that is most nearly OPPOSITE in meaning to IMMACULATE:",
      options: [
        "Filthy",
        "Lucid",
        "Spotless",
        "Tidy"
      ],
      correctAnswerIndex: 0,
      explanation: "Immaculate means perfectly clean, neat, or pure; its direct opposite is filthy or dirty."
    },
    {
      id: "apt16-7",
      question: "Choose the word that is most nearly OPPOSITE in meaning to RAVAGE:",
      options: [
        "Devastate",
        "Ruin",
        "Damage",
        "Renovate / Restore"
      ],
      correctAnswerIndex: 3,
      explanation: "To ravage means to severely damage, ruin, or devastate. The opposite action is to renovate, repair, or restore."
    },
    {
      id: "apt16-8",
      question: "What does to \"make informed decision\" mean in the context of population management?",
      options: [
        "based on facts and information",
        "made for the sake of satisfying oneself",
        "made for the sake of satisfying others",
        "based on mere personal opinion"
      ],
      correctAnswerIndex: 0,
      explanation: "An informed decision is a sound conclusion founded upon accurate evidence, facts, and objective education."
    },
    {
      id: "apt16-9",
      question: "What is the theme of the passage on population?",
      options: [
        "Population control and its disadvantages.",
        "The need to balance birth rate and death rate.",
        "Population growth always poses challenges.",
        "Decline in population size has problems."
      ],
      correctAnswerIndex: 1,
      explanation: "The passage explores balancing resource availability, growth rates, and sustainable development."
    },
    {
      id: "apt16-10",
      question: "Based on the information given in the passage, which one of the following statements is correct?",
      options: [
        "Having the requisite understanding about population is what matters most.",
        "Both the government and the community are responsible for controlling population.",
        "The role of the community is highly constrained.",
        "It is the sole responsibility of the government to control population growth."
      ],
      correctAnswerIndex: 1,
      explanation: "The passage notes that managing population requires collaborative strategies from governments and community-level education."
    },
    {
      id: "apt16-11",
      question: "What does the word \"far-reaching\" mean according to the context of the passage?",
      options: [
        "facilitating resource allocation",
        "impacting economic development widely",
        "affecting certain areas",
        "going to faraway places"
      ],
      correctAnswerIndex: 1,
      explanation: "'Far-reaching' signifies having extensive, wide-ranging influence and deep structural consequences."
    },
    {
      id: "apt16-12",
      question: "Statement: Thomas Edison failed so many times before he invented the light bulb. Instead of quitting, however, Edison tried again and again until he finally achieved success. Which conclusion is most valid?\nConclusion I: A problem can be a chance to do one's best.\nConclusion II: It is advisable to have perseverance in the face of challenges.\nConclusion III: One has to always indulge in a problem whatever the consequences.",
      options: [
        "Conclusions I and II",
        "Conclusions II and III",
        "Conclusion II",
        "Conclusion I"
      ],
      correctAnswerIndex: 0,
      explanation: "Edison's story illustrates both viewing challenges as opportunities to excel (I) and the imperative value of resilience and perseverance (II)."
    },
    {
      id: "apt16-13",
      question: "Statement: Most thriving jobs require higher learning, but many newly created jobs in flourishing sectors primarily require communication, interpersonal skills, and team work rather than just a degree. What can be concluded?",
      options: [
        "Career development in most jobs is impossible without producing a degree.",
        "A university degree is irrelevant for the newly created and flourishing jobs.",
        "The new jobs that are being created rather require knowledge of soft skills.",
        "Holding a university degree is crucial for career development."
      ],
      correctAnswerIndex: 2,
      explanation: "The passage explicitly notes that modern flourishing jobs place critical importance on soft skills (interpersonal relations, team work, communication)."
    },
    {
      id: "apt16-14",
      question: "Statement I: For quite some years now, several sub-cities in Addis Ababa get one or two days of water supply per week.\nStatement II: There has been significant imbalance between demand for and supply of water in the city.\nStatement III: There has been a booming water trading market in the city.\nWhich statement is true?",
      options: [
        "Each of the three is an independent cause for three different effects.",
        "Statement III is the cause and statements I and II are its effects.",
        "Statement II is the cause and statements I and III are its effects.",
        "Statement I is the cause and statements II and III are its effects."
      ],
      correctAnswerIndex: 2,
      explanation: "The fundamental cause is the acute imbalance between water supply and demand (II), which directly causes rationing schedules (I) and private water vending markets (III)."
    },
    {
      id: "apt16-15",
      question: "Statement: XYZ company workers with cars complain about lack of parking space in the compound or street. The company administration couldn't give solutions.\nWhich conclusion logically follows?",
      options: [
        "Both conclusions I and III",
        "Both conclusions I and II",
        "Conclusion II: The workers should leave their cars at home.",
        "Conclusion I: The workers should start using public transportation."
      ],
      correctAnswerIndex: 1,
      explanation: "When facility parking capacity is physically exhausted, practical commuter alternatives include taking public transit (I) and leaving personal vehicles at home (II)."
    },
    {
      id: "apt16-16",
      question: "Five students (Ha, Ga, Ta, Za, Ya) sat for exams in English, History, Geography, and Math. For Ha, History was easiest, Math was hardest. For Ga, it was the reverse. Ta found History & Math easiest, Za found them hardest. For Ya, History was easiest, Math hardest. Which subject was hardest for most students?",
      options: [
        "Mathematics",
        "English",
        "History",
        "Geography"
      ],
      correctAnswerIndex: 0,
      explanation: "Counting hardest subject rankings: Ha (Math), Za (Math & History), Ya (Math) make Mathematics the most frequently cited most difficult subject."
    },
    {
      id: "apt16-17",
      question: "Assumption: Most traffic accidents in Ethiopia are caused by calling on phones, texting, violation of regulations, and driver recklessness. Which conclusions follow?",
      options: [
        "Both conclusion II and III",
        "Both conclusions I and II",
        "Conclusion II",
        "Conclusion I"
      ],
      correctAnswerIndex: 0,
      explanation: "Calling, texting, and violating rules are conscious driver decisions (II) and direct consequences of irresponsible behavioral infractions (III)."
    },
    {
      id: "apt16-18",
      question: "Substitute the word in bold: \"Risk factors such as smoking and stress EXACERBATE blood pressure.\"",
      options: [
        "moderate",
        "mitigate",
        "aggravate",
        "improve"
      ],
      correctAnswerIndex: 2,
      explanation: "To exacerbate a condition or disease means to worsen, aggravate, or intensify it."
    },
    {
      id: "apt16-19",
      question: "Substitute the word in bold: \"Unethical work habits JEOPARDIZE individuals' development efforts.\"",
      options: [
        "detriment / endanger",
        "facilitate",
        "speed-up",
        "accelerate"
      ],
      correctAnswerIndex: 0,
      explanation: "To jeopardize means to place in peril, endanger, or cause detriment to."
    },
    {
      id: "apt16-20",
      question: "Substitute the word in bold: \"Lowland areas usually get INTERMITTENT rain.\"",
      options: [
        "substantial",
        "frequent",
        "regular",
        "sporadic"
      ],
      correctAnswerIndex: 3,
      explanation: "Intermittent rainfall occurs irregularly, occasionally, or at disconnected intervals (sporadic)."
    },
    {
      id: "apt16-21",
      question: "Many health professionals believe that laughter has ________ effects on the human body as it enhances both physical and emotional health.",
      options: [
        "detrimental",
        "harmful",
        "therapeutic",
        "adverse"
      ],
      correctAnswerIndex: 2,
      explanation: "'Therapeutic' means having a healing, beneficial, or curative effect on bodily and mental health."
    },
    {
      id: "apt16-22",
      question: "The ________ forests in western Ethiopia, accompanied by the chirps and singing of birds and the fresh breeze are really inspirational.",
      options: [
        "abandoned",
        "deserted",
        "empty",
        "tranquil"
      ],
      correctAnswerIndex: 3,
      explanation: "'Tranquil' means peaceful, calm, serene, and free from disturbance, fitting the lush forest scene."
    },
    {
      id: "apt16-23",
      question: "As it contains students from diverse cultural backgrounds, the class is a highly ________ one.",
      options: [
        "invariable",
        "consistent",
        "homogeneous",
        "heterogeneous"
      ],
      correctAnswerIndex: 3,
      explanation: "A group made up of people or things that are diverse and varied in character is heterogeneous."
    },
    {
      id: "apt16-24",
      question: "To fight some of the incurable diseases the world is facing currently, scientists are ________ biotechnology to develop effective drugs.",
      options: [
        "setting aside",
        "utilizing",
        "discounting",
        "overlooking"
      ],
      correctAnswerIndex: 1,
      explanation: "Scientists are actively applying, employing, or utilizing modern biotechnology tools."
    },
    {
      id: "apt16-25",
      question: "Sentence Correction: Choose the grammatically correct sentence.",
      options: [
        "In my opinion, we can visited our friend when we return from school.",
        "In my opinion, we can visit our friend when we return back from school.",
        "In my opinion, I think, we can visit our friend when we back from school.",
        "In my opinion, we can visit our friend when we are back from school."
      ],
      correctAnswerIndex: 3,
      explanation: "'In my opinion, we can visit our friend when we are back from school' is concise, grammatically sound, and avoids pleonastic redundancy ('return back' is redundant, modal 'can' requires base verb 'visit')."
    },
    {
      id: "apt16-26",
      question: "Sentence Correction: Choose the grammatically correct sentence avoiding dangling modifiers.",
      options: [
        "The dog that was riding a bicycle barked at me.",
        "The dog, while it was riding a bicycle, barked at me.",
        "While it was riding a bicycle the dog barked at me.",
        "The dog barked at me while I was riding a bicycle."
      ],
      correctAnswerIndex: 3,
      explanation: "Option D correctly places the modifier next to the person riding the bicycle ('while I was riding a bicycle') rather than absurdly describing the dog as riding a bicycle."
    },
    {
      id: "apt16-27",
      question: "Sentence Correction: Choose the grammatically correct interrogative sentence.",
      options: [
        "What things are you enjoy doing in your spare time?",
        "What are the things you enjoy doing in your spare time?",
        "What things you are enjoy doing in your spare time?",
        "What things you enjoy doing in your spare time?"
      ],
      correctAnswerIndex: 1,
      explanation: "'What are the things you enjoy doing in your spare time?' correctly follows standard English question syntax with inverted auxiliary verb."
    },
    {
      id: "apt16-28",
      question: "Sentence Correction: Choose the grammatically correct comparative sentence.",
      options: [
        "The population of China is more great than India.",
        "The population of China is greater than in India.",
        "The population of China is greater than that of India.",
        "The population of China is greater than India."
      ],
      correctAnswerIndex: 2,
      explanation: "When comparing population, one must compare the population of China to 'that of India' (using pronoun 'that of' to avoid illogically comparing a population to a country)."
    },
    {
      id: "apt16-29",
      question: "Choose the word that is most nearly SIMILAR in meaning to CONDONE:",
      options: [
        "Forgive / Overlook",
        "Complicate",
        "Confuse",
        "Discourage"
      ],
      correctAnswerIndex: 0,
      explanation: "To condone means to accept, pardon, forgive, or allow behavior that is considered wrong."
    },
    {
      id: "apt16-30",
      question: "Choose the word that is most nearly SIMILAR in meaning to ADHERE:",
      options: [
        "Decline",
        "Drop",
        "Abandon",
        "Obey / Stick to"
      ],
      correctAnswerIndex: 3,
      explanation: "To adhere to rules or principles means to abide by, stick with, or obey them faithfully."
    },
    {
      id: "apt16-31",
      question: "Choose the word that is most nearly SIMILAR in meaning to FEASIBLE:",
      options: [
        "Unrealistic",
        "Impractical",
        "Achievable / Viable",
        "Ambitious"
      ],
      correctAnswerIndex: 2,
      explanation: "Feasible means capable of being done easily or conveniently; achievable, practicable, or workable."
    },
    {
      id: "apt16-32",
      question: "Analogy: BOTANY : PLANTS :: ________ : Soil",
      options: [
        "Sociology",
        "Pedagogy",
        "Pedology",
        "Biology"
      ],
      correctAnswerIndex: 2,
      explanation: "Botany is the scientific discipline dedicated to the study of plants, while Pedology is the scientific study of soils in their natural environment."
    },
    {
      id: "apt16-33",
      question: "Analogy: WONDERFUL : SATISFACTORY :: Gigantic : ________",
      options: [
        "Broad",
        "Large",
        "Comprehensive",
        "Spacious"
      ],
      correctAnswerIndex: 1,
      explanation: "Wonderful is an elevated/extreme degree of satisfactory; likewise, Gigantic is an extreme degree of large."
    },
    {
      id: "apt16-34",
      question: "Analogy: JUSTICE : FAIRNESS :: ________ : Bias",
      options: [
        "Rational",
        "Prejudice",
        "Compassion",
        "Just"
      ],
      correctAnswerIndex: 1,
      explanation: "Justice is characterized by fairness; prejudice is characterized by bias."
    },
    {
      id: "apt16-35",
      question: "Analogy: TEAM : PLAYER :: Crew : ________",
      options: [
        "Member",
        "Musician",
        "Vocalist",
        "Trainer"
      ],
      correctAnswerIndex: 0,
      explanation: "A team is composed of individual players; a crew is composed of individual crew members."
    },
    {
      id: "apt16-36",
      question: "For what value(s) of k does the system of linear equations { 2x + 3y = 1, kx + 6y = -3 } have a unique solution?",
      options: [
        "k = -4",
        "k ≠ 4",
        "k = 4",
        "k ≠ -4"
      ],
      correctAnswerIndex: 1,
      explanation: "For a unique solution, the ratio of coefficients must not be equal: a1/a2 ≠ b1/b2 => 2/k ≠ 3/6 = 1/2 => k ≠ 4."
    },
    {
      id: "apt16-37",
      question: "If (3x^2 + 1)/(3x + 6) = (x^2)/(x + 2) - 3, then what is the value of 1/(9x + 1)?",
      options: [
        "-1/5",
        "1/20",
        "-1/18",
        "1/18"
      ],
      correctAnswerIndex: 2,
      explanation: "(3x^2 + 1) / (3(x + 2)) = (3x^2 - 9(x + 2)) / (3(x + 2)) => 3x^2 + 1 = 3x^2 - 9x - 18 => 1 = -9x - 18 => 9x = -19. Then 9x + 1 = -19 + 1 = -18. Thus 1/(9x + 1) = -1/18."
    },
    {
      id: "apt16-38",
      question: "The difference of two numbers is 10, and the sum of three times the larger number and twice the smaller number is 55. What is the value of the larger number?",
      options: [
        "14",
        "15",
        "6",
        "5"
      ],
      correctAnswerIndex: 1,
      explanation: "Let larger be x, smaller be y. x - y = 10 => y = x - 10. 3x + 2y = 55 => 3x + 2(x - 10) = 55 => 5x - 20 = 55 => 5x = 75 => x = 15."
    },
    {
      id: "apt16-39",
      question: "What percent of 16 is 12?",
      options: [
        "70%",
        "50%",
        "25%",
        "75%"
      ],
      correctAnswerIndex: 3,
      explanation: "Percentage = (12 / 16) * 100% = (3 / 4) * 100% = 75%."
    },
    {
      id: "apt16-40",
      question: "One root of the quadratic equation 2x^2 + (1 - h)x - h = 0 is 4 times the other root. What are the roots of the equation?",
      options: [
        "-2 and -8",
        "2 and 8",
        "-1/2 and -2",
        "1/2 and 2"
      ],
      correctAnswerIndex: 3,
      explanation: "Testing roots 1/2 and 2 (ratio 2 / (1/2) = 4): Sum = 1/2 + 2 = 5/2. Product = (1/2)(2) = 1. For 2x^2 - 5x + 2 = 0, -(1 - h)/2 = 5/2 => h - 1 = 5 => h = 6, and -h/2 = -6/2 = -3. The valid roots are 1/2 and 2."
    },
    {
      id: "apt16-41",
      question: "How many different four letter words which start with a vowel can be formed from the word MATH if the letters cannot be used more than once?",
      options: [
        "24",
        "18",
        "8",
        "6"
      ],
      correctAnswerIndex: 3,
      explanation: "Letters in MATH are M, A, T, H. The only vowel is 'A' (1 choice for 1st position). Remaining 3 positions can be filled by M, T, H in 3! = 3 * 2 * 1 = 6 ways. Total = 1 * 6 = 6."
    },
    {
      id: "apt16-42",
      question: "A bag contains 15 balls, numbered 1 through 15. What is the probability of selecting a number that is odd or a multiple of 4?",
      options: [
        "1/3",
        "11/15",
        "1/5",
        "8/15"
      ],
      correctAnswerIndex: 1,
      explanation: "Odd numbers in {1..15}: {1, 3, 5, 7, 9, 11, 13, 15} (8 numbers). Multiples of 4: {4, 8, 12} (3 numbers). These sets are mutually disjoint. Total = 8 + 3 = 11 numbers. Probability = 11/15."
    },
    {
      id: "apt16-43",
      question: "Let ΔABC is an isosceles right triangle with ∠C = 90°. If the length of side AC is 4 cm, what is the length of side AB?",
      options: [
        "4√2 cm",
        "8 cm",
        "4 cm",
        "2√2 cm"
      ],
      correctAnswerIndex: 0,
      explanation: "In an isosceles right triangle with legs AC = BC = 4 cm, hypotenuse AB = √(4^2 + 4^2) = √(16 + 16) = √32 = 4√2 cm."
    },
    {
      id: "apt16-44",
      question: "Which one of the following can NOT be the degree measure of each interior angle of a regular polygon?",
      options: [
        "140°",
        "105°",
        "120°",
        "135°"
      ],
      correctAnswerIndex: 1,
      explanation: "Exterior angle = 180° - Interior angle. For 105°, exterior angle is 180° - 105° = 75°. Number of sides n = 360° / 75° = 4.8, which is not an integer. Thus 105° cannot be an interior angle of a regular polygon."
    },
    {
      id: "apt16-45",
      question: "Data set: a, a, b, c, c, d is given where a < b < c < d.\nQuantity P: Mode of the data\nQuantity Q: Median of the data\nCompare the quantities:",
      options: [
        "Quantity P is less than Quantity Q",
        "The relationship cannot be determined",
        "Quantity P is greater than Quantity Q",
        "Quantity P and Quantity Q are equal"
      ],
      correctAnswerIndex: 1,
      explanation: "The data set is bimodal with modes a and c, whereas the median is (b + c)/2. Because the exact values of a, b, c are unspecified, the relation between the modes and the median cannot be uniquely determined."
    },
    {
      id: "apt16-46",
      question: "Let x, y, z be lengths of the sides of a triangle.\nQuantity P: x + y + 3\nQuantity Q: z + 3\nCompare the quantities:",
      options: [
        "Quantity P is less than Quantity Q",
        "Quantity P and quantity Q are equal",
        "Quantity P is greater than Quantity Q",
        "The relationship cannot be determined"
      ],
      correctAnswerIndex: 2,
      explanation: "By the Triangle Inequality Theorem, the sum of any two sides is strictly greater than the third side: x + y > z. Adding 3 to both sides yields x + y + 3 > z + 3. Hence Quantity P > Quantity Q."
    },
    {
      id: "apt16-47",
      question: "If f(x) = 10^{2x - 1}, then which one of the following is equal to f^-1(x)?",
      options: [
        "log(√x) + 1/2",
        "log(√x) - 1/2",
        "log(2x - 1)",
        "log x + 1/2"
      ],
      correctAnswerIndex: 0,
      explanation: "Let y = 10^{2x - 1}. Taking log_10 of both sides: log y = 2x - 1 => 2x = log y + 1 => x = (1/2)log y + 1/2 = log(√y) + 1/2. Thus f^-1(x) = log(√x) + 1/2."
    },
    {
      id: "apt16-48",
      question: "Which one of the following is NOT true about the graph of f(x) = (7/5)^x?",
      options: [
        "Its y-intercept is 1.",
        "Its range is the set of all real numbers.",
        "It is an increasing function.",
        "Its domain is the set of all real numbers."
      ],
      correctAnswerIndex: 1,
      explanation: "For any exponential function f(x) = a^x with a > 0, the range is strictly positive real numbers (0, ∞), not the entire set of real numbers R."
    },
    {
      id: "apt16-49",
      question: "What are the values of y and z in the sequence: 1, -1/3, 1/7, -1/15, 1/31, -1/63, y, z, ...?",
      options: [
        "1/127 and -1/255",
        "1/127 and -1/227",
        "1/129 and -1/227",
        "1/129 and -1/255"
      ],
      correctAnswerIndex: 0,
      explanation: "The denominators follow the formula 2^n - 1: 1, 3, 7, 15, 31, 63, 127 (2^7 - 1), 255 (2^8 - 1). Signs alternate (+, -, +, -, +, -, +, -), so y = 1/127 and z = -1/255."
    },
    {
      id: "apt16-50",
      question: "Which one of the following is the value of x in the sequence 23, 34, 56, 89, x, 188, ...?",
      options: [
        "100",
        "144",
        "111",
        "133"
      ],
      correctAnswerIndex: 3,
      explanation: "Differences between successive terms are multiples of 11: 34 - 23 = +11, 56 - 34 = +22, 89 - 56 = +33. Thus x = 89 + 44 = 133, followed by 188 - 133 = +55."
    },
    {
      id: "apt16-51",
      question: "What is the rationalizing factor of the denominator of 1 / (3√4)?",
      options: [
        "3√2",
        "2",
        "√2",
        "√6"
      ],
      correctAnswerIndex: 0,
      explanation: "3√4 = 4^{1/3} = 2^{2/3}. Multiplying by 3√2 (2^{1/3}) gives 2^{2/3} * 2^{1/3} = 2^1 = 2 (rational). Hence the rationalizing factor is 3√2."
    },
    {
      id: "apt16-52",
      question: "If 3x - 2 = 3 - 5x, then which one of the following is equal to 7 - 4x?",
      options: [
        "9/2",
        "19/2",
        "11/2",
        "13/2"
      ],
      correctAnswerIndex: 0,
      explanation: "3x + 5x = 3 + 2 => 8x = 5 => x = 5/8. Then 7 - 4x = 7 - 4(5/8) = 7 - 5/2 = (14 - 5)/2 = 9/2."
    },
    {
      id: "apt16-53",
      question: "The greatest common factor and least common multiple of two numbers are 12 and 336, respectively. If one of the numbers is 84, what is the other number?",
      options: [
        "48",
        "96",
        "36",
        "72"
      ],
      correctAnswerIndex: 0,
      explanation: "Product of two numbers = GCF * LCM => 84 * B = 12 * 336 => B = (12 * 336) / 84 = 336 / 7 = 48."
    },
    {
      id: "apt16-54",
      question: "How many numbers in the set {-8, -5, -3, -1, 0, 2, 5, 7, 8} satisfy the condition |5 - 3x| < 11?",
      options: [
        "3",
        "6",
        "4",
        "5"
      ],
      correctAnswerIndex: 2,
      explanation: "-11 < 5 - 3x < 11 => -16 < -3x < 6 => dividing by -3 gives -2 < x < 16/3 (5.33). Numbers from the set in the open interval (-2, 5.33) are: -1, 0, 2, 5 (4 numbers)."
    },
    {
      id: "apt16-55",
      question: "A father is 32 years old and his son is 8 years old now. In how many years will the father be three times as old as his son?",
      options: [
        "3",
        "5",
        "6",
        "4"
      ],
      correctAnswerIndex: 3,
      explanation: "Let y be the number of years: 32 + y = 3(8 + y) => 32 + y = 24 + 3y => 2y = 8 => y = 4 years."
    },
    {
      id: "apt16-56",
      question: "Annual income data table of five schools (in thousands Birr): Tuition (P:120, Q:60, R:210, S:90, T:120), Term fees (P:24, Q:12, R:45, S:24, T:30), Donations (P:54, Q:21, R:60, S:51, T:60), Grants (P:60, Q:54, R:120, S:42, T:55), Misc (P:12, Q:3, R:15, S:3, T:15). Which school has the lowest percentage of income from term fees out of its total income?",
      options: [
        "S",
        "P",
        "R",
        "Q"
      ],
      correctAnswerIndex: 3,
      explanation: "Total incomes: P = 270 (term fee = 24/270 = 8.89%), Q = 150 (term fee = 12/150 = 8.00%), R = 450 (45/450 = 10.0%), S = 210 (24/210 = 11.4%), T = 280 (30/280 = 10.7%). School Q has the lowest percentage (8.00%)."
    },
    {
      id: "apt16-57",
      question: "Which school has the lowest ratio of miscellaneous to term fees?",
      options: [
        "S",
        "T",
        "Q",
        "R"
      ],
      correctAnswerIndex: 0,
      explanation: "Ratios of Misc / Term fees: P = 12/24 = 0.50, Q = 3/12 = 0.25, R = 15/45 = 0.33, S = 3/24 = 0.125, T = 15/30 = 0.50. School S has the lowest ratio (0.125)."
    },
    {
      id: "apt16-58",
      question: "What is the average of the income from tuition fees of the five schools (in thousands Birr)?",
      options: [
        "90",
        "120",
        "100",
        "210"
      ],
      correctAnswerIndex: 1,
      explanation: "Tuition fees: 120 + 60 + 210 + 90 + 120 = 600 thousand Birr. Average = 600 / 5 = 120 thousand Birr."
    },
    {
      id: "apt16-59",
      question: "Which school has the lowest income from donations and term fees combined (in thousands Birr)?",
      options: [
        "S",
        "R",
        "Q",
        "T"
      ],
      correctAnswerIndex: 2,
      explanation: "Combined donations + term fees: P = 54+24 = 78; Q = 21+12 = 33; R = 60+45 = 105; S = 51+24 = 75; T = 60+30 = 90. School Q has the lowest total (33 thousand Birr)."
    },
    {
      id: "apt16-60",
      question: "Which school has the highest percentage of income from grants out of its total income?",
      options: [
        "P",
        "S",
        "Q",
        "T"
      ],
      correctAnswerIndex: 2,
      explanation: "Grants percentage: P = 60/270 = 22.2%, Q = 54/150 = 36.0%, R = 120/450 = 26.7%, S = 42/210 = 20.0%, T = 55/280 = 19.6%. School Q has the highest grant percentage (36.0%)."
    }
  ]
};
