export type NominationQuestion = {
  id: string;
  section: string;
  prompt: string;
  wordLimit?: number;
  evidence?: string[];
};

export type AwardCategory = {
  id: string;
  name: string;
  short: string;
  tagline: string;
  description: string;
  recognises: string[];
  questions: NominationQuestion[];
};

// ─── Judge evaluation criteria ────────────────────────────────────────────────
// Each category has its own set of judge criteria derived from its nomination
// questions. Judges rate 1–5 stars per criterion; the leaderboard sums the totals.
//
// Keep `id` values stable once scoring begins — changing an id orphans saved scores.

export type EvaluationCriterion = {
  id: string;
  /** Short label shown above the star picker */
  label: string;
  /** Optional helper text describing what to assess */
  description?: string;
  /** Maximum stars for this criterion (default 5) */
  max?: number;
  /** Weight used when computing the weighted average (default 1) */
  weight?: number;
};

// ─── Per-category criteria ────────────────────────────────────────────────────

const CRITERIA_DEAN: EvaluationCriterion[] = [
  { id: "dean-c1", label: "Academic Excellence", description: "Has the nominee demonstrated a strong academic record (75%+ aggregate)? Are their achievements well-evidenced?", max: 5, weight: 2 },
  { id: "dean-c2", label: "Leadership & Mentorship", description: "Quality and breadth of leadership roles held and impact on peers through mentorship.", max: 5, weight: 2 },
  { id: "dean-c3", label: "Community Service & Outreach", description: "Depth and sustained nature of community or campus outreach contributions.", max: 5, weight: 1 },
  { id: "dean-c4", label: "Innovation & Creativity", description: "Has the nominee introduced original ideas or improved processes at DUT or in the community?", max: 5, weight: 1 },
  { id: "dean-c5", label: "Integrity & Values", description: "Does the nominee embody SALEA values: excellence, integrity, leadership and DUT's Living Values Framework?", max: 5, weight: 1 },
  { id: "dean-c6", label: "Personal Growth", description: "Evidence of deliberate personal development, resilience and overcoming challenges.", max: 5, weight: 1 },
];

const CRITERIA_SPORT: EvaluationCriterion[] = [
  { id: "sport-c1", label: "Sportsmanship & Integrity", description: "Demonstrated integrity, fairness, respect for opponents and positive attitude during competition.", max: 5, weight: 2 },
  { id: "sport-c2", label: "Leadership in Sport", description: "Leadership roles held — captain, club officer, event organiser — and the impact of that leadership.", max: 5, weight: 2 },
  { id: "sport-c3", label: "Team & Community Culture", description: "Has the nominee fostered unity, teamwork and a positive sport culture at DUT or in the community?", max: 5, weight: 1 },
  { id: "sport-c4", label: "Academic Balance", description: "Has the nominee maintained the required academic standard (65%) alongside their sporting commitments?", max: 5, weight: 1 },
];

const CRITERIA_WELLNESS: EvaluationCriterion[] = [
  { id: "well-c1", label: "Quality of Wellness Initiative", description: "How impactful, innovative and well-organised were the wellness programmes or activities led by the nominee?", max: 5, weight: 2 },
  { id: "well-c2", label: "Measurable Impact on Peers", description: "Evidence of positive change in physical, mental or emotional well-being of DUT students.", max: 5, weight: 2 },
  { id: "well-c3", label: "Collaboration & Sustainability", description: "Did the nominee collaborate with other departments or organisations? Are the initiatives sustainable?", max: 5, weight: 1 },
];

