import React, { useEffect, useState } from "react";

import Herostyles from "./Hero.module.css";

import {
  FaPlay,
  FaArrowRight,
} from "react-icons/fa";

import {
  MdManageAccounts,
  MdSpeed,
  MdSecurity,
  MdPsychology,
  MdInventory2,
  MdPointOfSale,
  MdAnalytics,
  MdPhoneIphone,
  MdTrendingUp,
  MdReceiptLong,
  MdQrCode2,
  MdAutoAwesome,
} from "react-icons/md";

import { Link } from "react-router-dom";

import VideoModal from "../Video/VideoModal";
import AselarVideo from "../assets/aselarmedia.mp4";


const Hero: React.FC = () => {
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const features = [
    {
      icon: <MdSpeed />,
      text: "AI-Powered Automation",
    },
    {
      icon: <MdSecurity />,
      text: "Enterprise Security",
    },
    {
      icon: <MdPsychology />,
      text: "Smart Processing",
    },
  ];

  useEffect(() => {
    const featureInterval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);

    return () => clearInterval(featureInterval);
  }, [features.length]);

  return (
    <div className={Herostyles.hero}>

      {/* Background */}
      <div className={Herostyles.backgroundOverlay}></div>

      <div className={Herostyles.animatedShapes}>
        <div className={Herostyles.shape1}></div>
        <div className={Herostyles.shape2}></div>
        <div className={Herostyles.shape3}></div>
      </div>


      <div className={Herostyles.container}>

        <div className={Herostyles.content}>

          {/* =====================================================
              LEFT CONTENT
          ====================================================== */}

          <div className={Herostyles.textContent}>

            {/* Badge */}
            <div className={Herostyles.badge}>
              <div className={Herostyles.badgeDot}></div>

              Autonomy. Self-assisting. AI Powered.
            </div>


            {/* Heading */}
            <div className={Herostyles.headlines}>

              <h3 className={Herostyles.finalTitle}>
                Run{" "}
                <span className={Herostyles.highlightBlue}>
                  Your
                </span>{" "}
                Business The Smarter Way.
              </h3>

            </div>


            {/* Description */}
            <p className={Herostyles.description}>
              Aselar is a browser-based business intelligent
              system that helps you run your business smoothly.
            </p>

            <p className={Herostyles.description}>
              Replace your traditional POS. No scanner, printer,
              toner or monitor required. Sell directly from your
              phone, tablet or laptop.
            </p>


            {/* =================================================
                FEATURES
            ================================================== */}

            <div className={Herostyles.featuresList}>

              {features.map((feature, index) => (

                <div
                  key={index}
                  className={`${Herostyles.featureItem} ${
                    currentFeature === index
                      ? Herostyles.active
                      : ""
                  }`}
                >

                  <div className={Herostyles.featureIcon}>
                    {feature.icon}
                  </div>

                  <span className={Herostyles.featureText}>
                    {feature.text}
                  </span>

                  {currentFeature === index && (
                    <div className={Herostyles.checkmark}>
                      ✓
                    </div>
                  )}

                </div>

              ))}

            </div>


            {/* =================================================
                CTA BUTTONS
            ================================================== */}

            <div className={Herostyles.ctaButtons}>

              <button
                className={Herostyles.primaryButton}
                onClick={() => setIsVideoPlaying(true)}
              >

                <FaPlay />

                Watch Aselar

                <FaArrowRight
                  className={Herostyles.buttonArrow}
                />

              </button>


              <VideoModal
                isOpen={isVideoPlaying}
                src={AselarVideo}
                onClose={() => setIsVideoPlaying(false)}
              />


              <Link
                to="/sign-in"
                className={Herostyles.secondaryButton}
              >

                Login

                <MdManageAccounts />

              </Link>

            </div>


            {/* =================================================
                STATS
            ================================================== */}

            <div className={Herostyles.stats}>

              <div className={Herostyles.statItem}>

                <div className={Herostyles.statNumber}>
                  300+
                </div>

                <div className={Herostyles.statLabel}>
                  Businesses
                </div>

              </div>


              <div className={Herostyles.statItem}>

                <div className={Herostyles.statNumber}>
                  99.9%
                </div>

                <div className={Herostyles.statLabel}>
                  Uptime
                </div>

              </div>


              <div className={Herostyles.statItem}>

                <div className={Herostyles.statNumber}>
                  24/7
                </div>

                <div className={Herostyles.statLabel}>
                  Support
                </div>

              </div>

            </div>

          </div>


          {/* =====================================================
              RIGHT SIDE — ASELaR SOFTWARE VISUAL
          ====================================================== */}

          <div className={Herostyles.visualContent}>

            <div className={Herostyles.dashboardVisual}>


              {/* ===============================================
                  DASHBOARD HEADER
              ================================================ */}

              <div className={Herostyles.dashboardHeader}>

                <div className={Herostyles.dashboardBrand}>

                  <div className={Herostyles.dashboardLogo}>
                    A
                  </div>

                  <div>
                    <div className={Herostyles.dashboardTitle}>
                      Aselar
                    </div>

                    <div className={Herostyles.dashboardSubtitle}>
                      Business Intelligence
                    </div>
                  </div>

                </div>


                <div className={Herostyles.liveStatus}>

                  <span className={Herostyles.liveDot}></span>

                  Live

                </div>

              </div>


              {/* ===============================================
                  DASHBOARD BODY
              ================================================ */}

              <div className={Herostyles.dashboardBody}>


                {/* Main analytics panel */}

                <div className={Herostyles.analyticsPanel}>

                  <div className={Herostyles.panelTop}>

                    <div>

                      <span className={Herostyles.panelLabel}>
                        Today's Sales
                      </span>

                      <strong className={Herostyles.salesAmount}>
                        P12,840
                      </strong>

                    </div>


                    <div className={Herostyles.growthBadge}>

                      <MdTrendingUp />

                      +18.4%

                    </div>

                  </div>


                  {/* SVG Chart */}

                  <div className={Herostyles.chartContainer}>

                    <svg
                      className={Herostyles.salesChart}
                      viewBox="0 0 500 180"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >

                      {/* Grid */}

                      <line
                        x1="0"
                        y1="35"
                        x2="500"
                        y2="35"
                        className={Herostyles.chartGrid}
                      />

                      <line
                        x1="0"
                        y1="85"
                        x2="500"
                        y2="85"
                        className={Herostyles.chartGrid}
                      />

                      <line
                        x1="0"
                        y1="135"
                        x2="500"
                        y2="135"
                        className={Herostyles.chartGrid}
                      />


                      {/* Area */}

                      <path
                        d="
                          M0 145
                          C40 140 55 115 90 120
                          C125 125 135 80 170 95
                          C205 110 220 65 255 75
                          C290 85 300 100 335 70
                          C370 40 390 60 420 45
                          C450 30 470 42 500 15
                          L500 180
                          L0 180
                          Z
                        "
                        className={Herostyles.chartArea}
                      />


                      {/* Line */}

                      <path
                        d="
                          M0 145
                          C40 140 55 115 90 120
                          C125 125 135 80 170 95
                          C205 110 220 65 255 75
                          C290 85 300 100 335 70
                          C370 40 390 60 420 45
                          C450 30 470 42 500 15
                        "
                        className={Herostyles.chartLine}
                      />

                    </svg>

                  </div>

                </div>


                {/* =============================================
                    QUICK STATS
                ============================================== */}

                <div className={Herostyles.quickStats}>


                  <div className={Herostyles.quickCard}>

                    <div className={Herostyles.quickIcon}>
                      <MdPointOfSale />
                    </div>

                    <div>

                      <span>
                        Transactions
                      </span>

                      <strong>
                        248
                      </strong>

                    </div>

                  </div>


                  <div className={Herostyles.quickCard}>

                    <div className={Herostyles.quickIcon}>
                      <MdInventory2 />
                    </div>

                    <div>

                      <span>
                        Stock Items
                      </span>

                      <strong>
                        1,842
                      </strong>

                    </div>

                  </div>


                  <div className={Herostyles.quickCard}>

                    <div className={Herostyles.quickIcon}>
                      <MdAnalytics />
                    </div>

                    <div>

                      <span>
                        Revenue
                      </span>

                      <strong>
                        +24%
                      </strong>

                    </div>

                  </div>


                </div>


                {/* =============================================
                    RECENT BUSINESS ACTIVITY
                ============================================== */}

                <div className={Herostyles.activityPanel}>

                  <div className={Herostyles.activityHeader}>

                    <span>
                      Recent Activity
                    </span>

                    <span className={Herostyles.viewAll}>
                      View all
                    </span>

                  </div>


                  <div className={Herostyles.activityRow}>

                    <div className={Herostyles.activityIcon}>
                      <MdReceiptLong />
                    </div>

                    <div className={Herostyles.activityInfo}>

                      <strong>
                        Sale completed
                      </strong>

                      <span>
                        Receipt #AS-2048
                      </span>

                    </div>

                    <strong className={Herostyles.activityAmount}>
                      +P850
                    </strong>

                  </div>


                  <div className={Herostyles.activityRow}>

                    <div className={Herostyles.activityIcon}>
                      <MdInventory2 />
                    </div>

                    <div className={Herostyles.activityInfo}>

                      <strong>
                        Stock updated
                      </strong>

                      <span>
                        24 products updated
                      </span>

                    </div>

                    <span className={Herostyles.activityTime}>
                      2m
                    </span>

                  </div>


                  <div className={Herostyles.activityRow}>

                    <div className={Herostyles.activityIcon}>
                      <MdQrCode2 />
                    </div>

                    <div className={Herostyles.activityInfo}>

                      <strong>
                        Digital receipt
                      </strong>

                      <span>
                        Sent to customer
                      </span>

                    </div>

                    <span className={Herostyles.activityTime}>
                      5m
                    </span>

                  </div>

                </div>

              </div>


              {/* ===============================================
                  FLOATING MOBILE DEVICE
              ================================================ */}

              <div className={Herostyles.mobilePreview}>

                <div className={Herostyles.mobileTop}>

                  <span>
                    Aselar POS
                  </span>

                  <MdPhoneIphone />

                </div>


                <div className={Herostyles.mobileScreen}>

                  <div className={Herostyles.mobileAmount}>
                    P2,450
                  </div>

                  <span>
                    Today's Sales
                  </span>


                  <div className={Herostyles.mobileProgress}>

                    <div
                      className={Herostyles.mobileProgressFill}
                    ></div>

                  </div>


                  <div className={Herostyles.mobileItems}>

                    <div>
                      <MdPointOfSale />
                      Sales
                    </div>

                    <div>
                      <MdInventory2 />
                      Stock
                    </div>

                    <div>
                      <MdAnalytics />
                      Reports
                    </div>

                  </div>

                </div>

              </div>


              {/* ===============================================
                  FLOATING AI CARD
              ================================================ */}

              <div className={Herostyles.floatingCard}>

                <div className={Herostyles.floatingCardIcon}>
                  <MdAutoAwesome />
                </div>

                <div className={Herostyles.floatingCardContent}>

                  <div className={Herostyles.floatingCardTitle}>
                    AI Assistant
                  </div>

                  <div className={Herostyles.floatingCardSubtitle}>
                    Analysing your business
                  </div>

                </div>

                <div className={Herostyles.aiPulse}></div>

              </div>


            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default Hero;