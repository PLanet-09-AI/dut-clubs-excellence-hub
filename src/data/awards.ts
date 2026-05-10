export const AWARD_CATEGORIES = [
  { id: "leader", name: "Student Leader of the Year", eligibility: "Active SRC, club or society leadership role for at least one academic year." },
  { id: "academic", name: "Academic Excellence", eligibility: "Cumulative average of 75% or higher across the latest two semesters." },
  { id: "community", name: "Community Impact", eligibility: "Documented community service of 40+ hours during 2025–2026." },
  { id: "sport", name: "Sportsperson of the Year", eligibility: "Represented DUT at provincial or national level during 2025–2026." },
  { id: "cultural", name: "Cultural Ambassador", eligibility: "Active member of a recognised DUT cultural ensemble or arts initiative." },
  { id: "residence", name: "Residence of the Year", eligibility: "Nomination submitted by a residence committee or warden." },
  { id: "innovation", name: "Innovation & Entrepreneurship", eligibility: "Founder or co-founder of a registered student venture or research initiative." },
  { id: "rising", name: "Rising Star (First Year)", eligibility: "Currently in first year with a notable contribution to campus life." },
] as const;

export type CategoryId = (typeof AWARD_CATEGORIES)[number]["id"];

export const PAST_WINNERS = [
  { year: 2024, category: "Student Leader of the Year", name: "Thandeka Mhlongo", faculty: "Management Sciences", quote: "Leadership is the courage to listen first." },
  { year: 2024, category: "Academic Excellence", name: "Sipho Dlamini", faculty: "Engineering & Built Environment", quote: "Curiosity is the engine of greatness." },
  { year: 2024, category: "Community Impact", name: "Aisha Patel", faculty: "Health Sciences", quote: "Service is love made visible." },
  { year: 2024, category: "Sportsperson of the Year", name: "Lwazi Khumalo", faculty: "Applied Sciences", quote: "Discipline carries you when motivation cannot." },
  { year: 2024, category: "Cultural Ambassador", name: "Nomvula Zulu", faculty: "Arts & Design", quote: "Culture is memory dancing forward." },

  { year: 2023, category: "Student Leader of the Year", name: "Mandla Cele", faculty: "Management Sciences", quote: "We rise by lifting others." },
  { year: 2023, category: "Academic Excellence", name: "Priya Naidoo", faculty: "Accounting & Informatics", quote: "Excellence is a habit, not an accident." },
  { year: 2023, category: "Community Impact", name: "Sibongile Mbatha", faculty: "Health Sciences", quote: "The quietest acts ripple the furthest." },
  { year: 2023, category: "Sportsperson of the Year", name: "Andile Zungu", faculty: "Applied Sciences", quote: "Every champion was once a beginner who refused to quit." },
  { year: 2023, category: "Residence of the Year", name: "Steve Biko Residence", faculty: "Steve Biko Campus", quote: "Home is where character is built." },

  { year: 2022, category: "Student Leader of the Year", name: "Zinhle Buthelezi", faculty: "Engineering & Built Environment", quote: "Lead with the door open." },
  { year: 2022, category: "Academic Excellence", name: "Kuda Moyo", faculty: "Applied Sciences", quote: "Knowledge is the only crown that doesn't tarnish." },
  { year: 2022, category: "Cultural Ambassador", name: "Lerato Mokoena", faculty: "Arts & Design", quote: "Art is how we say what words cannot." },
  { year: 2022, category: "Innovation & Entrepreneurship", name: "Junior Ndlovu", faculty: "Management Sciences", quote: "Build small, build now, build true." },
  { year: 2022, category: "Sportsperson of the Year", name: "Bongi Mthembu", faculty: "Health Sciences", quote: "Strength is the smile after the struggle." },
];

export const FACULTIES = [
  "Accounting & Informatics",
  "Applied Sciences",
  "Arts & Design",
  "Engineering & Built Environment",
  "Health Sciences",
  "Management Sciences",
];
