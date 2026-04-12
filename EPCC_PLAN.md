# Plan: MedExpense Tracker

**Created**: 2026-04-10 | **Effort**: ~32h | **Complexity**: Medium

---

## 1. Objective

**Goal**: Build a web app to upload, process, and track family medical expenses for Irish tax returns.
**Why**: Eliminates manual year-end receipt gathering; expenses categorised as they occur.
**Success**:
- Upload a receipt photo/PDF → review extracted data → save to Drive + Sheets in under 2 minutes
- OCR extracts usable data from ~90% of receipts (rest flagged for manual entry)
- Spreadsheet ready to use directly for Med 1 / Med 2 tax return forms

## 2. Tech Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Framework | Next.js 15 (App Router) | Single project for frontend + API routes, easy local dev and AWS deploy |
| Language | TypeScript | Type safety for Google API integrations, better IDE support |
| Styling | Tailwind CSS | Fast responsive UI, no custom CSS overhead |
| OCR | Tesseract.js (server-side) | Free, runs in Node.js, swappable to Claude Vision/Google Cloud Vision later |
| PDF text | pdf-parse | Extract text from text-based PDFs |
| PDF to image | pdf2pic | Convert image-based PDFs to images for Tesseract |
| Google APIs | googleapis npm package | Official Google client for Drive + Sheets + OAuth |
| Auth | NextAuth.js + Google Provider | Handles OAuth flow, session management, token refresh |
| Deployment | Local first → AWS (Amplify or EC2) | Start simple, scale when ready |

## 3. Architecture

```
┌─────────────────────────────────────────────┐
│                  Next.js App                 │
│                                              │
│  ┌──────────────┐    ┌───────────────────┐  │
│  │   Frontend    │    │   API Routes      │  │
│  │  (React +     │───▶│  /api/auth/*      │  │
│  │   Tailwind)   │    │  /api/upload      │  │
│  │               │    │  /api/expenses    │  │
│  └──────────────┘    └───────┬───────────┘  │
│                              │               │
│                     ┌────────▼────────┐      │
│                     │  OCR Service    │      │
│                     │  (Tesseract.js) │      │
│                     └────────┬────────┘      │
│                              │               │
└──────────────────────────────┼───────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                 ▼
      Google OAuth    Google Drive API   Google Sheets API
      (login)         (store receipts)   (log expenses)
```

### Key Data Flow: Upload → Save

1. User uploads file via form → `POST /api/upload`
2. API saves file to temp storage, runs Tesseract OCR
3. Parsing logic extracts fields (name, amount, date, practitioner, treatment)
4. Fuzzy match patient name against family members
5. Classify as Med 1 / Med 2 based on practitioner type
6. Return extracted data + confidence flags to frontend
7. User reviews/edits on confirmation screen
8. User clicks Save → `POST /api/expenses`
9. API uploads file to Google Drive (with naming convention)
10. API writes row to Google Sheets (with Drive link)
11. Return success + Drive link to frontend

### File Naming Convention

```
YYYY-MM-DD_FirstName-LastName_PractitionerType_EUR-Amount.ext
Example: 2026-03-15_Luca-Casey_Physio_EUR85.00.jpg
```

Note: Using `EUR` prefix instead of `€` symbol to avoid filesystem encoding issues.

### Google Sheets Schema

| Column | Example | Notes |
|--------|---------|-------|
| Date | 2026-03-15 | From invoice |
| Family Member | Luca Casey | Matched to known list |
| Practitioner Type | Physiotherapist | |
| Treatment | Sports injury assessment | |
| Amount | 85.00 | EUR, numeric |
| Category | Med 1 | Med 1 or Med 2 |
| Reimbursed | Yes | Yes/No |
| Insurer | VHI | Blank if not reimbursed |
| Reimbursed Amount | 50.00 | Blank if not reimbursed |
| Net Claimable | 35.00 | Amount - Reimbursed Amount |
| Receipt Link | https://drive.google.com/... | Clickable |
| Upload Date | 2026-04-10 | When uploaded |

