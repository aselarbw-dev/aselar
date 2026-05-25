import React from 'react'
import styles from "./Invoice.module.css"
import logo from "../assets/tesla-logo-7408969_1280.png"
const Invoice:React.FC = () => {
  return (
    <div className={styles.invoice}>
    <div className={styles.address}>
           <img src={logo} alt="invoice logo" />
           <div className={styles.addressText}>
           <h4>TeX-Technology Extreme</h4>
                                     <h4>Plot 1234</h4>
                                     <h4>Box 3456,Phakalane</h4>
                                     <h4>tex@robotics.bw</h4>
                                     <h4>Fair Grounds</h4>
           </div>
    </div>
    <div className={styles.invoiceBody}>
             <h4 className={styles.invoiceNumber}>No.12457</h4>
             <div className={styles.invoiceHeaders}>
             <h4>Service</h4>
             <h4>Description</h4>
                <h4>Unit</h4>
                    <h4>Price </h4>
             </div>
             <div className={styles.invoiceDetail}>
                   <div>Website </div>
                   <div>Dynamic/responsive</div>
                   <div>1</div>
                   <div>3000</div>
             </div>
             <div className={styles.invoiceDetail}>
                   <div>Database </div>
                   <div>Data for students</div>
                   <div>1</div>
                   <div>5000</div>
             </div>
    </div>
    <div className={styles.addingUp}>
            <div className={styles.paidUp}>
                   <h4>Total Paid-P</h4>
                   <div>8000</div>
            </div>
            <div className={styles.taxInvoice}>
            <h4>Tax-P </h4>
            <div>0</div>
            </div>
            <div className={styles.totalPaid}>
            <h4>Total-P</h4>
            <div>8000</div>
            </div>
    </div>
    <div className={styles.security}>
                              <h4>RefNo.123356</h4>
                              <h4>Seller: Jb-1671</h4>
                              </div>
                              <div className={styles.day}>
                                    <h4>8th October,2024,12:45PM</h4>
                              </div>
                            <p className={styles.tag}>Powered by Aselar,a TeX product.</p>
                            <button>Print Invoice</button>

    </div>
  )
}

export default Invoice