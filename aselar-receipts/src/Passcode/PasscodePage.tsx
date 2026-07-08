import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import styles from "./PasscodePage.module.css";
import Notice from "../Notice/Notice";

const PasscodePage = () => {
  const [passcode, setPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSetPasscode = async () => {
    if (passcode.length < 4) {
      toast.error("Passcode must be at least 4 characters long.");
      return;
    }

    if (passcode !== confirmPasscode) {
      toast.error("Passcodes do not match. Please try again.");
      return;
    }

    setLoading(true);

    const controller = new AbortController();
    // Render free tier cold starts can take 20-30s+, so give it real room
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/set-passcode`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { "Authorization": `Bearer ${token}` })
        },
        body: JSON.stringify({ passcode }),
        credentials: "include",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (data.success) {
        toast.success("Passcode set successfully!");
        const redirectTo = location.state?.redirectTo;
        navigate(redirectTo || "/banking");
      } else {
        toast.error(data.message || "Failed to set passcode. Please try again.");
      }

    } catch (error) {
      clearTimeout(timeoutId);
      console.error("Error setting passcode:", error);

      if (error instanceof DOMException && error.name === 'AbortError') {
        toast.error("Server is waking up — please wait a few seconds and try again.");
      } else {
        toast.error("Network error. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.createPasscodeContainer}>
      <Notice />
      <h2>Create Your Passcode</h2>
      <p>This passcode will be used to access sensitive pages
        like Payments and Inventory Management.</p>
      <input
        type="password"
        value={passcode}
        onChange={(e) => setPasscode(e.target.value)}
        placeholder="Enter your passcode"
        disabled={loading}
      />
      <input
        type="password"
        value={confirmPasscode}
        onChange={(e) => setConfirmPasscode(e.target.value)}
        placeholder="Confirm your passcode"
        disabled={loading}
      />
      <button onClick={handleSetPasscode} disabled={loading}>
        {loading ? "Setting passcode..." : "Set Passcode"}
      </button>
    </div>
  );
};

export default PasscodePage;