## 4. Task Breakdown

### Phase 1: Project Setup & Auth (~6h)

| # | Task | Est. | Deps | Risk |
|---|------|------|------|------|
| 1.1 | Initialise Next.js project with TypeScript + Tailwind | 0.5h | None | Low |
| 1.2 | Set up Google Cloud Console project: create OAuth credentials, enable Drive + Sheets APIs. Write step-by-step README guide. | 1.5h | None | Low |
| 1.3 | Integrate NextAuth.js with Google provider, configure OAuth scopes (drive.file, spreadsheets, userinfo.email) | 2h | 1.1, 1.2 | Medium — scope configuration can be tricky |
| 1.4 | Build login page and auth-protected layout (redirect to login if not authenticated) | 1h | 1.3 | Low |
| 1.5 | Test OAuth flow end-to-end: login, session persistence, sign out | 1h | 1.4 | Low |

### Phase 2: Upload & OCR (~8h)

| # | Task | Est. | Deps | Risk |
|---|------|------|------|------|
| 2.1 | Build upload page: drag-and-drop + file picker, mobile-responsive, JPG/PDF only validation | 2h | 1.4 | Low |
| 2.2 | Create `POST /api/upload` route: receive file, save to temp, return file metadata | 1h | 1.1 | Low |
| 2.3 | Integrate Tesseract.js for JPG OCR on server side | 1.5h | 2.2 | Medium — quality depends on image |
| 2.4 | Add PDF text extraction (pdf-parse for text PDFs, pdf2pic + Tesseract for image PDFs) | 1.5h | 2.3 | Medium — image PDF conversion |
| 2.5 | Build field parser: extract date, amount, patient name, practitioner type, treatment from OCR text using regex + heuristics | 2h | 2.3 | High — most variable part |

### Phase 3: Smart Extraction (~4h)

| # | Task | Est. | Deps | Risk |
|---|------|------|------|------|
| 3.1 | Implement fuzzy name matching against family members list (Aidan Casey, Kyla Casey, Luca Casey, Mia Casey, Kari Roche) | 1h | 2.5 | Low |
| 3.2 | Build Med 1 / Med 2 classifier based on practitioner type and treatment keywords | 1.5h | 2.5 | Low — rule-based lookup |
| 3.3 | Implement confidence scoring: flag fields where extraction is uncertain | 1.5h | 2.5, 3.1, 3.2 | Medium |

### Phase 4: Review & Confirmation UI (~4h)

| # | Task | Est. | Deps | Risk |
|---|------|------|------|------|
| 4.1 | Build review form: editable fields for all extracted data, pre-populated from OCR | 2h | 3.3 | Low |
| 4.2 | Add visual highlighting for low-confidence fields (yellow background) | 0.5h | 4.1 | Low |
| 4.3 | Add family member dropdown, Med 1/Med 2 selector, reimbursement section (checkbox + insurer + amount) | 1h | 4.1 | Low |
| 4.4 | Add receipt image/PDF preview alongside the form | 0.5h | 4.1 | Low |

### Phase 5: Google Drive Integration (~4h)

| # | Task | Est. | Deps | Risk |
|---|------|------|------|------|
| 5.1 | Create Google Drive service: find-or-create folder by path (`Medical/[year]/expenses/`) | 1.5h | 1.3 | Medium — folder traversal logic |
| 5.2 | Implement file upload to Drive with naming convention, return shareable link | 1.5h | 5.1 | Low |
| 5.3 | Handle multi-year: detect year from expense date, create correct folder | 1h | 5.1 | Low |

### Phase 6: Google Sheets Integration (~4h)

| # | Task | Est. | Deps | Risk |
|---|------|------|------|------|
| 6.1 | Create Sheets service: find-or-create spreadsheet, find-or-create year tab with header row | 1.5h | 1.3 | Medium |
| 6.2 | Implement append row with all columns, calculate Net Claimable Amount | 1h | 6.1 | Low |
| 6.3 | Handle multi-year: write to correct tab based on expense date | 0.5h | 6.1 | Low |
| 6.4 | Create `POST /api/expenses` route: orchestrate Drive upload + Sheets write in transaction-like flow | 1h | 5.2, 6.2 | Medium — partial failure handling |

