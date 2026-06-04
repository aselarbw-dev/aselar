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
  };

  return (
    <div className={styles.container}>
      <div className={styles.agreementBox}>
        <h2>Aselar User Agreement</h2>
        <div className={styles.scrollableContainer}>

          <h3>1. About Aselar</h3>
          <p>
            Aselar is a digital product built and operated by TeX-Technology Extreme Pty (Ltd), a company duly registered
            under the laws of the Republic of Botswana. Aselar operates in full compliance with the Constitution of the
            Republic of Botswana, the Penal Code (Cap. 08:01), the Companies Act (Cap. 42:01), and all relevant subsidiary
            legislation, charters, and regulatory frameworks applicable within Botswana.
          </p>

          <h3>2. Data Privacy and Protection — Our Commitment to You</h3>
          <p>
            At TeX-Technology Extreme Pty (Ltd), your privacy is not a feature — it is a foundation. The security,
            confidentiality, and integrity of your personal data is our highest operational priority. We do not sell,
            trade, lease, or in any way commercialise your personal data to third parties. No advertiser, partner,
            or external organisation has access to your data. Your information belongs to you.
          </p>
          <p>
            Aselar's data practices are governed by and fully compliant with the <strong>Data Protection Act, 2024
            (Chapter 42:17)</strong> of Botswana. As stated in the Act's preamble, its purpose is <em>"to regulate
            the protection of personal data and to ensure that the privacy of individuals in relation to their
            personal data is maintained."</em> We take this mandate seriously and have architected our systems to
            uphold it without compromise.
          </p>
          <p>
            In accordance with <strong>Sections 19–25 of the Data Protection Act, 2024</strong>, Aselar processes
            all personal data under the following binding principles:
          </p>
          <ul>
            <li><strong>Lawfulness, Fairness, and Transparency (s.19):</strong> We process your data only where
            we have a lawful basis to do so, and we are transparent about how and why your data is used.</li>
            <li><strong>Purpose Limitation (s.20):</strong> Data collected is used solely for the purpose for
            which it was collected — operating your Aselar account and providing platform services. It will
            not be repurposed without your explicit consent.</li>
            <li><strong>Data Minimisation (s.21):</strong> We collect only what is strictly necessary. Aselar
            does not harvest excessive personal information.</li>
            <li><strong>Accuracy (s.22):</strong> We take reasonable steps to ensure that your data is accurate
            and kept up to date.</li>
            <li><strong>Storage Limitation (s.23):</strong> Your personal data is retained only for as long as
            is necessary to fulfil the purposes for which it was collected, after which it is securely deleted
            or anonymised.</li>
            <li><strong>Integrity and Confidentiality (s.24):</strong> All data is processed with appropriate
            technical and organisational security measures to protect against unauthorised or unlawful processing,
            accidental loss, destruction, or damage.</li>
            <li><strong>Accountability (s.25):</strong> TeX-Technology Extreme Pty (Ltd) is fully accountable
            for compliance with these principles and maintains internal records to demonstrate such compliance.</li>
          </ul>
          <p>
            Furthermore, under <strong>Section 43 of the Data Protection Act, 2024</strong>, you — as a data
            subject — hold the following rights, which Aselar unconditionally respects:
          </p>
          <ul>
            <li>The right to be informed about how your data is being processed.</li>
            <li>The right to access your personal data held by Aselar at any time.</li>
            <li>The right to request correction of inaccurate or incomplete data.</li>
            <li>The right to request erasure of your data where it is no longer necessary.</li>
            <li>The right to object to or restrict certain types of processing.</li>
            <li>The right to data portability where technically feasible.</li>
          </ul>
          <p>
            To exercise any of these rights, contact us directly. We are obligated under Botswana law to respond
            within a reasonable and lawful timeframe.
          </p>

          <h3>3. What Data We Collect and Why</h3>
          <p>
            Aselar collects the minimum data required to operate your account securely. This includes your
            registered phone number and email address. These are used exclusively for account authentication,
            critical security alerts, and emergency communications. Even internally, access to this information
            is strictly limited — our developers do not have access to your business names, transaction details,
            or revenue figures. Your business data is yours alone.
          </p>
          <p>
            All data transmitted between you and the Aselar platform is encrypted in transit and at rest using
            industry-standard protocols. No plaintext sensitive data is stored on our servers.
          </p>

          <h3>4. No Sale or Disclosure of Personal Data</h3>
          <p>
            Under <strong>Section 31 of the Data Protection Act, 2024</strong>, personal data shall not be disclosed
            to third parties without the explicit and informed consent of the data subject, except where required by
            law or a court order. Aselar strictly adheres to this provision. We will never sell, rent, or transfer
            your personal data to any third party for commercial, marketing, or advertising purposes — under
            any circumstances.
          </p>
          <p>
            Additionally, <strong>Section 72 of the Act</strong> provides that any person who unlawfully discloses
            personal data commits an offence and is liable to prosecution. TeX-Technology Extreme Pty (Ltd) enforces
            this standard internally and holds all staff, contractors, and systems to the same obligation.
          </p>

          <h3>5. Cross-Border Data Transfers</h3>
          <p>
            Where data is processed or stored outside the borders of Botswana — for example, on cloud infrastructure —
            such transfers are conducted in full compliance with <strong>Part VII of the Data Protection Act, 2024</strong>,
            which governs transborder data flows. We ensure that any recipient jurisdiction or organisation offers an
            adequate level of data protection equivalent to that required under Botswana law.
          </p>

          <h3>6. Cybercrime and Digital Security Obligations</h3>
          <p>
            Users of Aselar are subject to the <strong>Cybercrime and Computer Related Crimes Act, 2007 (Cap. 26:05)</strong>
            of Botswana. This Act criminalises unauthorised access to computer systems, data interception, system
            interference, and computer fraud. Any attempt to breach, manipulate, intercept, or exploit Aselar's
            systems, data, or infrastructure constitutes a criminal offence under this Act and will be reported
            to the Botswana Police Service and relevant cybercrime authorities without hesitation.
          </p>

          <h3>7. Prohibition of Illegal Conduct</h3>
          <p>
            By accessing and using Aselar, you irrevocably agree that you will not use this platform — directly
            or indirectly — for any unlawful, fraudulent, or prohibited activity. The following are expressly
            forbidden on Aselar:
          </p>
          <ul>
            <li>Sale or facilitation of illegal drugs, controlled substances, or unregistered pharmaceuticals.</li>
            <li>Unlicensed trade of firearms, ammunition, or weapons of any kind.</li>
            <li>Gambling, betting, or operating any game of chance without lawful authorisation under Botswana law.</li>
            <li>Sale or distribution of sexually explicit or adult material of any nature.</li>
            <li>Unregulated financial services, pyramid schemes, or any activity contravening the
            <strong>Non-Bank Financial Institutions Regulatory Authority Act (NBFIRA Act, 2006)</strong>.</li>
            <li>Money laundering, terrorist financing, or any activity prohibited under the
            <strong>Financial Intelligence Act, 2022</strong> and the <strong>Proceeds of Serious Crime Act
            (Cap. 08:05)</strong> of Botswana.</li>
            <li>Fraud, misrepresentation, or deceptive trade practices contrary to the
            <strong>Consumer Protection Act, 2018 (Cap. 42:10)</strong>.</li>
            <li>Any conduct that violates the <strong>Penal Code (Cap. 08:01)</strong> of Botswana.</li>
          </ul>
          <p>
            Violation of any of the above will result in immediate and permanent account termination, full
            cooperation with law enforcement authorities, and civil or criminal proceedings where applicable.
            TeX-Technology Extreme Pty (Ltd) shall bear no liability whatsoever for any illegal activity
            conducted by users on this platform.
          </p>

          <h3>8. Anti-Money Laundering (AML) Compliance</h3>
          <p>
            Aselar operates in compliance with Botswana's <strong>Financial Intelligence Act, 2022</strong> and
            the <strong>Proceeds of Serious Crime Act (Cap. 08:05)</strong>. All transactions conducted through
            Aselar must represent legitimate commerce. Users are prohibited from using Aselar to conceal, transfer,
            or disguise proceeds of any criminal activity. We reserve the right to flag, freeze, and report
            suspicious transactions to the <strong>Financial Intelligence Agency (FIA)</strong> of Botswana as
            required by law.
          </p>

          <h3>9. User Accounts and Responsibilities</h3>
          <p>
            To use Aselar, you must create an account using accurate, truthful, and current information.
            You are solely responsible for maintaining the confidentiality of your login credentials and for
            all activity that occurs under your account. You agree to notify Aselar immediately upon becoming
            aware of any unauthorised access or security breach. Sellers on the platform must accurately
            represent their products and services, respond to customer inquiries in good faith, and comply
            with all applicable consumer protection laws under the <strong>Consumer Protection Act, 2018</strong>.
          </p>

          <h3>10. Intellectual Property</h3>
          <p>
            All content on Aselar — including but not limited to software, source code, graphics, logos, brand
            identity, text, and interfaces — is the exclusive intellectual property of TeX-Technology Extreme Pty (Ltd)
            or its licensors, and is protected under Botswana's <strong>Copyright and Neighbouring Rights Act
            (Cap. 68:02)</strong> and the <strong>Industrial Property Act (Cap. 68:03)</strong>. Unauthorised
            reproduction, distribution, or commercial exploitation of any Aselar content is strictly prohibited
            and constitutes grounds for legal action.
          </p>
          <p>
            Users grant TeX-Technology Extreme Pty (Ltd) a non-exclusive, royalty-free, limited licence to use
            user-generated content (such as product listings and images) solely for the purpose of operating
            and displaying platform services. You represent that you hold all necessary rights to any content
            you upload.
          </p>

          <h3>11. Payments and Financial Transactions</h3>
          <p>
            All transactions on Aselar occur directly between buyers and sellers. Aselar facilitates the
            payment process but is not a party to any transaction and assumes no liability for transactional
            disputes. All payments are processed securely in compliance with applicable Botswana financial
            regulations. Users must ensure all transactions represent legitimate commercial exchange.
            Platform fees, where applicable, are disclosed in the fee schedule accessible on the platform.
          </p>

          <h3>12. Limitation of Liability</h3>
          <p>
            To the fullest extent permitted under the laws of Botswana, TeX-Technology Extreme Pty (Ltd) and
            its directors, employees, agents, and affiliates shall not be liable for any indirect, incidental,
            consequential, special, or punitive damages arising from your use of — or inability to use — the
            Aselar platform. This includes, without limitation, loss of profits, loss of data, reputational
            damage, or loss of business opportunity. Our aggregate liability shall not exceed the total amount
            paid by you to TeX-Technology Extreme Pty (Ltd) in the twelve (12) months preceding the incident.
            TeX-Technology Extreme Pty (Ltd) accepts no liability for any loss arising from illegal conduct
            by any user of the platform.
          </p>

          <h3>13. Dispute Resolution and Governing Law</h3>
          <p>
            These Terms and Conditions are governed by, and shall be construed in accordance with, the laws
            of the Republic of Botswana. Any dispute arising out of or in connection with your use of Aselar
            shall first be subject to good-faith negotiation between the parties. If unresolved within thirty
            (30) days, the dispute shall be referred to binding arbitration in Gaborone, Botswana, in
            accordance with the <strong>Arbitration Act (Cap. 06:07)</strong> of Botswana. The parties
            irrevocably submit to the exclusive jurisdiction of the courts of Botswana for any matter not
            resolved through arbitration.
          </p>

          <h3>14. Returns and Refunds</h3>
          <p>
            Return and refund policies are set by individual sellers on the platform. However, all sellers
            are bound to operate in compliance with the <strong>Consumer Protection Act, 2018 (Cap. 42:10)</strong>
            of Botswana, which affords consumers the right to fair, honest, and transparent trade. Aselar
            encourages clear and accessible refund policies and will mediate disputes in good faith where requested.
          </p>

          <h3>15. Termination</h3>
          <p>
            Aselar reserves the right to suspend, restrict, or permanently terminate your account at its sole
            discretion, with or without notice, for any breach of these Terms, violation of Botswana law, or
            conduct deemed harmful to the platform, its users, or the public. Upon termination, your right to
            access or use Aselar ceases immediately. Data deletion following termination will be conducted in
            accordance with our data retention obligations under the <strong>Data Protection Act, 2024</strong>.
          </p>

          <h3>16. Changes to These Terms</h3>
          <p>
            TeX-Technology Extreme Pty (Ltd) reserves the right to amend these Terms and Conditions at any time.
            Where changes are material, users will be notified via registered email or a prominent notice on the
            platform. Continued use of Aselar following notification constitutes your acceptance of the revised
            terms. It is your responsibility to review these terms periodically.
          </p>

          <h3>17. Contact and Data Inquiries</h3>
          <p>
            For any queries regarding your personal data, privacy rights, account security, or these Terms
            and Conditions, you may contact TeX-Technology Extreme Pty (Ltd) through the official channels
            listed on the Aselar platform. We are committed to responding to all data-related requests
            promptly and in full accordance with our obligations under the <strong>Data Protection Act, 2024</strong>.
          </p>

        </div>
        <div className={styles.actions}>
          <label>
            <input
              type="checkbox"
              checked={isAgreed}
              onChange={handleCheckboxChange}
            />
            I have read, understood, and agree to the Aselar Terms and Conditions, including all data protection,
            legal compliance, and prohibited conduct clauses outlined above.
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