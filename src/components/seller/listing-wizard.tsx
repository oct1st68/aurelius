"use client";

import { useActionState, useState } from "react";
import {
  saveListingAction,
  submitListingAction,
  type WizardFormState,
} from "@/app/(site)/actions/wizard-actions";

interface Props {
  brands: { id: string; name: string }[];
  steps: string[];
}

/**
 * Listing Wizard — seven steps (I–VII). Drafts save server-side and can be
 * resumed later from the seller listings table.
 */
export function ListingWizard({ brands, steps }: Props) {
  const [step, setStep] = useState(0);
  const [listingId, setListingId] = useState<string | null>(null);
  const [saveState, saveAction, savePending] = useActionState<WizardFormState, FormData>(
    async (prev, fd) => {
      const result = await saveListingActionServer(prev, fd);
      if (result.listingId) setListingId(result.listingId);
      if (result.ok && fd.get("intent") !== "draft") {
        // Final submit → back to dashboard listings
        window.location.href = "/seller/listings";
      }
      return result;
    },
    {},
  );

  async function saveListingActionServer(prev: WizardFormState, fd: FormData): Promise<WizardFormState> {
    if (listingId) fd.set("listingId", listingId);
    return saveListingAction(prev, fd);
  }

  const [reviewState, reviewAction, reviewPending] = useActionState<WizardFormState, FormData>(
    submitListingAction,
    {},
  );

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="mt-8">
      {/* Step indicator */}
      <ol className="flex flex-wrap gap-2" aria-label="Wizard steps">
        {steps.map((label, i) => (
          <li
            key={label}
            className={`badge ${i === step ? "border-gold text-gold" : i < step ? "badge-ok" : "opacity-50"}`}
            aria-current={i === step ? "step" : undefined}
          >
            {label}
          </li>
        ))}
      </ol>

      <form action={saveAction} className="panel mt-8 p-8">
        <input type="hidden" name="intent" value="draft" />
        {listingId && <input type="hidden" name="listingId" value={listingId} />}

        {step === 0 && <StepIdentity brands={brands} />}
        {step === 1 && <StepSpecifications />}
        {step === 2 && <StepCondition />}
        {step === 3 && <StepDocumentation />}
        {step === 4 && <StepPhotography />}
        {step === 5 && <StepPricing />}
        {step === 6 && <StepReview reviewState={reviewState} reviewAction={reviewAction} reviewPending={reviewPending} />}

        {saveState.error && (
          <p role="alert" className="mt-6 text-sm text-red-400">
            {saveState.error}
          </p>
        )}
        {saveState.ok && saveState.message && (
          <p role="status" className="mt-6 text-sm text-emerald-400">
            {saveState.message}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between">
          <button type="button" onClick={prev} disabled={step === 0} className="btn-imperial btn-ghost !min-h-10 px-5 text-[11px]">
            ← Back
          </button>
          <div className="flex gap-3">
            <button type="submit" disabled={savePending} className="btn-imperial !min-h-10 px-5 text-[11px]">
              {savePending ? "Saving…" : "Save draft"}
            </button>
            {step < steps.length - 1 && (
              <button type="button" onClick={next} className="btn-imperial btn-solid !min-h-10 px-5 text-[11px]">
                Continue →
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

function StepIdentity({ brands }: { brands: { id: string; name: string }[] }) {
  return (
    <fieldset className="grid gap-5 sm:grid-cols-2">
      <legend className="font-display mb-4 text-sm tracking-[0.25em] text-gold">I · IDENTITY</legend>
      <Select label="Great House" name="brandId" options={brands.map((b) => ({ value: b.id, label: b.name }))} required />
      <Text label="Model" name="model" placeholder="e.g. Patrimoine Tourbillon" required />
      <Text label="Reference number" name="referenceNumber" placeholder="CH-TP-4810" required />
      <Text label="Year" name="year" type="number" placeholder="2016" required />
      <Select
        label="Movement"
        name="movement"
        options={[
          { value: "Automatic", label: "Automatic" },
          { value: "Manual", label: "Manual" },
          { value: "Quartz", label: "Quartz" },
        ]}
      />
      <Text label="Serial number" name="serialNumber" placeholder="Case serial (shown masked publicly)" required />
    </fieldset>
  );
}

function StepSpecifications() {
  return (
    <fieldset className="grid gap-5 sm:grid-cols-2">
      <legend className="font-display mb-4 text-sm tracking-[0.25em] text-gold">II · SPECIFICATIONS</legend>
      <Text label="Case material" name="caseMaterial" placeholder="Stainless Steel" />
      <Text label="Case diameter (mm)" name="caseDiameterMm" type="number" placeholder="39" />
      <Text label="Dial color" name="dialColor" placeholder="Silvered Guilloché" />
      <Text label="Bracelet / strap" name="bracelet" placeholder="Alligator Leather" />
      <Text label="Water resistance (m)" name="waterResistanceM" type="number" placeholder="50" />
      <Text label="Power reserve (h, optional)" name="powerReserveHours" type="number" placeholder="72" />
      <Text label="Functions (comma separated)" name="functions" placeholder="Date, GMT" className="sm:col-span-2" />
    </fieldset>
  );
}

function StepCondition() {
  return (
    <fieldset className="grid gap-5">
      <legend className="font-display mb-4 text-sm tracking-[0.25em] text-gold">III · CONDITION</legend>
      <Select
        label="Condition grade"
        name="conditionGrade"
        options={[
          { value: "NOS", label: "New Old Stock" },
          { value: "MINT", label: "Mint" },
          { value: "EXCELLENT", label: "Excellent" },
          { value: "VERY_GOOD", label: "Very good" },
          { value: "GOOD", label: "Good" },
          { value: "FAIR", label: "Fair" },
        ]}
      />
      <Select
        label="Box & papers"
        name="boxAndPapers"
        options={[
          { value: "FULL_SET", label: "Full set" },
          { value: "BOX_ONLY", label: "Box only" },
          { value: "PAPERS_ONLY", label: "Papers only" },
          { value: "NO_BOX_PAPERS", label: "No box or papers" },
        ]}
      />
      <Area label="Condition notes" name="conditionNotes" rows={3} placeholder="Honest description of wear, scratches, service…" />
      <Text label="Service history" name="serviceHistory" placeholder="Full service 2023 by house-approved watchmaker" />
    </fieldset>
  );
}

function StepDocumentation() {
  return (
    <fieldset className="grid gap-5">
      <legend className="font-display mb-4 text-sm tracking-[0.25em] text-gold">IV · DOCUMENTATION</legend>
      <Text label="Documents (comma separated names)" name="documentation" placeholder="Warranty card, Archive extract" />
      <p className="text-xs leading-relaxed text-bronze">
        Document uploads are validated for type and size. Name the
        documents you hold; the authentication atelier verifies originals.
      </p>
    </fieldset>
  );
}

function StepPhotography() {
  return (
    <fieldset className="grid gap-5">
      <legend className="font-display mb-4 text-sm tracking-[0.25em] text-gold">V · PHOTOGRAPHY</legend>
      <Text
        label="Image paths (comma separated, under media/)"
        name="imagePaths"
        className="font-mono text-xs"
        placeholder="photos/w01.jpg, photos/w04.jpg"
      />
      <div className="panel p-4 text-xs leading-relaxed text-bronze">
        <p>
          Uploads accept JPEG/PNG/WebP, max 5MB, min 200×200px — validated server-side.
          You may also reference curated photo paths above
          (comma separated) to skip file selection.
        </p>
        <p className="mt-2">Tip: copy any photo path from an existing watch page image.</p>
      </div>
    </fieldset>
  );
}

function StepPricing() {
  return (
    <fieldset className="grid gap-5">
      <legend className="font-display mb-4 text-sm tracking-[0.25em] text-gold">VI · PRICING</legend>
      <Text label="Asking price (USD)" name="price" placeholder="12,500.00" required />
      <div>
        <span className="label-imperial">Collections</span>
        <div className="flex flex-wrap gap-4">
          {["SATURN", "VINTAGE", "SPORTS", "DRESS", "DIVER"].map((c) => (
            <label key={c} className="flex cursor-pointer items-center gap-2 text-sm text-travertine/85">
              <input type="checkbox" name="collections" value={c} className="h-4 w-4 accent-[#b89b5e]" />
              {c}
            </label>
          ))}
        </div>
      </div>
      <Area label="Connoisseur's description" name="description" rows={5} placeholder="Tell the piece's story — min 40 characters." />
    </fieldset>
  );
}

function StepReview({
  reviewState,
  reviewAction,
  reviewPending,
}: {
  reviewState: WizardFormState;
  reviewAction: (fd: FormData) => void;
  reviewPending: boolean;
}) {
  return (
    <fieldset className="grid gap-5">
      <legend className="font-display mb-4 text-sm tracking-[0.25em] text-gold">VII · REVIEW & SUBMIT</legend>
      <p className="text-sm leading-relaxed text-travertine/70">
        Your draft is saved. Submitting sends the listing to AURELIUS moderation —
        <strong className="text-ivory"> sellers cannot approve their own listings</strong>. An
        admin reviews the piece against house standards before it is published.
      </p>
      <form action={reviewAction}>
        {reviewState.error && (
          <p role="alert" className="text-sm text-red-400">
            {reviewState.error}
          </p>
        )}
        <button type="submit" disabled={reviewPending} className="btn-imperial btn-solid">
          {reviewPending ? "Submitting…" : "Submit for Review"}
        </button>
      </form>
    </fieldset>
  );
}

function Text({
  label,
  name,
  type = "text",
  placeholder,
  required,
  className = "",
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={`w-${name}`} className="label-imperial">
        {label}
      </label>
      <input
        id={`w-${name}`}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="input-imperial"
      />
    </div>
  );
}

function Area({
  label,
  name,
  rows = 3,
  placeholder,
}: {
  label: string;
  name: string;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={`w-${name}`} className="label-imperial">
        {label}
      </label>
      <textarea id={`w-${name}`} name={name} rows={rows} placeholder={placeholder} className="input-imperial py-2" />
    </div>
  );
}

function Select({
  label,
  name,
  options,
  required,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={`w-${name}`} className="label-imperial">
        {label}
      </label>
      <select id={`w-${name}`} name={name} required={required} className="input-imperial">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
