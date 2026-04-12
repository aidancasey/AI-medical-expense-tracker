"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FAMILY_MEMBERS,
  PRACTITIONER_TYPES,
  INSURER_OPTIONS,
  classifyTaxCategory,
  type TaxCategory,
} from "@/lib/constants";

interface UploadResult {
  extracted: {
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
  };
  ocrText: string;
  ocrConfidence: number;
  file: {
    base64: string;
    mimeType: string;
    originalName: string;
  };
}

const LOW_CONFIDENCE = 0.6;

function FieldLabel({
  label,
  confidence,
}: {
  label: string;
  confidence?: number;
}) {
  const isLow = confidence !== undefined && confidence < LOW_CONFIDENCE;
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
      {isLow && (
        <span className="ml-2 text-xs font-normal text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
          Low confidence — please verify
        </span>
      )}
    </label>
  );
}

function inputClass(confidence?: number) {
  const isLow = confidence !== undefined && confidence < LOW_CONFIDENCE;
  return `block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 ${
    isLow
      ? "border-amber-400 bg-amber-50 focus:ring-amber-400"
      : "border-gray-300 bg-white focus:ring-blue-500"
  }`;
}

export default function ReviewPage() {
  const router = useRouter();
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    receiptLink: string;
    spreadsheetUrl: string;
    fileName: string;
  } | null>(null);

  // Form fields
  const [date, setDate] = useState("");
  const [familyMember, setFamilyMember] = useState("");
  const [practitionerType, setPractitionerType] = useState("");
  const [treatment, setTreatment] = useState("");
  const [amount, setAmount] = useState("");
  const [taxCategory, setTaxCategory] = useState<TaxCategory>("Med 1");
  const [reimbursed, setReimbursed] = useState(false);
  const [insurerName, setInsurerName] = useState("");
  const [reimbursedAmount, setReimbursedAmount] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem("uploadResult");
    if (!raw) {
      router.replace("/upload");
      return;
    }
    const result: UploadResult = JSON.parse(raw);
    setUploadResult(result);

    const e = result.extracted;
    setDate(e.date || "");
    setFamilyMember(e.familyMember || "");
    setPractitionerType(e.practitionerType || "");
    setTreatment(e.treatment || "");
    setAmount(e.amount != null ? String(e.amount) : "");
    setTaxCategory(e.taxCategory || "Med 1");
  }, [router]);

  // Auto-reclassify when practitioner or treatment changes
  useEffect(() => {
    if (practitionerType) {
      setTaxCategory(classifyTaxCategory(practitionerType, treatment));
    }
  }, [practitionerType, treatment]);

  async function handleSave() {
    if (!uploadResult) return;
    setSaveError(null);
    setIsSaving(true);

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          familyMember,
          practitionerType,
          treatment,
          amount,
          taxCategory,
          reimbursed,
          insurerName: reimbursed ? insurerName : "",
          reimbursedAmount: reimbursed ? reimbursedAmount : "0",
          file: uploadResult.file,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      sessionStorage.removeItem("uploadResult");
      setSuccess({
        receiptLink: data.receiptLink,
        spreadsheetUrl: data.spreadsheetUrl,
        fileName: data.fileName,
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-green-100 p-4">
            <svg
              className="h-12 w-12 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Expense Saved
        </h1>
        <p className="text-sm text-gray-500 mb-1">{success.fileName}</p>
        <div className="mt-6 flex flex-col gap-3">
          <a
            href={success.receiptLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex justify-center items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            View Receipt in Drive
          </a>
          <a
            href={success.spreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex justify-center items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Open Spreadsheet
          </a>
          <button
            onClick={() => router.push("/upload")}
            className="inline-flex justify-center items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Upload Another Receipt
          </button>
        </div>
      </div>
    );
  }

  if (!uploadResult) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  const conf = uploadResult.extracted.confidence;
  const isImage = uploadResult.file.mimeType.startsWith("image/");

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Review Receipt</h1>
      <p className="text-sm text-gray-500 mb-6">
        Check the extracted details below. Fields with low confidence are
        highlighted — please verify them before saving.
      </p>

      {saveError && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {saveError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column: form */}
        <div className="space-y-4">
          {/* Date */}
          <div>
            <FieldLabel label="Date" confidence={conf.date} />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass(conf.date)}
            />
          </div>

          {/* Family Member */}
          <div>
            <FieldLabel label="Family Member" confidence={conf.familyMember} />
            <select
              value={familyMember}
              onChange={(e) => setFamilyMember(e.target.value)}
              className={inputClass(conf.familyMember)}
            >
              <option value="">— select —</option>
              {FAMILY_MEMBERS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Practitioner Type */}
          <div>
            <FieldLabel
              label="Practitioner Type"
              confidence={conf.practitionerType}
            />
            <select
              value={practitionerType}
              onChange={(e) => setPractitionerType(e.target.value)}
              className={inputClass(conf.practitionerType)}
            >
              <option value="">— select —</option>
              {PRACTITIONER_TYPES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Treatment */}
          <div>
            <FieldLabel label="Treatment" confidence={conf.treatment} />
            <input
              type="text"
              value={treatment}
              onChange={(e) => setTreatment(e.target.value)}
              placeholder="e.g. physiotherapy session"
              className={inputClass(conf.treatment)}
            />
          </div>

          {/* Amount */}
          <div>
            <FieldLabel label="Amount (EUR)" confidence={conf.amount} />
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-500 text-sm">
                €
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={`${inputClass(conf.amount)} pl-7`}
              />
            </div>
          </div>

          {/* Tax Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tax Relief Category
            </label>
            <div className="flex gap-6">
              {(["Med 1", "Med 2"] as TaxCategory[]).map((cat) => (
                <label key={cat} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="taxCategory"
                    value={cat}
                    checked={taxCategory === cat}
                    onChange={() => setTaxCategory(cat)}
                    className="h-4 w-4 text-blue-600 border-gray-300"
                  />
                  <span className="text-sm text-gray-700">{cat}</span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Auto-classified based on practitioner type. Override if needed.
            </p>
          </div>

          {/* Reimbursement */}
          <div className="rounded-lg border border-gray-200 p-4 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={reimbursed}
                onChange={(e) => setReimbursed(e.target.checked)}
                className="h-4 w-4 rounded text-blue-600 border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">
                Reimbursed by health insurer
              </span>
            </label>

            {reimbursed && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Insurer
                  </label>
                  <select
                    value={insurerName}
                    onChange={(e) => setInsurerName(e.target.value)}
                    className={inputClass()}
                  >
                    <option value="">— select insurer —</option>
                    {INSURER_OPTIONS.map((ins) => (
                      <option key={ins} value={ins}>
                        {ins}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reimbursed Amount (EUR)
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-500 text-sm">
                      €
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={reimbursedAmount}
                      onChange={(e) => setReimbursedAmount(e.target.value)}
                      placeholder="0.00"
                      className={`${inputClass()} pl-7`}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column: receipt preview */}
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Receipt Preview
            </p>
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:${uploadResult.file.mimeType};base64,${uploadResult.file.base64}`}
                alt="Receipt"
                className="w-full rounded-lg border border-gray-200 object-contain max-h-96"
              />
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
                <svg
                  className="h-10 w-10 text-gray-400 mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-sm text-gray-600 font-medium">
                  {uploadResult.file.originalName}
                </p>
                <p className="text-xs text-gray-400 mt-1">PDF document</p>
              </div>
            )}
          </div>

          {uploadResult.ocrText && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                Extracted Text
              </p>
              <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg border border-gray-200 p-3 overflow-auto max-h-40 whitespace-pre-wrap">
                {uploadResult.ocrText}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.push("/upload")}
          disabled={isSaving}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !date || !familyMember || !amount}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          )}
          {isSaving ? "Saving…" : "Save Expense"}
        </button>
      </div>
    </div>
  );
}
