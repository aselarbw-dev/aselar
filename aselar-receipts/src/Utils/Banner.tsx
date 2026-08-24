import { useState, useEffect } from "react"
import { useLocation } from "react-router-dom";
import bannerStyles from "./Banner.module.css"
import { FaFileUpload } from "react-icons/fa";
import { Link } from "react-router-dom"
import { toast } from "react-toastify";
import axios from "axios";
import ScanOnlyModeToggle from "../Scans/ScanOnlyModeToggle";
import { FaFile } from 'react-icons/fa'


import Calculator from "../Calculator/Calculator"
import { FaCalculator } from "react-icons/fa6";



interface UserProfile {
  _id: string;
  name: string;
  nameOfBusiness: string;
  emailBusiness: string;
  businessPhone: string;
  profilePicture: string;
}
interface BannerProps {
  isCollapsed: boolean;
}
// Set up Axios defaults for CSRF protection
axios.defaults.withCredentials = true;
const Banner = ({ isCollapsed }: BannerProps) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showContent, setShowContent] = useState(false)
  

  const location = useLocation();
  const userName = location.state?.userName;

  const showData = () => {
    setShowContent(!showContent)
    console.log(userName)
  }
  
  

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await axios.get<UserProfile>(
          `${import.meta.env.VITE_AUTH_SERVICE_URL}api/profile`,
          {
            withCredentials: true,
          }
        );
        setUser(response.data);
      } catch (error) {
        toast.error("Failed to fetch user profile");
        console.error("Error fetching user profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []); 

  if (loading) {
    return (
      <div className={bannerStyles.loadingContainer}>
        Loading your dashboard...
      </div>
    );
  }

  return (
   <div className={`${bannerStyles.theCoverForAll} ${isCollapsed ? bannerStyles.collapsed : ''}`}>
      <div className={bannerStyles.categories}>
        <div className={bannerStyles.welcomeNote}>
          {user && (
            <div className={bannerStyles.details}>
              <img
                src={user.profilePicture}
                alt="Profile"
                className={bannerStyles.profileImg}
              />
              <div className={bannerStyles.userDetails}>
                <h2 className={bannerStyles.name}>{user.nameOfBusiness}</h2>
                <p>Email: {user.emailBusiness}</p>
                <p>Phone: {user.businessPhone}</p>
              </div>
            </div>
          )}
        </div>

        <div className={bannerStyles.actionSection}>
          <div className={bannerStyles.notifications}>
            <a href="https://aselar.netlify.app/" className={bannerStyles.iconButton} title="Aselar Documentation">
              <FaFile color="#FFCC00" size={24}/>
            </a>             
          </div>

          <ScanOnlyModeToggle />

          <div className={`${bannerStyles.calculatorShow} ${bannerStyles.dropdownContainer}`}>
  {showContent && <Calculator onClose={() => setShowContent(false)} />}
  <div className={bannerStyles.iconButton} onClick={showData}>
    <FaCalculator color="blue" size={24}/>
  </div>
</div>

          <div className={bannerStyles.settings}>
            <Link to="/files-uploads" className={bannerStyles.iconButton} title="Go to Files Uploads">
              <FaFileUpload color=" #FFD700" size={24} /> 
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Banner