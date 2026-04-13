import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadReceiptToDrive } from "@/lib/google-drive";
import { appendExpenseRow } from "@/lib/google-sheets";
import type { SavedExpense } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    date,
    familyMember,
    practitionerType,
    treatment,
    amount,
    file,
  } = body;

  if (!date || !familyMember || !amount || !file?.base64) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const year = date.split("-")[0];
  const numAmount = parseFloat(amount);

  // Build filename: YYYY-MM-DD_FirstName-LastName_PractitionerType_EURAmount.ext
  const ext = file.mimeType === "application/pdf" ? "pdf" : "jpg";
  const safeMember = familyMember.replace(/\s+/g, "-");
  const safePractitioner = (practitionerType || "Other").replace(/\s+/g, "-");
  const fileName = `${date}_${safeMember}_${safePractitioner}_EUR${numAmount.toFixed(2)}.${ext}`;

  const fileBuffer = Buffer.from(file.base64, "base64");

  try {
    // Upload to Google Drive
    const { webViewLink } = await uploadReceiptToDrive(
      session.accessToken,
      fileBuffer,
      file.mimeType,
      fileName,
      year
    );

    // Write to Google Sheets
    const expense: SavedExpense = {
      date,
      familyMember,
      practitionerType: practitionerType || "Other",
      treatment: treatment || "",
      amount: numAmount,
      receiptLink: webViewLink,
      uploadDate: new Date().toISOString().split("T")[0],
      confidence: {
        date: 1,
        familyMember: 1,
        practitionerType: 1,
        treatment: 1,
        amount: 1,
      },
    };

    const { spreadsheetUrl } = await appendExpenseRow(
      session.accessToken,
      expense
    );

    return NextResponse.json({
      success: true,
      receiptLink: webViewLink,
      spreadsheetUrl,
      fileName,
    });
  } catch (error) {
    console.error("Failed to save expense:", error);
    const message =
      error instanceof Error ? error.message : "Failed to save expense";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
