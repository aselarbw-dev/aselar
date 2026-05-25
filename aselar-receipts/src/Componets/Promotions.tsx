import promoStyles from "../Componets/Promotions.module.css"
import { FaUser } from "react-icons/fa";
import promoPic from "../assets/concert-4125832_1280.jpg"
import {Link} from "react-router-dom"
const Promotions = () => {
  return (
    <div className={promoStyles.promo}>
        <div className={promoStyles.coverage}>
         <h1>Bring yoour products and services here in a fun way.</h1>
         <p>Aselar business promotions and events allows 
            you to reach a wide range of customers virtually.
            Aselar business promotions and events allows 
            you to reach a wide range of customers virtually.
            Aselar business promotions and events allows 
            you to reach a wide range of customers virtually.
            
            </p>
           <Link to="/"><button className={promoStyles.button}>Signup to start<FaUser/></button></Link> 
        </div>
      <div className={promoStyles.imagePromo}>
              <img src={promoPic} alt="promo-pic" />
      </div>
        </div>
  )
}

export default Promotions