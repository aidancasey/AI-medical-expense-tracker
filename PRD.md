# Product Requirement Document: MedExpense Tracker

**Created**: 2026-04-10
**Version**: 1.0
**Status**: Draft
**Complexity**: Medium

---

## Executive Summary

A personal web application for the Casey/Roche family to capture, process, and track medical expenses throughout the year, streamlining annual Irish tax return preparation (Med 1 / Med 2 relief claims). Users upload invoice photos or PDFs via a simple web form, the system extracts key details via OCR, presents them for review, then stores the receipt in Google Drive and logs the expense in a Google Spreadsheet.

## Problem Statement

Preparing an Irish tax return requires gathering all medical receipts for the year, categorising them by tax relief type (Med 1 / Med 2), identifying which were reimbursed by health insurers, and totalling amounts per family member. This is currently a manual, error-prone process done retrospectively. A system that captures and categorises expenses as they occur eliminates the year-end scramble and reduces errors.

## Target Users

### Primary User
- **Aidan Casey** — manages family finances and prepares annual tax return
- Needs to quickly capture receipts on the go (iPhone) or from emailed PDFs
- Wants minimal friction: upload → confirm → done

### Secondary Users
- **Kari Roche** — may upload receipts from her own device
- Other family members unlikely to use the system directly

### Family Members (Expense Subjects)
- Aidan Casey
- Kyla Casey
- Luca Casey
- Mia Casey
- Kari Roche

## Goals & Success Criteria

### Product Goals
1. Reduce time spent preparing medical expense data for tax returns from hours to minutes
2. Ensure no receipts are lost or forgotten throughout the year
3. Accurately categorise expenses by Med 1 / Med 2 for direct use in tax filing

### Success Metrics
- 100% of uploaded receipts stored in Google Drive with correct naming convention
- OCR extraction accuracy sufficient for ~90% of receipts (remaining flagged for manual entry)
- Complete spreadsheet ready for tax return with no additional data gathering needed

### Acceptance Criteria
- [ ] User can upload a JPG or PDF via web form from any device
- [ ] System extracts patient name, amount, practitioner, treatment, date from receipt
- [ ] User reviews and confirms/edits extracted data before saving
- [ ] Receipt file saved to Google Drive under `Medical/[year]/expenses/`
- [ ] Expense row written to Google Spreadsheet with link back to receipt
- [ ] Reimbursement status can be recorded per expense
- [ ] Med 1 / Med 2 category assigned to each expense
- [ ] Multi-year support: new folder and sheet tab created automatically per year

## Core Features

### Must Have (P0 - MVP)

1. **Google OAuth Login**
   - Sign in with Gmail account
   - Secures access to personal Google Drive and Sheets
   - Single user (family) authentication

2. **Receipt Upload**
   - Web form accessible from any device (mobile-responsive)
   - Accept JPG and PDF files
   - One receipt at a time

3. **OCR & Data Extraction**
   - Extract text from uploaded image/PDF using Tesseract (free)
   - Parse extracted text to identify: patient name, amount (EUR), practitioner type, treatment description, date
   - Fuzzy match patient name against known family members (full name or first name)
   - Classify expense as Med 1 or Med 2 based on practitioner/treatment type
   - Flag low-confidence fields for manual entry

4. **Review & Confirmation Screen**
   - Display all extracted fields in an editable form
   - Highlight any fields flagged as low-confidence
   - Family member dropdown (pre-populated from extraction)
   - Med 1 / Med 2 selector (pre-populated from extraction)
   - Reimbursement tracking: checkbox + insurer name + reimbursed amount
   - Confirm button to save

5. **Google Drive Storage**
   - Save receipt to `Medical/[year]/expenses/` folder
   - Naming convention: `YYYY-MM-DD_[FamilyMember]_[PractitionerType]_[Amount].ext`
     - Example: `2026-03-15_Luca-Casey_Physio_€85.00.jpg`
   - Auto-create year folder if it doesn't exist

6. **Google Spreadsheet Logging**
   - Write one row per expense with columns:
     - Date
     - Family Member
     - Practitioner Type
     - Treatment Description
     - Amount (EUR)
     - Med 1 / Med 2
     - Reimbursed (Yes/No)
     - Insurer Name
     - Reimbursed Amount
     - Net Claimable Amount
     - Receipt Link (Google Drive URL)
     - Upload Date
   - One tab per year (e.g. "2026", "2027")
   - Auto-create new tab when year changes

7. **Multi-Year Support**
   - Detect expense year from invoice date
   - Auto-create Google Drive folder and Sheet tab for new years
   - Support uploading historical receipts (e.g. 2026 receipts uploaded in 2027)

### Should Have (P1)

8. **Tax Summary View**
   - Per-year summary showing totals by Med 1 / Med 2
   - Breakdown by family member
   - Total reimbursed vs. net claimable amounts
   - Directly usable figures for Med 1 / Med 2 tax return forms

9. **Expense List View**
   - View all logged expenses in a table
   - Filter by year, family member, category
   - Click through to receipt in Google Drive

