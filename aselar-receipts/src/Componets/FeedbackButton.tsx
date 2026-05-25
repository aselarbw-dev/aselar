import { useState } from 'react';
import styles from './FeedbackButton.module.css';

const RATINGS = ['😞', '😕', '😐', '😊', '🤩'];

const FeedbackButton = () => {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    comment: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.comment.trim()) return;

    setLoading(true);

    try {
      await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key:import.meta.env.VITE_WEB3FORMS_KEY_HERE,
          subject: `AvelarAI Feedback — ${rating !== null ? RATINGS[rating] : 'No rating'} from ${form.name || 'Anonymous'}`,
          name: form.name || 'Anonymous',
          email: form.email || 'Not provided',
          rating: rating !== null ? `${RATINGS[rating]} (${rating + 1}/5)` : 'Not rated',
          comment: form.comment,
          from_name: 'AvelarAI Feedback',
        }),
      });

      setSubmitted(true);
    } catch {
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setSubmitted(false);
      setRating(null);
      setForm({ name: '', email: '', comment: '' });
    }, 300);
  };

  return (
    <>
      <button className={styles.feedbackBtn} onClick={() => setOpen(true)}>
        <span className={styles.dot} />
        Share feedback
      </button>

      {open && (
        <div className={styles.overlay} onClick={handleClose}>
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <button className={styles.closeBtn} onClick={handleClose}>
              ×
            </button>

            {submitted ? (
              <div className={styles.success}>
                <div className={styles.successIcon}>✓</div>
                <h3 className={styles.successTitle}>Thank you!</h3>
                <p className={styles.successText}>
                  Your feedback means a lot and helps us make Aselar
                  better for everyone.
                </p>
              </div>
            ) : (
              <>
                <h2 className={styles.modalTitle}>Share your feedback</h2>
                <p className={styles.modalSubtitle}>
                  What do you think of Aselar? Your honest opinion
                  helps us improve.
                </p>

                <form className={styles.form} onSubmit={handleSubmit}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>How was your experience?</label>
                    <div className={styles.ratingRow}>
                      {RATINGS.map((emoji, i) => (
                        <button
                          key={i}
                          type="button"
                          className={`${styles.ratingStar} ${rating === i ? styles.ratingStarActive : ''}`}
                          onClick={() => setRating(i)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Name (optional)</label>
                    <input
                      className={styles.input}
                      type="text"
                      name="name"
                      placeholder="Your name"
                      value={form.name}
                      onChange={handleChange}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Email (optional)</label>
                    <input
                      className={styles.input}
                      type="email"
                      name="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={handleChange}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Your comment *</label>
                    <textarea
                      className={styles.textarea}
                      name="comment"
                      placeholder="Tell us what you think, what you'd like to see, or anything else..."
                      value={form.comment}
                      onChange={handleChange}
                    />
                  </div>

                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={loading || !form.comment.trim()}
                  >
                    {loading ? (
                      <>
                        <span className={styles.spinner} />
                        Sending...
                      </>
                    ) : (
                      'Send feedback'
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackButton;