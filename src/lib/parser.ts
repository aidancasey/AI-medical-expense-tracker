import {
  FAMILY_MEMBERS,
  PRACTITIONER_TYPES,
  type ExtractedExpense,
} from "./constants";

const CONFIDENCE_HIGH = 0.9;
const CONFIDENCE_MEDIUM = 0.6;
const CONFIDENCE_LOW = 0.3;

function matchFamilyMember(text: string): { name: string; confidence: number } {
  const lower = text.toLowerCase();

  // Try full name match first
  for (const member of FAMILY_MEMBERS) {
    if (lower.includes(member.toLowerCase())) {
      return { name: member, confidence: CONFIDENCE_HIGH };
    }
  }

  // Try first name match
  for (const member of FAMILY_MEMBERS) {
    const firstName = member.split(" ")[0].toLowerCase();
    if (lower.includes(firstName)) {
      return { name: member, confidence: CONFIDENCE_MEDIUM };
    }
  }

  // Try last name match (less specific)
  for (const member of FAMILY_MEMBERS) {
    const lastName = member.split(" ")[1].toLowerCase();
    if (lower.includes(lastName)) {
      return { name: member, confidence: CONFIDENCE_LOW };
    }
  }

  return { name: "", confidence: 0 };
}

function extractDate(text: string): { date: string; confidence: number } {
  // Common date patterns on Irish invoices
  const patterns = [
    // DD/MM/YYYY or DD-MM-YYYY
    /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/,
    // YYYY-MM-DD (ISO)
    /(\d{4})-(\d{1,2})-(\d{1,2})/,
    // DD Month YYYY or DD Mon YYYY
    /(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})/i,
  ];

  const monthMap: Record<string, string> = {
    jan: "01", january: "01",
    feb: "02", february: "02",
    mar: "03", march: "03",
    apr: "04", april: "04",
    may: "05",
    jun: "06", june: "06",
    jul: "07", july: "07",
    aug: "08", august: "08",
    sep: "09", september: "09",
    oct: "10", october: "10",
    nov: "11", november: "11",
    dec: "12", december: "12",
  };

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    let year: string, month: string, day: string;

    if (pattern === patterns[1]) {
      // ISO format
      [, year, month, day] = match;
    } else if (pattern === patterns[2]) {
      // DD Month YYYY
      day = match[1].padStart(2, "0");
      month = monthMap[match[2].toLowerCase().slice(0, 3)] || "01";
      year = match[3];
      return { date: `${year}-${month}-${day}`, confidence: CONFIDENCE_HIGH };
    } else {
      // DD/MM/YYYY — Irish date format (day first)
      day = match[1].padStart(2, "0");
      month = match[2].padStart(2, "0");
      year = match[3];
    }

    const numYear = parseInt(year);
    const numMonth = parseInt(month);
    const numDay = parseInt(day);

    if (
      numYear >= 2020 &&
      numYear <= 2030 &&
      numMonth >= 1 &&
      numMonth <= 12 &&
      numDay >= 1 &&
      numDay <= 31
    ) {
      return {
        date: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
        confidence: CONFIDENCE_HIGH,
      };
    }
  }

  return { date: "", confidence: 0 };
}

function extractAmount(text: string): {
  amount: number | null;
  confidence: number;
} {
  // Match EUR amounts — various formats
  const patterns = [
    // €85.00 or € 85.00 or EUR 85.00
    /(?:€|EUR)\s*(\d{1,5}(?:[.,]\d{2})?)/gi,
    // Total: 85.00 or Amount: 85.00 or Fee: 85.00
    /(?:total|amount|fee|charge|due|paid|balance)[:\s]*€?\s*(\d{1,5}(?:[.,]\d{2})?)/gi,
    // Standalone amounts like 85.00 (lower confidence)
    /\b(\d{2,5}\.\d{2})\b/g,
  ];

  const amounts: { value: number; confidence: number }[] = [];

  for (let i = 0; i < patterns.length; i++) {
    const matches = [...text.matchAll(patterns[i])];
    for (const match of matches) {
      const value = parseFloat(match[1].replace(",", "."));
      if (value > 0 && value < 50000) {
        amounts.push({
          value,
          confidence: i === 0 ? CONFIDENCE_HIGH : i === 1 ? CONFIDENCE_HIGH : CONFIDENCE_LOW,
        });
      }
    }
  }

  if (amounts.length === 0) return { amount: null, confidence: 0 };

  // Prefer the highest confidence match, then the largest amount (likely the total)
  amounts.sort((a, b) => b.confidence - a.confidence || b.value - a.value);
  return { amount: amounts[0].value, confidence: amounts[0].confidence };
}

