// src/Vat/LineForm.tsx
// The form for adding or editing one sale or purchase. Amounts are typed in pula. The server checks
// everything again and its messages are shown under the box they belong to.

import { useState, type FormEvent, type ReactNode } from "react";
import s from "./Vat.module.css";
import type { Direction, DocType, Line, LineInput, SupplyType, VatClass, VatProfile } from "./types";
import { VatApiError, createLine, updateLine } from "./vatApi";
import { thebeToInput } from "./format";
import { Modal, messageOf } from "./Ui";

interface Props {
  periodId: string;
  /** Sale (output) or purchase (input). Fixed when editing. */
  direction: Direction;
  /** Pass a line to edit it; leave out to add a new one. */
  line?: Line;
  profile: VatProfile | null;
  onSaved: () => void;
  onClose: () => void;
}

interface FormState {
  docType: DocType;
  invoiceNumber: string;
  invoiceDate: string;
  counterpartyName: string;
  counterpartyTin: string;
  description: string;
  amount: string;
  vatAmount: string;
  vatClass: VatClass;
  supplyType: SupplyType;
  country: string;
  currency: string;
  fxRate: string;
  amountIncludesVat: boolean;
  claimable: boolean;
}

/** The starting values: blank for a new line, the line's own values when editing. */
function initialState(line: Line | undefined, profile: VatProfile | null): FormState {
  if (!line) {
    return {
      docType: "invoice",
      invoiceNumber: "",
      invoiceDate: "",
      counterpartyName: "",
      counterpartyTin: "",
      description: "",
      amount: "",
      vatAmount: "",
      vatClass: "standard",
      supplyType: "local",
      country: "",
      currency: "BWP",
      fxRate: "",
      amountIncludesVat: profile?.pricesInclusive ?? false,
      claimable: true,
    };
  }
  const foreign = line.currency !== "BWP";
  return {
    docType: line.docType,
    invoiceNumber: line.invoiceNumber ?? "",
    invoiceDate: line.invoiceDate ? line.invoiceDate.slice(0, 10) : "",
    counterpartyName: line.counterpartyName ?? "",
    counterpartyTin: line.counterpartyTin ?? "",
    description: line.description ?? "",
    // Credit notes are typed as positive amounts.
    amount: thebeToInput(Math.abs(foreign ? line.originalAmountMinor ?? 0 : line.amountExclThebe)),
    vatAmount: line.vatClass === "standard" ? thebeToInput(Math.abs(line.vatThebe)) : "",
    vatClass: line.vatClass,
    supplyType: line.supplyType,
    country: line.country ?? "",
    currency: line.currency,
    fxRate: foreign ? String(line.fxRate) : "",
    amountIncludesVat: false, // the stored amount is always before VAT
    claimable: line.claimable,
  };
}

const optional = (value: string): string | undefined => (value.trim() === "" ? undefined : value.trim());

/** What is sent to the server. */
function buildInput(
  direction: Direction,
  form: FormState,
  context: { isEdit: boolean; initialAmount: string; vatTouched: boolean }
): LineInput {
  const currency = form.currency.trim().toUpperCase() || "BWP";
  const foreign = currency !== "BWP";

  const input: LineInput = { direction, docType: form.docType, amount: form.amount.trim() };
  const invoiceNumber = optional(form.invoiceNumber);
  if (invoiceNumber) input.invoiceNumber = invoiceNumber;
  const invoiceDate = optional(form.invoiceDate);
  if (invoiceDate) input.invoiceDate = invoiceDate;
  const name = optional(form.counterpartyName);
  if (name) input.counterpartyName = name;
  const tin = optional(form.counterpartyTin);
  if (tin) input.counterpartyTin = tin;
  const description = optional(form.description);
  if (description) input.description = description;

  if (form.vatClass !== "standard") input.vatClass = form.vatClass;

  if (foreign) {
    input.currency = currency;
    input.fxRate = form.fxRate.trim();
  } else {
    input.amountIncludesVat = form.amountIncludesVat;
  }

  // The VAT printed on the invoice. When an edited line has a new amount and the VAT box was left
  // alone, the old VAT no longer fits, so it is left out and calculated again.
  const vat = optional(form.vatAmount);
  const vatStillFits = !context.isEdit || context.vatTouched || form.amount.trim() === context.initialAmount;
  if (form.vatClass === "standard" && vat && vatStillFits) input.vatAmount = vat;

  if (direction === "input") {
    input.supplyType = form.supplyType;
    input.claimable = form.claimable;
    const country = optional(form.country);
    if (form.supplyType !== "local" && country) input.country = country;
  }
  return input;
}

