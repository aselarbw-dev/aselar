import React, { useState, useEffect } from 'react'
import styles from "./Profile.module.css"
import { Link } from 'react-router-dom'

interface BusinessData {
  _id: string;
  businessNature: string;
  place: string;
  city: string;
  businessNumber: string;
  businessDescription: string;
  user: string;
}

interface ProfileData {
  _id: string;
  nameOfBusiness: string;
  emailBusiness: string;
  businessPhone: string;
  profilePicture: string;
}

const Profile: React.FC = () => {
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // --- Edit mode state ---
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // User-model fields
  const [formName, setFormName] = useState<string>("");
  const [formEmail, setFormEmail] = useState<string>("");
  const [formPhone, setFormPhone] = useState<string>("");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Business-model fields
  const [formIndustry, setFormIndustry] = useState<string>("");
  const [formPlace, setFormPlace] = useState<string>("");
  const [formCity, setFormCity] = useState<string>("");

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const token = localStorage.getItem('token')
        setLoading(true);
        const [businessResponse, profileResponse] = await Promise.all([
          fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/get-business`, {
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            credentials: "include"
          }),
          fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/profile`, {
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            credentials: "include"
          })
        ]);

        if (businessResponse.ok) {
          const business = await businessResponse.json();
          setBusinessData(business);
          setFormIndustry(business.businessNature || "");
          setFormPlace(business.place || "");
          setFormCity(business.city || "");
        } else {
          console.warn('Failed to fetch business data');
        }

        if (profileResponse.ok) {
          const profile = await profileResponse.json();
          setProfileData(profile);
          setFormName(profile.nameOfBusiness || "");
          setFormEmail(profile.emailBusiness || "");
          setFormPhone(profile.businessPhone || "");
        } else {
          console.warn('Failed to fetch profile data');
        }

      } catch (error: any) {
        console.error('Fetch error:', error);
        setError(error.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormFile(file);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleCancel = () => {
    if (profileData) {
      setFormName(profileData.nameOfBusiness || "");
      setFormEmail(profileData.emailBusiness || "");
      setFormPhone(profileData.businessPhone || "");
    }
    if (businessData) {
      setFormIndustry(businessData.businessNature || "");
      setFormPlace(businessData.place || "");
      setFormCity(businessData.city || "");
    }
    setFormFile(null);
    setPreviewUrl(null);
    setSaveError(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);

    const token = localStorage.getItem('token');
    const errors: string[] = [];

    // --- Request 1: User model (profile) ---
    const profileFormData = new FormData();
    profileFormData.append("nameOfBusiness", formName);
    profileFormData.append("emailBusiness", formEmail);
    profileFormData.append("businessPhone", formPhone);
    if (formFile) {
      profileFormData.append("profilePicture", formFile);
    }

    const profileRequest = fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/profile`, {
      method: "PUT",
      headers: { 'Authorization': `Bearer ${token}` }, // browser sets multipart boundary
      credentials: "include",
      body: profileFormData,
    });

    // --- Request 2: Business model ---
    const businessRequest = fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/business`, {
      method: "PUT",
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: "include",
      body: JSON.stringify({
        businessNature: formIndustry,
        place: formPlace,
        city: formCity,
      }),
    });

    const [profileResult, businessResult] = await Promise.allSettled([
      profileRequest,
      businessRequest,
    ]);

    // Handle profile result
    if (profileResult.status === "fulfilled" && profileResult.value.ok) {
      const json = await profileResult.value.json();
      setProfileData(json.data);
      setFormFile(null);
      setPreviewUrl(null);
    } else {
      const message =
        profileResult.status === "fulfilled"
          ? (await profileResult.value.json().catch(() => null))?.message
          : profileResult.reason?.message;
      errors.push(message || "Failed to update profile details");
    }

    // Handle business result
    if (businessResult.status === "fulfilled" && businessResult.value.ok) {
      const json = await businessResult.value.json();
      setBusinessData(json.data);
    } else {
      const message =
        businessResult.status === "fulfilled"
          ? (await businessResult.value.json().catch(() => null))?.message
          : businessResult.reason?.message;
      errors.push(message || "Failed to update business details");
    }

    setSaving(false);

    if (errors.length > 0) {
      setSaveError(errors.join(" | "));
      // stay in edit mode so they can retry the failed part
    } else {
      setIsEditing(false);
    }
  };

  if (loading) return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner}></div>
      <p>Loading receipt...</p>
    </div>
  );

  if (error) return (
    <div className={styles.errorContainer}>
      <div className={styles.errorIcon}>⚠️</div>
      <p>Error: {error}</p>
      <button
        onClick={() => window.location.reload()}
        className={styles.retryButton}
      >
        Try Again
      </button>
    </div>
  );

  return (
    <div className={styles.card}>
      <div className={`${styles.cardMain} ${isEditing ? styles.cardMainEditing : ''}`}>
        <div className={styles.cardImg}>
          <img src={previewUrl || profileData?.profilePicture} alt="profile picture" />
          {isEditing && (
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className={styles.fileInput}
            />
          )}
        </div>

        <div className={styles.cardBody}>
          {isEditing ? (
            <>
              <label>
                Company Name
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </label>
              <label>
                Contact
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
              </label>
              <label>
                Industry
                <input
                  type="text"
                  value={formIndustry}
                  onChange={(e) => setFormIndustry(e.target.value)}
                />
              </label>
              <label>
                Place
                <input
                  type="text"
                  value={formPlace}
                  onChange={(e) => setFormPlace(e.target.value)}
                />
              </label>
              <label>
                City
                <input
                  type="text"
                  value={formCity}
                  onChange={(e) => setFormCity(e.target.value)}
                />
              </label>

              {saveError && <p className={styles.saveError}>{saveError}</p>}
            </>
          ) : (
            <>
              <h3>Company Name :{profileData?.nameOfBusiness}</h3>
              <h4>Industry:{businessData?.businessNature}</h4>
              <h4>Email:{profileData?.emailBusiness}</h4>
              <h4>Contact:{profileData?.businessPhone}</h4>
              <h4>Place:{businessData?.place}</h4>
            </>
          )}
        </div>

        <div className={styles.buttones}>
          {isEditing ? (
            <>
              <button
                className={styles.edit}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                className={styles.delete}
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button className={styles.edit} onClick={() => setIsEditing(true)}>
                Edit Profile
              </button>
              <Link to="/password-change">
                <button className={styles.edit}>
                  Change Password
                </button>
              </Link>
              <Link to="/delete-account">
                <button className={styles.delete}>
                  Delete Account
                </button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Profile