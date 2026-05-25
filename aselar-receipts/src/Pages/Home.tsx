import Nav from "../Componets/Nav"
import Hero from "../Componets/Hero"
import Numbers from "../Componets/Numbers"
//import Value from "../Componets/Value"
//import Product from "../Componets/Product"
//import Aside from "../Componets/Aside"
//import Promotions from "../Componets/Promotions"
//import Carousel from "../Slider/Carousel"
//import NewsCarousel from "../Carousel/NewsCarousel"
//import Pricing from "../Pricing/Pricing"
import CustomerEngagement from "../Componets/CustomerEngangement"
import Overlay from "../Componets/Overlay"

import Footer from "../Componets/Footer"
const Home = () => {
  return (
    <div>
  <Nav/>
   <Hero/>
   <CustomerEngagement/>
    <Numbers/>
    {/* <Pricing/>*/}
 
   
  
   <Overlay/>
   
  
   
    

  

     <Footer/>

    </div>
  )
}

export default Home