import NavBar from './NavBar.module.css'
import { FaUser}from "react-icons/fa";
import {Link} from "react-router-dom"
import Aselar from "../assets/Asset 5.png"
import { ShowOnLogout } from "../Protect/protect";
//import aselar from "../assets/ASELAR LOGO WHITE BACKGROUND.png"
const Nav = () => {
  return (
  
        <div className={NavBar.wrapper}>
            <div className={NavBar.logo}>
          {/* <img src={aselar} alt="aselar-logo" className={NavBar.aselarLogo}/> */}
                <img src={Aselar} alt="aselar logo" />
           {/*<h1 className={NavBar.aselar}><span>A</span>selar</h1> */} 
               
            </div>
          {/*   <ul className={NavBar.lists}>
           
            <ShowOnLogout>
             <Link to="/"  rel="preload"><li>Home</li>  </Link>    
             </ShowOnLogout>
           
             
                </ul>*/}
         
      
              
          
            <div className={NavBar.buttons}>
              
                            <ShowOnLogout>
                    <Link to="/get-started"  rel="preload"> <button className={NavBar.signupButton}><FaUser /> Get Started </button></Link> 
                               </ShowOnLogout>
                               {/* <Link to="/all-search"> <button className={NavBar.searchBusiness}><FaSearch/> Businesses </button></Link> */}
                   
                   
                                     
            </div>
        </div>

  )
}

export default Nav 