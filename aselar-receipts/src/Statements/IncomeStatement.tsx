import React, { useState } from "react";
import styles from "./IncomeStatement.module.css";

export interface IncomeStatementLineItem {
  label: string;
  amount: number; // negative values render in parentheses, e.g. deductions
}

export interface IncomeStatementSection {
  title: string;
  items: IncomeStatementLineItem[];
  totalLabel: string;
  total: number;
}

export interface IncomeStatementData {
  businessName: string;
  logoUrl?: string; // optional business logo; falls back to initials badge
  periodLabel: string;
  revenue: IncomeStatementSection;
  costOfSales: IncomeStatementSection;
  grossProfitLabel: string;
  grossProfit: number;
  operatingExpenses: IncomeStatementSection;
  netProfitLabel: string;
  netProfit: number;
}

export interface IncomeStatementProps {
  data?: IncomeStatementData;
  isSample?: boolean;
  /** Called when the user clicks "Download PDF". Defaults to window.print(). */
  onDownloadPdf?: () => void;
  /**
   * Called when the user submits a phone number via "Send via SMS".
   * Wire this to your Twilio-backed endpoint. Defaults to a placeholder
   * fetch against /api/statements/send-sms.
   */
  onSendSms?: (phoneNumber: string) => Promise<void>;
}

