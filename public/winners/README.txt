Place winner photos in this folder using the naming convention:

  {year}-{slug}.jpg

─── 2025 SSA Winners — Photo Mapping ────────────────────────────────

OUTSTANDING RESIDENCE LIFE
  2025-tims-house.jpg              → Liu KZN Properties (Tim's House) Residence   [Platinum]
  2025-spare-investment.jpg        → Spare Investment Residence                    [Gold]
  2025-ashblock.jpg                → Ashblock Residence                           [Silver]
  2025-bigs-jos-four-seasons.jpg   → Big's Jo's Four Seasons                      [Silver]

DEAN OF STUDENTS PRESTIGIOUS
  2025-luke-jaden-krishnan.jpg     → Luke Jaden Krishnan                          [Platinum]
  2025-luyanda-zulu.jpg            → Luyanda Zulu                                 [Gold]
  2025-xoliso-dlamini.jpg          → Xoliso Dlamini                               [Silver]

EXEMPLARY SOCIETY / CLUB STRUCTURE
  2025-swda.jpg                    → Student with Disabilities Association (SWDA)  [Platinum]
  2025-ubuciko-bomlomo.jpg         → Ubuciko Bomlomo Ngamagama                    [Gold]
  2025-saice-midlands.jpg          → SAICE - Midlands Campus                      [Silver]

STUDENT ENTREPRENEURSHIP
  2025-owethu-mhlongo.jpg          → Owethu Sphesihle Mhlongo                     [Platinum]

SPORTSMANSHIP
  2025-charlene-makwara.jpg        → Charlene "Chay" Makwara                      [Platinum]
  2025-mihlali-mzilwa.jpg          → Mihlali Mzilwa                               [Gold]
  2025-reneilwe-masiavhula.jpg     → Reneilwe Masiavhula                          [Silver]

DIVERSITY & INCLUSION
  2025-imperial-residence.jpg      → Imperial Residence                            [Platinum]

EMERGING LEADER
  2025-noluthando-dladla.jpg       → Noluthando Happiness Dladla                  [Silver]

─── Uploading via Admin UI (easiest — no script needed) ─────────────

1. Open the app and go to /admin
2. Sign in as admin
3. Click the "Winners" tab
4. Click "Seed Historical Winners" button (creates all 2025 + historical docs)
5. Each winner row now has a camera icon (🖼) — click it to upload the photo directly
   → The photo is auto-compressed and saved to Firestore instantly
6. Green camera icon = photo uploaded ✓

─── Uploading via Script (batch upload) ──────────────────────────────

Requires GOOGLE_APPLICATION_CREDENTIALS env var pointing to a Firebase
service account JSON file.

  set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\serviceAccount.json
  node scripts/seed-winner-images.mjs

The script fuzzy-matches image slugs to winner names in Firestore.
Extension can be .jpg, .jpeg, .png, or .webp.

