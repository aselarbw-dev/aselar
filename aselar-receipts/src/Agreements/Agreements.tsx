import React, { useState } from "react";
import styles from "./Agreements.module.css"
import { toast } from "react-toastify";
import { Link } from "react-router-dom";

const Agreements: React.FC = () => {
  const [isAgreed, setIsAgreed] = useState(false);

  const handleCheckboxChange = () => {
    setIsAgreed(!isAgreed);
  };

  const handleProceed = () => {
    toast.success("Agreement reached!");
    // Add your logic for proceeding after agreement
  };

  return (
    <div className={styles.container}>
      <div className={styles.agreementBox}>
        <h2>Aselar User Agreement</h2>
        <div className={styles.scrollableContainer}>
          <p>
            Aselar is a digital product built by Technology Extreme Pty (Ltd), a Botswana registered company.
            Herein, Aselar abides by all legalities stipulated by the Constitution of the Republic of Botswana, the Penal Code, and other supporting charters and bodies.
            As a Botswana company, we comply with data protection, data recovery, anti-money laundering laws, and henceforth.
          </p>

          <p>
            Users must comply with all applicable laws of the Republic of Botswana, including digital laws and their amendments, such as the Data Protection Act, 2024 (Chapter 42:17). As stated in the Act's preamble: "An Act to make provision for the continuation of the Information and Data Protection Commission; to regulate the protection of personal data and to ensure that the privacy of individuals in relation to their personal data is maintained; and to provide for all matters incidental thereto." By using Aselar, you agree to process any data in accordance with these laws, including principles of lawfulness, fairness, transparency, purpose limitation, data minimization, accuracy, storage limitation, integrity, confidentiality, and accountability (Sections 19-25).
          </p>

          <p>
            Aselar secures your data with confidentiality in accordance with the laws of Botswana, particularly Section 24 of the Data Protection Act, 2024, which mandates integrity and confidentiality in the processing of personal data. We use strict policies for data protection, recovery, and sensitivity. Information between the user and product is encrypted, and even the developers do not know the profits or business names. Data known to the team is limited to user registered phone number and email, used only for specific emergency cases. Under the Constitution of Botswana, user data or metadata shall not be made public or sold to third parties for commercialization or any marketing benefits that jeopardize the user, organization, and any related parties.
          </p>

          <p>
            There shall be no sale of prohibited or illegal products or services on this platform, including illegal drugs, firearms, unregulated trades, gambling, bets, or sexual products of any type. Violation of this policy will result in immediate removal of your account and reporting to the relevant authorities in accordance with Botswana law.
          </p>

          <p>
            <strong>User Accounts and Responsibilities:</strong> To use Aselar, you must create an account with accurate information. You are responsible for maintaining the confidentiality of your account credentials and for all activities occurring under your account. You agree not to use the platform for any unlawful purpose or in violation of these terms. As a marketplace platform, sellers must accurately describe products, handle customer inquiries promptly, and comply with all applicable consumer protection laws in Botswana.
          </p>

          <p>
            <strong>Intellectual Property:</strong> All content on Aselar, including but not limited to text, graphics, logos, and software, is the property of Technology Extreme Pty (Ltd) or its licensors and is protected by Botswana copyright and intellectual property laws. Users grant Aselar a non-exclusive, royalty-free license to use any user-generated content (e.g., product listings, images) for the purpose of operating and promoting the platform. You agree not to infringe on third-party intellectual property rights.
          </p>

          <p>
            <strong>Payments and Transactions:</strong> All transactions on Aselar are between buyers and sellers directly. Aselar facilitates payments but is not a party to the transaction and does not assume liability for disputes arising from them. Users must comply with Botswana's anti-money laundering regulations. Fees may apply as outlined in the platform's fee schedule, and all payments are processed securely in accordance with local financial laws.
          </p>

          <p>
            <strong>Limitation of Liability:</strong> To the fullest extent permitted by Botswana law, Technology Extreme Pty (Ltd) and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of Aselar, including but not limited to loss of profits, data, or business opportunities. Our total liability shall not exceed the amount paid by you to us in the preceding 12 months.
          </p>

          <p>
            <strong>Dispute Resolution and Governing Law:</strong> These terms are governed by the laws of the Republic of Botswana. Any disputes arising from your use of Aselar shall be resolved through negotiation, and if unsuccessful, through arbitration in Gaborone, Botswana, in accordance with the Arbitration Act of Botswana. You agree to submit to the exclusive jurisdiction of Botswana courts where applicable.
          </p>

          <p>
            <strong>Termination:</strong> Aselar reserves the right to suspend or terminate your account at any time for violation of these terms, with or without notice. Upon termination, your right to use the platform ceases immediately, and you must cease all use of Aselar materials.
          </p>

          <p>
            <strong>Changes to Terms:</strong> We may update these terms from time to time. Continued use of Aselar after changes constitutes acceptance of the new terms. We will notify users of material changes via email or on the platform.
          </p>

          <p>
            <strong>Returns and Refunds:</strong> Return and refund policies are determined by individual sellers, but all must comply with Botswana's Consumer Protection Act. Aselar encourages sellers to provide clear policies and mediate disputes fairly.
          </p>

          {/* Add more terms and conditions here */}
        </div>
        <div className={styles.actions}>
          <label>
            <input
              type="checkbox"
              checked={isAgreed}
              onChange={handleCheckboxChange}
            />
            I agree to the terms and conditions
          </label>
          <Link to="/sign-up">
            <button
              onClick={handleProceed}
              disabled={!isAgreed}
              className={styles.proceedButton}
            >
              Proceed
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Agreements;
