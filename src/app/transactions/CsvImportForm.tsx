"use client";

import { useActionState, useRef, useState } from "react";
import { confirmCsvImportAction, previewCsvAction, type CsvPreviewState, type FormState } from "./actions";
import { formatRand } from "@/lib/format";

const initialPreview: CsvPreviewState = { error: null, rowCount: 0, totalCents: 0, preview: [] };
const initialConfirm: FormState = { error: null, success: null };

export function CsvImportForm({ periods }: { periods: { id: string; name: string }[] }) {
  const [csvText, setCsvText] = useState("");
  const [previewState, previewAction, previewPending] = useActionState(previewCsvAction, initialPreview);
  const [confirmState, confirmAction, confirmPending] = useActionState(confirmCsvImportAction, initialConfirm);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setCsvText(await file.text());
  }

  return (
    <div className="card space-y-3">
      <h2 className="text-sm font-semibold text-slate-700">Import a bank CSV export</h2>
      <p className="text-xs text-slate-500">
        Expected columns: <code>date,description,amount</code> (amount in Rand, e.g. 125.00). No
        live bank connection — this only reads a file you export yourself.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFile}
        className="block w-full text-sm"
      />
      <textarea
        className="input h-28 font-mono text-xs"
        placeholder={"date,description,amount\n2026-09-10,Uber Trip,65.00"}
        value={csvText}
        onChange={(e) => setCsvText(e.target.value)}
      />

      <form action={previewAction}>
        <input type="hidden" name="csvText" value={csvText} />
        <button type="submit" className="btn-secondary" disabled={previewPending || !csvText.trim()}>
          {previewPending ? "Parsing..." : "Preview"}
        </button>
      </form>

      {previewState.error ? <p className="text-sm text-red-600">{previewState.error}</p> : null}

      {previewState.rowCount > 0 ? (
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="mb-2 text-sm">
            {previewState.rowCount} row(s) parsed, totaling {formatRand(previewState.totalCents)}.
          </p>
          <ul className="mb-3 max-h-40 space-y-1 overflow-y-auto text-xs text-slate-600">
            {previewState.preview.map((row, i) => (
              <li key={i}>
                {new Date(row.occurredAt).toLocaleDateString("en-ZA")} — {row.description} —{" "}
                {formatRand(row.amountCents)}
              </li>
            ))}
          </ul>

          <form action={confirmAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="csvText" value={csvText} />
            <div>
              <label className="label" htmlFor="csv-period">
                Assign to period (optional)
              </label>
              <select className="input" id="csv-period" name="periodId" defaultValue="">
                <option value="">None</option>
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn" disabled={confirmPending}>
              {confirmPending ? "Importing..." : "Confirm import"}
            </button>
          </form>
        </div>
      ) : null}

      {confirmState.error ? <p className="text-sm text-red-600">{confirmState.error}</p> : null}
      {confirmState.success ? <p className="text-sm text-brand-700">{confirmState.success}</p> : null}
    </div>
  );
}
