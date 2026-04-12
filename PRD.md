# Product Requirement Document: MedExpense Tracker

**Created**: 2026-04-10
**Updated**: 2026-04-12
**Version**: 1.1
**Status**: Implemented — deployed to Google Cloud Run

---

## Executive Summary

A personal web application for the Casey/Roche family to capture, process, and track medical expenses throughout the year. Users upload invoice photos or PDFs via a simple web form, the system extracts key details via OCR, presents them for review, then stores the receipt privately in Google Drive and logs the expense in a Google Spreadsheet.

## Problem Statement

Preparing an Irish tax return requires gathering all medical receipts for the year. This is currently a manual, error-prone process done retrospectively. A system that captures expenses as they occur eliminates the year-end scramble and reduces errors.

## Target Users

### Primary User
- **Aidan Casey** — manages family finances and prepares annual tax return
- Needs to quickly capture receipts on the go (iPhone) or from emailed PDFs
- Wants minimal friction: upload → confirm → done

### Secondary Users
- **Kari Roche** — may upload receipts from her own device

### Family Members (Expense Subjects)
- Aidan Casey, Kyla Casey, Luca Casey, Mia Casey, Kari Roche

## Goals & Success Criteria

### Product Goals
1. Reduce time spent gathering medical expense data for tax returns from hours to minutes
2. Ensure no receipts are lost or forgotten throughout the year
3. Maintain a clean, organised spreadsheet record ready for tax filing

### Success Metrics
- 100% of uploaded receipts stored privately in Google Drive with correct naming convention
- OCR extraction accurate enough for ~90% of receipts (remaining flagged for manual entry)
- Complete spreadsheet ready for tax return with no additional data gathering needed

### Acceptance Criteria
- [x] User can upload a JPG or PDF via web form from any device
- [x] System extracts patient name, amount, practitioner, treatment, date from receipt
- [x] User reviews and confirms/edits extracted data before saving
- [x] Receipt file saved privately to Google Drive under `Medical/[year]/expenses/`
- [x] Expense row written to Google Spreadsheet with link back to receipt
- [x] Multi-year support: new folder and sheet tab created automatically per year

## Core Features

### Must Have (P0 - MVP) — All Implemented ✅

1. **Google OAuth Login**
   - Sign in with Gmail account
   - Secures access to personal Google Drive and Sheets

2. **Receipt Upload**
   - Web form accessible from any device (mobile-responsive)
   - Accept JPG and PDF files
   - One receipt at a time

3. **OCR & Data Extraction**
   - Extract text using Tesseract.js (server-side, free)
   - Parse extracted text to identify: patient name, amount (EUR), practitioner type, treatment description, date
   - Fuzzy match patient name against known family members (full name or first name)
   - Confidence scoring — low-confidence fields flagged for manual review

4. **Review & Confirmation Screen**
   - Display all extracted fields in an editable form
   - Low-confidence fields highlighted in amber
   - Family member dropdown
   - Practitioner type dropdown
   - Confirm button to save, Cancel to discard

5. **Google Drive Storage**
   - Receipt saved privately to `Medical/[year]/expenses/` folder
   - Naming convention: `YYYY-MM-DD_FirstName-LastName_PractitionerType_EURAmount.ext`
   - Example: `2026-03-15_Luca-Casey_Physiotherapist_EUR85.00.jpg`
   - Files accessible only to the authenticated Google account owner
   - Auto-create year folder if it doesn't exist

6. **Google Spreadsheet Logging**
   - Write one row per expense with columns:
     - Date
     - Family Member
     - Practitioner Type
     - Treatment Description
     - Amount (EUR)
     - Receipt Link (Google Drive URL)
     - Upload Date
   - One tab per year (e.g. "2026", "2027")
   - Auto-create new tab when year changes
   - Spreadsheet auto-created on first use if not pre-configured

7. **Multi-Year Support**
   - Detect expense year from invoice date (not upload date)
   - Auto-create Google Drive folder and Sheet tab for new years
   - Supports uploading historical receipts

### Should Have (P1)

8. **Expense List View**
   - View all logged expenses in a table
   - Filter by year, family member
   - Click through to receipt in Google Drive

9. **Tax Summary View**
   - Per-year spending totals
   - Breakdown by family member

### Nice to Have (P2)

10. **Bulk Upload** — upload multiple receipts in one session
11. **Edit Previously Logged Expense** — modify spreadsheet row from web UI
12. **Dashboard** — year-to-date spending overview with charts

## User Journey

### Primary Journey: Upload & Log a Receipt

1. User takes photo of medical receipt on iPhone
2. User opens web app → logs in with Google account
3. User uploads photo from camera roll (or PDF from files)
4. System runs OCR, extracts and parses fields
5. Review screen shows extracted data with low-confidence fields highlighted in amber:
   - Family member: "Luca Casey"
   - Date: 2026-03-15
   - Practitioner: Physiotherapist
   - Treatment: Sports injury assessment
   - Amount: €85.00
6. User confirms or edits any field
7. User clicks "Save"
8. Receipt uploaded privately to Drive (`Medical/2026/expenses/2026-03-15_Luca-Casey_Physiotherapist_EUR85.00.jpg`)
9. Row written to Google Sheet "2026" tab
10. Success screen with links to receipt and spreadsheet

### Edge Cases
- **Blurry photo**: OCR returns low confidence → all fields flagged amber for manual entry
- **No patient name on invoice**: Family member field blank, flagged for selection
- **Invoice in parent's name for child**: User corrects in review step
- **Receipt from previous year**: System detects date year, files to correct folder/tab

## Technical Implementation

### Stack
- **Framework**: Next.js 16 (App Router, TypeScript, Tailwind CSS v4)
- **Auth**: NextAuth.js v5 beta + Google OAuth
- **OCR**: Tesseract.js v7 (server-side WASM) — swappable to Claude Vision if quality insufficient
- **PDF parsing**: pdf-parse v1.1.1
- **Google APIs**: googleapis npm package
- **Deployment**: Google Cloud Run (europe-west1), CI/CD via GitHub Actions
- **Node.js**: v22 (pinned in `.nvmrc`)

### Production URL
`https://medexpense-572619161403.europe-west1.run.app`

### Google API Scopes
- `drive.file` — create/manage files the app creates
- `spreadsheets` — read/write Google Sheets
- `userinfo.email` — identify logged-in user

## Constraints

### Technical
- Free OCR (Tesseract) may struggle with poor quality photos — Claude Vision API fallback planned if needed (~€3-5/yr for 100 receipts)
- Google API rate limits not a concern at ~100 receipts/year
- Must work on mobile Safari/Chrome (iPhone primary device)

### Budget
- Running cost: ~€0/year (Cloud Run free tier covers 100 receipts comfortably)
- Domain: not purchased — app accessed via bookmark/home screen shortcut

## Out of Scope

- Med 1 / Med 2 tax classification (removed — user handles this directly in tax return)
- Reimbursement / insurer tracking (removed — user tracks separately)
- Automated email/notification system
- Multi-user accounts beyond Google OAuth
- Direct Revenue Online Service (ROS) integration
- Prescription or medication management
- Insurance claim submission
- Dedicated mobile app (web upload only)

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Tesseract OCR quality insufficient for thermal/handwritten receipts | Medium | Swap to Claude Vision API — interface is designed for easy replacement |
| Invoice formats too varied for reliable parsing | Medium | Review/edit step catches errors; improve parser rules over time |
| Google API credential expiry | Low | NextAuth handles token refresh; re-login if needed |
