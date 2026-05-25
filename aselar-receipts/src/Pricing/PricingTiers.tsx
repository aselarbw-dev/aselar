import styles from './PricingTiers.module.css';

const PricingTiers = () => {
  return (
    <div className={styles.pricingContainer}>
      <div className={styles.pricingCard}>
        <h2>TuckShops</h2>
        <div className={styles.price}>
          <span className={styles.amount}> Bwp 70.00</span>
          <span className={styles.period}>user/month, paid monthly</span>
        </div>
        <p className={styles.subscription}>(Annual subscription—auto renews)</p>
        <div className={styles.buttonGroup}>
          <button className={styles.buyNowButton}>Buy now</button>
          <button className={styles.tryNowButton}>Try now</button>
        </div>
        <p className={styles.trialTerms}>See trial terms</p>
        <ul className={styles.featuresList}>
          <li>30 Sms receipts per day</li>
          <li>30 whatsapp receipts per day</li>
          <li>5 Sms invoice,Quotation and debt reminder form  per day</li>
          <li>5 Whatsapp invoice,Quotation and debt reminder form  per day</li>
          <li>8 Files uploads</li>
          <li>3% micro-lending interest on principal</li>
        </ul>
      </div>

      <div className={styles.pricingCard}>
        <h2>Medium Enterprises  </h2>
        <div className={styles.price}>
          <span className={styles.amount}>Bwp 200.00</span>
          <span className={styles.period}>user/month, paid in 6months</span>
        </div>
        <p className={styles.subscription}>(Annual subscription—auto renews)</p>
        <div className={styles.buttonGroup}>
          <button className={styles.buyNowButton}>Buy now</button>
          <button className={styles.tryNowButton}>Try now</button>
        </div>
        <p className={styles.trialTerms}>See trial terms</p>
        <ul className={styles.featuresList}>
        <li>100 Sms receipts per day</li>
          <li>100 whatsapp receipts per day</li>
          <li>20  Sms invoice,Quotation and ledgers form  per day</li>
          <li>20 Whatsapp invoice,Quotation and ledgers  per day</li>
          <li>20 Files uploads</li>
          <li>5% micro-lending interest on principal</li>
        </ul>
      </div>

      <div className={styles.pricingCard}>
        <h2>Large Companies</h2>
        <div className={styles.price}>
          <span className={styles.amount}>Bwp 500.00</span>
          <span className={styles.period}>user/month, paid yearly</span>
        </div>
        <p className={styles.subscription}>(Annual subscription—auto renews)</p>
        <div className={styles.buttonGroup}>
          <button className={styles.buyNowButton}>Buy now</button>
          <button className={styles.tryNowButton}>Try now</button>
        </div>
        <p className={styles.trialTerms}>See trial terms</p>
        <ul className={styles.featuresList}>
        <li>Unlimited  Sms receipts per day</li>
          <li>Unlimited  whatsapp receipts per day</li>
          <li>Unlimited  Sms invoice,Quotation and ledgers form  per day</li>
          <li>Unlimited Whatsapp invoice,Quotation and ledgers form  per day</li>
          <li>100 Files uploads</li>
          <li>7% micro-lending interest on principal</li>
        </ul>
      </div>
    </div>
  );
};

export default PricingTiers;