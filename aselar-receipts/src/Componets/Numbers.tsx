import Brands from "../Componets/Numbers.module.css";
import {
  FaGraduationCap,
  FaShoppingCart,
  FaUtensils,
  FaCar,
  FaHotel,
  FaTruck,
  FaDrumstickBite,     // perfect for butchery
} from "react-icons/fa";
import { IconContext } from "react-icons";

const Numbers = () => {
  return (
    <div className={Brands.overall}>
      <div className={Brands.text}>
        <div className={Brands.images}>
          {/* Schools */}
          <div className={Brands.schools}>
            <IconContext.Provider value={{ className: Brands.schoolIcon }}>
              <FaGraduationCap color="#3b82f6" />
            </IconContext.Provider>
            <h3>Works for schools</h3>
          </div>

          {/* Retail */}
          <div className={Brands.schools}>
            <IconContext.Provider value={{ className: Brands.schoolIcon }}>
              <FaShoppingCart color="#3b82f6" />
            </IconContext.Provider>
            <h3>Works for Retails</h3>
          </div>

          {/* Restaurants */}
          <div className={Brands.schools}>
            <IconContext.Provider value={{ className: Brands.schoolIcon }}>
              <FaUtensils color="#3b82f6" />
            </IconContext.Provider>
            <h3>Works for Restaurants</h3>
          </div>

          {/* Car Rentals */}
          <div className={Brands.schools}>
            <IconContext.Provider value={{ className: Brands.schoolIcon }}>
              <FaCar color="#3b82f6" />
            </IconContext.Provider>
            <h3>Works for Car Rentals</h3>
          </div>

          {/* Hotels */}
          <div className={Brands.schools}>
            <IconContext.Provider value={{ className: Brands.schoolIcon }}>
              <FaHotel color="#3b82f6" />
            </IconContext.Provider>
            <h3>Works for Hotels</h3>
          </div>

          {/* Butcheries */}
          <div className={Brands.schools}>
            <IconContext.Provider value={{ className: Brands.schoolIcon }}>
              <FaDrumstickBite color="#3b82f6" />
            </IconContext.Provider>
            <h3>Works for Butcheries</h3>
          </div>

          {/* Couriers */}
          <div className={Brands.schools}>
            <IconContext.Provider value={{ className: Brands.schoolIcon }}>
              <FaTruck color="#3b82f6" />
            </IconContext.Provider>
            <h3>Works for Couriers</h3>
          </div>

          {/* Colleges */}
          <div className={Brands.schools}>
            <IconContext.Provider value={{ className: Brands.schoolIcon }}>
              <FaGraduationCap color="#3b82f6" />
            </IconContext.Provider>
            <h3>Works for Colleges</h3>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Numbers;