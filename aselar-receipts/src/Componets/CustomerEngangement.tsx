import Mobile from "../assets/undraw_maintenance_4unj.png";
import Business from "../assets/undraw_my-files_1xwx (1).png";
import Server from "../assets/undraw_download_sa8g.png";
import { FaCheckCircle } from "react-icons/fa";
import { motion, Variants } from "framer-motion";
import styles from "./CustomerEngangement.module.css";

const CustomerEngagement = () => {
  // ── Separate benefit lists for each card ──
  const customerBenefits = [
    "Better user experience",
    "Easily traceable and less monotony",
    "You can revisit the URL and always access your statements and redownload",
    "Efficient – cannot lose information"
  ];

  const efficiencyBenefits = [
    "Bringing business security – everything is locked",
    "Digital receipts offer convenience",
    "Cost effective – no need for printer, toner or paper",
    "Less office confusion, waste or paper clutter as everything is digital"
  ];

  const competitiveBenefits = [
    "Secure storage for all documents",
    "All documents stored under one platform",
    "Reduction in carbon footprint",
    "Multi-channel document sharing"
  ];

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 50 },
    visible: ({ custom }: { custom: number }) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: custom * 0.2,
        duration: 0.6
      }
    }),
    hover: { scale: 1.02, transition: { duration: 0.3 } }
  };

  const listItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (customDelay: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: customDelay }
    })
  };

  // Card configuration with title + dedicated benefits list
  const cards = [
    { img: Mobile, title: "Customer Access", benefits: customerBenefits },
    { img: Business, title: "Business Efficiency", benefits: efficiencyBenefits },
    { img: Server, title: "Competitive Edge", benefits: competitiveBenefits }
  ];

  return (
    <div className={styles.container}>
      <motion.h2
        className={styles.heading}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        Digital POS with paperless receipts
      </motion.h2>

      <motion.p
        className={styles.subheading}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        Say goodbye to clutter and faded receipt papers. Aselar instantly sends receipts, quotations, invoices, payslips, debt notices via text message, complete with a secure PDF download link.
        Your customers can access their receipts or documents anytime, anywhere whilst it saves you the POS costs that inconvenience you.
      </motion.p>

      <motion.p
        className={styles.subheading}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        You don’t need thousands of Pula for a traditional POS. With Aselar, everything runs seamlessly on a tablet, mobile phone, or laptop. Say goodbye to printer maintenance, toner, and stationery costs. All your documents are securely stored in the cloud—ready for instant download whenever tax authorities, credit facilitators or auditors need them.
      </motion.p>

      <div className={styles.cardContainer}>
        {cards.map((card, index) => (
          <motion.div
            key={index}
            className={styles.card}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={index}
            whileHover="hover"
          >
            <img src={card.img} alt={`${card.title} benefits`} className={styles.cardImage} />
            <div className={styles.cardContent}>
              <h4 className={styles.cardTitle}>{card.title}</h4>
              <ul className={styles.benefitsList}>
                {card.benefits.map((benefit, i) => (
                  <motion.li
                    key={i}
                    className={styles.benefitItem}
                    variants={listItemVariants}
                    initial="hidden"
                    animate="visible"
                    custom={(index + 1) * 0.2 + i * 0.1}
                  >
                    <FaCheckCircle className={styles.checkIcon} />
                    <span>{benefit}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CustomerEngagement;