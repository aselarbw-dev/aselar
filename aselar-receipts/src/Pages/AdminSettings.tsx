import DiscountToggle from '../Settings/DiscountToggle'
import SellerManagement from '../Settings/SellerManagement'
import styles from './AdminSettings.module.css'

const AdminSettings = () => {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>
          Manage how your business runs on Aselar.
        </p>
      </header>

      <div className={styles.layout}>
        <nav className={styles.nav} aria-label="Settings sections">
          <a href="#sales" className={styles.navLink}>
            Sales
          </a>
          <a href="#team" className={styles.navLink}>
            Team &amp; Access
          </a>
        </nav>

        <div className={styles.content}>
          <section id="sales" className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Sales</h2>
              <p className={styles.sectionDescription}>
                Control how discounts are applied at the point of sale.
              </p>
            </div>
            <div className={styles.card}>
              <DiscountToggle />
            </div>
          </section>

          <section id="team" className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Team &amp; Access</h2>
              <p className={styles.sectionDescription}>
                Decide who is allowed to log in as a seller on this account.
              </p>
            </div>
            <div className={styles.card}>
              <SellerManagement />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default AdminSettings