const formatPula = (value: number): string => {
  const abs = Math.abs(value).toLocaleString("en-BW", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return value < 0 ? `(P ${abs})` : `P ${abs}`;
};

const getInitials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

export const SAMPLE_INCOME_STATEMENT: IncomeStatementData = {
  businessName: "Thabo's Butchery",
  periodLabel: "For the month ended 30 June 2026",
  revenue: {
    title: "Revenue",
    items: [
      { label: "Beef Sales", amount: 52300 },
      { label: "Chicken Sales", amount: 18900 },
      { label: "Pork & Other Meats", amount: 9150 },
    ],
    totalLabel: "Total Revenue",
    total: 80350,
  },
  costOfSales: {
    title: "Cost of Sales",
    items: [
      { label: "Opening Stock (Meat Inventory)", amount: 15000 },
      { label: "Purchases (Meat & Livestock)", amount: 42600 },
      { label: "Closing Stock", amount: -11200 },
    ],
    totalLabel: "Total Cost of Sales",
    total: 46400,
  },
  grossProfitLabel: "Gross Profit",
  grossProfit: 33950,
  operatingExpenses: {
    title: "Operating Expenses",
    items: [
      { label: "Rent", amount: 6500 },
      { label: "Salaries & Wages", amount: 15800 },
      { label: "Electricity (Refrigeration)", amount: 3200 },
      { label: "Packaging & Consumables", amount: 1450 },
      { label: "Transport (Cold Chain Delivery)", amount: 1980 },
      { label: "Bank Charges", amount: 410 },
      { label: "Aselar Subscription", amount: 300 },
      { label: "Miscellaneous", amount: 760 },
    ],
    totalLabel: "Total Operating Expenses",
    total: 30400,
  },
  netProfitLabel: "Net Profit Before Tax",
  netProfit: 3550,
};

const Section: React.FC<{ section: IncomeStatementSection }> = ({ section }) => (
  <>
    <tr className={styles.sectionHeader}>
      <td colSpan={2}>{section.title}</td>
    </tr>
    {section.items.map((item, idx) => (
      <tr key={item.label} className={idx % 2 === 1 ? styles.rowShaded : undefined}>
        <td className={styles.label}>{item.label}</td>
        <td className={styles.amount}>{formatPula(item.amount)}</td>
      </tr>
    ))}
    <tr className={styles.rowTotal}>
      <td className={styles.label}>{section.totalLabel}</td>
      <td className={styles.amount}>{formatPula(section.total)}</td>
    </tr>
  </>
);

const DownloadIcon: React.FC = () => (
  <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
    <path
      d="M10 3v9m0 0 3.5-3.5M10 12 6.5 8.5M4 14.5v1a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5v-1"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SmsIcon: React.FC = () => (
  <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
    <path
      d="M3 5.5A1.5 1.5 0 0 1 4.5 4h11A1.5 1.5 0 0 1 17 5.5v6A1.5 1.5 0 0 1 15.5 13H8l-3.2 2.6a.5.5 0 0 1-.8-.4V13h-.5A1.5 1.5 0 0 1 2 11.5v-6Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Displays an Aselar income statement.
 *
 * Pass `isSample` (default true) to show the "SAMPLE" banner and the
 * AI-readiness explainer — used for prospective clients on the Complete
 * tier before they have 4-5 months of transaction history. Once a
 * business's real AI-generated statement is ready, render with
 * `isSample={false}` and their live `data`.
 */
const IncomeStatement: React.FC<IncomeStatementProps> = ({
  data = SAMPLE_INCOME_STATEMENT,
  isSample = true,
  onDownloadPdf,
  onSendSms,
}) => {
  const [showSmsInput, setShowSmsInput] = useState(false);
  const [phone, setPhone] = useState("");
  const [smsStatus, setSmsStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleDownloadPdf = () => {
    if (onDownloadPdf) {
      onDownloadPdf();
    } else {
      window.print();
    }
  };

  const handleSendSms = async () => {
    if (!phone.trim()) return;
    setSmsStatus("sending");
    try {
      if (onSendSms) {
        await onSendSms(phone.trim());
      } else {
        // Placeholder — wire this to your Twilio-backed endpoint.
        await fetch("/api/statements/send-sms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: phone.trim(), businessName: data.businessName }),
        });
      }
      setSmsStatus("sent");
    } catch {
      setSmsStatus("error");
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        {data.logoUrl ? (
          <img src={data.logoUrl} alt={`${data.businessName} logo`} className={styles.logoImage} />
        ) : (
          <div className={styles.logoBadge}>{getInitials(data.businessName)}</div>
        )}

        <div className={styles.brand}>ASELAR</div>
        <div className={styles.title}>AI-Generated Income Statement</div>

        {isSample && (
          <div className={styles.sampleBanner}>
            SAMPLE — Illustrative business, for demonstration purposes only
          </div>
        )}

        <div className={styles.businessName}>{data.businessName}</div>
        <div className={styles.period}>{data.periodLabel}</div>
      </div>

      <table className={styles.table}>
        <tbody>
          <Section section={data.revenue} />
          <Section section={data.costOfSales} />
          <tr className={styles.rowHighlight}>
            <td className={styles.label}>{data.grossProfitLabel}</td>
            <td className={styles.amount}>{formatPula(data.grossProfit)}</td>
          </tr>
          <Section section={data.operatingExpenses} />
          <tr className={styles.rowHighlight}>
            <td className={styles.label}>{data.netProfitLabel}</td>
            <td className={styles.amount}>{formatPula(data.netProfit)}</td>
          </tr>
        </tbody>
      </table>

      <div className={styles.actions}>
        <button type="button" className={styles.btnPrimary} onClick={handleDownloadPdf}>
          <DownloadIcon />
          Download PDF
        </button>

        {!showSmsInput ? (
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => setShowSmsInput(true)}
          >
            <SmsIcon />
            Send via SMS
          </button>
        ) : (
          <div className={styles.smsRow}>
            <input
              type="tel"
              inputMode="tel"
              placeholder="e.g. 71234567"
              className={styles.smsInput}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setSmsStatus("idle");
              }}
              disabled={smsStatus === "sending" || smsStatus === "sent"}
            />
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={handleSendSms}
              disabled={smsStatus === "sending" || smsStatus === "sent" || !phone.trim()}
            >
              {smsStatus === "sending" ? "Sending…" : smsStatus === "sent" ? "Sent ✓" : "Send"}
            </button>
          </div>
        )}
      </div>
      {smsStatus === "error" && (
        <div className={styles.smsError}>Couldn&apos;t send — please try again.</div>
      )}

      {isSample && (
        <div className={styles.explainer}>
          <h3 className={styles.explainerHeading}>How this works</h3>
          <p>
            This is a sample only, built to show the layout and level of
            detail your real statement will have. It does not reflect any
            actual business&apos;s figures.
          </p>
          <p>
            Once you&apos;re on the Complete plan, Aselar&apos;s AI builds
            your real income statement automatically from the receipts,
            quotations, invoices, and debt notes you already capture day to
            day — no extra data entry required.
          </p>
          <p>
            <strong>Timeline:</strong> your real, accurate financial
            statements become available after roughly 4–5 months of regular
            Aselar usage. This gives the AI enough transaction history to
            reconcile stock, expenses, and revenue reliably.
          </p>
          <p>
            <strong>Until then:</strong> keep capturing your day-to-day
            receipts, quotations, and invoices as normal — every one of them
            is building toward your first statement.
          </p>
        </div>
      )}
    </div>
  );
};

export default IncomeStatement;