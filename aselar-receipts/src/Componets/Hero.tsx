import React, { useState, useEffect } from "react";
import Truck from "../assets/tractor-385681_1280.jpg";
import Food from "../assets/cranes-7921948_1280.jpg";
import Launch from "../assets/barber-shop-6797761_1280.jpg";
import Paper from "../assets/supermarket-5202138_1280.jpg";
import Building from "../assets/building-4803602_1280.jpg";
import Herostyles from "./Hero.module.css";
import {  FaFacebook, FaYoutube, FaInstagram, FaPlay, FaArrowRight } from "react-icons/fa";
import { MdManageAccounts, MdSpeed, MdSecurity, MdPsychology } from "react-icons/md";
import { Link } from "react-router-dom";
import VideoModal from '../Video/VideoModal'
import AselarVideo from '../assets/aselarmedia.mp4'
const Hero: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  
  const images = [Building, Truck, Food, Launch, Paper];
  const businessTypes = [
    { image: Launch, title: "Manufacturing", description: "Automotive Solutions" },
    { image: Truck, title: "Agriculture", description: "Farm Management" },
    { image: Food, title: "Construction", description: "Project Tracking" },
    { image: Paper, title: "Retail", description: "Inventory Control" }
  ];

  const features = [
    { icon: <MdSpeed />, text: "AI-Powered Automation" },
    { icon: <MdSecurity />, text: "Enterprise Security" },
    { icon: <MdPsychology />, text: "Smart Processing" }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [images.length]);

  useEffect(() => {
    const featureInterval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(featureInterval);
  }, []);

  const handleIndicatorClick = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <>
      <div className={Herostyles.hero}>
        {/* Animated Background */}
        <div className={Herostyles.backgroundOverlay}></div>
        <div className={Herostyles.animatedShapes}>
          <div className={Herostyles.shape1}></div>
          <div className={Herostyles.shape2}></div>
          <div className={Herostyles.shape3}></div>
        </div>

        <div className={Herostyles.container}>
          {/* Social Icons */}
          <div className={Herostyles.socialIcons}>
            <div className={Herostyles.iconWrapper}>
             
              <a href="https://www.facebook.com/profile.php?id=61575532701173" target="_blank" rel="noopener noreferrer">
               <FaFacebook  color="white"/>
              </a>
        
            </div>
            <div className={Herostyles.iconWrapper}>
               <a href="https://youtu.be/HmH7bdCUOhs" target="_blank" rel="noopener noreferrer">
               <FaYoutube  color="white"/>
              </a>
              
            </div>
            <div className={Herostyles.iconWrapper}>
              <a href='https://www.instagram.com/aselar_bw/'>
<FaInstagram />
              </a>
              
            </div>
          </div>

          {/* Main Content */}
          <div className={Herostyles.content}>
            {/* Left Column */}
            <div className={Herostyles.textContent}>
              {/* Badge */}
              <div className={Herostyles.badge}>
                <div className={Herostyles.badgeDot}></div>
                Autonomy. Self-assisting. AI Powered.
              </div>

              
              <div className={Herostyles.headlines}>
                <h3 className={Herostyles.finalTitle}>
               Run  <span className={Herostyles.highlightBlue}>Your</span> Business The Smarter Way.
                </h3>
              </div>

              {/* Description */}
              <p className={Herostyles.description}>
               Aselar is a browser based business intelligent system that helps you run business smoothly.
              </p>
                <p className={Herostyles.description}>
It replaces your traditional POS,you dont need a scanner,printer,tonner or monitor.Everything can be sold using a mobile phone,tablet or laptop.
              </p>
              {/* Features List */}
              <div className={Herostyles.featuresList}>
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className={`${Herostyles.featureItem} ${
                      currentFeature === index ? Herostyles.active : ""
                    }`}
                  >
                    <div className={Herostyles.featureIcon}>
                      {feature.icon}
                    </div>
                    <span className={Herostyles.featureText}>
                      {feature.text}
                    </span>
                    {currentFeature === index && (
                      <div className={Herostyles.checkmark}>✓</div>
                    )}
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className={Herostyles.ctaButtons}>
                <button 
                  className={Herostyles.primaryButton}
                  onClick={() => setIsVideoPlaying(true)}
                >
                  <FaPlay />
                  Watch Aselar
                  <FaArrowRight className={Herostyles.buttonArrow} />
                </button>
                <VideoModal isOpen={isVideoPlaying} 
                src={AselarVideo}
                onClose={() => setIsVideoPlaying(false)}
                 />
                
                  
                <Link to="/sign-in"  rel="preload">
                  <button className={Herostyles.secondaryButton}>
                    Login
                    <MdManageAccounts />
                  </button>
                </Link>
              </div>

              {/* Stats */}
              <div className={Herostyles.stats}>
                <div className={Herostyles.statItem}>
                  <div className={Herostyles.statNumber}>300+</div>
                  <div className={Herostyles.statLabel}>Businesses</div>
                </div>
                <div className={Herostyles.statItem}>
                  <div className={Herostyles.statNumber}>99.9%</div>
                  <div className={Herostyles.statLabel}>Uptime</div>
                </div>
                <div className={Herostyles.statItem}>
                  <div className={Herostyles.statNumber}>24/7</div>
                  <div className={Herostyles.statLabel}>Support</div>
                </div>
              </div>
            </div>

            {/* Right Column - Business Cards */}
            <div className={Herostyles.visualContent}>
              <div className={Herostyles.businessGrid}>
                {businessTypes.map((business, index) => (
                  <div
                    key={index}
                    className={`${Herostyles.businessCard} ${
                      index === 0 ? Herostyles.featured : ""
                    }`}
                    style={{ backgroundImage: `url(${business.image})` }}
                  >
                    <div className={Herostyles.cardOverlay}></div>
                    <div className={Herostyles.cardContent}>
                      <h3 className={Herostyles.cardTitle}>{business.title}</h3>
                      <p className={Herostyles.cardDescription}>{business.description}</p>
                      {index === 0 && (
                        <div className={Herostyles.processingIndicator}>
                          <div className={Herostyles.processingDot}></div>
                          Active Processing
                          <div className={Herostyles.progressBar}>
                            <div className={Herostyles.progress}></div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className={Herostyles.cardArrow}>
                      <FaArrowRight />
                    </div>
                  </div>
                ))}
              </div>

              {/* Floating AI Card */}
              <div className={Herostyles.floatingCard}>
                <div className={Herostyles.floatingCardIcon}>
                  <MdPsychology />
                </div>
                <div className={Herostyles.floatingCardContent}>
                  <div className={Herostyles.floatingCardTitle}>AI Processing</div>
                  <div className={Herostyles.floatingCardSubtitle}>Real-time analysis</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Background Indicators */}
        <div className={Herostyles.indicators}>
          {images.map((_, index) => (
            <div
              key={index}
              className={`${Herostyles.indicator} ${
                index === currentIndex ? Herostyles.activeIndicator : ""
              }`}
              onClick={() => handleIndicatorClick(index)}
            ></div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Hero;