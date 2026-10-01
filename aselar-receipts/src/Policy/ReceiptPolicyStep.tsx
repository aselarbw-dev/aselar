// ReceiptPolicyStep.tsx
import React, { useEffect, useState } from 'react';
import styles from './ReceiptPolicyStep.module.css';
import {useNavigate} from "react-router-dom";
const API_URL = `${import.meta.env.VITE_AUTH_SERVICE_URL}api/receipt-policy`;
const MAX_LENGTH = 1000;

const TEMPLATES: { label: string; text: string }[] = [
  {
    label: 'Exchange only',
    text: 'Goods may be exchanged within 7 days of purchase with this receipt. No cash refunds. Items must be unused and in original condition.',
  },
  {
    label: 'Refund allowed',
    text: 'Refunds are accepted within 7 days of purchase with this receipt and the item in original condition. Perishable goods are non-refundable.',
  },
  {
    label: 'No refunds',
    text: 'All sales are final. Goods once sold cannot be returned or refunded. The business is not liable for loss or damage after purchase.',
  },
];

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

// ---- Shared read helper (use this in your receipt component) ----
// Cached per token so printing many receipts doesn't hit the server each time.
let cache: { token: string; clause: string } | null = null;

export const fetchReceiptPolicy = async (force = false): Promise<string> => {
    
  const token = localStorage.getItem('token') || '';
  if (!token) return '';
  if (!force && cache && cache.token === token) return cache.clause;

  try {
    const response = await fetch(API_URL, {
      headers: authHeaders(),
      credentials: 'include',
    });
    if (!response.ok) return cache && cache.token === token ? cache.clause : '';
    const data = await response.json().catch(() => ({}));
    const clause: string = data.clause || '';
    cache = { token, clause };
    return clause;
  } catch (err) {
    console.error('Failed to load receipt policy:', err);
    return cache && cache.token === token ? cache.clause : '';
  }
};

interface ReceiptPolicyStepProps {
  onSaved?: (clause: string) => void; // called after save (or if unchanged)
  onSkip?: () => void;                // if provided, a "Skip for now" button is shown
  asModal?: boolean;                  // true = popup overlay, false = inline step
}

const ReceiptPolicyStep: React.FC<ReceiptPolicyStepProps> = ({
  onSaved,
  onSkip,
  asModal = false,
}) => {
  const [clause, setClause] = useState<string>('');
  const [existing, setExisting] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
const navigate = useNavigate();
  // Pre-fill with the saved clause, if any
  useEffect(() => {
    let active = true;
    fetchReceiptPolicy(true).then((saved) => {
      if (!active) return;
      setExisting(saved);
      setClause(saved);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = clause.trim();

    if (!trimmed) {
      setError('Enter a refund policy or liability clause, or skip for now.');
      return;
    }
    if (trimmed.length > MAX_LENGTH) {
      setError(`Keep it to ${MAX_LENGTH} characters or less.`);
      return;
    }

    // Nothing changed: don't create a duplicate record
    if (trimmed === existing) {
      onSaved?.(trimmed);
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ clause: trimmed }),
        credentials: 'include',
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || `Server error: ${response.status}`);
        return;
      }

      const saved: string = data.clause || trimmed;
      const token = localStorage.getItem('token') || '';
      cache = { token, clause: saved }; // keep receipts in sync immediately
      setExisting(saved);
      onSaved?.(saved);
      navigate("/create-passcode");
    } catch (err) {
      console.error('Failed to save receipt policy:', err);
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <div className={styles.content}>
      <h2>Refund Policy / Liability Clause</h2>
      <p>This text will be printed at the bottom of every receipt your business issues.</p>

      <div className={styles.templates}>
        {TEMPLATES.map((t) => (
          <button
            key={t.label}
            type="button"
            className={styles.templateButton}
            onClick={() => setClause(t.text)}
            disabled={saving || loading}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <textarea
          value={clause}
          onChange={(e) => setClause(e.target.value)}
          placeholder={loading ? 'Loading...' : 'e.g. Goods may be exchanged within 7 days with this receipt.'}
          className={styles.textarea}
          rows={5}
          maxLength={MAX_LENGTH}
          disabled={saving || loading}
        />
        <div className={styles.counter}>
          {clause.length}/{MAX_LENGTH}
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button
          type="submit"
          className={styles.submitButton}
          disabled={saving || loading}
        >
          {saving ? 'Saving...' : 'Save Clause'}
        </button>

        {onSkip && (
          <button
            type="button"
            className={styles.skipButton}
            onClick={onSkip}
            disabled={saving}
          >
            Skip for now
          </button>
        )}
      </form>
    </div>
  );

  if (asModal) {
    return <div className={styles.modalOverlay}>{content}</div>;
  }
  return content;
};

export default ReceiptPolicyStep;