const CRITERIA_SOCIETY: EvaluationCriterion[] = [
  { id: "soc-c1", label: "Leadership Excellence", description: "Quality of academic excellence and leadership initiatives driven by the society/club.", max: 5, weight: 2 },
  { id: "soc-c2", label: "Impactful Initiatives", description: "Evidence of initiatives that meaningfully enhanced DUT student life (outputs and outcomes documented).", max: 5, weight: 2 },
  { id: "soc-c3", label: "Inclusivity & Vibrancy", description: "Commitment to a diverse, vibrant, inclusive campus community.", max: 5, weight: 1 },
  { id: "soc-c4", label: "Creative & Innovative Approaches", description: "Did the society use unique, creative methods to achieve objectives?", max: 5, weight: 1 },
  { id: "soc-c5", label: "Collaborations", description: "Quality and reach of partnerships with other organisations, departments or external bodies.", max: 5, weight: 1 },
  { id: "soc-c6", label: "Documented Outcomes", description: "Are the outcomes clearly evidenced through reports, registers and testimonials?", max: 5, weight: 1 },
];

const CRITERIA_RESIDENCE: EvaluationCriterion[] = [
  { id: "res-c1", label: "Overall Residence Achievement", description: "How compelling is the residence's story of excellence — culture, engagement and student outcomes?", max: 5, weight: 2 },
  { id: "res-c2", label: "Programme Quality & Attendance", description: "Quality, frequency and attendance rates of in-house and central programmes.", max: 5, weight: 2 },
  { id: "res-c3", label: "Living Values in Practice", description: "How well are DUT Living Values embedded — consequence management, code of conduct and resident well-being?", max: 5, weight: 2 },
];

const CRITERIA_ENTREPRENEUR: EvaluationCriterion[] = [
  { id: "ent-c1", label: "Originality & Value Proposition", description: "How original, unique and relevant is the entrepreneurial venture? Is the value proposition clearly articulated?", max: 5, weight: 2 },
  { id: "ent-c2", label: "Vision & Strategic Leadership", description: "Clarity of long-term vision and evidence that the nominee is effectively leading the venture toward it.", max: 5, weight: 2 },
  { id: "ent-c3", label: "Resilience & Personal Growth", description: "Depth of reflection on challenges faced and growth demonstrated on the entrepreneurial journey.", max: 5, weight: 1 },
  { id: "ent-c4", label: "Team & Resource Management", description: "Effectiveness of managing people, finances and operations for productivity.", max: 5, weight: 1 },
  { id: "ent-c5", label: "Social Responsibility & Community Impact", description: "Contribution of the venture to social responsibility or the DUT/broader community.", max: 5, weight: 1 },
];

const CRITERIA_EMERGING: EvaluationCriterion[] = [
  { id: "em-c1", label: "Early Leadership Potential", description: "Strength and quality of leadership roles already taken as a first-year student.", max: 5, weight: 2 },
  { id: "em-c2", label: "Character & Integrity", description: "Evidence of outstanding integrity, positive values and making a difference for others.", max: 5, weight: 2 },
  { id: "em-c3", label: "Positive Difference Made", description: "Specific, documented moments where the nominee improved student life or the DUT community.", max: 5, weight: 2 },
];

const CRITERIA_DIVERSITY: EvaluationCriterion[] = [
  { id: "div-c1", label: "Advocacy Effectiveness", description: "How effectively has the nominee championed minority or special-interest groups on campus?", max: 5, weight: 2 },
  { id: "div-c2", label: "Measurable Impact", description: "Evidence of positive change in campus culture, belonging or inclusion (attendance, surveys, testimonials).", max: 5, weight: 2 },
  { id: "div-c3", label: "Cross-department Collaboration", description: "Quality of partnerships formed with other units, departments or external organisations to advance inclusion.", max: 5, weight: 1 },
];

/** Criteria map keyed by category id */
const CRITERIA_BY_CATEGORY: Record<string, EvaluationCriterion[]> = {
  dean: CRITERIA_DEAN,
  sport: CRITERIA_SPORT,
  wellness: CRITERIA_WELLNESS,
  society: CRITERIA_SOCIETY,
  residence: CRITERIA_RESIDENCE,
  entrepreneur: CRITERIA_ENTREPRENEUR,
  emerging: CRITERIA_EMERGING,
  diversity: CRITERIA_DIVERSITY,
};

