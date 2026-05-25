import asideStyles from "../Componets/Aside.module.css"
import { FaCheckCircle } from "react-icons/fa";
import Printer from "../assets/cash-register-5610295_1280.jpg"
const Aside = () => {
  return (
    <div className={asideStyles.aside}>
        <div className={asideStyles.asideText}>
           <h1>Benefits of E-Receipts</h1>
           <h3><span><FaCheckCircle/></span>Easily traceable and less monotony.</h3>
           <h3><span><FaCheckCircle/></span>Saving costs on tonner and repair maintenance.</h3>
           <h3><span><FaCheckCircle/></span>Organized and easy to use when requested</h3>
           <h3><span><FaCheckCircle/></span>Contactless and safe in pandemics</h3>
           <h3><span><FaCheckCircle/></span>Flexible to use accross all devices.</h3>
         
        </div>
        <div className={asideStyles.image}>
                          <img src={Printer} alt="printer" />
        </div>
        </div>
  )
}

export default Aside