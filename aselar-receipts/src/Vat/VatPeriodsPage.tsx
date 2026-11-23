// src/Vat/VatPeriodsPage.tsx
// The front door of the VAT module: the next deadline, and every tax period with its status.

import { Link } from "react-router-dom";
import s from "./Vat.module.css";
import type { Period } from "./types";
import { getProfile, listPeriods } from "./vatApi";
import { STATUS_LABEL, dueDay, dueText, dueTone, periodLabel, periodRange, pula } from "./format";
import { Badge, ErrorBox, Loading, useLoad, useVatPaths } from "./Ui";

export default function VatPeriodsPage() {
  const paths = useVatPaths();

  // Periods can only be listed once the VAT settings exist, so ask for those first.
  const data = useLoad(async () => {
    const profile = await getProfile();
    if (!profile) return { profile: null, periods: [] as Period[] };
    return { profile, periods: await listPeriods() };
  }, []);

  if (data.error && !data.data) return <ErrorBox message={data.error} onRetry={data.reload} />;
  if (!data.data) return <Loading />;

  const { profile, periods } = data.data;

  if (!profile) {
    return (
      <div className={s.card}>
        <h1>VAT returns</h1>
        <p>
          Set up your VAT details first: your VAT number, how often you file, and the date your first return period starts. Aselar then prepares each period for you.
        </p>
        <Link to={paths.settings} className={`${s.button} ${s.buttonPrimary}`} style={{ textDecoration: "none", display: "inline-block" }}>
          Set up VAT
        </Link>
      </div>
    );
  }

  // The earliest deadline among the periods not yet filed.
  const next = periods
    .filter((p) => p.status !== "filed")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
  const bannerClass = next ? { late: s.bannerLate, soon: s.bannerSoon, ok: s.bannerOk, done: s.bannerOk }[dueTone(next)] : "";

  return (
    <div className={s.stack}>
      <div className={s.spread}>
        <div>
          <h1>VAT returns</h1>
          <div className={s.muted}>
            VAT number {profile.vatNumber || "not set"} · Category {profile.category} · {profile.ratePercent}% VAT
          </div>
        </div>
        <Link to={paths.settings} className={s.button} style={{ textDecoration: "none" }}>
          Settings
        </Link>
      </div>

      {next && (
        <div className={`${s.banner} ${bannerClass}`} role="status">
          {periodLabel(next)} return: {dueText(next).toLowerCase()} (due {dueDay(next)}).{" "}
          <Link to={paths.period(next._id)} style={{ color: "inherit" }}>
            Open it
          </Link>
        </div>
      )}

      {periods.length === 0 ? (
        <div className={`${s.tableWrap} ${s.empty}`}>No periods yet. They appear once your first period has started.</div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Period</th>
                <th>Dates</th>
                <th>Status</th>
                <th>Deadline</th>
                <th className={s.right}>VAT result</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => {
                const tone = { done: s.toneDone, late: s.toneLate, soon: s.toneSoon, ok: "" }[dueTone(period)];
                const net = period.totals?.computedAt ? period.totals.netThebe : undefined;
                return (
                  <tr key={period._id}>
                    <td>
                      <strong>{periodLabel(period)}</strong>
                    </td>
                    <td className={s.muted}>{periodRange(period)}</td>
                    <td>
                      <Badge tone={period.status === "filed" ? "good" : period.status === "ready" || period.status === "exported" ? "info" : "warn"}>{STATUS_LABEL[period.status]}</Badge>
                    </td>
                    <td className={tone}>{dueText(period)}</td>
                    <td className={s.num}>{net === undefined ? "–" : net > 0 ? `${pula(net)} payable` : net < 0 ? `${pula(-net)} credit` : "Nil"}</td>
                    <td className={s.right}>
                      <Link to={paths.period(period._id)} className={`${s.button} ${s.buttonSmall}`} style={{ textDecoration: "none" }}>
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}