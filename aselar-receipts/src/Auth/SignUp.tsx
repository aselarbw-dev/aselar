import React, { useState } from 'react';
import user from "../Auth/SignUp.module.css";
import { toast } from 'react-toastify';
import { useNavigate,Link } from 'react-router-dom';
import Spinner from '../Spinners/Spinner';
import loader from "../assets/circle-9360_256.gif";
//import { FaUser } from "react-icons/fa";
//import { IconContext } from 'react-icons';
import AselarWhite from "../assets/Asset 6.png"
interface FormSignUp {
  nameOfBusiness: string;
  password: string;
  emailBusiness: string;
  businessPhone: string;
  place: string;   // NEW
  city: string;    // NEW
  profilePicture: File | null;
}

const initialSignup: FormSignUp = {
  nameOfBusiness: "",
  password: "",
  emailBusiness: "",
  businessPhone: "",
  place: "",   // NEW
  city: "",    // NEW
  profilePicture: null,
};

// ---- Password rules: ONE source of truth (change here if the pattern changes later) ----
const ALLOWED_SPECIALS = ['@', '$', '!', '%', '*', '?', '&'];
const SPECIAL_CHAR_REGEX = /[@$!%*?&]/;
const ALLOWED_CHARS_ONLY_REGEX = /^[A-Za-z\d@$!%*?&]*$/;

const getPasswordRequirements = (password: string) => [
  { met: password.length >= 8, text: "At least 8 characters" },
  { met: /[A-Z]/.test(password), text: "One uppercase letter (A-Z)" },
  { met: /[a-z]/.test(password), text: "One lowercase letter (a-z)" },
  { met: /\d/.test(password), text: "One number (0-9)" },
  { met: SPECIAL_CHAR_REGEX.test(password), text: "One special character from the list above" },
  { met: ALLOWED_CHARS_ONLY_REGEX.test(password), text: "Only letters, numbers and the symbols above (no spaces or other symbols)" },
];

const isPasswordValid = (password: string): boolean =>
  getPasswordRequirements(password).every((req) => req.met);