### Nice to Have (P2)

10. **Bulk Upload**
    - Upload multiple receipts in one session
    - Queue for sequential processing

11. **Edit Previously Logged Expense**
    - Modify spreadsheet row from web UI
    - Update reimbursement status after initial entry

12. **Dashboard**
    - Year-to-date spending overview
    - Spending by category and family member charts

## User Journey

### Primary Journey: Upload & Log a Receipt

1. User takes photo of medical receipt on iPhone
2. User opens web app in browser → logs in with Google account
3. User taps "Upload Receipt" → selects photo from camera roll (or PDF from files)
4. System processes image: OCR extracts text, AI parses fields
5. Review screen shows extracted data:
   - Family member: "Luca Casey" (matched from "Luca" on invoice)
   - Date: 2026-03-15
   - Practitioner: Physiotherapist
   - Treatment: Sports injury assessment
   - Amount: €85.00
   - Category: Med 1
   - Flagged fields highlighted in yellow
6. User confirms or edits any field, adds reimbursement info if applicable
7. User clicks "Save"
8. System uploads receipt to Drive (`Medical/2026/expenses/2026-03-15_Luca-Casey_Physio_€85.00.jpg`)
9. System writes row to Google Sheet "2026" tab
10. User sees success confirmation with link to receipt in Drive

### Edge Cases
- **Blurry photo**: OCR returns low confidence → all fields flagged for manual entry
- **No patient name on invoice**: Family member field left blank, flagged for selection
- **Invoice in parent's name for child**: User corrects family member in review step
- **Reimbursement received later**: User updates via spreadsheet directly (MVP) or edit feature (P1)
- **Receipt from previous year**: System detects date year, files to correct folder/tab

## Technical Approach

### High-Level Architecture
- **Frontend**: Simple responsive web app (React or plain HTML/JS)
- **Backend**: Node.js or Python server
- **OCR**: Tesseract.js (browser) or pytesseract (server) — free, swappable to Google Cloud Vision or Claude Vision if quality insufficient
- **Storage**: Google Drive API + Google Sheets API
- **Auth**: Google OAuth 2.0
- **Deployment**: Local development first → AWS (EC2 or Lambda + S3 for static hosting)

### Med 1 / Med 2 Classification

**Med 1 (Tax relief at 20%)**:
- Doctor / GP visits
- Consultant fees
- Prescribed drugs and medicines
- Physiotherapy
- Hospital charges (public and semi-private)

**Med 2 (Tax relief at 20%, different form)**:
- Dental (routine: check-ups, fillings, extractions)
- Orthodontic treatment
- Ophthalmic (eye tests, glasses, contact lenses)
- Hearing aids
- Speech therapy
- Orthoptic treatment

*Note: Non-routine dental (crowns, veneers, periodontal) qualifies under Med 1.*

### Google API Scopes Required
- `drive.file` — create/manage files the app creates
- `spreadsheets` — read/write Google Sheets
- `userinfo.email` — identify logged-in user

## Constraints

### Technical
- Free OCR (Tesseract) may struggle with poor quality photos — paid API fallback planned
- Google API rate limits unlikely to be an issue at ~100 receipts/year
- Must work on mobile Safari/Chrome (iPhone primary device)

### Budget
- Target: near-zero running cost
- Free tier: Tesseract OCR, Google APIs (within free quotas)
- Potential paid: Google Cloud Vision (~$15/yr) or Claude API (~$3-5/yr) if free OCR insufficient

### Timeline
- MVP first, iterate based on real usage with 2026 test receipts

## Out of Scope

- Automated email/notification system
- Multi-user accounts or access control beyond Google OAuth
- Direct Revenue Online Service (ROS) integration
- Prescription tracking or medication management
- Insurance claim submission
- Receipt scanning via dedicated mobile app (web upload only for MVP)

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Tesseract OCR quality insufficient for handwritten/thermal receipts | Medium | Design for swappable OCR provider; flag low-confidence for manual entry |
| Google API credential setup complexity | Low | Step-by-step setup guide included in project README |
| Invoice formats too varied for reliable parsing | Medium | Review/edit step catches extraction errors; improve parsing rules over time |
| Euro symbol (€) and Irish formatting not handled correctly | Low | Explicit locale handling in parsing logic |

## Open Questions

1. Should the web app have a specific name/branding, or is a simple title sufficient?
2. For AWS deployment — preferred service (EC2, ECS, Lambda + API Gateway)?
3. Should the spreadsheet be pre-created manually or auto-created by the app on first use?

## Dependencies

- Google Cloud Console project with OAuth credentials configured
- Google Drive and Sheets API enabled
- Tesseract OCR library

## Next Steps

This PRD feeds into the EPCC workflow:

1. Review & approve this PRD
2. Run `/epcc-plan` to create implementation plan (greenfield project)
3. Begin development with `/epcc-code`
4. Finalize with `/epcc-commit`

---

**End of PRD**
