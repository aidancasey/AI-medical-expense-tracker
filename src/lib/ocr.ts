import Tesseract from "tesseract.js";
import path from "path";

export interface OCRResult {
  text: string;
  confidence: number;
}

export async function extractTextFromImage(
  buffer: Buffer
): Promise<OCRResult> {
  const workerPath = path.join(
    process.cwd(),
    "node_modules/tesseract.js/src/worker-script/node/index.js"
  );

  // Use baked-in tessdata if present (Docker image), otherwise let
  // Tesseract download to its default cache (local dev)
  const fs = await import("fs");
  const bakedLangPath = "/app/tessdata";
  const langPath = fs.existsSync(bakedLangPath) ? bakedLangPath : undefined;

  const {
    data: { text, confidence },
  } = await Tesseract.recognize(buffer, "eng", {
    workerPath,
    ...(langPath ? { langPath } : {}),
  });
  return { text, confidence };
}

export async function extractTextFromPDF(buffer: Buffer): Promise<OCRResult> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse/lib/pdf-parse.js");
  const data = await pdfParse(buffer);

  if (data.text && data.text.trim().length > 20) {
    return { text: data.text, confidence: 95 };
  }

  // Likely a scanned PDF with no embedded text — flag low confidence
  return { text: data.text || "", confidence: 20 };
}

export async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<OCRResult> {
  if (mimeType === "application/pdf") {
    return extractTextFromPDF(buffer);
  }
  return extractTextFromImage(buffer);
}
