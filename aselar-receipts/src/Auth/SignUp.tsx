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
  profilePicture: File | null;
}

const initialSignup: FormSignUp = {
  nameOfBusiness: "",
  password: "",
  emailBusiness: "",
  businessPhone: "",
  profilePicture: null,
};

const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [load, setLoad] = useState(false);
  const [userProfile, setUserProfile] = useState<FormSignUp>(initialSignup);
  const [preview, setPreview] = useState<any>();
  const [passwordStrength, setPasswordStrength] = useState<string>("");

  const handleEvents = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserProfile({
      ...userProfile,
      [name]: value,
    });

    // Real-time password validation
    if (name === 'password') {
      validatePasswordStrength(value);
    }
  };

  const validatePasswordStrength = (password: string) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);
    const hasMinLength = password.length >= 8;

    const requirements = [
      { met: hasMinLength, text: "At least 8 characters" },
      { met: hasUpperCase, text: "One uppercase letter" },
      { met: hasLowerCase, text: "One lowercase letter" },
      { met: hasNumbers, text: "One number" },
      { met: hasSpecialChar, text: "One special character (@$!%*?&)" }
    ];

    const metRequirements = requirements.filter(req => req.met).length;
    
    if (password.length === 0) {
      setPasswordStrength("");
    } else if (metRequirements < 3) {
      setPasswordStrength("weak");
    } else if (metRequirements < 5) {
      setPasswordStrength("medium");
    } else {
      setPasswordStrength("strong");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    // Check image size (300KB = 300 * 1024 bytes)
    if (file && file.size > 300 * 1024) {
      toast.error("Image is too large. Please upload an image less than 300KB.");
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

  const isPasswordValid = (password: string): boolean => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  };

  const submitForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!userProfile.nameOfBusiness || !userProfile.businessPhone ||
        !userProfile.emailBusiness || !userProfile.password) {
      toast.error("Please enter necessary required information.");
      return;
    }
    
    if (!userProfile.emailBusiness.includes("@")) {
      toast.error("Please enter a valid email.");
      return;
    }
    
    // Enhanced password validation
    if (!isPasswordValid(userProfile.password)) {
      toast.error("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)");
      return;
    }
    
    if (!userProfile.profilePicture) {
      toast.error("Please upload a profile picture.");
      return;
    }

    const formData = new FormData();
    formData.append('profilePicture', userProfile.profilePicture as File);
    formData.append('nameOfBusiness', userProfile.nameOfBusiness);
    formData.append('businessPhone', userProfile.businessPhone);
    formData.append('emailBusiness', userProfile.emailBusiness);
    formData.append('password', userProfile.password);

    setLoading(true);
    setLoad(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/business-signup`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Handle server-side validation errors
        toast.error(data.message || "Registration failed. Please try again.");
        return;
      }
      
      console.log(data);
      toast.success(`Welcome on board ${userProfile.nameOfBusiness}!`);
      navigate("/create-passcode");
      setUserProfile(initialSignup);
      setPasswordStrength("");
      
    } catch (error) {
      console.error('Registration error:', error);
      toast.error("An error occurred. Please try again.");
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

  const getPasswordRequirements = () => {
    const password = userProfile.password;
    return [
      { met: password.length >= 8, text: "At least 8 characters" },
      { met: /[A-Z]/.test(password), text: "One uppercase letter" },
      { met: /[a-z]/.test(password), text: "One lowercase letter" },
      { met: /\d/.test(password), text: "One number" },
      { met: /[@$!%*?&]/.test(password), text: "One special character (@$!%*?&)" }
    ];
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
            <label htmlFor="">Business Owner</label>
            <input
              type="text"
              placeholder="business owner"
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
            <label htmlFor="">Password</label>
            <input
              type="password"
              placeholder="password"
              name="password"
              onChange={handleEvents}
              value={userProfile.password}
            />
            
            {/* Password Strength Indicator */}
            {userProfile.password && (
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
            
            {/* Password Requirements */}
            {userProfile.password && (
              <div style={{ 
                marginTop: '8px', 
                padding: '8px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#666' }}>
                  Password Requirements:
                </div>
                {getPasswordRequirements().map((req, index) => (
                  <div key={index} style={{ 
                    color: req.met ? '#2ed573' : '#ff4757',
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '2px'
                  }}>
                    <span style={{ marginRight: '6px' }}>
                      {req.met ? '✓' : '✗'}
                    </span>
                    {req.text}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className={user.formInfo}>
            <label htmlFor="">Upload your Logo</label>
            <div className={user.flex}>
              <input
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleFileChange}
              />
              {preview && (
                <div className={user.previewContainer}>
                  <img src={preview} alt="Profile Preview" className={user.profileImg} />
                </div>
              )}
            </div>
          </div>
          
          <div className={user.formButton}>
            <button 
              type="submit"
              disabled={loading || passwordStrength !== 'strong'}
              style={{
                opacity: loading || (userProfile.password && passwordStrength !== 'strong') ? 0.6 : 1,
                cursor: loading || (userProfile.password && passwordStrength !== 'strong') ? 'not-allowed' : 'pointer'
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