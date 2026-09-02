"use client";

import { useActionState, useState } from "react";
import {
  claimInspectionAction,
  recordInspectionAction,
  beginInspectionAction,
  type InspectionFormState,
} from "@/app/(site)/actions/inspection-actions";

interface Props {
  inspectionId: string;
  orderId: string;
  claimed: boolean;
}

const CHECKS = [
  { name: "movement", label: "Movement original & correct" },
  { name: "authenticity", label: "Serial & provenance verified" },
  { name: "condition", label: "Condition matches listing" },
  { name: "timekeeping", label: "Timekeeping within spec" },
];

export function InspectionActions({ inspectionId, orderId, claimed }: Props) {
  const [claimState, claimAction, claimPending] = useActionState<InspectionFormState, FormData>(
    claimInspectionAction,
    {},
  );
  const [beginState, beginAction, beginPending] = useActionState<InspectionFormState, FormData>(
    beginInspectionAction,
    {},
  );
  const [recordState, recordAction, recordPending] = useActionState<InspectionFormState, FormData>(
    recordInspectionAction,
    {},
  );
  const [formOpen, setFormOpen] = useState(false);

  if (recordState.ok) {
    return (
      <p role="status" className="mt-4 text-sm text-emerald-400">
        {recordState.message}
      </p>
    );
  }

  return (
    <div className="mt-4 border-t hairline pt-4">
      {!claimed ? (
        <form action={claimAction} className="flex items-center gap-3">
          <input type="hidden" name="inspectionId" value={inspectionId} />
          <button type="submit" disabled={claimPending} className="btn-imperial !min-h-9 px-4 text-[10px]">
            {claimPending ? "…" : claimState.ok ? "Claimed ✓" : "Claim inspection"}
          </button>
          {claimState.error && <span role="alert" className="text-xs text-red-400">{claimState.error}</span>}
        </form>
      ) : (
        <>
          {beginState.ok && (
            <p className="mb-2 text-xs text-emerald-400">{beginState.message}</p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setFormOpen((v) => !v)}
              className="btn-imperial btn-solid !min-h-9 px-4 text-[10px]"
              aria-expanded={formOpen}
            >
              Record outcome
            </button>
            <form action={beginAction}>
              <input type="hidden" name="orderId" value={orderId} />
              <button type="submit" disabled={beginPending} className="btn-imperial !min-h-9 px-4 text-[10px]">
                {beginPending ? "…" : "Start inspection stage"}
              </button>
            </form>
          </div>
          {formOpen && (
            <form action={recordAction} className="mt-4 grid gap-4">
              <input type="hidden" name="inspectionId" value={inspectionId} />
              <div className="grid gap-2 sm:grid-cols-2">
                {CHECKS.map((check) => (
                  <label key={check.name} className="flex cursor-pointer items-center gap-2.5 text-sm text-travertine/85">
                    <input type="checkbox" name={check.name} className="h-4 w-4 accent-[#b89b5e]" />
                    {check.label}
                  </label>
                ))}
              </div>
              <div>
                <label htmlFor={`notes-${inspectionId}`} className="label-imperial">
                  Inspection notes (required, min 10 chars)
                </label>
                <textarea
                  id={`notes-${inspectionId}`}
                  name="notes"
                  rows={3}
                  required
                  minLength={10}
                  className="input-imperial py-2"
                  placeholder="Findings on movement, dial, case, and timekeeping…"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <button name="outcome" value="APPROVED" disabled={recordPending} className="btn-imperial btn-solid !min-h-10 px-5 text-[11px]">
                  Approve authenticity
                </button>
                <button name="outcome" value="ADDITIONAL_REVIEW" disabled={recordPending} className="btn-imperial !min-h-10 px-5 text-[11px]">
                  Request additional review
                </button>
                <button name="outcome" value="REJECTED" disabled={recordPending} className="btn-imperial btn-burgundy !min-h-10 px-5 text-[11px]">
                  Reject authenticity
                </button>
              </div>
              {recordState.error && (
                <p role="alert" className="text-sm text-red-400">
                  {recordState.error}
                </p>
              )}
            </form>
          )}
        </>
      )}
    </div>
  );
}
