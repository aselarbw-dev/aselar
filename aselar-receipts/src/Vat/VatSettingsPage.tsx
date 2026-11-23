// src/Vat/VatSettingsPage.tsx
// The business's VAT settings. Some settings decide how periods are created, so once periods
// exist they are locked here (changing them would overlap the periods already made).

import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import s from "./Vat.module.css";
import type { VatCategory, VatProfile, VatProfileInput } from "./types";
import { VatApiError, getProfile, saveProfile } from "./vatApi";
import { parsePulaToThebe, periodStartDay, thebeToInput } from "./format";
import { ErrorBox, Loading, Notice, messageOf, useLoad, useVatPaths } from "./Ui";

interface FormState {
  vatNumber: string;
  category: VatCategory;
  ratePercent: string;
  pricesInclusive: boolean;
  deadlineDays: string;
  firstPeriodStart: string;
  openingCredit: string;
  lateClaimPolicy: "warn" | "block";
}

function initial(profile: VatProfile | null): FormState {
  return {
    vatNumber: profile?.vatNumber ?? "",
    category: profile?.category ?? "A",
    ratePercent: String(profile?.ratePercent ?? 14),
    pricesInclusive: profile?.pricesInclusive ?? false,
    deadlineDays: String(profile?.deadlineDays ?? 28),
    firstPeriodStart: profile?.firstPeriodStart ? periodStartDay(profile.firstPeriodStart) : "",
    openingCredit: profile ? thebeToInput(profile.openingCreditThebe) : "",
    lateClaimPolicy: profile?.lateClaimPolicy ?? "warn",
  };
}

/** Messages from the server, including the list a schema validation sends. */
function serverMessage(error: unknown): string {
  const text = messageOf(error);
  if (error instanceof VatApiError && Array.isArray(error.details)) {
    return `${text}: ${error.details.filter((d): d is string => typeof d === "string").join(" ")}`;
  }
  return text;
}

export default function VatSettingsPage() {
  const paths = useVatPaths();
  const loaded = useLoad(getProfile, []);

  if (loaded.error && !loaded.data && loaded.loading === false) return <ErrorBox message={loaded.error} onRetry={loaded.reload} />;
  if (loaded.loading && loaded.data === undefined) return <Loading />;

  // The form starts from what was loaded (null means: not set up yet).
  return <SettingsForm profile={loaded.data ?? null} backTo={paths.periods} />;
}

