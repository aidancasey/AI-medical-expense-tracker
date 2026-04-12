import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { extractText } from "@/lib/ocr";
import { parseReceiptText } from "@/lib/parser";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/pdf",
  ];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Please upload a JPG, PNG, or PDF." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Run OCR
  const ocrResult = await extractText(buffer, file.type);

  // Parse extracted text into structured fields
  const extracted = parseReceiptText(ocrResult.text);

  // Encode file as base64 for temporary storage (passed back to client)
  const fileBase64 = buffer.toString("base64");

  return NextResponse.json({
    extracted,
    ocrText: ocrResult.text,
    ocrConfidence: ocrResult.confidence,
    file: {
      base64: fileBase64,
      mimeType: file.type,
      originalName: file.name,
    },
  });
}
