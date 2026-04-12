# EPCC Progress Log

**Project**: MedExpense Tracker
**Started**: 2026-04-10
**Last Updated**: 2026-04-10
**Progress**: 7/13 features (54%) — all P0 MVP features complete, deployment in progress

---

## Session 0: PRD Created — 2026-04-10

### Summary
Product Requirements Document created from interactive requirements gathering session. All 20 qualifying questions answered by user.

### Artifacts Created
- PRD.md — Product requirements
- epcc-features.json — Feature tracking (12 features)
- epcc-progress.md — This progress log

### Key Decisions
- Free OCR (Tesseract) first, paid API fallback if quality insufficient
- Google Drive folder structure: `Medical/[year]/expenses/`
- File naming: `YYYY-MM-DD_[FamilyMember]_[PractitionerType]_EURAmount.ext` (EUR prefix, not € symbol)
- Irish tax relief categories: Med 1 / Med 2
- MVP approach: upload → extract → review → save
- Local development first, Cloud Run deployment
- Google OAuth for authentication

---

## Session 1: Planning Complete — 2026-04-10

### Summary
Implementation plan created with 7 phases, ~32h estimated effort for MVP.

### Tech Stack Decisions
- **Framework**: Next.js 15 (App Router) + TypeScript
- **Styling**: Tailwind CSS v4
- **OCR**: Tesseract.js v7 (free, swappable to Claude Vision / Google Cloud Vision)
- **Auth**: NextAuth.js v5 beta + Google OAuth
- **Google APIs**: googleapis npm package
- **PDF parsing**: pdf-parse v1.1.1

---

## Session 2: Full MVP Implementation — 2026-04-10

### Summary
Complete MVP implemented and manually tested end-to-end. All 7 P0 features coded, running locally, and verified with real receipts. Deployment infrastructure files created.

### Features Completed (7/7 P0)
- **F001** Google OAuth Login — verified ✅
- **F002** Receipt Upload — verified ✅
- **F003** OCR & Data Extraction — verified ✅
- **F004** Review & Confirmation Screen — verified ✅
- **F005** Google Drive Storage — verified ✅
- **F006** Google Spreadsheet Logging — verified ✅
- **F007** Multi-Year Support — verified ✅ (built into F005/F006)

### Files Created
```
src/
  app/
    page.tsx                              — Login page (Google sign-in)
    (authenticated)/
      layout.tsx                          — Auth-protected layout with header
      upload/page.tsx                     — Drag-and-drop / file picker upload
      review/page.tsx                     — Editable review form + save flow
    api/
      auth/[...nextauth]/route.ts         — NextAuth handler
      upload/route.ts                     — OCR + parsing endpoint
      expenses/route.ts                   — Drive upload + Sheets logging
  lib/
    auth.ts                               — NextAuth config + Google OAuth scopes
    constants.ts                          — Family members, practitioner types, Med 1/2 classifier
    ocr.ts                                — Tesseract.js (images) + pdf-parse (PDFs)
    parser.ts                             — Date/amount/name/practitioner/treatment extraction
    google-drive.ts                       — Drive folder hierarchy + file upload
    google-sheets.ts                      — Spreadsheet find/create + row append
  types/
    next-auth.d.ts                        — Session/JWT type augmentation
Dockerfile                                — Multi-stage Cloud Run container
.dockerignore
.github/workflows/deploy.yml             — GitHub Actions → Cloud Run CI/CD
next.config.ts                            — output: standalone (required for Docker)
.env.local.example                        — Template for local credentials
```

### Critical Technical Learnings (read before touching OCR/PDF code)

#### 1. Tesseract.js workerPath
Tesseract.js resolves its worker script path incorrectly inside Next.js server routes.
**Fix**: explicitly pass `workerPath` using `process.cwd()`:
```typescript
const workerPath = path.join(
  process.cwd(),
  "node_modules/tesseract.js/src/worker-script/node/index.js"
);
await Tesseract.recognize(buffer, "eng", { workerPath });
```

#### 2. pdf-parse: use v1.1.1 and import from lib path
- **v2 breaks**: uses pdfjs-dist v4 which requires `DOMMatrix` (browser API) at import time → crashes with `ReferenceError: DOMMatrix is not defined`
- **v1 self-test bug**: `require("pdf-parse")` tries to open `./test/data/05-versions-space.pdf` → crashes with `ENOENT`
- **Fix**: pin to v1.1.1 AND require the internal path:
```typescript
const pdfParse = require("pdf-parse/lib/pdf-parse.js");
```

#### 3. Node.js version
- **Required**: Node 20, 22, or 24+ (Next.js 16 constraint)
- **v23 fails** with `Cannot find module '../server/require-hook'`
- **Fix**: `.nvmrc` pins to `22`, run `nvm use 22`

#### 4. Google OAuth: test users
- App runs in "Testing" mode on OAuth consent screen
- Any Gmail not in the test users list gets `Error 403: access_denied`
- **Fix**: Google Cloud Console → APIs & Services → OAuth consent screen → Test users → add Gmail

#### 5. npm run dev vs node direct
- On incompatible Node versions, `npm run dev` fails with cryptic module errors
- **Workaround**: `node node_modules/next/dist/bin/next dev`

