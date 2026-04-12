import { google } from "googleapis";
import type { SavedExpense } from "./constants";

const SPREADSHEET_NAME = "MedExpense Tracker";

const HEADERS = [
  "Date",
  "Family Member",
  "Practitioner Type",
  "Treatment",
  "Amount (EUR)",
  "Receipt Link",
  "Upload Date",
];

function getSheetsClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.sheets({ version: "v4", auth });
}

async function findOrCreateSpreadsheet(
  accessToken: string
): Promise<string> {
  // Check env for existing spreadsheet ID
  if (process.env.GOOGLE_SPREADSHEET_ID) {
    return process.env.GOOGLE_SPREADSHEET_ID;
  }

  // Search Drive for existing spreadsheet
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const drive = google.drive({ version: "v3", auth });

  const res = await drive.files.list({
    q: `name='${SPREADSHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
    fields: "files(id)",
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  // Create new spreadsheet
  const sheets = getSheetsClient(accessToken);
  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: SPREADSHEET_NAME },
    },
  });

  return spreadsheet.data.spreadsheetId!;
}

async function ensureYearTab(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  year: string
): Promise<void> {
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
  });

  const sheetNames =
    spreadsheet.data.sheets?.map((s) => s.properties?.title) || [];

  if (sheetNames.includes(year)) return;

  // Add new sheet tab for the year
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: { title: year },
          },
        },
      ],
    },
  });

  // Add headers to new sheet
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${year}!A1:G1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [HEADERS],
    },
  });

  // Delete default "Sheet1" if it exists and we just created a year tab
  const defaultSheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title === "Sheet1"
  );
  if (defaultSheet && sheetNames.length === 1) {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteSheet: {
                sheetId: defaultSheet.properties?.sheetId,
              },
            },
          ],
        },
      });
    } catch {
      // Ignore if we can't delete it (can't delete last sheet)
    }
  }
}

export async function appendExpenseRow(
  accessToken: string,
  expense: SavedExpense
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const spreadsheetId = await findOrCreateSpreadsheet(accessToken);
  const sheets = getSheetsClient(accessToken);
  const year = expense.date.split("-")[0];

  await ensureYearTab(sheets, spreadsheetId, year);

  const row = [
    expense.date,
    expense.familyMember,
    expense.practitionerType,
    expense.treatment,
    expense.amount?.toFixed(2) ?? "",
    expense.receiptLink,
    expense.uploadDate,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${year}!A:G`,
    valueInputOption: "RAW",
    requestBody: {
      values: [row],
    },
  });

  return {
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
  };
}
