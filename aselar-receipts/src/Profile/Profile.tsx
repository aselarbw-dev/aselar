import React,{useState,useEffect} from 'react'
import styles from "./Profile.module.css"
import { Link } from 'react-router-dom'

interface BusinessData {
  _id: string;
  businessNature: string;
  place: string;
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
const Profile:React.FC= () => {
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
      const [error, setError] = useState<string | null>(null);
    
      useEffect(() => {
        const fetchAllData = async () => {
          try {
            const token=localStorage.getItem('token')
            setLoading(true);
            const [businessResponse, profileResponse] = await Promise.all([
            
            // Fetch all data simultaneously
            
              fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/get-business`, {
                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                credentials: "include"
              }),
              fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/profile`, {
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                credentials: "include"
              })
            ]);
    
            // Handle business data
            if (businessResponse.ok) {
              const business = await businessResponse.json();
              setBusinessData(business);
            } else {
              console.warn('Failed to fetch business data');
            }
    
            // Handle profile data
            if (profileResponse.ok) {
              const profile = await profileResponse.json();
              setProfileData(profile);
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
    <div className={styles.cardMain}>
       <div className={styles.cardImg}>
                 <img src={profileData?.profilePicture} alt="profile picture" />
       </div>
       <div className={styles.cardBody}>
            <h3>Company Name :{profileData?.nameOfBusiness}</h3>
            <h4>Industry:{businessData?.businessNature}</h4>
            <h4>Email:{profileData?.emailBusiness}</h4>
            <h4>Contact:{profileData?.businessPhone}</h4>
            <h4>Place:{businessData?.place}</h4>
          
       </div>
       <div className={styles.buttones}>
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
 
       </div>
    </div>
    </div>
  )
}

export default Profile