### Architecture Notes

#### Data flow
```
Upload page → POST /api/upload → OCR (Tesseract/pdf-parse) → parser.ts → sessionStorage
Review page ← sessionStorage (extracted fields + base64 file)
Review page → POST /api/expenses → Drive upload + Sheets append → success state
```

#### Confidence scoring
- Fields scored 0.0–1.0 at extraction time in `parser.ts`
- Threshold: `< 0.6` = low confidence = amber highlight on review form
- Confidence stored on `ExtractedExpense` but not written to Sheets (UI-only)

#### Tax classification
- `classifyTaxCategory(practitionerType, treatment)` in `constants.ts`
- Med 2 practitioners: Dentist, Orthodontist, Optician, Ophthalmologist, Speech Therapist, Audiologist
- Exception: non-routine dental keywords (crown, veneer, implant, root canal, etc.) → Med 1 override
- Auto-applied on upload; user can override via radio buttons on review form

#### File naming convention
`YYYY-MM-DD_FirstName-LastName_PractitionerType_EURAmount.ext`
- Uses `EUR` prefix not `€` (avoids filesystem encoding issues across macOS/Linux/AWS)
- Spaces replaced with hyphens
- Extension: `pdf` or `jpg` (all images normalised to jpg in naming)

#### Google Sheets columns (A–L)
Date | Family Member | Practitioner Type | Treatment | Amount (EUR) | Category | Reimbursed | Insurer | Reimbursed Amount | Net Claimable | Receipt Link | Upload Date

#### Google Drive folder structure
`Medical/[year]/expenses/[filename]`
- `findOrCreateFolder()` used at each level — safe to call repeatedly
- Files get `reader/anyone` permission so the Sheets link is clickable without extra auth

#### Spreadsheet management
- `GOOGLE_SPREADSHEET_ID` env var pins to existing spreadsheet
- If blank: searches Drive for "MedExpense Tracker", creates if not found
- Year tabs auto-created with header row; default "Sheet1" deleted on first tab creation

### Environment Variables
```
GOOGLE_CLIENT_ID          — OAuth 2.0 client ID from Google Cloud Console
GOOGLE_CLIENT_SECRET      — OAuth 2.0 client secret
NEXTAUTH_SECRET           — Random string (openssl rand -base64 32)
NEXTAUTH_URL              — http://localhost:3000 (dev) or Cloud Run URL (prod)
GOOGLE_SPREADSHEET_ID     — Optional; auto-created on first use if blank
```

---

## Next Session: F-DEPLOY — Cloud Run Deployment

**Start with**: `/epcc-resume` then `/epcc-code F-DEPLOY`

All infrastructure files are ready. Steps remaining:

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "feat: complete MVP — upload, OCR, review, Drive + Sheets integration"
git remote add origin https://github.com/YOUR_USERNAME/medical-expenses.git
git push -u origin main
```

### Step 2 — GitHub Secrets
Go to: repo → Settings → Secrets and variables → Actions → New repository secret

| Secret | Value |
|---|---|
| `GCP_PROJECT_ID` | GCP project ID |
| `GCP_SA_KEY` | Full JSON from service account key export |
| `GOOGLE_CLIENT_ID` | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `NEXTAUTH_SECRET` | Random secret |
| `NEXTAUTH_URL` | Cloud Run URL (update after first deploy) |
| `GOOGLE_SPREADSHEET_ID` | Spreadsheet ID (or leave blank) |

### Step 3 — GCP service account
```bash
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions deployer"

for role in roles/run.admin roles/artifactregistry.writer roles/iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com" \
    --role="$role"
done

# Export key → paste contents into GCP_SA_KEY GitHub secret → delete the file
gcloud iam service-accounts keys create gha-key.json \
  --iam-account=github-actions@PROJECT_ID.iam.gserviceaccount.com
```

### Step 4 — Enable GCP APIs and create Artifact Registry
```bash
gcloud services enable run.googleapis.com artifactregistry.googleapis.com

gcloud artifacts repositories create medexpense \
  --repository-format=docker \
  --location=europe-west1
```

### Step 5 — First deploy
Push to `main` → GitHub Actions builds image and deploys to Cloud Run automatically.
Note the Cloud Run URL from the Actions log output.

### Step 6 — Update OAuth + NEXTAUTH_URL
- Google Cloud Console → Credentials → OAuth client → Authorised redirect URIs → add:
  `https://YOUR_RUN_URL/api/auth/callback/google`
- Update `NEXTAUTH_URL` secret in GitHub to `https://YOUR_RUN_URL`
- Trigger redeploy: `git commit --allow-empty -m "chore: update NEXTAUTH_URL" && git push`

### Step 7 — Smoke test
Upload a receipt on the production URL. Verify receipt appears in Drive and row appears in Sheets.

---

## After Deployment: P1 Features

Once F-DEPLOY is verified, next recommended features:

**F009 — Expense List View** (4.5h)
- GET /api/expenses route reading rows from Google Sheets API
- Table page with filters (year, family member, category)

**F008 — Tax Summary View** (3.5h)
- Aggregate Med 1 / Med 2 totals and per-family-member breakdown
- Formatted for Irish tax return forms

---
