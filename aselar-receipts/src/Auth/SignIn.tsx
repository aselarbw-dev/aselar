import React, { useState, useEffect } from 'react';
import signStyles from "../Auth/SignIn.module.css";
import { toast } from "react-toastify";
import { useNavigate, Link } from 'react-router-dom';
import loader from "../assets/circle-9360_256.gif";
import Spinner from "../Spinners/Spinner";
import AselarWhite from "../assets/Asset 6.png"
import { useAuth, User } from '../context/AuthContext';

interface LoginUser {
  emailBusiness: string;
  password: string;
}

const initialSignIn: LoginUser = {
  password: "",
  emailBusiness: "",
};

const SignIn: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LoginUser>(initialSignIn);
  const [loading, setLoading] = useState(false);
  const [load, setLoad] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const { login, isAuthenticated } = useAuth();

  const handleEvents = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/inside-dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const submitForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.emailBusiness || !formData.password) {
      toast.error("Please enter your email and password.");
      return;
    }

    if (!formData.emailBusiness.includes("@")) {
      toast.error("The email is in wrong format. Please enter a valid email with the @ symbol.");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password should be at least 8 characters.");
      return;
    }

    setLoading(true);
    setLoad(true);

    try {
      const loginPayload = {
        emailBusiness: formData.emailBusiness,
        password: formData.password
      };

      const response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/business-login`, {
        method: "POST",
        mode: "cors",
        body: JSON.stringify(loginPayload),
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      const data = await response.json();
      localStorage.setItem("token", data.token);

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);
      console.log("Full response data:", data);

      if (response.ok && (data.success === true || data.success === "true" || response.status === 200)) {
        toast.success(`Welcome back, ${data.nameOfBusiness || formData.emailBusiness}.`);
        setFormData(initialSignIn);
        setLoginAttempts(0);

        const userObject: User = {
          id: data.id || data.userId || data._id || data.businessId || Date.now().toString(),
          emailBusiness: formData.emailBusiness,
          nameOfBusiness: data.nameOfBusiness || data.businessName || 'Business User'
        };

        const token = data.token || data.accessToken || '';
        login(userObject, token);

        navigate("/inside-dashboard", { state: { userName: data.nameOfBusiness } });
      } else {
        if (data.message?.includes("locked") || data.message?.includes("attempts")) {
          toast.error(data.message, {
            autoClose: 8000,
          });

          if (data.message?.includes("locked")) {
            setLoginAttempts(5);
          } else if (data.message?.includes("remaining")) {
            const match = data.message.match(/(\d+) attempts remaining/);
            if (match) {
              const remaining = parseInt(match[1]);
              setLoginAttempts(5 - remaining);
            } else {
              setLoginAttempts(prev => prev + 1);
            }
          }
        } else {
          console.log("Login failed - response data:", data);
          let errorMsg = data.message || "Login failed. Please try again.";

          const lowerMsg = errorMsg.toLowerCase();
          if (
            response.status === 500 ||
            lowerMsg.includes("password") ||
            lowerMsg.includes("incorrect") ||
            lowerMsg.includes("wrong") ||
            lowerMsg.includes("invalid") ||
            lowerMsg.includes("credentials")
          ) {
            errorMsg = "Please enter the correct password, the current one seems wrong";
          } else if (
            lowerMsg.includes('email') ||
            lowerMsg.includes('not found') ||
            lowerMsg.includes('invalid email') ||
            lowerMsg.includes('not available')
          ) {
            errorMsg = "The email is wrong or not available.";
          }

          toast.error(errorMsg);
          setLoginAttempts(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error("Catch block - Login error:", error);
      toast.error("Please try again. The email or password you entered is incorrect.");
      setLoginAttempts(prev => prev + 1);
    } finally {
      setLoading(false);
      setLoad(false);
    }
  };

  return (
    <div className={signStyles.signMain}>
      {load && <Spinner />}
      <div className={signStyles.coverSign}>
        <form action="" className={signStyles.In} onSubmit={submitForm}>
          <div className={signStyles.logoWhite}>
            <img src={AselarWhite} alt="aselar logo" />
          </div>

          <h1 className={signStyles.Header}>Login </h1>

          {loginAttempts >= 3 && loginAttempts < 5 && (
            <div style={{
              backgroundColor: '#fff3cd',
              border: '1px solid #ffeaa7',
              color: '#856404',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '1rem',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              ⚠️ Warning: {5 - loginAttempts} login attempts remaining before account lock.
            </div>
          )}

          {loginAttempts >= 5 && (
            <div style={{
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
              color: '#721c24',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '1rem',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              🔒 Account temporarily locked. Please wait before trying again.
            </div>
          )}

          <div className={signStyles.formInfo}>
            <label htmlFor="emailBusiness">Email</label>
            <input
              type="email"
              placeholder="email"
              name="emailBusiness"
              value={formData.emailBusiness}
              onChange={handleEvents}
              disabled={loading || loginAttempts >= 5}
            />
          </div>

          <div className={signStyles.formInfo}>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              placeholder="password"
              name="password"
              value={formData.password}
              onChange={handleEvents}
              disabled={loading || loginAttempts >= 5}
            />
          </div>

          <div className={signStyles.formBtn}>
            <button
              type="submit"
              disabled={loading || loginAttempts >= 5}
              style={{
                opacity: loading || loginAttempts >= 5 ? 0.6 : 1,
                cursor: loading || loginAttempts >= 5 ? 'not-allowed' : 'pointer'
              }}
            >
              Sign In
              {loading && <img src={loader} alt="loading..." className={signStyles.load} />}
            </button>
          </div>

          <div className={signStyles.downLinks}>
            <Link to="/forgot-password" className={signStyles.home} rel="preload">
              Forgot Password?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignIn;