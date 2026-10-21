import { type Question } from '../services/geminiService';

export const aptitude2017Exam = {
  id: "euee-2017-aptitude",
  title: "2017 E.C. ESSLCE Scholastic Aptitude Test",
  subject: "Aptitude",
  grade: "Grade 12",
  timeLimit: 7200, // 120 minutes (2:00 hours)
  questions: [
    // Section One: Verbal Reasoning (Questions 1 - 35)
    // Subsection 1: Analytical and Logical Reasoning (Q1 - Q6)
    {
      id: "apt-1",
      section: "SECTION ONE: Verbal Reasoning",
      instruction: "DIRECTIONS (Questions 1–6): In each of the following questions, analyze the logical premises, relationships, or word puzzles and deduce the correct conclusion.",
      question: "If two days after tomorrow is four days before Saturday, what day is it today?",
      options: [
        "Friday",
        "Saturday",
        "Sunday",
        "Monday"
      ],
      correctAnswerIndex: 3,
      explanation: "Work backwards from Saturday: Four days before Saturday is Tuesday. Tuesday is 'two days after tomorrow' $\\implies$ Tomorrow is Sunday $\\implies$ Today is Monday."
    },
    {
      id: "apt-2",
      question: "Gad is older than Dan, and Dan is older than Betti. With Senni being older than Dan and younger than Gad, who is the youngest?",
      options: [
        "Betti",
        "Senni",
        "Gad",
        "Dan"
      ],
      correctAnswerIndex: 0,
      explanation: "From the given relationships: $\\text{Gad} > \\text{Senni} > \\text{Dan} > \\text{Betti}$. Therefore, Betti is the youngest."
    },
    {
      id: "apt-3",
      question: "Aki is Bali's sister. Yaya is Bali's mother. Lema is Yaya's father. Gette is Lema's mother. Then how is Aki related to Lema?",
      options: [
        "daughter",
        "granddaughter",
        "grandson",
        "grandmother"
      ],
      correctAnswerIndex: 1,
      explanation: "Yaya is Bali and Aki's mother. Lema is Yaya's father. Therefore, Aki is Lema's daughter's daughter $\\implies$ granddaughter."
    },
    {
      id: "apt-4",
      question: "Statement I: All football players are sportspersons.\nStatement II: All sportspersons are fit.\nConclusion: Some football players are fit.\nThis conclusion is:",
      options: [
        "incorrect",
        "inappropriate",
        "reasonably correct (logically valid since all implies some)",
        "completely false"
      ],
      correctAnswerIndex: 2,
      explanation: "If all football players are sportspersons and all sportspersons are fit, then all football players are fit. Since 'all' implies 'some', the conclusion is reasonably correct."
    },
    {
      id: "apt-5",
      question: "How many months in a standard year have a twenty-eighth day?",
      options: [
        "seven months",
        "twelve months",
        "one month",
        "two months"
      ],
      correctAnswerIndex: 1,
      explanation: "All 12 months have at least 28 days (February has 28 or 29, and all other 11 months have 30 or 31 days)."
    },
    {
      id: "apt-6",
      question: "Which of the following jumbled letter groups can be rearranged into a meaningful 5-letter English word?",
      options: [
        "PYRIO",
        "DWAEP (rearranges to PAWED)",
        "GOFAT",
        "PASEH"
      ],
      correctAnswerIndex: 1,
      explanation: "The letters D-W-A-E-P rearrange to form the valid English word 'PAWED' (or 'WADEP' $\\to$ 'PAWED')."
    },

    // Reading Comprehension Passage I (Q7 - Q10)
    {
      id: "apt-7",
      section: "SECTION ONE: Verbal Reasoning",
      instruction: "DIRECTIONS (Questions 7–10): Read the following passage carefully and answer questions 7 to 10 based on what is stated or implied in the text.",
      passage: "What is the matter with our reading is casualness. If we are not tired after reading, we have not really read; we have only looked at words. For we are assuming that, without further trouble, we can possess, coordinate, and assimilate all the ideas and emotions offered to us by a mind greater than our own. The assumption has only to be stated to be recognized as a monstrous absurdity.\n\nReading without subsequent reflection is ridiculous; it is equally a proof of folly and vanity. True intellectual appreciation demands that we pause, weigh arguments, evaluate the underlying premises, and integrate the author's insights into our own framework of thinking.",
      question: "[Reading Comprehension I] What is described as an absurd assumption about reading according to Passage I?",
      options: [
        "Reading does not require physical effort.",
        "All books are equally valuable.",
        "Ideas and complex thoughts from superior minds can be instantly absorbed and assimilated without effort.",
        "Superior minds are easy to understand."
      ],
      correctAnswerIndex: 2,
      explanation: "The author points out the 'monstrous absurdity' of assuming that one can immediately possess, coordinate, and assimilate deep ideas from a great author without intense effort."
    },
    {
      id: "apt-8",
      question: "[Reading Comprehension I] Which line from the text serves as direct evidence that instant assimilation is absurd?",
      options: [
        "Line 3-4: 'If we are not tired after reading...'",
        "Line 7-9: 'For we are assuming that, without further trouble, we can possess, co-ordinate, and assimilate all the ideas... offered to us by a mind greater than our own.'",
        "Line 4: 'tired after reading... disposal of the book.'",
        "Line 1: 'What is the matter with our reading is casualness...'"
      ],
      correctAnswerIndex: 1,
      explanation: "Lines 7-9 explicitly state the flawed assumption of effortless assimilation of ideas."
    },
    {
      id: "apt-9",
      question: "[Reading Comprehension I] Why does the author emphasize the indispensable act of reflection after reading?",
      options: [
        "To complete the true reading process and integrate comprehension",
        "To simplify the ideas encountered",
        "To establish intellectual superiority over peers",
        "To make reading purely entertaining"
      ],
      correctAnswerIndex: 0,
      explanation: "The author notes that reflection is the vital remaining step; reading without subsequent reflection is incomplete and 'ridiculous'."
    },
    {
      id: "apt-10",
      question: "[Reading Comprehension I] Which excerpt proves that reflection is essential to avoid vanity?",
      options: [
        "Line 10: 'The assumption has only to be stated...'",
        "Line 12: 'Reading without subsequent reflection is ridiculous; it is equally a proof of folly and vanity.'",
        "Line 4: 'If we are not tired...'",
        "Line 1: 'What is the matter with our reading...'"
      ],
      correctAnswerIndex: 1,
      explanation: "Line 12 directly confirms that reading without reflective thought is an act of folly and vanity."
    },

    // Sentence Correction (Q11 - Q14)
    {
      id: "apt-11",
      section: "SECTION ONE: Verbal Reasoning",
      instruction: "DIRECTIONS (Questions 11–14): In each of the following questions, select the sentence that is grammatically correct, standard in punctuation, and best expresses the given thought.",
      question: "Identify the grammatically correct sentence:",
      options: [
        "One of all-time greatest payer have recently retired from football.",
        "One of all-time greatest payers have recently retired from football.",
        "One of the all-time greatest players has recently retired from football.",
        "One of all-time greatest payers have recently retired from football."
      ],
      correctAnswerIndex: 2,
      explanation: "The subject 'One of...' takes a singular verb 'has' combined with plural noun 'players' with the definite article 'the'."
    },
    {
      id: "apt-12",
      question: "Identify the grammatically correct conditional advice sentence:",
      options: [
        "If you'll not feel well, you'd better go to clinic.",
        "If you're not feeling well, you'd better go to the clinic.",
        "If you'll not feel well, you better go to clinic.",
        "If you're not feeling well, you would better go to clinic."
      ],
      correctAnswerIndex: 1,
      explanation: "In first conditional present clauses, use present continuous ('If you're not feeling well') + modal idiom 'had better' ('you'd better')."
    },
    {
      id: "apt-13",
      question: "Identify the grammatically correct sentence:",
      options: [
        "There school takes only twenty minutes on foot.",
        "Theirs school takes only twenty minutes on foot.",
        "Their school takes only twenty minutes on foot.",
        "They're school takes only twenty minutes on foot."
      ],
      correctAnswerIndex: 2,
      explanation: "'Their' is the possessive adjective modifying the noun 'school'. 'There' is an adverb of place, 'theirs' is a pronoun, and 'they're' is a contraction of 'they are'."
    },
    {
      id: "apt-14",
      question: "Identify the sentence demonstrating proper grammatical parallelism:",
      options: [
        "I wanted to first take a shower and then eat a snack.",
        "I wanted first take shower and then eat snack.",
        "I wanted to first take shower and then ate snack.",
        "I wanted to first take shower and then eating snack."
      ],
      correctAnswerIndex: 0,
      explanation: "Parallel infinitive structure: 'to take [a shower] and [to] eat [a snack]' maintains balanced verb tense."
    },

    // Classification Items (Q15 - Q18)
    {
      id: "apt-15",
      section: "SECTION ONE: Verbal Reasoning",
      instruction: "DIRECTIONS (Questions 15–18): In each of the following questions, four words are given. Three of them belong to the same logical category or concept. Choose the one word that does NOT belong with the others.",
      question: "Which of the following words does NOT belong to the group? (Classification)",
      options: [
        "Monogamy",
        "Polygamy",
        "Polyglot (person who speaks many languages)",
        "Polyandry"
      ],
      correctAnswerIndex: 2,
      explanation: "Monogamy, polygamy, and polyandry are systems of marriage/matrimony, whereas 'polyglot' refers to a person fluent in multiple languages."
    },
    {
      id: "apt-16",
      question: "Which word does NOT belong with the others in the political election category?",
      options: [
        "Election",
        "Ballot-box",
        "Signal-box (railway signalling apparatus)",
        "Voting"
      ],
      correctAnswerIndex: 2,
      explanation: "Election, ballot-box, and voting are democratic electoral terms; a signal-box is a railway infrastructure component."
    },
    {
      id: "apt-17",
      question: "Which movement term does NOT belong to the group?",
      options: [
        "Tiptoeing",
        "Flying (aerial locomotion)",
        "Strolling",
        "Striding"
      ],
      correctAnswerIndex: 1,
      explanation: "Tiptoeing, strolling, and striding are terrestrial styles of pedestrian walking, whereas flying is airborne motion."
    },
    {
      id: "apt-18",
      question: "Which item does NOT belong to the group of specific watercraft?",
      options: [
        "Yacht",
        "Ship",
        "Vehicle (general overarching category)",
        "Boat"
      ],
      correctAnswerIndex: 2,
      explanation: "Yacht, ship, and boat are specific water vessels; 'vehicle' is a broad general category."
    },

    // Analogy (Q19 - Q22)
    {
      id: "apt-19",
      section: "SECTION ONE: Verbal Reasoning",
      instruction: "DIRECTIONS (Questions 19–22): Each question below consists of a related pair of capitalized words followed by four lettered pairs. Select the lettered pair that best expresses a relationship similar to that expressed in the original pair.",
      question: "AUTOMOBILE : GARAGE :: Airplane : ________",
      options: [
        "Deck",
        "Truck",
        "Train",
        "Hangar"
      ],
      correctAnswerIndex: 3,
      explanation: "An automobile is housed/parked in a garage; an airplane is housed in a hangar."
    },
    {
      id: "apt-20",
      question: "KEY : LOCK :: Password : ________",
      options: [
        "Server",
        "Screen",
        "Monitor",
        "Computer / Account"
      ],
      correctAnswerIndex: 3,
      explanation: "A key unlocks a physical lock; a password unlocks a digital computer or user account."
    },
    {
      id: "apt-21",
      question: "NEST : BIRD :: Den : ________",
      options: [
        "Backyard",
        "Lion / Bear",
        "Hive",
        "Cave"
      ],
      correctAnswerIndex: 1,
      explanation: "A nest is the home constructed by a bird; a den is the habitat/dwelling of a lion or bear."
    },
    {
      id: "apt-22",
      question: "PHYSICIAN : HOSPITAL :: Teacher : ________",
      options: [
        "Administrator",
        "Student",
        "Supervisor",
        "School"
      ],
      correctAnswerIndex: 3,
      explanation: "A physician works in a hospital; a teacher works in a school."
    },

    // Synonyms (Q23 - Q25)
    {
      id: "apt-23",
      section: "SECTION ONE: Verbal Reasoning",
      instruction: "DIRECTIONS (Questions 23–25): Choose the word or phrase that is most nearly similar in meaning (SYNONYM) to the given capitalized word.",
      question: "Choose the word most nearly similar in meaning to: PHONEY",
      options: [
        "Fake / Counterfeit",
        "Funny",
        "Genuine",
        "Authentic"
      ],
      correctAnswerIndex: 0,
      explanation: "'Phoney' means not genuine, fraudulent, or fake."
    },
    {
      id: "apt-24",
      question: "Choose the word most nearly similar in meaning to: HUMOROUS",
      options: [
        "Satiating",
        "Satisfying",
        "Amusing / Comical",
        "Doubting"
      ],
      correctAnswerIndex: 2,
      explanation: "'Humorous' means funny, entertaining, or amusing."
    },
    {
      id: "apt-25",
      question: "Choose the word most nearly similar in meaning to: THEFT",
      options: [
        "Burglary / Larceny",
        "Hypocrisy",
        "Gossip",
        "Suspicion"
      ],
      correctAnswerIndex: 0,
      explanation: "'Theft' is the unlawful taking of another's property, synonymous with burglary or larceny."
    },

    // Antonyms (Q26 - Q28)
    {
      id: "apt-26",
      section: "SECTION ONE: Verbal Reasoning",
      instruction: "DIRECTIONS (Questions 26–28): Choose the word that is most nearly OPPOSITE in meaning (ANTONYM) to the given capitalized word.",
      question: "Choose the word most OPPOSITE in meaning to: FONDLY",
      options: [
        "Affectionate",
        "Sociable",
        "Hatred / Hostility",
        "Agreeable"
      ],
      correctAnswerIndex: 2,
      explanation: "'Fondly' means with love and affection; its opposite is with hatred or hostility."
    },
    {
      id: "apt-27",
      question: "Choose the word most OPPOSITE in meaning to: INVINCIBLE",
      options: [
        "Breakable",
        "Debatable",
        "Visible",
        "Conquerable / Vulnerable"
      ],
      correctAnswerIndex: 3,
      explanation: "'Invincible' means incapable of being defeated; its antonym is conquerable or vulnerable."
    },
    {
      id: "apt-28",
      question: "Choose the word most OPPOSITE in meaning to: SUBORDINATE",
      options: [
        "Superior",
        "Retainer",
        "Soldier",
        "Inferior"
      ],
      correctAnswerIndex: 0,
      explanation: "'Subordinate' means lower in rank or authority; its antonym is 'superior'."
    },

    // Reading Comprehension Passage II (Q29 - Q32)
    {
      id: "apt-29",
      section: "SECTION ONE: Verbal Reasoning",
      instruction: "DIRECTIONS (Questions 29–32): Read Passage II below carefully and answer questions 29 to 32 based on what is stated or directly implied in the text.",
      passage: "The transition from being an employee to becoming an effective employer requires a profound transformation in perspective and personal discipline. Most successful employers today have risen through the ranks, relying on their ability to manage and direct others effectively. One crucial skill in business development involves identifying complementary needs in the community and brokering productive exchanges—such as connecting an owner wanting to convert assets with an entrepreneur seeking that exact opportunity.\n\nHowever, leadership is not simply about commanding resources. When organizational leaders fall prey to bureaucratic vices, neglect employee well-being, or fail to communicate openly, enterprise cohesion fractures. Great leaders understand that sustainable enterprise is built on reciprocal service, transparent feedback, and shared responsibility.",
      question: "[Reading Comprehension II] In paragraph 2, the phrase 'these two individuals' refers to:",
      options: [
        "Mr. John Smith and the movie theater owner who wants a grocery store",
        "The grocery store and the cinema building",
        "The employer and the employee",
        "People and the community as a whole"
      ],
      correctAnswerIndex: 0,
      explanation: "Paragraph 2 illustrates connecting John Smith (selling grocery for a theater) with someone who has a theater and wants a grocery store."
    },
    {
      id: "apt-30",
      question: "[Reading Comprehension II] What does 'most successful employers today have risen through the ranks, relying on their ability to manage and direct others effectively' imply?",
      options: [
        "Every employer inherits their wealth easily.",
        "Having different titles is all that matters.",
        "Success is achieved by navigating obstacles and proving leadership through hard work.",
        "Most successful employers have proven their leadership ability through their journey."
      ],
      correctAnswerIndex: 3,
      explanation: "Rising through the ranks implies progressive development and demonstration of management and leadership capabilities over time."
    },
    {
      id: "apt-31",
      question: "[Reading Comprehension II] The primary intent of Napoleon Hill in this excerpt is that:",
      options: [
        "The transition from employee to employer requires only casual interest.",
        "Career transitions are purely governed by luck.",
        "Successful employers only rely on trade-offs.",
        "There are systematic steps and service-oriented mindsets required in transitioning from employee to employer."
      ],
      correctAnswerIndex: 3,
      explanation: "The text provides actionable guidance: serving current employers diligently, acquiring managerial mastery, and facilitating community value trades."
    },
    {
      id: "apt-32",
      question: "[Reading Comprehension II] According to the passage context, what does the word 'vices' denote in employer-employee relations?",
      options: [
        "deputies",
        "strengths",
        "weaknesses / bad managerial habits",
        "ambitions"
      ],
      correctAnswerIndex: 2,
      explanation: "'Vices' refers to negative habits, abuses of authority, or leadership weaknesses."
    },

    // Word Substitution (Q33 - Q35)
    {
      id: "apt-33",
      section: "SECTION ONE: Verbal Reasoning",
      instruction: "DIRECTIONS (Questions 33–35): In each sentence below, choose the word that can best replace the bolded word without changing the meaning of the sentence.",
      question: "Replace the bolded term: 'The man was killed in a car accident. His **body** was dragged from the burning wreckage.'",
      options: [
        "remains",
        "fire",
        "backseats",
        "wheels"
      ],
      correctAnswerIndex: 0,
      explanation: "The deceased physical body of a person is formally referred to as 'remains'."
    },
    {
      id: "apt-34",
      question: "Replace the bolded term: 'Harvard is one of the most **prestigious** universities in the USA.'",
      options: [
        "privileged",
        "admired / highly esteemed",
        "furnished",
        "expensive"
      ],
      correctAnswerIndex: 1,
      explanation: "'Prestigious' means possessing high status, respected, admired, or esteemed for excellence."
    },
    {
      id: "apt-35",
      question: "Replace the bolded term: 'The parliament has just **repealed** the discriminatory segregation law.'",
      options: [
        "approved",
        "renewed",
        "signed",
        "cancelled / revoked"
      ],
      correctAnswerIndex: 3,
      explanation: "To 'repeal' a law means to officially revoke, annul, or cancel it."
    },

    // Section Two: Quantitative Reasoning (Questions 36 – 60)
    {
      id: "apt-36",
      section: "SECTION TWO: Quantitative Reasoning",
      instruction: "DIRECTIONS (Questions 36–60): In this section, solve each mathematical problem using relevant concepts of arithmetic, algebra, geometry, functions, probability, and data interpretation. Select the single best answer from the four alternatives.",
      question: "A square is divided by its two diagonals and two perpendicular mid-segment lines into 8 smallest basic triangles. How many total triangles exist in the figure?",
      options: [
        "18",
        "14",
        "16",
        "12"
      ],
      correctAnswerIndex: 2,
      explanation: "In a standard $2\\times 2$ grid with both diagonals: 8 single-unit triangles + 4 two-unit diagonal triangles + 4 four-unit quadrant triangles = 16 triangles."
    },
    {
      id: "apt-37",
      question: "Which of the following mathematical statements is TRUE?",
      options: [
        "Every integer $a$ can be the numerator of a rational number $\\frac{a}{b}$ where $b \\neq 0$.",
        "Every non-negative integer is a natural number (since 0 is non-negative but not natural).",
        "The intersection of integers and irrational numbers is non-empty.",
        "The sum of two irrational numbers is always an irrational number (e.g. $\\sqrt{2} + (-\\sqrt{2}) = 0$ is rational)."
      ],
      correctAnswerIndex: 0,
      explanation: "Any integer $a$ can form a rational number $\\frac{a}{1}$, so every integer can serve as a numerator."
    },
    {
      id: "apt-38",
      question: "If $f(x) = \\sin(\\pi x) + e^{x^2} + |x| + x^3$ and $g(x) = \\cos(\\pi x) + \\ln(x + 1) + x$, find the exact value of $f(1) - 2g(0)$:",
      options: [
        "$e$",
        "$\\ln 2$",
        "$0$",
        "$e + 2$"
      ],
      correctAnswerIndex: 0,
      explanation: "$f(1) = \\sin(\\pi) + e^{1} + |1| + 1^3 = 0 + e + 1 + 1 = e + 2$.\n$g(0) = \\cos(0) + \\ln(1) + 0 = 1 + 0 + 0 = 1$.\n$f(1) - 2g(0) = (e + 2) - 2(1) = e$."
    },
    {
      id: "apt-39",
      question: "A juice glass is filled $\\frac{1}{2}$ with avocado. One-third of the remaining $\\frac{1}{2}$ is mango ($\\frac{1}{6}$). The rest ($\\frac{1}{3}$) is equally divided between banana and papaya ($\\frac{1}{6}$ each). What is the ratio of banana to avocado in the glass?",
      options: [
        "$1 : 6$",
        "$1 : 2$",
        "$1 : 3$",
        "$2 : 3$"
      ],
      correctAnswerIndex: 2,
      explanation: "Avocado = $\\frac{1}{2} = \\frac{3}{6}$. Banana = $\\frac{1}{6}$. Ratio of banana to avocado = $\\frac{1/6}{1/2} = \\frac{1}{3} \\implies 1 : 3$."
    },
    {
      id: "apt-40",
      question: "Which of the following radicals is the largest in magnitude: $\\sqrt[6]{5}, \\sqrt[36]{2}, \\sqrt[12]{11}, \\sqrt[64]{3}$?",
      options: [
        "$\\sqrt[6]{5}$",
        "$\\sqrt[36]{2}$",
        "$\\sqrt[12]{11}$",
        "$\\sqrt[64]{3}$"
      ],
      correctAnswerIndex: 0,
      explanation: "Raise to power 12: $(\\sqrt[6]{5})^{12} = 5^2 = 25$. $(\\sqrt[12]{11})^{12} = 11$. Since $25 > 11 > 2^{12/36} > 3^{12/64}$, $\\sqrt[6]{5}$ is largest."
    },
    {
      id: "apt-41",
      question: "Pipe A fills a water tank in 3 hours, and Pipe B fills it in 6 hours. How long will it take in hours to fill the tank if both pipes are opened simultaneously?",
      options: [
        "5 hours",
        "4 hours",
        "9 hours",
        "2 hours"
      ],
      correctAnswerIndex: 3,
      explanation: "Combined rate $= \\frac{1}{3} + \\frac{1}{6} = \\frac{2+1}{6} = \\frac{3}{6} = \\frac{1}{2}\\text{ tank/hr}$. Time $= \\frac{1}{1/2} = 2\\text{ hours}$."
    },
    {
      id: "apt-42",
      question: "An old machine fills 35 bottles/hour and a new machine fills 50 bottles/hour. Together they fill 590 bottles daily. One day the old machine works for 4 hours and breaks down. How many hours must the new machine run alone to fill the remaining bottles?",
      options: [
        "8 hours",
        "9 hours",
        "5 hours",
        "7 hours"
      ],
      correctAnswerIndex: 1,
      explanation: "Old machine in 4 hrs fills: $35 \\times 4 = 140$ bottles. Remaining to fill $= 590 - 140 = 450$ bottles. Time for new machine $= \\frac{450}{50} = 9\\text{ hours}$."
    },
    {
      id: "apt-43",
      question: "A spherical soccer ball has a volume of $36\\pi\\text{ cm}^3$. What is its total surface area in $\\text{cm}^2$?",
      options: [
        "$\\frac{16\\pi}{3}$",
        "$12\\pi$",
        "$36\\pi\\text{ cm}^2$",
        "$\\frac{32\\pi}{3}$"
      ],
      correctAnswerIndex: 2,
      explanation: "$V = \\frac{4}{3}\\pi r^3 = 36\\pi \\implies r^3 = 27 \\implies r = 3\\text{ cm}$. Surface area $A = 4\\pi r^2 = 4\\pi (3^2) = 36\\pi\\text{ cm}^2$."
    },
    {
      id: "apt-44",
      question: "The height of a projectile in meters is $h(t) = kt - t^2 + 30$. If the maximum vertex height reached is $34\\text{ m}$, what is the positive value of $k$?",
      options: [
        "$\\sqrt{2}$",
        "$4$",
        "$5$",
        "$2$"
      ],
      correctAnswerIndex: 1,
      explanation: "Vertex occurs at $t = \\frac{-k}{2(-1)} = \\frac{k}{2}$. Maximum height $h(k/2) = k(k/2) - (k/2)^2 + 30 = \\frac{k^2}{4} + 30 = 34 \\implies \\frac{k^2}{4} = 4 \\implies k^2 = 16 \\implies k = 4$."
    },
    {
      id: "apt-45",
      question: "A farmer has 10 cows that produce equal milk $x$ liters daily (total $10x$). One day 4 cows give half milk ($4 \\times 0.5x = 2x$), 3 cows give three-fourths ($3 \\times 0.75x = 2.25x$), and 3 give zero milk. If the shortfall in milk was 92 liters, how many liters did he receive that day?",
      options: [
        "92 liters",
        "16 liters",
        "160 liters",
        "68 liters"
      ],
      correctAnswerIndex: 3,
      explanation: "Received $= 2x + 2.25x = 4.25x = \\frac{17x}{4}$. Shortfall $= 10x - 4.25x = 5.75x = 92 \\implies x = 16\\text{ L}$. Total received $= 4.25 \\times 16 = 68\\text{ liters}$."
    },

    // Bar Graph Study Patterns (Q46 - Q48)
    {
      id: "apt-46",
      question: "[Graph Analysis] For 32 recorded study days: 2 hrs (10 days), 4 hrs (7 days), 6 hrs (7 days), 8 hrs (5 days), 10 hrs (3 days). How many days did the student study MORE than the average daily hours?",
      options: [
        "5 days",
        "8 days",
        "17 days",
        "15 days"
      ],
      correctAnswerIndex: 3,
      explanation: "Total hours $= (10 \\times 2) + (7 \\times 4) + (7 \\times 6) + (5 \\times 8) + (3 \\times 10) = 20 + 28 + 42 + 40 + 30 = 160\\text{ hrs}$. Average $= \\frac{160}{32} = 5\\text{ hrs/day}$. Days studying $> 5\\text{ hrs}$ (6, 8, 10 hrs) $= 7 + 5 + 3 = 15\\text{ days}$."
    },
    {
      id: "apt-47",
      question: "[Graph Analysis] How many days did the student study LESS than 8 hours?",
      options: [
        "18 days",
        "6 days",
        "24 days",
        "12 days"
      ],
      correctAnswerIndex: 2,
      explanation: "Days with $< 8\\text{ hours}$ (2, 4, and 6 hours) $= 10 + 7 + 7 = 24\\text{ days}$."
    },
    {
      id: "apt-48",
      question: "[Graph Analysis] What is the MEDIAN number of study hours for the 32 days?",
      options: [
        "6 hours",
        "2 hours",
        "8 hours",
        "4 hours"
      ],
      correctAnswerIndex: 3,
      explanation: "For $N = 32$, median is the average of 16th and 17th ordered values. Cumulative counts: 2 hrs (days 1-10), 4 hrs (days 11-17). Both 16th and 17th days fall in 4 hours, so Median = 4 hours."
    },

    // Quantitative Algebra & Calculus (Q49 - Q60)
    {
      id: "apt-49",
      question: "If $-x + 2y = 4$, then find the simplified numerical value of $\\frac{25^y}{5^x}$:",
      options: [
        "125",
        "625",
        "5",
        "25"
      ],
      correctAnswerIndex: 1,
      explanation: "$\\frac{25^y}{5^x} = \\frac{(5^2)^y}{5^x} = 5^{2y - x}$. Given $2y - x = 4$, this evaluates to $5^4 = 625$."
    },
    {
      id: "apt-50",
      question: "A woman burns 416 calories in a 60-minute workout. She burns 10 cal/min swimming and 6 cal/min stationary biking. How many minutes of the hour did she spend swimming?",
      options: [
        "56 minutes",
        "14 minutes",
        "60 minutes",
        "46 minutes"
      ],
      correctAnswerIndex: 1,
      explanation: "Let $t$ be swimming minutes: $10t + 6(60 - t) = 416 \\implies 10t + 360 - 6t = 416 \\implies 4t = 56 \\implies t = 14\\text{ minutes}$."
    },
    {
      id: "apt-51",
      question: "What is the natural domain of the logarithmic function $g(x) = \\ln(1 - x) + \\ln(x)$?",
      options: [
        "$(0, \\infty)$",
        "$\\mathbb{R} \\setminus \\{-1, 0\\}$",
        "$(0, 1)$",
        "$(1, \\infty)$"
      ],
      correctAnswerIndex: 2,
      explanation: "For real logarithms: $1 - x > 0 \\implies x < 1$ and $x > 0$. The intersection yields $0 < x < 1 \\implies (0, 1)$."
    },
    {
      id: "apt-52",
      question: "How many total days are there from the first day of March (March 1) to the last day of May (May 31) inclusive?",
      options: [
        "89 days",
        "92 days",
        "91 days",
        "90 days"
      ],
      correctAnswerIndex: 1,
      explanation: "March (31 days) + April (30 days) + May (31 days) $= 31 + 30 + 31 = 92\\text{ days}$."
    },
    {
      id: "apt-53",
      question: "A corporation pays 10 employees a total of Birr 100,000 monthly. 6 out of 10 employees earn strictly less than Birr 10,000/month.\nQuantity P: Average monthly payment\nQuantity Q: Median monthly payment\nCompare Quantity P and Quantity Q:",
      options: [
        "Quantity P is greater than Quantity Q ($P > Q$)",
        "Quantity P is less than Quantity Q ($P < Q$)",
        "The two quantities cannot be compared",
        "The two quantities are equal"
      ],
      correctAnswerIndex: 0,
      explanation: "Average (P) $= \\frac{100,000}{10} = 10,000\\text{ Birr}$. Since at least 6 out of 10 workers earn $< 10,000$, both the 5th and 6th sorted salaries are $< 10,000$, so Median (Q) $< 10,000$. Hence $P > Q$."
    },
    {
      id: "apt-54",
      question: "Let $x, y, z$ be the side lengths of a non-degenerate triangle.\nQuantity P: $3x + y - z$\nQuantity Q: $4x$\nCompare Quantity P and Quantity Q:",
      options: [
        "Quantity P is less than Quantity Q ($P < Q$)",
        "Quantity P is greater than Quantity Q ($P > Q$)",
        "The two quantities cannot be compared",
        "The two quantities are equal"
      ],
      correctAnswerIndex: 0,
      explanation: "By the Triangle Inequality Theorem: $y < x + z \\implies y - z < x$. Therefore, $3x + (y - z) < 3x + x = 4x$. Thus Quantity P < Quantity Q."
    },
    {
      id: "apt-55",
      question: "Which of the following is true regarding the power function $f(x) = x^{2/5} = (\\sqrt[5]{x})^2$?",
      options: [
        "The domain is $\\{x \\in \\mathbb{R} \\mid x \\ge 0\\}$",
        "The range of $f$ is $\\{y \\in \\mathbb{R} \\mid y \\ge 0\\}$",
        "The range of $f$ is all real numbers $\\mathbb{R}$",
        "The domain is negative numbers only"
      ],
      correctAnswerIndex: 1,
      explanation: "Since the root is odd (5th root), the domain is all real numbers $\\mathbb{R}$. Because the numerator is even (squared), the output is always non-negative: $[0, \\infty)$."
    },
    {
      id: "apt-56",
      question: "Find the missing value $z$ in the alternating sequence: $1, 2, 4, 8, 10, 20, 22, z, \\dots$",
      options: [
        "44",
        "24",
        "32",
        "40"
      ],
      correctAnswerIndex: 0,
      explanation: "Rule alternates: $\\times 2, +2, \\times 2, +2, \\dots$\n$1 \\times 2 = 2$\n$2 + 2 = 4$\n$4 \\times 2 = 8$\n$8 + 2 = 10$\n$10 \\times 2 = 20$\n$20 + 2 = 22$\n$z = 22 \\times 2 = 44$."
    },
    {
      id: "apt-57",
      question: "A $6\\text{m} \\times 6\\text{m}$ square floor ($36\\text{ m}^2$) is tiled with $1\\text{ m}^2$ ceramic tiles. Black tiles are placed along both complete diagonals, and white tiles cover the rest. What is the ratio of black to white tiles?",
      options: [
        "$1 : 6$",
        "$1 : 2$",
        "$1 : 5$",
        "$4 : 5$"
      ],
      correctAnswerIndex: 1,
      explanation: "In a $6 \\times 6$ grid (even dimension), the two diagonals do not share a common center tile. Each diagonal has 6 tiles $\\implies 6 + 6 = 12$ black tiles. White tiles $= 36 - 12 = 24$. Ratio black:white $= 12 : 24 = 1 : 2$."
    },
    {
      id: "apt-58",
      question: "The daily profit for a T-shirt factory is $p(x) = -x^2 + 1400x - 80000$. Which selling price range $x$ yields a profit of at least Birr 400,000?",
      options: [
        "$600 \\le x \\le 800$",
        "$x \\le 800$",
        "$x \\le 600 \\text{ or } x \\ge 800$",
        "$x \\le 600$"
      ],
      correctAnswerIndex: 0,
      explanation: "$-x^2 + 1400x - 80000 \\ge 400000 \\implies -x^2 + 1400x - 480000 \\ge 0 \\implies x^2 - 1400x + 480000 \\le 0 \\implies (x - 600)(x - 800) \\le 0 \\implies 600 \\le x \\le 800$."
    },
    {
      id: "apt-59",
      question: "Points A, B, and C lie on a circle of radius $R = 2$ centered at O, forming an equilateral triangle. What is the area of triangle ABC in square units?",
      options: [
        "$3$",
        "$\\sqrt{3}$",
        "$1$",
        "$3\\sqrt{3}$"
      ],
      correctAnswerIndex: 3,
      explanation: "Circumradius $R = \\frac{a}{\\sqrt{3}} \\implies a = 2\\sqrt{3}$. Area of equilateral triangle $= \\frac{\\sqrt{3}}{4} a^2 = \\frac{\\sqrt{3}}{4} (2\\sqrt{3})^2 = \\frac{\\sqrt{3}}{4}(12) = 3\\sqrt{3}$."
    },
    {
      id: "apt-60",
      question: "Find the missing term $x$ in the sequence: $-1, 0, 1, 2, -1, 8, 1, 26, -1, x, 1, 242, -1, 728, 1, \\dots$",
      options: [
        "54",
        "36",
        "80",
        "34"
      ],
      correctAnswerIndex: 2,
      explanation: "Looking at terms at positions 2, 4, 6, 8, 10, 12: $0, 2, 8, 26, x, 242, 728$. The pattern is $a_n = 3a_{n-1} + 2$ (or $3^k - 1$): $3^1 - 1 = 2$, $3^2 - 1 = 8$, $3^3 - 1 = 26$, $3^4 - 1 = 80$, $3^5 - 1 = 242$. Therefore, $x = 80$."
    }
  ] as Question[]
};