function SettingsForm({ profile, backTo }: { profile: VatProfile | null; backTo: string }) {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(() => initial(profile));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const locked = profile !== null; // category, first period and opening credit are fixed once periods exist
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setSaved(false);
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const rate = Number(form.ratePercent);
    const days = Number(form.deadlineDays);
    if (form.ratePercent.trim() === "" || !Number.isFinite(rate) || rate < 0 || rate > 100) return setError("The VAT rate must be a number between 0 and 100.");
    if (!Number.isInteger(days) || days < 1 || days > 90) return setError("Days to file must be a whole number between 1 and 90.");

    const input: VatProfileInput = {
      vatNumber: form.vatNumber.trim(),
      ratePercent: rate,
      pricesInclusive: form.pricesInclusive,
      deadlineDays: days,
      lateClaimPolicy: form.lateClaimPolicy,
    };

    if (!locked) {
      const credit = form.openingCredit.trim() === "" ? 0 : parsePulaToThebe(form.openingCredit);
      if (credit === null || credit < 0) return setError("The credit brought forward must be an amount such as 1,250.50, or blank.");
      input.openingCreditThebe = credit;
      input.category = form.category;
      // The first day of the first period, at midnight in Botswana.
      if (form.firstPeriodStart) input.firstPeriodStart = `${form.firstPeriodStart}T00:00:00+02:00`;
    }

    setSaving(true);
    try {
      await saveProfile(input);
      if (!profile) navigate(backTo); // first time: on to the periods
      else {
        setSaved(true);
        setSaving(false);
      }
    } catch (err) {
      setError(serverMessage(err));
      setSaving(false);
    }
  }

  return (
    <div className={s.stack}>
      <div>
        <Link to={backTo} className={s.back}>
          ← All periods
        </Link>
        <h1 style={{ marginTop: 6 }}>VAT settings</h1>
        <div className={s.muted}>These settings decide how your periods and figures are worked out.</div>
      </div>

      {error && (
        <Notice kind="error" onClose={() => setError(null)}>
          {error}
        </Notice>
      )}
      {saved && <Notice kind="success">Settings saved.</Notice>}

      <form className={`${s.card} ${s.stack}`} onSubmit={submit} noValidate>
        <div className={s.formGrid}>
          <div className={s.field}>
            <label htmlFor="st-vat">VAT number (TIN)</label>
            <input id="st-vat" type="text" value={form.vatNumber} onChange={(e) => set("vatNumber", e.target.value)} />
          </div>

          <div className={s.field}>
            <label htmlFor="st-category">How often do you file?</label>
            <select id="st-category" value={form.category} disabled={locked} onChange={(e) => set("category", e.target.value as VatCategory)}>
              <option value="A">Every 2 months: periods end Jan, Mar, May, Jul, Sep, Nov (Category A)</option>
              <option value="B">Every 2 months: periods end Feb, Apr, Jun, Aug, Oct, Dec (Category B)</option>
              <option value="C">Every month (Category C)</option>
            </select>
            <div className={s.hint}>{locked ? "Locked once periods exist." : "BURS tells you which category you are in."}</div>
          </div>

          <div className={s.field}>
            <label htmlFor="st-first">First period starts on</label>
            <input id="st-first" type="date" value={form.firstPeriodStart} disabled={locked} onChange={(e) => set("firstPeriodStart", e.target.value)} />
            <div className={s.hint}>{locked ? "Locked once periods exist." : "The first day of the first period to prepare. Leave blank to start with the current period."}</div>
          </div>

          <div className={s.field}>
            <label htmlFor="st-credit">Credit brought forward (P)</label>
            <input id="st-credit" type="text" inputMode="decimal" value={form.openingCredit} disabled={locked} onChange={(e) => set("openingCredit", e.target.value)} />
            <div className={s.hint}>{locked ? "Locked once periods exist." : "Any VAT credit from before your first period. Leave blank for none."}</div>
          </div>

          <div className={s.field}>
            <label htmlFor="st-rate">VAT rate (%)</label>
            <input id="st-rate" type="text" inputMode="decimal" value={form.ratePercent} onChange={(e) => set("ratePercent", e.target.value)} />
          </div>

          <div className={s.field}>
            <label htmlFor="st-days">Days to file after a period ends</label>
            <input id="st-days" type="text" inputMode="numeric" value={form.deadlineDays} onChange={(e) => set("deadlineDays", e.target.value)} />
            <div className={s.hint}>Applies to periods created from now on.</div>
          </div>

          <div className={s.field}>
            <label htmlFor="st-late">Invoices dated outside the period</label>
            <select id="st-late" value={form.lateClaimPolicy} onChange={(e) => set("lateClaimPolicy", e.target.value as "warn" | "block")}>
              <option value="warn">Warn me (it may be a late claim)</option>
              <option value="block">Treat purchases like this as an issue to fix</option>
            </select>
          </div>

          <div className={s.field}>
            <label className={s.checkbox}>
              <input type="checkbox" checked={form.pricesInclusive} onChange={(e) => set("pricesInclusive", e.target.checked)} />
              <span>My prices include VAT</span>
            </label>
          </div>
        </div>

        <div className={s.buttonRow}>
          <Link to={backTo} className={s.button} style={{ textDecoration: "none" }}>
            Cancel
          </Link>
          <button type="submit" className={`${s.button} ${s.buttonPrimary}`} disabled={saving}>
            {saving ? "Saving…" : profile ? "Save settings" : "Save and start"}
          </button>
        </div>
      </form>
    </div>
  );
}