/** Fallback for unknown/missing category ids */
export const EVALUATION_CRITERIA: EvaluationCriterion[] = CRITERIA_DEAN;

/**
 * Returns the evaluation criteria for a given category id.
 * Falls back to Dean's Award criteria if the id is not recognised.
 */
export function getCriteriaForCategory(categoryId?: string): EvaluationCriterion[] {
  if (!categoryId) return EVALUATION_CRITERIA;
  return CRITERIA_BY_CATEGORY[categoryId] ?? EVALUATION_CRITERIA;
}

/** Weighted average (0–5 scale) of a set of per-criterion star ratings. */
export function computeWeightedAverage(
  criteriaScores: Record<string, number>,
  criteria: EvaluationCriterion[] = EVALUATION_CRITERIA,
): number {
  let weightedSum = 0;
  let weightTotal = 0;
  for (const c of criteria) {
    const raw = criteriaScores[c.id];
    if (typeof raw !== "number" || raw <= 0) continue;
    const max = c.max ?? 5;
    const weight = c.weight ?? 1;
    // Normalise each criterion onto a 0–5 scale before weighting.
    const normalised = (raw / max) * 5;
    weightedSum += normalised * weight;
    weightTotal += weight;
  }
  return weightTotal === 0 ? 0 : weightedSum / weightTotal;
}

export const AWARD_THEME = {
  title: "SALEA 2026",
  subtitle: "Recognising Excellence · Celebrating Leadership · Inspiring Greatness",
  eventName: "Student Academic & Leadership Excellence Awards",
  recognitionPeriod: "1 July 2025 – 30 June 2026",
  nominationWindow: "01 July 2026 – 31 July 2026",
  closingDate: "31 July 2026",
  /** ISO date strings for judge scoring window */
  scoringOpenDate: "2026-08-01", // day after nominations close
  scoringDeadline: "2026-08-15", // judges must submit by this date
  venue: "DUT Sports Center",
  openingAddressTitle: "Welcome & Opening Address",
  openingAddressRemarks: "Dean's remarks",
  yearsBadge: "Student Academic & Leadership Excellence Awards 2026",
};

