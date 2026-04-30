export interface UploadResult {
  extracted: {
    date: string;
    familyMember: string;
    practitionerType: string;
    treatment: string;
    amount: number | null;
    confidence: {
      date: number;
      familyMember: number;
      practitionerType: number;
      treatment: number;
      amount: number;
    };
  };
  ocrText: string;
  ocrConfidence: number;
  file: {
    base64: string;
    mimeType: string;
    originalName: string;
  };
}

let current: UploadResult | null = null;

export function setUploadResult(result: UploadResult): void {
  current = result;
}

export function getUploadResult(): UploadResult | null {
  return current;
}

export function clearUploadResult(): void {
  current = null;
}