function identifyPractitioner(text: string): {
  type: string;
  confidence: number;
} {
  const lower = text.toLowerCase();

  const keywords: Record<string, string[]> = {
    GP: ["general practitioner", "gp ", "g.p.", "family doctor", "doctor"],
    Consultant: ["consultant", "specialist", "clinic"],
    Physiotherapist: ["physio", "physiotherapy", "physical therapy"],
    Dentist: ["dental", "dentist", "dentistry"],
    Orthodontist: ["orthodon", "braces"],
    Optician: ["optician", "optometrist", "eye test", "glasses", "contact lens"],
    Ophthalmologist: ["ophthalmol", "eye doctor", "eye surgeon"],
    Pharmacist: ["pharmacy", "pharmacist", "chemist", "prescription", "dispensing"],
    Hospital: ["hospital", "a&e", "emergency department", "inpatient", "outpatient"],
    "Speech Therapist": ["speech therap", "speech and language"],
    Audiologist: ["audiolog", "hearing"],
    Psychologist: ["psycholog", "counsell", "therapist"],
  };

  for (const [type, kws] of Object.entries(keywords)) {
    for (const kw of kws) {
      if (lower.includes(kw)) {
        return { type, confidence: CONFIDENCE_HIGH };
      }
    }
  }

  // Check against practitioner type names directly
  for (const type of PRACTITIONER_TYPES) {
    if (lower.includes(type.toLowerCase())) {
      return { type, confidence: CONFIDENCE_MEDIUM };
    }
  }

  return { type: "", confidence: 0 };
}

function extractTreatment(text: string): {
  treatment: string;
  confidence: number;
} {
  const lower = text.toLowerCase();

  const treatmentKeywords = [
    "consultation",
    "assessment",
    "examination",
    "check-up",
    "checkup",
    "treatment",
    "filling",
    "extraction",
    "cleaning",
    "scale and polish",
    "x-ray",
    "xray",
    "scan",
    "mri",
    "blood test",
    "injection",
    "vaccination",
    "therapy session",
    "session",
    "review",
    "follow-up",
    "follow up",
    "prescription",
    "crown",
    "bridge",
    "root canal",
    "eye test",
    "refraction",
    "sports injury",
  ];

  for (const keyword of treatmentKeywords) {
    const idx = lower.indexOf(keyword);
    if (idx !== -1) {
      // Extract a phrase around the keyword
      const start = Math.max(0, idx - 20);
      const end = Math.min(text.length, idx + keyword.length + 30);
      let snippet = text.slice(start, end).trim();
      // Clean up to nearest word boundaries
      if (start > 0) {
        snippet = snippet.replace(/^\S*\s/, "");
      }
      snippet = snippet.replace(/\s\S*$/, "");
      return { treatment: snippet || keyword, confidence: CONFIDENCE_MEDIUM };
    }
  }

  return { treatment: "", confidence: 0 };
}

export function parseReceiptText(text: string): ExtractedExpense {
  const { name: familyMember, confidence: familyMemberConf } =
    matchFamilyMember(text);
  const { date, confidence: dateConf } = extractDate(text);
  const { amount, confidence: amountConf } = extractAmount(text);
  const { type: practitionerType, confidence: practitionerConf } =
    identifyPractitioner(text);
  const { treatment, confidence: treatmentConf } = extractTreatment(text);

  return {
    date,
    familyMember,
    practitionerType: practitionerType || "",
    treatment,
    amount,
    confidence: {
      date: dateConf,
      familyMember: familyMemberConf,
      practitionerType: practitionerConf,
      treatment: treatmentConf,
      amount: amountConf,
    },
  };
}