export const AWARD_CATEGORIES: AwardCategory[] = [
  {
    id: "dean",
    name: "Dean of Students Prestigious Award",
    short: "Dean's Prestigious",
    tagline: "All-round excellence in academics and leadership.",
    description:
      "Recognises students who have demonstrated outstanding achievements across academic excellence, leadership, community engagement, innovation and personal growth — embodying the spirit of excellence and inspiring greatness.",
    recognises: [
      "Academic excellence with an aggregate of 75% or above",
      "Leadership in student-led initiatives & mentorship of peers",
      "Active community service and outreach contribution",
      "Innovative, creative solutions for the university or community",
      "Exceptional character and integrity",
      "Demonstrated personal growth and self-improvement",
    ],
    questions: [
      { id: "dean-a1", section: "Academic Excellence", prompt: "Upload your latest academic transcript / progress report (75%+ aggregate). Describe how the nominee pursues academic excellence.", evidence: ["2025 academic transcript (official, stamped)", "Certificate of merit / Dean's List", "Testimonials from lecturers and tutors"] },
      { id: "dean-b1", section: "Leadership", prompt: "Describe your involvement in leadership roles in student-led initiatives. Share a project or initiative you started or led that positively impacted other students or the broader community.", wordLimit: 500, evidence: ["Recommendation letter", "Event poster", "Post-programme report", "Attendance registers, photos, testimonials"] },
      { id: "dean-b2", section: "Leadership", prompt: "How have you used your influence to positively impact your peers? Provide specific examples.", wordLimit: 500 },
      { id: "dean-c1", section: "Community Engagement", prompt: "Describe the community service / outreach programmes you have been involved in (aim and objectives).", wordLimit: 500, evidence: ["Signed testimonials", "Event schedule & topics", "Attendance registers", "Photos / videos", "Certificate of participation"] },
      { id: "dean-c2", section: "Community Engagement", prompt: "How have your contributions improved the campus environment or the surrounding community?", wordLimit: 500 },
      { id: "dean-c3", section: "Community Engagement", prompt: "In what ways have you demonstrated a commitment to civic engagement or social responsibility?", wordLimit: 500 },
      { id: "dean-d1", section: "Innovation & Creativity", prompt: "Share an innovative plan/project you developed to enhance current processes at DUT or in your community.", wordLimit: 500, evidence: ["Signed testimonial", "Attendance registers", "Photos / video", "Prototype or project report"] },
      { id: "dean-f1", section: "Commitment to Values", prompt: "Describe how your actions demonstrate excellence, integrity and leadership in the spirit of SALEA 2026.", wordLimit: 500 },
      { id: "dean-f2", section: "Commitment to University Values", prompt: "In what ways have you promoted a positive campus culture? List at least three DUT initiatives that highlight the Living Values Framework." },
      { id: "dean-g1", section: "Personal Growth", prompt: "Describe your journey of personal growth and self-improvement during your time at DUT, including challenges overcome.", wordLimit: 500, evidence: ["Reflection essay", "Certificates"] },
    ],
  },
  {
    id: "sport",
    name: "Sportsmanship Award",
    short: "Sportsmanship",
    tagline: "Performance, teamwork, exemplary character.",
    description:
      "Honours a team or individual who demonstrated outstanding performance, teamwork and exemplary sportsmanship during the recognition period — exhibiting integrity, fairness and respect on and off the field.",
    recognises: [
      "Participation in competitions / leagues with strong progression",
      "Academic aggregate of 65% individuals / 60% team average",
      "Demonstrated DUT Living Values",
    ],
    questions: [
      { id: "sport-1", section: "Demonstrated Sportsmanship", prompt: "Describe specific incidents or consistent behaviours that demonstrate the nominee's integrity, fairness, respect for opponents and positive attitude. Outline track record and placements.", wordLimit: 300, evidence: ["Testimonial from coach / team manager", "Match reports", "Academic records"] },
      { id: "sport-2", section: "Leadership in Sport", prompt: "Outline the nominee's / team's leadership roles in sports teams, clubs or sporting events.", wordLimit: 300, evidence: ["Testimonial from coach / league organiser", "Team captaincy records"] },
      { id: "sport-3", section: "Impact on Team & Community Culture", prompt: "Describe how the nominee has fostered unity, teamwork and sports culture within DUT or the community.", wordLimit: 300, evidence: ["Testimonials from teammates", "Post programme reports", "Photos of team-building", "3 reflective essays (≤500 words each)"] },
      { id: "sport-4", section: "Leadership & Impact", prompt: "Reflect on how the nominee has demonstrated exceptional leadership and positive impact on their sport and peers.", wordLimit: 300, evidence: ["Endorsement letter from Sport Officer / coach / SRC"] },
    ],
  },
  {
    id: "wellness",
    name: "Promotion of Healthy Lifestyle Award",
    short: "Healthy Lifestyle",
    tagline: "Wellness initiatives that change lives.",
    description:
      "Recognises individuals, groups or societies who have contributed to promoting health and wellness within DUT — initiatives that impact physical, mental and emotional well-being.",
    recognises: [
      "Organising wellness activities, workshops or campus programmes",
      "Academic aggregate of 65% in the recognition period",
      "Positive impact on peers' health & wellbeing",
      "Innovative, creative wellness approaches",
      "Active collaboration with departments / organisations",
      "Sustainable wellness practices",
    ],
    questions: [
      { id: "well-1", section: "Wellness Initiative", prompt: "Describe a wellness activity, initiative or programme the nominee organised, led or promoted on campus (physical, mental or emotional well-being).", wordLimit: 300, evidence: ["Event poster", "Proposal of activities"] },
      { id: "well-2", section: "Impact Report", prompt: "Report on the positive impact the nominee's wellness activities have had on the DUT community.", wordLimit: 300, evidence: ["Photos", "Feedback reports", "Attendance registers", "Testimonials"] },
      { id: "well-3", section: "Collaboration", prompt: "Describe a project the nominee has collaborated on with other units / departments within the university.", wordLimit: 300, evidence: ["Implementation plan", "Attendance registers & feedback reports", "Post-survey report"] },
    ],
  },
  {
    id: "society",
    name: "Exemplary Society/Club/Structure Award",
    short: "Exemplary Society",
    tagline: "Organizations that lead with excellence.",
    description:
      "Recognises student clubs, societies or student-led structures that have demonstrated extraordinary dedication and influence — celebrating their contributions to academic excellence and leadership on campus.",
    recognises: [
      "Initiatives promoting academic excellence and leadership",
      "Initiatives enhancing student life and community involvement",
      "Cultivating an inclusive and vibrant community",
      "Creative, innovative approaches",
      "Collaboration with other organisations and academic departments",
      "Aggregate of 65% individuals / 60% group",
    ],
    questions: [
      { id: "soc-1", section: "Excellence in Leadership", prompt: "Describe how the nominee/group has driven activities demonstrating academic excellence and leadership. List at least three key initiatives led, outlining impact.", wordLimit: 500, evidence: ["Narrative report", "Photos, posters or programme draft"] },
      { id: "soc-2", section: "Impactful Initiatives", prompt: "Provide evidence of impactful initiatives that have enhanced DUT student life. Specify outputs and outcomes.", wordLimit: 500, evidence: ["Testimonials", "Attendance registers & evaluations", "Event outcome reports", "Photos & videos"] },
      { id: "soc-3", section: "Inclusivity & Vibrancy", prompt: "Explain how the nominee has demonstrated commitment to cultivating an inclusive, vibrant DUT community.", wordLimit: 500, evidence: ["Narrative with proof of vibrancy", "Photos / videos from inclusive events"] },
      { id: "soc-4", section: "Creative Approaches", prompt: "Outline specific instances where the nominee used creative and unique approaches to achieve their objectives.", wordLimit: 500, evidence: ["Narrative", "Multimedia (graphics, videos)", "Reports"] },
      { id: "soc-5", section: "Collaborations", prompt: "Detail any collaborations with other student organisations, services, academic departments or external organisations.", wordLimit: 500, evidence: ["Collaboration agreements", "Joint event reports", "Photos / flyers", "Letters of endorsement"] },
      { id: "soc-6", section: "Outcomes", prompt: "List the success and outcomes achieved from the activities / programmes.", wordLimit: 500, evidence: ["Final project report", "Reports highlighting outputs & outcomes"] },
    ],
  },
  {
    id: "residence",
    name: "Outstanding Residence Life Award",
    short: "Residence Life",
    tagline: "Where home becomes a community of excellence.",
    description:
      "Recognises a residence with the most impactful residence-life initiatives — high attendance, discipline, peer-to-peer support and a nurturing environment.",
    recognises: [
      "High attendance in In-House and central programmes",
      "DUT Living Values with strong consequence management",
      "Cohesive, inclusive residence with collective culture of care",
    ],
    questions: [
      { id: "res-1", section: "Residence Story", prompt: "Why does this residence deserve the Outstanding Residence Life Award? Include key achievements, what makes the residence stand out, the overall residence culture, and impact on student well-being and success.", evidence: ["Document highlighting achievements, engagement and inclusivity"] },
      { id: "res-2", section: "Programme Detail", prompt: "Outline the programmes held, detailing progress and impact.", wordLimit: 500, evidence: ["Residence programme reports (objectives, outcomes, themes)", "Plan of Action / Programme proposal", "Attendance registers", "Testimonials / feedback"] },
      { id: "res-3", section: "Living Values in Practice", prompt: "Detail how the DUT Living Values are sensitised within the residence. Use case examples and resolution strategies. How was the handbook and residence code of conduct workshopped?", evidence: ["1-page summary of intervention strategies / best practices", "Evidence of referrals where applicable"] },
    ],
  },
  {
    id: "entrepreneur",
    name: "Student Entrepreneurship Award",
    short: "Entrepreneurship",
    tagline: "Risk-takers with a clear vision.",
    description:
      "Recognises students who have demonstrated skills in creating and running a successful entrepreneurial project (including social or close-corporation ventures) — risk takers with original ideas and a clear vision.",
    recognises: [
      "Innovative, original ideas & unique value propositions",
      "Strong leadership and clear strategic vision",
      "Personal growth — overcoming challenges, continuous learning",
      "Effective management of team and resources",
      "Contribution to social responsibility / DUT community",
      "Aggregate of 65% individuals / 60% group",
    ],
    questions: [
      { id: "ent-1", section: "Originality & Value", prompt: "Describe how the entrepreneurial endeavour is original, unique and relevant. What makes the product or service unique and how does it add value?", wordLimit: 300, evidence: ["Product / service brochures", "Photos / videos of product in use", "Customer testimonials", "Patents / trademarks if any"] },
      { id: "ent-2", section: "Vision & Leadership", prompt: "What is your long-term vision and how have you demonstrated leadership in turning it into reality?", wordLimit: 300, evidence: ["Viability & sustainability report", "Team testimonials", "Incubation report", "Records of goals & achievements"] },
      { id: "ent-3", section: "Personal Journey", prompt: "Reflect on your entrepreneurial journey — challenges faced and personal growth.", wordLimit: 500, evidence: ["Reflective essay"] },
      { id: "ent-4", section: "Team & Resource Management", prompt: "How do you manage your team or resources to ensure productivity and smooth operations?", wordLimit: 300, evidence: ["Job descriptions / task allocation", "Meeting minutes", "Workflow / resource tracking", "Project plans"] },
      { id: "ent-5", section: "Social Responsibility", prompt: "How does your project contribute to social responsibility or the DUT community?", wordLimit: 300, evidence: ["Narrative reports (with photos & registers)", "Beneficiary testimonials", "Letters of collaboration"] },
    ],
  },
  {
    id: "emerging",
    name: "Emerging Leader (First Year Student)",
    short: "Emerging Leader",
    tagline: "Future leaders, already shining.",
    description:
      "Honours a remarkable first-year student who exemplifies transformational leadership and academic excellence — proactive, resilient, people-centred and committed to celebrating greatness in others.",
    recognises: [
      "Aggregate of 65% in recent progress report",
      "Early evidence of leadership potential and character",
      "Continuous learning and development mindset",
      "Currently in first year of study",
    ],
    questions: [
      { id: "em-0", section: "Registration", prompt: "Upload proof of registration.", evidence: ["Proof of registration"] },
      { id: "em-1", section: "Leadership Roles", prompt: "Describe leadership roles taken in any student organisations, co/extra-curricular activities or community service. Responsibilities and impact.", wordLimit: 300, evidence: ["Certificates of participation / leadership", "Photos / videos", "Testimonial from lecturer / peer / project leader"] },
      { id: "em-2", section: "Character & Values", prompt: "How have you demonstrated integrity and outstanding character? Provide examples of incidents, experiences or opportunities where you've made a positive difference.", wordLimit: 500, evidence: ["Reflective essay", "Reference letter from lecturer / mentor / peer"] },
      { id: "em-3", section: "Positive Difference", prompt: "How have you made a positive difference in the lives of other students or within the DUT community? Share specific moments or initiatives.", wordLimit: 300, evidence: ["Testimonials from peers / staff", "Photos or reports from outreach", "Letters of collaboration"] },
    ],
  },
  {
    id: "diversity",
    name: "Diversity & Inclusion Award",
    short: "Diversity & Inclusion",
    tagline: "Belonging, advocacy, an enabling DUT.",
    description:
      "Recognises activities and practices that foster an institution where everyone feels valued, respected and included — creating a safe and enabling environment for both students and staff.",
    recognises: [
      "Sustained commitment & advocacy for minority / special-interest groups",
      "Initiatives promoting cohesive, inclusive campus culture",
      "Track record of collaborations with departments / units",
      "Aggregate of 65% individuals / 60% team",
    ],
    questions: [
      { id: "div-1", section: "Advocacy", prompt: "Describe how the nominee has excelled in advocating for minority or special-interest groups.", evidence: ["Project reports with registers"] },
      { id: "div-2", section: "Impact", prompt: "Report on the positive impact the nominee has had to university students and the community. Provide evidence.", wordLimit: 300, evidence: ["Attendance registers & feedback reports", "Meeting minutes", "Testimonials"] },
      { id: "div-3", section: "Collaboration", prompt: "Describe a project the nominee has collaborated on with other units and academic departments to advance diversity & inclusion.", wordLimit: 300, evidence: ["Implementation plan", "Attendance registers & feedback reports", "Post-survey report", "Participation certificate"] },
    ],
  },
];