const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [load, setLoad] = useState(false);
  const [userProfile, setUserProfile] = useState<FormSignUp>(initialSignup);
  const [preview, setPreview] = useState<any>();
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Derived from the password on every render (no toasts, no stale state)
  const hasPassword = userProfile.password.length > 0;
  const requirements = getPasswordRequirements(userProfile.password);
  const metCount = requirements.filter((req) => req.met).length;
  const passwordStrength: string = !hasPassword
    ? ""
    : metCount === requirements.length
    ? "strong"
    : metCount < 4
    ? "weak"
    : "medium";

  const submitDisabled = loading || passwordStrength !== 'strong';

  const handleEvents = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserProfile({
      ...userProfile,
      [name]: value,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

   // Check image size (2MB = 2 * 1024 * 1024 bytes)
    if (file && file.size > 2 * 1024 * 1024) {
      toast.error("Image is too large. Please upload an image less than 2MB.", { toastId: 'logo-too-large' });
      return;
    }

    setUserProfile((prev) => ({
      ...prev,
      profilePicture: file,
    }));

    // Generate a preview if a file is selected
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const submitForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!userProfile.nameOfBusiness || !userProfile.businessPhone ||
        !userProfile.emailBusiness || !userProfile.password || !userProfile.place || !userProfile.city) {
      toast.error("Please enter necessary required information.", { toastId: 'required-fields' });
      return;
    }
    
    if (!userProfile.emailBusiness.includes("@")) {
      toast.error("Please enter a valid email.", { toastId: 'invalid-email' });
      return;
    }
    
    // Password validation (only shown on submit, never while typing)
    if (!isPasswordValid(userProfile.password)) {
      toast.error(
        `Password must be at least 8 characters with an uppercase letter, a lowercase letter, a number and one special character from: ${ALLOWED_SPECIALS.join(' ')}`,
        { toastId: 'invalid-password' }
      );
      return;
    }
    
    if (!userProfile.profilePicture) {
      toast.error("Please upload a profile picture.", { toastId: 'missing-logo' });
      return;
    }

    const formData = new FormData();
    formData.append('profilePicture', userProfile.profilePicture as File);
    formData.append('nameOfBusiness', userProfile.nameOfBusiness);
    formData.append('businessPhone', userProfile.businessPhone);
    formData.append('emailBusiness', userProfile.emailBusiness);
    formData.append('password', userProfile.password);
    formData.append('place', userProfile.place);   // NEW
    formData.append('city', userProfile.city);     // NEW

    setLoading(true);
    setLoad(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/business-signup`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      const data = await response.json();
console.log("Signup response data:", data); // add this
      
     if (!response.ok) {
  toast.error(data.message || "Registration failed. Please try again.", { toastId: 'signup-failed' });
  return;
}

// add this line
localStorage.setItem('token', data.token);

toast.success(`Welcome on board ${userProfile.nameOfBusiness}!`);
navigate("/create-passcode");
      setUserProfile(initialSignup);
      
    } catch (error) {
      console.error('Registration error:', error);
      toast.error("An error occurred. Please try again.", { toastId: 'signup-error' });
    } finally {
      setLoading(false);
      setLoad(false);
    }
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case "weak": return "#ff4757";
      case "medium": return "#ffa502";
      case "strong": return "#2ed573";
      default: return "#ddd";
    }
  };

  return (
    <div className={user.mainUser}>
      {load && <Spinner />}
      <div className={user.form}>
        <form action="" className={user.contentForm} onSubmit={submitForm}>
        <div className={user.logoWhite}>
          <img src={AselarWhite} alt="aselar logo" />
          </div>
         
          <h1 className={user.registerHeader}>Business Signup</h1>
          
          <div className={user.formInfo}>
            <label htmlFor="">Business Name</label>
            <input
              type="text"
              placeholder="business name"
              name="nameOfBusiness"
              onChange={handleEvents}
              value={userProfile.nameOfBusiness}
            />
          </div>
          
          <div className={user.formInfo}>
            <label htmlFor="">Business Email</label>
            <input
              type="email"
              placeholder="email"
              name="emailBusiness"
              onChange={handleEvents}
              value={userProfile.emailBusiness}
            />
          </div>
          
          <div className={user.formInfo}>
            <label htmlFor="">Business Contact</label>
            <input
              type="text"
              placeholder="contact"
              name="businessPhone"
              onChange={handleEvents}
              value={userProfile.businessPhone}
            />
          </div>
          <div className={user.formInfo}>
  <label htmlFor="">Place of Work</label>
  <input
    type="text"
    placeholder="eg plot 123, unit 01, extension 123"
    name="place"
    onChange={handleEvents}
    value={userProfile.place}
  />
</div>

<div className={user.formInfo}>
  <label htmlFor="">City / Town</label>
  <input
    type="text"
    placeholder="eg Gaborone, Francistown, Maun"
    name="city"
    onChange={handleEvents}
    value={userProfile.city}
  />
</div>
          <div className={user.formInfo}>
            <label htmlFor="password">Password</label>

            {/* Password input with Show / Hide toggle */}
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="password"
                name="password"
                autoComplete="new-password"
                onChange={handleEvents}
                value={userProfile.password}
                style={{ width: '100%', boxSizing: 'border-box', paddingRight: '4.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '4px 6px'
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            
            {/* Password Strength Indicator */}
            {hasPassword && (
              <div style={{ marginTop: '8px' }}>
                <div style={{
                  height: '4px',
                  backgroundColor: '#ddd',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    backgroundColor: getPasswordStrengthColor(),
                    width: passwordStrength === 'weak' ? '33%' : 
                           passwordStrength === 'medium' ? '66%' : 
                           passwordStrength === 'strong' ? '100%' : '0%',
                    transition: 'all 0.3s ease'
                  }} />
                </div>
                <small style={{ 
                  color: getPasswordStrengthColor(), 
                  textTransform: 'capitalize',
                  fontSize: '12px',
                  marginTop: '4px',
                  display: 'block'
                }}>
                  {passwordStrength && `Password strength: ${passwordStrength}`}
                </small>
              </div>
            )}
            
            {/* Password Requirements - always visible so users know the rules before typing */}
            <div style={{ 
              marginTop: '8px', 
              padding: '10px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#666' }}>
                Password rules:
              </div>

              <div style={{ marginBottom: '8px', color: '#666' }}>
                Special characters allowed (use only these):
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {ALLOWED_SPECIALS.map((char) => (
                    <span
                      key={char}
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: '13px',
                        minWidth: '24px',
                        textAlign: 'center',
                        padding: '2px 6px',
                        background: '#fff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        color: '#0f172a'
                      }}
                    >
                      {char}
                    </span>
                  ))}
                </div>
              </div>

              {requirements.map((req, index) => (
                <div key={index} style={{ 
                  color: !hasPassword ? '#666' : req.met ? '#2ed573' : '#ff4757',
                  display: 'flex',
                  alignItems: 'flex-start',
                  marginBottom: '2px'
                }}>
                  <span style={{ marginRight: '6px' }}>
                    {!hasPassword ? '•' : req.met ? '✓' : '✗'}
                  </span>
                  {req.text}
                </div>
              ))}
            </div>
          </div>
          
          <div className={user.formInfo}>
  <label htmlFor="">Upload your Logo</label>
  <div className={user.flex}>
    <label htmlFor="profilePictureInput" className={user.uploadButton}>
      Choose Logo
    </label>
    <input
      id="profilePictureInput"
      type="file"
      accept="image/png, image/jpeg"
      onChange={handleFileChange}
      className={user.hiddenFileInput}
    />
    {preview ? (
      <div className={user.previewContainer}>
        <img src={preview} alt="Profile Preview" className={user.profileImg} />
      </div>
    ) : (
      <span className={user.fileHint}>PNG or JPG, up to 2MB</span>
    )}
  </div>
</div>
          
          <div className={user.formButton}>
            <button 
              type="submit"
              disabled={submitDisabled}
              style={{
                opacity: submitDisabled ? 0.6 : 1,
                cursor: submitDisabled ? 'not-allowed' : 'pointer'
              }}
            >
              Submit
              {loading && <img src={loader} alt="loading..." className={user.load} />}
            </button>
            <Link to="/sign-in" className={user.referLink}  rel="preload">Have an acount?Signin</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUp;