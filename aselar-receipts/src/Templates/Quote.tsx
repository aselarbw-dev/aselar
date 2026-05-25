import React from 'react'
import styles from "./Quote.module.css"
import Logo from "../assets/tesla-logo-7408969_1280.png"
const Quote:React.FC = () => {
  return (
    <div className={styles.mainQuote}>
        <div className={styles.coveUp}>
              <div className={styles.logoAndAdress}>
                       <img src={Logo} alt="company logo" />
                       <div className={styles.address}>
                       <h4>TeX-Technology Extreme</h4>
                                     <h4>Plot 1234</h4>
                                     <h4>Box 3456,Phakalane</h4>
                                     <h4>tex@robotics.bw</h4>
                                     <h4>Fair Grounds</h4>
                       </div>
              </div>
              <div className={styles.quoteBody}>
                  <h2 className={styles.quoteNumber}>No.123671</h2>
                  <div className={styles.rendering}>
                    <h4>Service</h4>
                    <h4>Description</h4>
                    <h4>Quantity</h4>
                    <h4>Units</h4>
                    <h4>Price</h4>
                  </div>
                  <div className={styles.subBody}>
                       <div>Gardening</div>
                       <div>Gardeners</div>
                       <div>5</div>
                       <div>Na</div>
                       <div>90</div>
                  </div>
                  <div className={styles.subBody}>
                       <div>Gardening</div>
                       <div> Gardeners</div>
                       <div>5</div>
                       <div>Na</div>
                       <div>90</div>
                  </div>
                  <div className={styles.summing}>
                      <div className={styles.add}>
                        <h4>Sub Total-P</h4>
                        <div>180</div>
                      </div>
                      <div className={styles.tax}>
                        <h4>Tax-P</h4>
                        <div>0</div>
                      </div>
                      <div className={styles.mainTotal}>
                        <h4>Total-P</h4>
                        <div>180</div>
                      </div>
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
                            <button>Print Quote</button>

        </div>
        
        </div>
  )
}

export default Quote