import  { useState } from "react";
import { useNavigate, useLocation} from "react-router-dom";
import { toast } from "react-toastify";
import styles from "./PasscodePage.module.css";
import Notice from "../Notice/Notice";
const PasscodePage = () => {
  const [passcode, setPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
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

  try {
    const token = localStorage.getItem('token');

    if (!token) {
      toast.error("Session expired. Please log in again.");
      navigate("/sign-in");
      return;
    }

    const response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/set-passcode`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${token}` 
      },
      body: JSON.stringify({ passcode }),
      credentials: "include",
    });

    const data = await response.json();

   if (data.success) {
  toast.success("Passcode set successfully!");
  const redirectTo = location.state?.redirectTo;
  navigate(redirectTo || "/banking"); // onboarding continues to banking, dashboard redirect only if coming from inside
} else {
      toast.error("Failed to set passcode. Please try again.");
    }

  } catch (error) {
    console.error("Error setting passcode:", error);
    toast.error("An error occurred. Please try again.");
  }
};

  return (
    <div className={styles.createPasscodeContainer}>
      <Notice/>
      <h2>Create Your Passcode</h2>
      <p>This passcode will be used to access sensitive pages 
        like Payments and Inventory Management.</p>
      <input
        type="password"
        value={passcode}
        onChange={(e) => setPasscode(e.target.value)}
        placeholder="Enter your passcode"
      />
      <input
        type="password"
        value={confirmPasscode}
        onChange={(e) => setConfirmPasscode(e.target.value)}
        placeholder="Confirm your passcode"
      />
      <button onClick={handleSetPasscode}>Set Passcode</button>
    </div>
  );
};

export default PasscodePage;