import footer from "../Componets/Footer.module.css";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className={footer.mainFooter}>
      <div className={footer.mainCover}>
        <div className={footer.logoAselar}>
          <h1>
            <span>A</span>selar
        
          </h1>
          <p className={footer.tagline}>Empowering Intelligent Business Systems</p>
        </div>

        <div className={footer.linksSection}>
          <div className={footer.linksFooter}>
            <h4>Company</h4>
            <Link to="/">Home</Link>
            <Link to="/">Events</Link>
            <Link to="/">Promotions</Link>
            <Link to="/">Signup</Link>
          </div>
          <div className={footer.linksFooter}>
            <h4>Careers</h4>
            <Link to="/">Careers</Link>
            <Link to="/">CSR</Link>
            <Link to="/">Talent Acquisition</Link>
            <Link to="/">Work Area</Link>
          </div>
          <div className={footer.linksFooter}>
            <h4>Aselar Ecosystem</h4>
            <Link to="/">Aselar Agents</Link>
            <Link to="/">Aselar Cloud</Link>
            <Link to="/">Aselar Cash</Link>
            <Link to="/">Aselar Delivery</Link>
          </div>
            <div className={footer.linksFooter}>
            <h4>Contact Us</h4>
            <Link to="/">77363956</Link>
            <Link to="/">+27 786 860 477</Link>
            <Link to="/">aselarbw@gmail.com</Link>
            
          </div>
        </div>
      </div>
      <div className={footer.copyRight}>
        <p>© {new Date().getFullYear()} Aselar. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
