export const FAMILY_MEMBERS = [
  "Aidan Casey",
  "Kyla Casey",
  "Luca Casey",
  "Mia Casey",
  "Kari Roche",
] as const;

export type FamilyMember = (typeof FAMILY_MEMBERS)[number];

export const PRACTITIONER_TYPES = [
  "GP",
  "Consultant",
  "Physiotherapist",
  "Dentist",
  "Orthodontist",
  "Optician",
  "Ophthalmologist",
  "Pharmacist",
  "Hospital",
  "Speech Therapist",
  "Audiologist",
  "Psychologist",
  "Other",
] as const;

export type PractitionerType = (typeof PRACTITIONER_TYPES)[number];

export type TaxCategory = "Med 1" | "Med 2";

// Med 2 practitioner types — everything else is Med 1
const MED_2_PRACTITIONERS: string[] = [
  "Dentist",
  "Orthodontist",
  "Optician",
  "Ophthalmologist",
  "Speech Therapist",
  "Audiologist",
];

// Keywords that override Med 2 → Med 1 for dental
const MED_1_DENTAL_KEYWORDS = [
  "crown",
  "veneer",
  "periodontal",
  "implant",
  "root canal",
  "bridge",
  "surgical",
];

export function classifyTaxCategory(
  practitionerType: string,
  treatment: string
): TaxCategory {
  const isMed2Practitioner = MED_2_PRACTITIONERS.some(
    (p) => p.toLowerCase() === practitionerType.toLowerCase()
  );

  if (!isMed2Practitioner) return "Med 1";

  // Non-routine dental qualifies as Med 1
  if (
    practitionerType.toLowerCase() === "dentist" ||
    practitionerType.toLowerCase() === "orthodontist"
  ) {
    const lowerTreatment = treatment.toLowerCase();
    if (MED_1_DENTAL_KEYWORDS.some((kw) => lowerTreatment.includes(kw))) {
      return "Med 1";
    }
  }

  return "Med 2";
}

export const INSURER_OPTIONS = [
  "VHI",
  "Laya Healthcare",
  "Irish Life Health",
  "HSF Health Plan",
  "Other",
] as const;

export interface ExtractedExpense {
  date: string;
  familyMember: string;
  practitionerType: string;
  treatment: string;
  amount: number | null;
  taxCategory: TaxCategory;
  confidence: {
    date: number;
    familyMember: number;
    practitionerType: number;
    treatment: number;
    amount: number;
  };
}

export interface SavedExpense extends ExtractedExpense {
  reimbursed: boolean;
  insurerName: string;
  reimbursedAmount: number;
  netClaimable: number;
  receiptLink: string;
  uploadDate: string;
}
