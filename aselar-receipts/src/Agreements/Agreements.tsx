
import React, { useState } from "react";
import styles from "./Agreements.module.css";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";

const TERMS_VERSION = "2.0";
const PRIVACY_VERSION = "1.0";

const Agreements: React.FC = () => {
  const [isAgreed, setIsAgreed] = useState(false);
  const [country, setCountry] = useState("");

  const handleCheckboxChange = () => {
    setIsAgreed((previous) => !previous);
  };

  const handleCountryChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setCountry(event.target.value);
  };

  const handleProceed = () => {
    if (!country) {
      toast.error("Please select your country.");
      return;
    }

    if (!isAgreed) {
      toast.error("Please accept the Aselar Terms and Conditions.");
      return;
    }

    /*
     * Store the acceptance information locally for the current registration flow.
     *
     * IMPORTANT:
     * The backend should ultimately create the legally significant
     * acceptance record, including:
     * - user/account ID
     * - terms version
     * - privacy version
     * - country
     * - timestamp
     * - IP address
     * - user agent
     *
     * Do not rely on localStorage alone as the permanent legal record.
     */
    const acceptanceRecord = {
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
      country,
      accepted: true,
      acceptedAt: new Date().toISOString(),
    };

    localStorage.setItem(
      "aselar_terms_acceptance",
      JSON.stringify(acceptanceRecord)
    );

    toast.success("Agreement reached!");
  };

  const canProceed = Boolean(country && isAgreed);

  return (
    <div className={styles.container}>
      <div className={styles.agreementBox}>
        <h2>Aselar User Agreement</h2>

        <div className={styles.scrollableContainer}>
          <p>
            <strong>Effective Date:</strong> 18 August 2026
            <br />
            <strong>Terms Version:</strong> {TERMS_VERSION}
          </p>

          <p>
            Welcome to Aselar. These Terms of Use govern your access to and use
            of the Aselar platform, including its websites, applications,
            software, business tools, APIs, accounting features, artificial
            intelligence features, communications functionality and related
            services.
          </p>

          <p>
            By creating an account or using Aselar, you acknowledge that you
            have read, understood and agreed to these Terms, together with the
            applicable Privacy Policy and any country-specific terms or
            policies that apply to you.
          </p>

          <h3>1. About Aselar</h3>

          <p>
            Aselar is a technology platform designed to help businesses,
            entrepreneurs, retailers, informal-sector businesses and other
            organisations manage and operate their businesses digitally.
          </p>

          <p>
            Aselar provides tools that may include, without limitation,
            point-of-sale functionality, inventory management, sales
            management, digital receipts, quotations, invoices, accounting
            assistance, business intelligence, customer and supplier
            management, employee-related documents, communications,
            reporting, artificial intelligence features and other business
            services.
          </p>

          <p>
            Aselar is developed, maintained and operated through a
            collaborative technology and business relationship involving
            <strong> TeX-Technology Extreme (Pty) Ltd</strong>, a company
            registered in the Republic of Botswana, and{" "}
            <strong>Amaphiko Holdings (Pty) Ltd</strong>, a company registered
            in the Republic of South Africa.
          </p>

          <p>
            TeX-Technology Extreme (Pty) Ltd and Amaphiko Holdings (Pty) Ltd
            may collectively be referred to in these Terms as the{" "}
            <strong>"Aselar Operators"</strong>.
          </p>

          <p>
            The Aselar Operators may use subsidiaries, affiliates, contractors,
            technology providers, hosting providers, payment providers and
            other authorised service providers to deliver the Aselar services.
          </p>

          <h3>2. Regional Scope</h3>

          <p>
            Aselar is intended for use by businesses and users across the
            Southern African Development Community (SADC) and other
            jurisdictions in which Aselar may lawfully make its services
            available.
          </p>

          <p>
            These Terms establish the general rules governing use of Aselar
            across the region. Certain legal, regulatory, consumer-protection,
            tax, financial, employment, data-protection or other requirements
            may differ between countries.
          </p>

          <p>
            Where applicable, additional country-specific terms, notices or
            legal requirements may apply to users based on their location,
            business activities, transactions or the particular Aselar
            service being used.
          </p>

          <p>
            Nothing in these Terms is intended to remove, restrict or override
            any mandatory legal right that cannot lawfully be excluded or
            limited in the jurisdiction applicable to you.
          </p>

          <h3>3. Acceptance of These Terms</h3>

          <p>
            By registering for, accessing or using Aselar, you confirm that
            you have the legal capacity and authority required to enter into
            these Terms.
          </p>

          <p>
            If you create an Aselar account on behalf of a business,
            organisation or other legal entity, you represent that you have
            authority to bind that entity to these Terms.
          </p>

          <p>
            If you do not agree with these Terms, the Privacy Policy or any
            applicable country-specific requirements, you must not create or
            use an Aselar account.
          </p>

          <h3>4. Business Accounts and User Responsibilities</h3>

          <p>
            You must provide information that is accurate, current and not
            misleading when creating and maintaining an Aselar account.
          </p>

          <p>
            You are responsible for maintaining the security of your account,
            passwords, authentication information, devices and authorised
            users.
          </p>

          <p>
            You are responsible for all activity conducted through your
            account and must notify Aselar promptly if you suspect
            unauthorised access, credential compromise or other security
            incidents.
          </p>

          <p>
            Businesses are responsible for ensuring that their use of Aselar
            complies with the laws, licences, permits, registrations, tax
            obligations and regulatory requirements applicable to their
            business and jurisdiction.
          </p>

          <h3>5. Aselar Services</h3>

          <p>
            Aselar may provide software tools that assist businesses with
            recording, organising, analysing and managing business information.
          </p>

          <p>
            Features may change over time as Aselar is developed. We may add,
            modify, suspend or discontinue features where reasonably necessary
            for security, technical, commercial, legal or operational reasons.
          </p>

          <p>
            Aselar is a technology service and does not guarantee that the
            platform will be continuously available, uninterrupted or entirely
            free from errors.
          </p>

          <h3>6. Artificial Intelligence and Automated Features</h3>

          <p>
            Aselar may use artificial intelligence, machine learning,
            automation and other computational technologies to provide
            features including business insights, accounting assistance,
            classifications, summaries, recommendations, document generation
            and other automated outputs.
          </p>

          <p>
            AI-generated or automated information may contain errors,
            omissions or inaccuracies. You are responsible for reviewing and
            verifying important information before relying on it for financial,
            tax, legal, regulatory, employment or other significant decisions.
          </p>

          <p>
            Aselar's AI features are intended to assist users and do not
            constitute legal, accounting, auditing, tax, investment or other
            professional advice.
          </p>

          <p>
            Where professional advice is required, you should consult an
            appropriately qualified professional in the relevant jurisdiction.
          </p>

          <h3>7. Business Data and User Content</h3>

          <p>
            You retain your rights in the business information, records,
            images, documents, product information and other content that you
            submit to Aselar, subject to the rights necessary for Aselar to
            provide the services.
          </p>

          <p>
            By submitting content to Aselar, you confirm that you have the
            necessary rights, permissions and authority to provide that
            content and to permit Aselar to process it for the purposes of
            providing the services.
          </p>

          <p>
            You grant the Aselar Operators a limited, non-exclusive,
            worldwide, royalty-free licence to host, store, reproduce,
            transmit, display and process your content only to the extent
            reasonably necessary to operate, secure, maintain, improve and
            provide the Aselar services.
          </p>

          <p>
            This licence does not transfer ownership of your business data or
            intellectual property to the Aselar Operators.
          </p>

          <h3>8. Privacy and Data Protection</h3>

          <p>
            Aselar takes the protection and security of personal information
            seriously.
          </p>

          <p>
            Personal information is processed in accordance with the Aselar
            Privacy Policy and applicable data-protection laws in the
            jurisdictions in which Aselar operates.
          </p>

          <p>
            Depending on the relationship between Aselar and the customer,
            Aselar may process personal information as a service provider,
            processor, operator or other legally recognised role, while the
            business using Aselar may remain responsible for determining the
            purposes for which certain customer, employee, supplier or other
            personal information is processed.
          </p>

          <p>
            Where required, additional data-processing terms may apply through
            an Aselar Data Processing Agreement ("DPA").
          </p>

          <p>
            Aselar does not sell personal information to advertisers or
            otherwise commercialise personal information in exchange for
            advertising revenue.
          </p>

          <p>
            We may, however, use authorised technology and service providers
            such as hosting, cloud infrastructure, communications, security,
            analytics and payment providers where reasonably necessary to
            provide Aselar.
          </p>

          <p>
            Please read the{" "}
            <strong>Aselar Privacy Policy</strong> for detailed information
            concerning data collection, processing, retention, security,
            international transfers and user rights.
          </p>

          <h3>9. International and Cross-Border Data Processing</h3>

          <p>
            Aselar may use infrastructure, technology providers and service
            providers located in countries other than the country in which you
            are located.
          </p>

          <p>
            Where personal information is transferred across national borders,
            the Aselar Operators will implement measures required by applicable
            data-protection laws and contractual obligations.
          </p>

          <p>
            Additional information regarding international transfers and
            applicable safeguards is provided in the Aselar Privacy Policy and,
            where applicable, the DPA.
          </p>

          <h3>10. Acceptable Use and Prohibited Activities</h3>

          <p>
            You may not use Aselar to engage in, facilitate or promote
            activities that are unlawful, fraudulent, deceptive, abusive or
            otherwise prohibited by applicable law.
          </p>

          <p>Prohibited activities include, without limitation:</p>

          <ul>
            <li>
              Fraud, deception, impersonation or deliberate misrepresentation.
            </li>
            <li>
              Money laundering, terrorist financing or the concealment of
              proceeds of crime.
            </li>
            <li>
              Unlawful sale or distribution of controlled substances,
              pharmaceuticals, weapons or other restricted goods.
            </li>
            <li>
              Unlawful gambling, betting or regulated financial activities.
            </li>
            <li>
              Pyramid schemes, fraudulent investment schemes or other deceptive
              financial arrangements.
            </li>
            <li>
              Activities involving stolen goods, counterfeit goods or unlawful
              intellectual-property infringement.
            </li>
            <li>
              Unauthorised access to, interference with or attempted compromise
              of Aselar systems or another user's account.
            </li>
            <li>
              Uploading malicious software, malware or code intended to damage,
              disrupt or compromise systems.
            </li>
            <li>
              Using Aselar to violate applicable consumer-protection,
              competition, tax, employment, financial, privacy or other laws.
            </li>
            <li>
              Using Aselar for any purpose that would expose the Aselar
              Operators or their service providers to unlawful regulatory or
              sanctions risk.
            </li>
          </ul>

          <p>
            The Aselar Operators may investigate suspected violations and may
            suspend, restrict or terminate accounts where reasonably necessary
            to protect users, the platform, third parties or comply with
            applicable law.
          </p>

          <h3>11. Regulatory and Business Compliance</h3>

          <p>
            You are solely responsible for determining whether your products,
            services and business activities are lawful in the jurisdiction
            where you operate.
          </p>

          <p>
            This includes obtaining all required business registrations,
            licences, permits, tax registrations, professional approvals and
            other regulatory authorisations.
          </p>

          <p>
            Aselar does not guarantee that use of its software makes a
            particular business compliant with the laws of any country.
          </p>

          <h3>12. Payments and Transactions</h3>

          <p>
            Where Aselar provides payment-related functionality, the applicable
            payment provider's terms may also apply.
          </p>

          <p>
            Unless expressly stated otherwise, Aselar is a technology platform
            and does not become the buyer or seller of goods or services merely
            because its software facilitates a transaction.
          </p>

          <p>
            Users remain responsible for the accuracy, legality and fulfilment
            of transactions conducted through their accounts.
          </p>

          <p>
            Applicable platform fees, subscription charges or transaction fees
            will be communicated to users through the relevant Aselar service,
            pricing page or subscription agreement.
          </p>

          <h3>13. Consumer Transactions, Returns and Refunds</h3>

          <p>
            Where a business uses Aselar to sell goods or services to
            consumers, the business remains responsible for complying with
            applicable consumer-protection laws.
          </p>

          <p>
            Sellers are responsible for establishing and honouring lawful
            return, cancellation, warranty and refund policies applicable to
            their products or services.
          </p>

          <p>
            Aselar may provide tools for communicating or recording such
            policies but does not become the seller of the underlying goods or
            services unless expressly stated otherwise.
          </p>

          <h3>14. Intellectual Property</h3>

          <p>
            The Aselar platform, including its software, source code,
            architecture, interfaces, visual designs, trademarks, logos,
            documentation, proprietary processes and related technology, is
            owned by, licensed to or otherwise lawfully controlled by the
            Aselar Operators and/or their licensors.
          </p>

          <p>
            Nothing in these Terms grants you ownership of the Aselar software,
            trademarks, source code or other proprietary technology.
          </p>

          <p>
            You may not copy, reverse engineer, decompile, modify, reproduce,
            distribute, resell or commercially exploit Aselar except where
            expressly permitted by the Aselar Operators or applicable law.
          </p>

          <h3>15. Third-Party Services and Integrations</h3>

          <p>
            Aselar may integrate with third-party services including cloud
            providers, payment services, communications platforms, mapping
            services, artificial intelligence providers, analytics providers
            and other technology providers.
          </p>

          <p>
            Third-party services may be governed by their own terms and privacy
            policies. Aselar is not responsible for independent services that
            it does not control.
          </p>

          <h3>16. Security</h3>

          <p>
            The Aselar Operators implement reasonable technical and
            organisational safeguards designed to protect information against
            unauthorised access, loss, destruction, alteration or disclosure.
          </p>

          <p>
            However, no internet-based system can be guaranteed to be
            completely secure. Users are responsible for using secure
            passwords, protecting their devices and following reasonable
            security practices.
          </p>

          <h3>17. Service Availability</h3>

          <p>
            Aselar may occasionally become unavailable because of maintenance,
            upgrades, technical failures, telecommunications issues,
            infrastructure failures, cyber incidents, third-party service
            interruptions, regulatory requirements or events beyond our
            reasonable control.
          </p>

          <p>
            We will use reasonable efforts to restore affected services as
            quickly as practicable.
          </p>

          <h3>18. Suspension and Termination</h3>

          <p>
            The Aselar Operators may suspend, restrict or terminate an account
            where reasonably necessary due to:
          </p>

          <ul>
            <li>Violation of these Terms.</li>
            <li>Illegal, fraudulent or abusive activity.</li>
            <li>Security threats or suspected account compromise.</li>
            <li>Failure to pay applicable fees.</li>
            <li>Regulatory or legal requirements.</li>
            <li>Conduct that creates material risk to Aselar or other users.</li>
          </ul>

          <p>
            Where reasonably practicable, users will be given notice and an
            opportunity to remedy a breach. Immediate action may be taken where
            delay could cause harm, compromise security or violate applicable
            law.
          </p>

          <h3>19. Data Following Account Termination</h3>

          <p>
            Following termination, access to the account may cease immediately
            or after any applicable transition period.
          </p>

          <p>
            Data may be retained for periods required by law, legitimate
            security requirements, financial recordkeeping obligations,
            dispute resolution or other lawful purposes.
          </p>

          <p>
            Where no lawful retention requirement exists, information may be
            deleted or anonymised in accordance with the Aselar Privacy Policy
            and applicable data-retention requirements.
          </p>

          <h3>20. Disclaimer of Warranties</h3>

          <p>
            To the fullest extent permitted by applicable law, Aselar is
            provided on an "as available" and "as is" basis.
          </p>

          <p>
            We do not guarantee that Aselar will always be uninterrupted,
            error-free, completely secure or suitable for every particular
            business purpose.
          </p>

          <p>
            Nothing in these Terms excludes a warranty, consumer right or legal
            protection that cannot lawfully be excluded in the jurisdiction
            applicable to you.
          </p>

          <h3>21. Limitation of Liability</h3>

          <p>
            To the fullest extent permitted by applicable law, the Aselar
            Operators and their directors, officers, employees, contractors,
            affiliates and service providers will not be liable for indirect,
            incidental, consequential, special or punitive losses arising from
            the use of or inability to use Aselar.
          </p>

          <p>
            This may include loss of profits, loss of business opportunity,
            reputational loss, loss of anticipated savings or indirect loss of
            data.
          </p>

          <p>
            Where legally permitted, the aggregate liability of the Aselar
            Operators arising from the services will be limited to the amount
            actually paid by the affected user to Aselar during the twelve
            months immediately preceding the event giving rise to the claim.
          </p>

          <p>
            This limitation does not apply where liability cannot legally be
            limited or excluded.
          </p>

          <h3>22. User Indemnification</h3>

          <p>
            To the extent permitted by applicable law, you agree to indemnify
            and hold harmless the Aselar Operators and their directors,
            employees, agents and service providers against claims, losses,
            liabilities and reasonable costs arising from your unlawful use of
            Aselar, violation of these Terms, infringement of third-party
            rights or misuse of the platform.
          </p>

          <h3>23. Dispute Resolution</h3>

          <p>
            If a dispute arises concerning Aselar, the parties should first
            attempt to resolve the matter through good-faith communication.
          </p>

          <p>
            Where appropriate, the parties may pursue mediation or another
            mutually agreed dispute-resolution mechanism before commencing
            formal proceedings.
          </p>

          <p>
            The applicable governing law and dispute-resolution forum may depend
            on the user's country, the applicable country-specific terms and
            mandatory laws governing the relationship.
          </p>

          <h3>24. Governing Law and Country-Specific Terms</h3>

          <p>
            Aselar operates across multiple jurisdictions. Accordingly, these
            Terms are intended to operate together with applicable country or
            regional legal requirements.
          </p>

          <p>
            Where mandatory law in the user's jurisdiction applies, that law
            will prevail to the extent required over any inconsistent provision
            of these Terms.
          </p>

          <p>
            The Aselar Operators may publish country-specific legal addenda for
            particular jurisdictions. Such addenda form part of the applicable
            agreement for users to whom they apply.
          </p>

          <h3>25. Changes to These Terms</h3>

          <p>
            We may update these Terms from time to time to reflect changes in
            the Aselar services, applicable laws, technology, business
            practices or security requirements.
          </p>

          <p>
            Where changes are material, we will take reasonable steps to notify
            affected users through the platform, email, SMS, WhatsApp or other
            appropriate communication channels.
          </p>

          <p>
            Where required by applicable law, users may be required to
            expressly accept updated Terms before continuing to use certain
            services.
          </p>

          <h3>26. Privacy Policy and Additional Policies</h3>

          <p>
            The following documents may form part of the Aselar legal
            framework:
          </p>

          <ul>
            <li>Aselar Terms of Use</li>
            <li>Aselar Privacy Policy</li>
            <li>Aselar Data Processing Agreement</li>
            <li>Aselar Acceptable Use Policy</li>
            <li>Aselar Cookie Policy</li>
            <li>Applicable Country-Specific Legal Addenda</li>
            <li>Applicable Subscription, Pricing or Service Agreements</li>
          </ul>

          <p>
            Where a separate agreement applies specifically to a particular
            service, that agreement will govern that service to the extent of
            any inconsistency.
          </p>

          <h3>27. Contact and Legal Notices</h3>

          <p>
            Questions concerning these Terms, privacy, account security,
            compliance or legal matters may be directed to the official Aselar
            support or legal channels made available through the Aselar
            platform.
          </p>

          <p>
            The applicable Aselar Operator or authorised representative may
            respond depending on the user's country, service and nature of the
            request.
          </p>

          <h3>28. Entire Agreement</h3>

          <p>
            These Terms, together with the applicable Privacy Policy,
            country-specific terms, policies and service agreements, constitute
            the agreement governing your use of Aselar.
          </p>

          <p>
            If any provision is found to be invalid or unenforceable, the
            remaining provisions will continue to apply to the fullest extent
            permitted by law.
          </p>
        </div>

        <div className={styles.actions}>
          <label>
            <strong>Country / Jurisdiction</strong>
            <select
              value={country}
              onChange={handleCountryChange}
              className={styles.countrySelect}
            >
              <option value="">Select your country</option>
              <option value="Botswana">Botswana</option>
              <option value="South Africa">South Africa</option>
              <option value="Namibia">Namibia</option>
              <option value="Zambia">Zambia</option>
              <option value="Zimbabwe">Zimbabwe</option>
              <option value="Malawi">Malawi</option>
              <option value="Mozambique">Mozambique</option>
              <option value="Lesotho">Lesotho</option>
              <option value="Eswatini">Eswatini</option>
              <option value="Tanzania">Tanzania</option>
              <option value="Mauritius">Mauritius</option>
              <option value="Seychelles">Seychelles</option>
              <option value="Democratic Republic of the Congo">
                Democratic Republic of the Congo
              </option>
              <option value="Angola">Angola</option>
              <option value="Other">Other</option>
            </select>
          </label>

         <label className={styles.agreementCheckbox}>
  <input
    type="checkbox"
    checked={isAgreed}
    onChange={handleCheckboxChange}
  />

  <span>
   I agree to the Aselar Terms of Use and Privacy Policy. I understand that additional country-specific terms may apply.
  </span>
</label>

          <div className={styles.policyLinks}>
            <span>Terms Version {TERMS_VERSION}</span>
            <span>|</span>
            <span>Privacy Policy Version {PRIVACY_VERSION}</span>
          </div>

          <Link
            to={canProceed ? "/sign-up" : "#"}
            onClick={(event) => {
              if (!canProceed) {
                event.preventDefault();
                handleProceed();
              }
            }}
          >
            <button
              type="button"
              onClick={handleProceed}
              disabled={!canProceed}
              className={styles.proceedButton}
            >
              Proceed
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Agreements;

