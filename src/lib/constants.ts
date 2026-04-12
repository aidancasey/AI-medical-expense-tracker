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

export interface ExtractedExpense {
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
}

export interface SavedExpense extends ExtractedExpense {
  receiptLink: string;
  uploadDate: string;
}
