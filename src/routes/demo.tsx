// /demo — Interactive sandbox for practising judge scoring (no Firestore writes)
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  Trophy,
  Play,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  MessageSquare,
  BookOpen,
  AlertCircle,
  Medal,
  BarChart3,
  X,
  FileText,
  User,
  GraduationCap,
  Building2,
} from "lucide-react";
import SiteNav from "@/components/SiteNav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { getCriteriaForCategory, computeWeightedAverage, AWARD_CATEGORIES } from "@/data/awards";

export const Route = createFileRoute("/demo")({
  component: DemoPage,
  head: () => ({
    meta: [
      { title: "Demo Sandbox · SALEA 2026" },
      { name: "description", content: "Practice the judge rating flow with dummy nominees." },
    ],
  }),
});

// ─── Dummy nominees with realistic question answers ───────────────────────────

type DemoNominee = {
  id: string;
  name: string;
  studentNumber: string;
  faculty: string;
  year: string;
  category: string;
  categoryId: string;
  nominatorName: string;
  nominatorRelationship: string;
  /** Keyed by question id from AWARD_CATEGORIES */
  answers: Record<string, string>;
};

const DEMO_NOMINEES: DemoNominee[] = [
  {
    id: "demo-1",
    name: "Ayanda Khumalo",
    studentNumber: "21001234",
    faculty: "Faculty of Engineering & the Built Environment",
    year: "3rd Year — BSc Civil Engineering",
    category: "Dean of Students Prestigious Award",
    categoryId: "dean",
    nominatorName: "Prof. S. Govender",
    nominatorRelationship: "Lecturer & Academic Advisor",
    answers: {
      "dean-a1":
        "Ayanda has maintained an academic average of 78% for three consecutive semesters and has appeared on the Dean's List in 2024 and 2025. She balances a demanding Engineering curriculum with extensive extracurricular commitments without any academic compromise. Her lecturers consistently note her proactive approach in tutorials and her willingness to assist peers who are struggling.",
      "dean-b1":
        "As President of the DUT Engineering Society (2024–2025), Ayanda led a committee of 14 students to deliver eight technical workshops attended by over 300 students. Her flagship initiative, the WomenInSTEM Conference, brought industry speakers from Arup, WSP and the SANRAL Graduate Programme to campus. 120 students attended and 18 women were connected with internship opportunities directly from the event. She also designed a peer-mentoring pilot in which third-year students are paired with first-years, resulting in a measured 12% improvement in first-year pass rates in Engineering Mathematics.",
      "dean-b2":
        "Ayanda created a WhatsApp study group network across five Engineering modules, reaching 180 students. She hosts weekly 'Tutoring Tuesday' sessions from 17:00–19:00 voluntarily, and three students who were at risk of academic exclusion last semester passed after regular engagement with her sessions. She leads by example — she never misses a session, prepares structured material, and follows up individually with students who fall behind.",
      "dean-c1":
        "Ayanda volunteers every Saturday morning from 08:00–11:00 at the Umlazi Youth Centre, where she runs a Coding & Problem-Solving club for Grade 10–12 learners. The aim is to demystify STEM careers for learners from previously disadvantaged communities and to bridge the gap between schooling and tertiary-level thinking. The club has grown from 9 to 34 learners over 8 months.",
      "dean-c2":
        "Through her Saturday coding sessions, Ayanda has introduced 34 secondary school learners to basic programming and engineering design thinking. Three of these learners have already applied to DUT for the 2027 cohort and cited Ayanda's sessions as their primary motivation. On campus, her peer-mentoring programme has raised first-year retention awareness and created a culture of 'senior students giving back' within the Engineering faculty.",
      "dean-c3":
        "Ayanda co-chairs the DUT SRC's Academic Transformation Portfolio, where she advocates for extended library hours during examination periods and the provision of data-free access to course materials for students in financial distress. She led a petition signed by 620 students that resulted in the Faculty of Engineering agreeing to host additional consultation sessions before major assessments.",
      "dean-d1":
        "Ayanda developed a mobile-friendly 'Engineering Buddy' app prototype (built in React Native) that matches first-year students with senior mentors based on their module choices and learning style preferences. The app was presented at the DUT Innovation Expo 2025 and awarded the Best Student Digital Solution prize by the judges panel. She is currently collaborating with the DUT IT department to explore formal adoption.",
      "dean-f1":
        "Ayanda embodies SALEA's values through consistent action rather than position. She refuses leadership that is performative — every initiative she has led has a measurable outcome and a handover plan so it continues after she graduates. She has never used her platform to self-promote but instead consistently redirects recognition to her teams and the students she serves.",
      "dean-f2":
        "Ayanda has actively promoted DUT's Living Values Framework through three documented initiatives: (1) her WomenInSTEM conference, which explicitly addressed Respect, Inclusivity and Excellence; (2) the peer-mentoring programme, grounded in Community and Ubuntu; and (3) a campus tree-planting drive in partnership with the Facilities Management department, reflecting Responsibility and Sustainability.",
      "dean-g1":
        "When Ayanda arrived at DUT she was the first in her family to attend university. She failed two modules in her first semester due to culture shock and financial pressure, and was placed on academic probation. Rather than withdrawing, she sought support from the Student Counselling Centre, restructured her study approach, and recovered fully. That experience is why she built the peer-mentoring programme — she knows first-hand that the right support at the right time changes trajectories. She has grown from a student in academic difficulty to the Dean's List, and from a silent observer to a campus leader who changes systems.",
    },
  },
  {
    id: "demo-2",
    name: "Sipho Ndlovu",
    studentNumber: "22005678",
    faculty: "Faculty of Accounting & Informatics",
    year: "4th Year — BCom Sports Management",
    category: "Sportsmanship Award",
    categoryId: "sport",
    nominatorName: "Coach T. Mthembu",
    nominatorRelationship: "Head Basketball Coach — DUT Sport",
    answers: {
      "sport-1":
        "Sipho has captained the DUT Men's Basketball team since 2024. He is known campus-wide for his conduct on and off the court — he has never received a technical foul in two seasons of competitive play, which is notable in a contact sport. After the USSA semi-final loss in 2025, Sipho gathered both teams on court for a joint prayer and mutual acknowledgment, a gesture that was photographed and shared by the USSA communications team as an example of sportsmanship. His academic average of 68% exceeds the required 65% minimum.",
      "sport-2":
        "Sipho has served as team captain for two consecutive seasons. In addition to leading by example in training (he is consistently the first to arrive and last to leave), he introduced a structured weekly captain's meeting to align training goals with each player's academic schedule. He liaised with the Faculty of Accounting & Informatics to arrange supplemental tutoring for three players who were at risk of missing the academic eligibility threshold for USSA.",
      "sport-3":
        "Under Sipho's captaincy, the team's internal cohesion has measurably improved. Dropout from training sessions fell from 40% to 8% between 2024 and 2025. He initiated a 'Basketball for Basics' programme where team members visit three local primary schools each term to coach fundamentals. Over 200 learners have participated. His coach notes that he resolves locker-room conflict through structured conversation rather than hierarchy, and that the team culture reflects his values of fairness and accountability.",
      "sport-4":
        "Sipho's impact extends to the way DUT sport is perceived in the community. Parents of learners from his community coaching sessions have written to DUT management praising his conduct and the positive influence he has had on their children. Within the university, he has been invited to speak at two faculty orientation sessions about balancing sport with academic responsibility — a testament to the trust placed in him by both sport and academic staff.",
    },
  },
  {
    id: "demo-3",
    name: "Naledi Dube",
    studentNumber: "23009012",
    faculty: "Faculty of Health Sciences",
    year: "2nd Year — Nursing Science",
    category: "Promotion of Healthy Lifestyle Award",
    categoryId: "wellness",
    nominatorName: "Ms. P. Pillay",
    nominatorRelationship: "DUT Student Wellness Manager",
    answers: {
      "well-1":
        "Naledi conceptualised and delivered DUT's first student-led Mental Health Awareness Week in October 2025. Over five days she coordinated 12 sessions covering: depression and anxiety recognition, study-stress management, healthy sleep hygiene, nutrition on a student budget, and peer-support skills. She recruited 6 guest facilitators — 4 from the DUT Counselling Centre and 2 external clinical psychologists who volunteered their time. Total attendance across all sessions was 512 students. She also co-authored a 24-page 'DUT Student Wellness Handbook' that was formally adopted by the DUT Counselling Centre and distributed to all first-year students in 2026.",
      "well-2":
        "A post-event survey completed by 318 attendees showed: 87% reported feeling better equipped to manage academic stress after attending; 62% said they had spoken to a peer about mental health for the first time after the awareness week; 34 students self-referred to the DUT Counselling Centre directly following Naledi's sessions — a 280% increase compared to the same period in 2024. The Counselling Centre confirmed that referral volume sustained for 6 weeks after the event, indicating lasting awareness rather than a temporary spike.",
      "well-3":
        "Naledi partnered with the DUT Sports Department to integrate mental wellness messaging into pre-season athlete orientations. She collaborated with the Residence Life unit to train 18 residence advisors as Mental Health First Aiders using the SADAG youth toolkit. She also engaged the Faculty of Health Sciences to offer academic credit for students who completed the peer-support training module, demonstrating an ability to work across institutional structures to embed wellness sustainability.",
    },
  },
  {
    id: "demo-4",
    name: "Thandeka Mhlongo",
    studentNumber: "21003456",
    faculty: "Faculty of Arts & Design",
    year: "Honours — Visual Communication",
    category: "Exemplary Society/Club/Structure Award",
    categoryId: "society",
    nominatorName: "Dr. A. Nxumalo",
    nominatorRelationship: "Head of Department — Arts & Design",
    answers: {
      "soc-1":
        "The DUT Afro-Arts Society under Thandeka's leadership delivered three flagship leadership initiatives: (1) a 12-week 'Creative Leadership Accelerator' programme upskilling 45 student artists in business, branding and negotiation; (2) a campus-wide 'African Heritage Month' spanning 18 events across 3 weeks; and (3) 'ArtMentor', which pairs Visual Communication students with first-year students from disadvantaged schooling backgrounds. Each initiative had a documented plan, post-activity report and measurable attendance register.",
      "soc-2":
        "The Society hosted DUT's largest student-organised gallery exhibition to date — 'Izimbali 2025' — displaying work from 67 student artists. The exhibition drew 1 200 attendees over three days, was covered by two national design publications, and resulted in four students securing commissions from attendees. The Society also generated R50 000 in sponsorship from local design studios and a national print company, enabling four bursaries for financially distressed Arts students.",
      "soc-3":
        "Thandeka deliberately designed the Society's membership and programming to be cross-cultural and cross-campus. Membership spans all six faculties. The Society runs all communications in English and isiZulu and has begun Afrikaans translations. Its events programme includes explicit sessions on cultural exchange, and all exhibitions actively curate work representing a diversity of ethnicities, identities and lived experiences. 94% of member survey respondents in 2025 agreed that the Society 'makes them feel seen and valued'.",
      "soc-4":
        "Thandeka introduced a 'Design Hackathon' format — a 48-hour creative sprint in which mixed teams solve real community briefs submitted by Durban NGOs. Three NGOs submitted briefs; teams produced brand identities and social media packages that were actually adopted. This format is novel in the DUT student society space and has since been adopted by two other societies with Thandeka's mentorship.",
      "soc-5":
        "The Society has active memoranda of understanding with: DUT Marketing & Communications (for co-production of campus visual content); the Durban Design Week organising committee (joint programming for three years running); and the KwaZulu-Natal Department of Arts & Culture (for graduate showcase support). Thandeka led all three partnership negotiations personally.",
      "soc-6":
        "Documented outcomes for the 2025 academic year: membership grew from 40 to 120 (200%); revenue generated — R50 000 (sponsorship) + R12 000 (workshop fees); 4 student bursaries awarded; 67 artists exhibited publicly; 3 community briefs successfully delivered to NGOs; 4 members secured professional commissions; 2 other societies adopted the Hackathon format; Society shortlisted for SASCO National Cultural Excellence Award.",
    },
  },
  {
    id: "demo-5",
    name: "Lwazi Sithole",
    studentNumber: "22007890",
    faculty: "Faculty of Management Sciences",
    year: "1st Year — BCom Business Administration",
    category: "Emerging Leader (First Year Student)",
    categoryId: "emerging",
    nominatorName: "Ms. N. Zulu",
    nominatorRelationship: "Peer & Class Representative Coordinator",
    answers: {
      "em-0": "Proof of registration attached — DUT Student Registration Certificate 2026, issued 10 January 2026. Student number 22007890 confirmed enrolled in BCom Business Administration, Faculty of Management Sciences.",
      "em-1":
        "Within his first four weeks at DUT, Lwazi volunteered to be class representative for his BCom cohort of 180 students. He immediately established a structured communication system — a WhatsApp broadcast channel with daily reminders, a shared Google Calendar for assessment deadlines and a bi-weekly 'Class State of Affairs' meeting with the faculty administrator. He also founded the DUT Mathematics Peer Tutoring Network after identifying that 40% of his cohort had failed their first Business Mathematics test. Within one month, 60 students had registered and 3 senior volunteers had joined. First-year Mathematics pass rates in his module improved by 18% between Test 1 and Test 2.",
      "em-2":
        "Lwazi's most defining act of integrity occurred when he discovered that a group of students had obtained a previous year's test paper and were planning to use it in preparation for an assessment. Rather than ignoring the situation, he privately spoke with the group, explained the academic integrity implications and supported them in approaching the lecturer voluntarily to disclose what had happened. The lecturer confirmed that Lwazi's intervention prevented a potential misconduct proceeding. He was commended by the Head of Department for his moral courage. He has also been consistently transparent in his class representative communications — if he cannot answer a question or follow up on a request, he says so and provides a timeline for response.",
      "em-3":
        "Lwazi organised three consecutive weekend community clean-up campaigns in the Umlazi G Section area where many DUT commuter students live. He recruited 80 volunteers (a mix of DUT students and community members), secured refuse bags and gloves through the eThekwini Municipality's ward councillor, and arranged media coverage from a community radio station. The initiative was adopted by the ward as an ongoing monthly programme, with Lwazi training two community volunteers to continue the coordination independently. On campus, his tutoring network has directly helped 12 students avoid academic exclusion in their first semester.",
    },
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type DemoScore = {
  criteriaScores: Record<string, number>;
  comment: string;
  overallScore: number;
  submittedAt: Date;
};

// ─── Star picker ──────────────────────────────────────────────────────────────

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? value;
  const label =
    value === 0 ? "No rating" :
    value === 1 ? "Poor" :
    value === 2 ? "Fair" :
    value === 3 ? "Good" :
    value === 4 ? "Very good" : "Exceptional";

  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHovered(null)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(value === star ? 0 : star)}
          onMouseEnter={() => setHovered(star)}
          className="transition-transform hover:scale-110 focus-visible:outline-none"
        >
          <Star
            className={`h-9 w-9 transition-colors ${
              star <= display ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
      <span className="ml-2 text-sm font-bold text-foreground">{label}</span>
    </div>
  );
}

// ─── Mini leaderboard ─────────────────────────────────────────────────────────

function MiniLeaderboard({ scores }: { scores: Record<string, DemoScore> }) {
  const ranked = useMemo(() =>
    DEMO_NOMINEES
      .map((n) => ({ ...n, score: scores[n.id]?.overallScore ?? 0, rated: !!scores[n.id] }))
      .filter((n) => n.rated)
      .sort((a, b) => b.score - a.score),
  [scores]);

  if (ranked.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-primary/20 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        Rate a nominee to see the leaderboard update in real time.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {ranked.map((n, i) => {
        const rank = i + 1;
        const pct = (n.score / 5) * 100;
        const colours =
          rank === 1 ? { ring: "border-yellow-300/60 bg-yellow-50/60", bar: "bg-yellow-400", badge: "bg-yellow-400" } :
          rank === 2 ? { ring: "border-slate-300/50 bg-slate-50/50", bar: "bg-slate-400", badge: "bg-slate-300" } :
          rank === 3 ? { ring: "border-amber-500/30 bg-amber-50/40", bar: "bg-amber-600", badge: "bg-amber-600" } :
                      { ring: "border-primary/10 bg-white", bar: "bg-primary/50", badge: "" };
        return (
          <div key={n.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${colours.ring}`}>
            {rank <= 3 ? (
              <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full shadow ${colours.badge}`}>
                {rank === 1 ? <Trophy className="h-3.5 w-3.5 text-white" /> : <Medal className="h-3.5 w-3.5 text-white" />}
              </div>
            ) : (
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-primary/20 bg-muted text-xs font-bold text-muted-foreground">{rank}</div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold">{n.name}</p>
                <span className="shrink-0 text-sm font-bold">{n.score.toFixed(2)}<span className="text-xs font-normal text-muted-foreground">/5</span></span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                <div className={`h-full rounded-full transition-all ${colours.bar}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{n.category}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Submission document viewer ───────────────────────────────────────────────

function SubmissionViewer({ nominee }: { nominee: DemoNominee }) {
  const catData = useMemo(
    () => AWARD_CATEGORIES.find((c) => c.id === nominee.categoryId),
    [nominee.categoryId],
  );

  // Group questions by section
  const sections = useMemo(() => {
    if (!catData) return [];
    const map = new Map<string, typeof catData.questions>();
    for (const q of catData.questions) {
      const list = map.get(q.section) ?? [];
      list.push(q);
      map.set(q.section, list);
    }
    return Array.from(map.entries());
  }, [catData]);

  return (
    <div className="h-full overflow-y-auto">
      {/* Document header — mimics a real form header */}
      <div className="sticky top-0 z-10 border-b border-primary/15 bg-white/95 backdrop-blur px-6 py-4">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary">
          <FileText className="h-3.5 w-3.5" />
          Nomination Submission · SALEA 2026
          <span className="ml-auto rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">Demo</span>
        </div>
      </div>

      <div className="px-6 py-5 space-y-6">
        {/* Nominee + nominator metadata */}
        <div className="rounded-xl border border-primary/15 bg-muted/20 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <User className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nominee</p>
                <p className="font-semibold text-foreground">{nominee.name}</p>
                <p className="text-xs text-muted-foreground">#{nominee.studentNumber}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Programme</p>
                <p className="font-semibold text-foreground">{nominee.year}</p>
                <p className="text-xs text-muted-foreground">{nominee.faculty.replace("Faculty of ", "")}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Category</p>
                <p className="font-semibold text-foreground">{nominee.category}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nominated by</p>
                <p className="font-semibold text-foreground">{nominee.nominatorName}</p>
                <p className="text-xs text-muted-foreground">{nominee.nominatorRelationship}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Q&A sections */}
        {sections.map(([section, questions], si) => (
          <div key={section}>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {si + 1}
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary">{section}</h3>
            </div>

            <div className="space-y-4 pl-8">
              {questions.map((q, qi) => {
                const answer = nominee.answers[q.id];
                return (
                  <div key={q.id} className="rounded-lg border border-primary/10 bg-white p-4 shadow-sm">
                    {/* Question prompt */}
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Q{qi + 1}{q.wordLimit ? ` · max ${q.wordLimit} words` : ""}
                    </p>
                    <p className="mb-3 text-sm font-medium text-foreground leading-snug">{q.prompt}</p>

                    {/* Evidence types expected */}
                    {q.evidence && q.evidence.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-1">
                        {q.evidence.map((e) => (
                          <span key={e} className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2 py-0.5 text-[10px] text-blue-700 font-medium">
                            <FileText className="h-2.5 w-2.5" /> {e}
                          </span>
                        ))}
                      </div>
                    )}

                    <Separator className="my-2" />

                    {/* Answer */}
                    {answer ? (
                      <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">{answer}</p>
                    ) : (
                      <p className="text-sm italic text-muted-foreground">No written answer provided.</p>
                    )}
                  </div>
                );
              })}
            </div>

            {si < sections.length - 1 && <Separator className="mt-6" />}
          </div>
        ))}

        <div className="rounded-lg border border-dashed border-primary/20 bg-muted/20 p-4 text-center text-xs text-muted-foreground">
          In the real judge panel, supporting documents (PDFs, transcripts, photos) appear above as a document preview viewer.
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

function DemoPage() {
  const [selected, setSelected] = useState<DemoNominee | null>(null);
  const [scores, setScores] = useState<Record<string, DemoScore>>({});
  const [criteriaInput, setCriteriaInput] = useState<Record<string, number>>({});
  const [commentInput, setCommentInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"nominees" | "leaderboard">("nominees");

  const criteria = selected ? getCriteriaForCategory(selected.categoryId) : [];
  const ratedCount = criteria.filter((c) => (criteriaInput[c.id] ?? 0) > 0).length;
  const overallPreview = computeWeightedAverage(criteriaInput, criteria);

  function openNominee(n: DemoNominee) {
    setSelected(n);
    setSavedId(null);
    const existing = scores[n.id];
    setCriteriaInput(existing?.criteriaScores ?? {});
    setCommentInput(existing?.comment ?? "");
  }

  function closeNominee() {
    setSelected(null);
    setSavedId(null);
  }

  async function submitScore() {
    if (!selected || ratedCount === 0) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    const overall = computeWeightedAverage(criteriaInput, criteria);
    setScores((prev) => ({
      ...prev,
      [selected.id]: { criteriaScores: { ...criteriaInput }, comment: commentInput, overallScore: overall, submittedAt: new Date() },
    }));
    setSavedId(selected.id);
    setSaving(false);
  }

  function resetAll() {
    if (!confirm("Reset all demo scores? This clears your practice data.")) return;
    setScores({});
    setCriteriaInput({});
    setCommentInput("");
    setSelected(null);
    setSavedId(null);
  }

  const totalRated = Object.keys(scores).length;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gray-50 text-foreground">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,oklch(0.95_0.02_260)_0%,transparent_60%)]" />
      <SiteNav />

      {/* Full-height layout when a nominee is open */}
      {selected ? (
        <div className="relative z-10 flex h-screen flex-col pt-[72px]">
          {/* Top bar */}
          <div className="flex items-center gap-3 border-b border-primary/15 bg-white/90 px-4 py-3 backdrop-blur">
            <button type="button" onClick={closeNominee} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition">
              <X className="h-4 w-4" /> All nominees
            </button>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-sm font-semibold text-foreground truncate">{selected.name}</span>
            <Badge variant="outline" className="ml-1 border-primary/20 text-[11px] text-primary">{selected.category}</Badge>
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                <AlertCircle className="h-3 w-3" /> Demo
              </div>
              <Link to="/guide" className="hidden sm:inline-flex items-center gap-1 rounded-full border border-primary/20 bg-white px-3 py-1 text-xs font-semibold text-primary hover:bg-muted/30 transition">
                <BookOpen className="h-3 w-3" /> Guide
              </Link>
            </div>
          </div>

          {/* Two-panel layout — exactly like the real judge panel */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left: submission document */}
            <aside className="hidden lg:flex flex-col flex-1 border-r border-primary/15 bg-white overflow-hidden">
              <div className="border-b border-primary/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Submission Document</p>
                <p className="text-[11px] text-muted-foreground">Question-by-question answers as submitted by the nominee.</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                <SubmissionViewer nominee={selected} />
              </div>
            </aside>

            {/* Right: scoring panel */}
            <div className="w-full lg:w-[420px] xl:w-[460px] flex flex-col overflow-hidden bg-gray-50">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Mobile: submission toggle */}
                <details className="lg:hidden rounded-xl border border-primary/15 bg-white overflow-hidden">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-primary flex items-center gap-2">
                    <FileText className="h-4 w-4" /> View submission document
                  </summary>
                  <div className="max-h-[50vh] overflow-y-auto border-t border-primary/10">
                    <SubmissionViewer nominee={selected} />
                  </div>
                </details>

                {/* Scoring panel header */}
                <Card className="overflow-hidden">
                  <div className="border-b border-primary/10 bg-muted/20 px-5 py-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-2 font-bold text-foreground">
                        <MessageSquare className="h-4 w-4 text-primary" /> Your Evaluation
                      </p>
                      <div className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${overallPreview > 0 ? "bg-gold/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                        <Star className={`h-3.5 w-3.5 ${overallPreview > 0 ? "fill-yellow-400 text-yellow-400" : ""}`} />
                        {overallPreview.toFixed(1)}/5
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {criteria.length} criteria for <span className="font-medium">{selected.category}</span> · {ratedCount}/{criteria.length} rated
                    </p>
                  </div>

                  <div className="space-y-3 p-5">
                    {/* Per-criterion star pickers */}
                    {criteria.map((c, i) => (
                      <div
                        key={c.id}
                        className={`rounded-xl border p-4 transition ${(criteriaInput[c.id] ?? 0) > 0 ? "border-yellow-300/60 bg-yellow-50/40" : "border-primary/10 bg-gray-50"}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Label className="block text-sm font-semibold text-foreground">
                              <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">{i + 1}</span>
                              {c.label}
                            </Label>
                            {c.description && (
                              <p className="mt-0.5 ml-7 text-xs text-muted-foreground">{c.description}</p>
                            )}
                          </div>
                          {(criteriaInput[c.id] ?? 0) > 0 && (
                            <span className="shrink-0 text-xs font-bold text-yellow-600">{criteriaInput[c.id]}/5</span>
                          )}
                        </div>
                        <div className="mt-3">
                          <StarPicker
                            value={criteriaInput[c.id] ?? 0}
                            onChange={(v) => setCriteriaInput((prev) => ({ ...prev, [c.id]: v }))}
                          />
                        </div>
                      </div>
                    ))}

                    {/* Comment */}
                    <div className="rounded-xl border border-primary/15 bg-blue-50/40 p-4">
                      <Label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <MessageSquare className="h-4 w-4 text-primary" />
                        Comments & Justification
                        <span className="ml-auto text-xs font-normal text-muted-foreground">{commentInput.length}/1000</span>
                      </Label>
                      <Textarea
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value.slice(0, 1000))}
                        placeholder="Write your evaluation notes — strengths, concerns, reasoning for your ratings…"
                        rows={5}
                        className="resize-y bg-white"
                      />
                      <p className="mt-1.5 text-[11px] text-muted-foreground">Visible to admin only — not shown to nominees.</p>
                    </div>

                    {/* Submit */}
                    <Button
                      onClick={submitScore}
                      disabled={saving || ratedCount === 0}
                      className="w-full bg-gold text-primary-foreground disabled:opacity-50"
                      size="lg"
                    >
                      {saving ? (
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                          Saving…
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          {scores[selected.id] ? "Update score" : "Submit score"}
                          {overallPreview > 0 && (
                            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{overallPreview.toFixed(1)}/5</span>
                          )}
                        </span>
                      )}
                    </Button>

                    {ratedCount === 0 && (
                      <p className="text-center text-xs text-amber-600">Rate at least one criterion above to enable submission.</p>
                    )}

                    {savedId === selected.id && (
                      <div className="flex flex-col items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-center">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                        <p className="text-sm font-semibold text-green-700">Score submitted!</p>
                        <p className="text-xs text-green-600">
                          Overall: {scores[selected.id]?.overallScore.toFixed(2)}/5
                        </p>
                        <div className="flex gap-2">
                          <button type="button" onClick={closeNominee} className="rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-50 transition">
                            Rate another
                          </button>
                          <button type="button" onClick={() => { closeNominee(); setTab("leaderboard"); }} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition">
                            View leaderboard
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── List / leaderboard view ── */
        <main className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="mb-2 flex items-center gap-2">
              <Play className="h-4 w-4 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">SALEA 2026 · Demo Sandbox</p>
            </div>
            <h1 className="font-serif text-4xl font-bold sm:text-5xl">
              Practice <span className="text-gradient-gold">Voting</span>
            </h1>
            <p className="mt-3 max-w-lg text-base text-muted-foreground">
              Five realistic dummy nominees — read their full submissions and rate each criterion exactly as you would in the live judge panel. Nothing is saved to the database.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                <AlertCircle className="h-3.5 w-3.5" /> Demo mode — no real data affected
              </div>
              <Badge variant="outline" className="border-green-300 text-green-700">{totalRated}/{DEMO_NOMINEES.length} rated</Badge>
              {totalRated > 0 && (
                <button type="button" onClick={resetAll} className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition">
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              )}
              <Link to="/guide" className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-white px-3 py-1 text-xs font-semibold text-primary hover:bg-muted/30 transition">
                <BookOpen className="h-3 w-3" /> View guide
              </Link>
            </div>
          </motion.div>

          {/* Tabs */}
          <div className="mb-6 flex overflow-hidden rounded-xl border border-primary/20 bg-muted/30 w-fit">
            {(["nominees", "leaderboard"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition capitalize ${tab === t ? "bg-gold text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
                {t === "nominees" ? <><Star className="h-4 w-4" /> Rate Nominees</> : (
                  <><BarChart3 className="h-4 w-4" /> Leaderboard
                    {totalRated > 0 && <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">{totalRated}</span>}
                  </>
                )}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {tab === "nominees" ? (
              <motion.div key="nominees" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {DEMO_NOMINEES.map((n, i) => {
                    const scored = scores[n.id];
                    const cats = getCriteriaForCategory(n.categoryId);
                    return (
                      <motion.button key={n.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        type="button" onClick={() => openNominee(n)}
                        className="group text-left rounded-2xl border border-primary/20 bg-white p-5 shadow-sm transition hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          {scored ? (
                            <span className="flex items-center gap-0.5 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700">
                              <CheckCircle2 className="h-3 w-3" /> {scored.overallScore.toFixed(1)}/5
                            </span>
                          ) : (
                            <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Not rated</span>
                          )}
                          <span className="text-[11px] text-muted-foreground">{cats.length} criteria</span>
                        </div>
                        <h3 className="font-serif text-lg font-bold leading-snug group-hover:text-primary transition-colors">{n.name}</h3>
                        <p className="mt-1 text-xs text-primary font-medium">{n.category}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{n.year} · {n.faculty.replace("Faculty of ", "")}</p>
                        <p className="mt-2 text-xs text-muted-foreground">Nominated by {n.nominatorName} ({n.nominatorRelationship})</p>
                        {scored ? (
                          <div className="mt-3 flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, si) => (
                              <Star key={si} className={`h-4 w-4 ${si < Math.round(scored.overallScore) ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted-foreground/20"}`} />
                            ))}
                          </div>
                        ) : null}
                        <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                          Open submission <ChevronRight className="h-3 w-3" />
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              <motion.div key="leaderboard" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="max-w-2xl">
                <div className="mb-4 flex items-center gap-3">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <h2 className="font-serif text-xl font-bold">Demo Leaderboard</h2>
                  <Badge variant="outline" className="border-amber-300 text-amber-700 text-[11px]">Practice only</Badge>
                </div>
                <p className="mb-5 text-sm text-muted-foreground">Ranked by overall weighted score. In the real leaderboard, all judges' scores are summed.</p>
                <MiniLeaderboard scores={scores} />
                {totalRated < DEMO_NOMINEES.length && (
                  <div className="mt-6 rounded-xl border border-dashed border-primary/20 bg-muted/20 p-4 text-center text-xs text-muted-foreground">
                    {DEMO_NOMINEES.length - totalRated} nominee{DEMO_NOMINEES.length - totalRated !== 1 ? "s" : ""} still to rate.{" "}
                    <button type="button" onClick={() => setTab("nominees")} className="font-semibold text-primary hover:underline">Rate them →</button>
                  </div>
                )}
                {totalRated === DEMO_NOMINEES.length && (
                  <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5 text-center">
                    <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-500" />
                    <p className="font-serif font-bold text-green-800">All nominees rated!</p>
                    <p className="mt-1 text-xs text-green-600">You're ready for the real panel. <Link to="/judge" className="font-semibold underline">Go to Judge Panel →</Link></p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      )}
    </div>
  );
}