### Phase 7: End-to-End Polish (~2h)

| # | Task | Est. | Deps | Risk |
|---|------|------|------|------|
| 7.1 | Success screen with Drive link and "Upload Another" button | 0.5h | 6.4 | Low |
| 7.2 | Error handling: display user-friendly errors for API failures, file too large, etc. | 1h | 6.4 | Low |
| 7.3 | Test full flow with real 2026 receipts, fix edge cases | 0.5h | 7.1, 7.2 | Low |

**Total MVP (P0): ~32h**

### Phase 8: P1 Features (~8h, post-MVP)

| # | Task | Est. | Deps | Risk |
|---|------|------|------|------|
| 8.1 | Expense list page: fetch from Sheets API, display in sortable table | 3h | 6.2 | Low |
| 8.2 | Filters: year, family member, Med 1/Med 2 | 1.5h | 8.1 | Low |
| 8.3 | Tax summary page: aggregate totals by category + family member | 2.5h | 8.1 | Low |
| 8.4 | Summary formatted for Med 1 / Med 2 tax return sections | 1h | 8.3 | Low |

## 5. Quality Strategy

### Testing Approach
- **Unit tests**: Field parser (date, amount, name extraction), Med 1/Med 2 classifier, fuzzy name matcher, naming convention builder
- **Integration tests**: Google Drive folder creation/upload, Google Sheets row append
- **Manual testing**: Upload real 2026 receipts (JPG + PDF) end-to-end
- **Target**: Unit test coverage on extraction logic (the most error-prone area)

### Validation
- Test with at least 10 real receipts covering different practitioner types
- Verify Drive folder structure is correct
- Verify Sheets rows match expected format
- Test on iPhone Safari (primary device)

## 6. Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Tesseract quality too low for phone photos | High | Medium | Design OCR provider as swappable interface; can switch to Claude Vision API (~$3-5/yr) with minimal code change |
| Google OAuth token refresh issues | Medium | Low | NextAuth.js handles refresh automatically; test with expired tokens |
| Varied invoice formats break field parser | Medium | High | Confidence scoring flags uncertain fields; user corrects in review step; improve parser over time |
| PDF-to-image conversion fails for some PDFs | Low | Medium | Fall back to text extraction; flag for manual entry if both fail |

### OCR Provider Swap Strategy

The OCR service will be behind an interface:
```typescript
interface OCRProvider {
  extractText(file: Buffer, mimeType: string): Promise<OCRResult>
}
```
Tesseract, Claude Vision, and Google Cloud Vision can all implement this. Swapping is a config change.

## 7. Google Cloud Setup Guide (for README)

Steps the user will follow:
1. Go to Google Cloud Console → create new project "MedExpense Tracker"
2. Enable APIs: Google Drive API, Google Sheets API
3. Create OAuth 2.0 credentials (Web Application type)
4. Set authorised redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Copy Client ID and Client Secret to `.env.local`
6. Configure OAuth consent screen (internal use, test user: own Gmail)

## 8. Assumptions & Out of Scope

**Assumptions**:
- User's Google account has sufficient Drive storage (~100 receipt photos/year is negligible)
- Receipts are mostly printed (not handwritten) — Tesseract handles printed text better
- Single Google account used for both auth and storage

**Out of scope for MVP**:
- P1 features (expense list, tax summary) — Phase 8 after MVP works
- P2 features (bulk upload, edit, dashboard) — future iterations
- AWS deployment — local only until MVP validated
- Automated tests for Google API integration (manual testing sufficient at this scale)

---

## Next Steps

1. Review this plan
2. When approved, run `/epcc-code` to begin implementation starting with Phase 1

---

**End of Plan**
