import React from "react";

import NavBar from "./NavBar.module.css";

import {
  FaInstagram,
  FaUser,
  FaYoutube,
  FaFacebook,
  FaSignInAlt,
} from "react-icons/fa";

import { Link } from "react-router-dom";

import Aselar from "../assets/Asset 5.png";

import { ShowOnLogout } from "../Protect/protect";


const Nav = () => {

  const socialLinks = [
    {
      name: "Facebook",
      href:
        "https://" +
        "www.facebook.com/profile.php?id=61575532701173",
      icon: <FaFacebook />,
    },
    {
      name: "YouTube",
      href:
        "https://" +
        "youtu.be/HmH7bdCUOhs",
      icon: <FaYoutube />,
    },
    {
      name: "Instagram",
      href:
        "https://" +
        "www.instagram.com/aselar_bw/",
      icon: <FaInstagram />,
    },
  ];


  return (
    <header className={NavBar.wrapper}>

      {/* =====================================================
          LOGO
      ====================================================== */}

      <div className={NavBar.logo}>

        <Link
          to="/"
          aria-label="Aselar home"
          className={NavBar.logoLink}
        >

          <img
            src={Aselar}
            alt="Aselar"
            className={NavBar.aselarLogo}
          />

        </Link>

      </div>


      {/* =====================================================
          RIGHT SIDE
      ====================================================== */}

      <div className={NavBar.navRight}>


        {/* =================================================
            SOCIAL MEDIA
        ================================================== */}

        <div className={NavBar.socialIcons}>

          {socialLinks.map((social) => (

            <a
              key={social.name}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Aselar on ${social.name}`}
              className={NavBar.socialLink}
            >

              {social.icon}

            </a>

          ))}

        </div>


        {/* =================================================
            NAVIGATION ACTIONS
        ================================================== */}

        <div className={NavBar.buttons}>

          <Link
            to="/sign-in"
            className={NavBar.loginButton}
          >

            <FaSignInAlt />

            <span>
              Login
            </span>

          </Link>


          <ShowOnLogout>

            <Link
              to="/get-started"
              className={NavBar.signupButton}
            >

              <FaUser />

              <span>
                Get Started
              </span>

              <span className={NavBar.buttonArrow}>
                →
              </span>

            </Link>

          </ShowOnLogout>

        </div>

      </div>

    </header>
  );
};


export default Nav;