/** The "field: message" pairs the server sends when a line is not valid. */
function fieldErrorsFrom(error: unknown): Record<string, string> {
  if (!(error instanceof VatApiError)) return {};
  const list = (error.details as { errors?: { field?: string; message?: string }[] } | undefined)?.errors;
  const out: Record<string, string> = {};
  if (Array.isArray(list)) {
    for (const item of list) {
      if (item && typeof item.field === "string" && typeof item.message === "string" && !out[item.field]) {
        out[item.field] = item.message;
      }
    }
  }
  return out;
}

function Field({ id, label, error, hint, wide, children }: { id: string; label: string; error?: string; hint?: ReactNode; wide?: boolean; children: ReactNode }) {
  return (
    <div className={`${s.field} ${wide ? s.fieldWide : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <div className={s.hint}>{hint}</div>}
      {error && (
        <div className={s.fieldError} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export default function LineForm({ periodId, direction, line, profile, onSaved, onClose }: Props) {
  const isEdit = Boolean(line);
  const [form, setForm] = useState<FormState>(() => initialState(line, profile));
  const [initialAmount] = useState(form.amount);
  const [vatTouched, setVatTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isSale = direction === "output";
  const currency = form.currency.trim().toUpperCase() || "BWP";
  const foreign = currency !== "BWP";
  const rate = profile?.ratePercent ?? 14;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((previous) => ({ ...previous, [key]: value }));
  const invalid = (field: string) => (errors[field] ? s.inputInvalid : undefined);

  const vatHint =
    form.vatClass !== "standard"
      ? "Zero-rated and exempt lines carry no VAT."
      : direction === "input" && form.supplyType === "imported_goods"
      ? "Enter the VAT paid at customs, in pula. If you leave it blank, it is estimated."
      : direction === "input" && form.supplyType === "imported_services"
      ? `Leave blank: VAT is ${rate}% of the pula value (reverse charge).`
      : `The VAT printed on the invoice. Leave blank to calculate it at ${rate}%.`;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (form.amount.trim() === "") {
      setErrors({ amount: "Enter the amount." });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const input = buildInput(direction, form, { isEdit, initialAmount, vatTouched });
      if (line) await updateLine(line._id, input);
      else await createLine(periodId, input);
      onSaved();
    } catch (error) {
      setErrors(fieldErrorsFrom(error));
      setFormError(messageOf(error));
      setSaving(false);
    }
  }

  const title = `${isEdit ? "Edit" : "Add"} ${isSale ? "sale" : "purchase"}`;
  const who = isSale ? "Customer" : "Supplier";

  return (
    <Modal title={title} onClose={onClose} wide>
      <form onSubmit={submit} noValidate>
        {formError && (
          <div className={`${s.notice} ${s.noticeError}`} role="alert">
            {formError}
          </div>
        )}

        <div className={s.formGrid}>
          <Field id="lf-doctype" label="Document">
            <select id="lf-doctype" value={form.docType} onChange={(e) => set("docType", e.target.value as DocType)}>
              <option value="invoice">Invoice</option>
              <option value="credit_note">Credit note (a refund or return)</option>
            </select>
          </Field>

          <Field id="lf-number" label="Invoice number" error={errors.invoiceNumber}>
            <input id="lf-number" type="text" className={invalid("invoiceNumber")} value={form.invoiceNumber} onChange={(e) => set("invoiceNumber", e.target.value)} />
          </Field>

          <Field id="lf-date" label="Invoice date" error={errors.invoiceDate}>
            <input id="lf-date" type="date" className={invalid("invoiceDate")} value={form.invoiceDate} onChange={(e) => set("invoiceDate", e.target.value)} />
          </Field>

          <Field id="lf-name" label={`${who} name`} error={errors.counterpartyName}>
            <input id="lf-name" type="text" className={invalid("counterpartyName")} value={form.counterpartyName} onChange={(e) => set("counterpartyName", e.target.value)} />
          </Field>

          <Field
            id="lf-tin"
            label={`${who} TIN`}
            error={errors.counterpartyTin}
            hint={isSale ? "Leave blank for sales to consumers." : "Required to claim the VAT. For a foreign supplier, use its tax ID."}
          >
            <input id="lf-tin" type="text" className={invalid("counterpartyTin")} value={form.counterpartyTin} onChange={(e) => set("counterpartyTin", e.target.value)} />
          </Field>

          <Field id="lf-description" label="Description" error={errors.description}>
            <input id="lf-description" type="text" className={invalid("description")} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </Field>

          <Field
            id="lf-amount"
            label={foreign ? `Amount in ${currency}` : form.amountIncludesVat ? "Amount including VAT (P)" : "Amount before VAT (P)"}
            error={errors.amount}
          >
            <input id="lf-amount" type="text" inputMode="decimal" className={invalid("amount")} value={form.amount} onChange={(e) => set("amount", e.target.value)} />
          </Field>

          <Field id="lf-vat" label="VAT (P)" error={errors.vatAmount} hint={vatHint}>
            <input
              id="lf-vat"
              type="text"
              inputMode="decimal"
              className={invalid("vatAmount")}
              value={form.vatClass === "standard" ? form.vatAmount : ""}
              disabled={form.vatClass !== "standard"}
              onChange={(e) => {
                setVatTouched(true);
                set("vatAmount", e.target.value);
              }}
            />
          </Field>

          <Field id="lf-vatclass" label="VAT rate" error={errors.vatClass}>
            <select id="lf-vatclass" value={form.vatClass} onChange={(e) => set("vatClass", e.target.value as VatClass)}>
              <option value="standard">Standard-rated ({rate}%)</option>
              <option value="zero">Zero-rated (0%)</option>
              <option value="exempt">Exempt</option>
            </select>
          </Field>

          <Field
            id="lf-currency"
            label="Currency"
            error={errors.currency}
            hint="BWP for pula. For another currency, enter its code (USD, ZAR, EUR) and the exchange rate."
          >
            <input id="lf-currency" type="text" maxLength={3} className={invalid("currency")} value={form.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} />
          </Field>

          {foreign ? (
            <Field id="lf-fx" label={`Exchange rate (pula for 1 ${currency})`} error={errors.fxRate} hint="For example 13.50. VAT is worked out on the pula value.">
              <input id="lf-fx" type="text" inputMode="decimal" className={invalid("fxRate")} value={form.fxRate} onChange={(e) => set("fxRate", e.target.value)} />
            </Field>
          ) : (
            <div className={s.field}>
              <label className={s.checkbox}>
                <input type="checkbox" checked={form.amountIncludesVat} onChange={(e) => set("amountIncludesVat", e.target.checked)} />
                <span>The amount includes VAT</span>
              </label>
              {errors.amountIncludesVat && <div className={s.fieldError}>{errors.amountIncludesVat}</div>}
            </div>
          )}

          {!isSale && (
            <>
              <Field id="lf-supply" label="Where was it bought?" error={errors.supplyType}>
                <select id="lf-supply" value={form.supplyType} onChange={(e) => set("supplyType", e.target.value as SupplyType)}>
                  <option value="local">Local purchase</option>
                  <option value="imported_goods">Imported goods</option>
                  <option value="imported_services">Imported services</option>
                </select>
              </Field>

              {form.supplyType !== "local" && (
                <Field id="lf-country" label="Country of the supplier" error={errors.country}>
                  <input id="lf-country" type="text" className={invalid("country")} value={form.country} onChange={(e) => set("country", e.target.value)} />
                </Field>
              )}

              <div className={`${s.field} ${s.fieldWide}`}>
                <label className={s.checkbox}>
                  <input type="checkbox" checked={form.claimable} onChange={(e) => set("claimable", e.target.checked)} />
                  <span>Claim the VAT on this purchase (untick for items that cannot be claimed, such as entertainment)</span>
                </label>
              </div>
            </>
          )}
        </div>

        <div className={s.buttonRow} style={{ marginTop: 16 }}>
          <button type="button" className={s.button} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className={`${s.button} ${s.buttonPrimary}`} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add line"}
          </button>
        </div>
      </form>
    </Modal>
  );
}