export type CategoryId = (typeof AWARD_CATEGORIES)[number]["id"];

export const FACULTIES = [
  "Accounting & Informatics",
  "Applied Sciences",
  "Arts & Design",
  "Engineering & Built Environment",
  "Health Sciences",
  "Management Sciences",
];

export const PAST_WINNERS = [
  { year: 2024, category: "Dean of Students Prestigious Award", name: "Thandeka Mhlongo", faculty: "Management Sciences", quote: "Leadership is the courage to listen first." },
  { year: 2024, category: "Sportsmanship Award", name: "Lwazi Khumalo", faculty: "Applied Sciences", quote: "Discipline carries you when motivation cannot." },
  { year: 2024, category: "Promotion of Healthy Lifestyle Award", name: "Aisha Patel", faculty: "Health Sciences", quote: "Service is love made visible." },
  { year: 2024, category: "Exemplary Society / Club / Structure Award", name: "DUT Activate Society", faculty: "Steve Biko Campus", quote: "Together is a verb." },
  { year: 2024, category: "Outstanding Residence Life Award", name: "Steve Biko Residence", faculty: "Steve Biko Campus", quote: "Home is where character is built." },
  { year: 2024, category: "Diversity & Inclusion Award", name: "Nomvula Zulu", faculty: "Arts & Design", quote: "Belonging is the first freedom." },

  { year: 2023, category: "Dean of Students Prestigious Award", name: "Mandla Cele", faculty: "Management Sciences", quote: "We rise by lifting others." },
  { year: 2023, category: "Student Entrepreneurship Award", name: "Junior Ndlovu", faculty: "Management Sciences", quote: "Build small, build now, build true." },
  { year: 2023, category: "Emerging Leader (First Year Student)", name: "Priya Naidoo", faculty: "Accounting & Informatics", quote: "Excellence is a habit, not an accident." },
  { year: 2023, category: "Sportsmanship Award", name: "Andile Zungu", faculty: "Applied Sciences", quote: "Every champion was once a beginner who refused to quit." },
  { year: 2023, category: "Outstanding Residence Life Award", name: "L Section Residence", faculty: "ML Sultan Campus", quote: "Care is the curriculum." },

  { year: 2022, category: "Dean of Students Prestigious Award", name: "Zinhle Buthelezi", faculty: "Engineering & Built Environment", quote: "Lead with the door open." },
  { year: 2022, category: "Diversity & Inclusion Award", name: "Lerato Mokoena", faculty: "Arts & Design", quote: "Difference is our greatest design." },
  { year: 2022, category: "Student Entrepreneurship Award", name: "Kuda Moyo", faculty: "Applied Sciences", quote: "Knowledge is the only crown that doesn't tarnish." },
  { year: 2022, category: "Sportsmanship Award", name: "Bongi Mthembu", faculty: "Health Sciences", quote: "Strength is the smile after the struggle." },
];
