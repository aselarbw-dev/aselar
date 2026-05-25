import React from 'react'
import styles from "./Receipt.module.css"
import { FaPlus } from 'react-icons/fa'
const Receipt:React.FC = () => {
  return (
    <div className={styles.mainReceipt}>
      <div className={styles.coverReceipt}>

      
            <div className={styles.loadReceipts}>
                 <h4>Product Loader</h4>
                 <hr />
                 <div className={styles.content}>
                    <div className={styles.items}><li>Bonita 1l </li> <li> P12</li> <FaPlus color='red' size={25} /></div>
                    <div className={styles.items}><li>Bonita 1l </li> <li> P12</li> <FaPlus color='red' size={25} /></div>
                    <div className={styles.items}><li>Bonita 1l </li> <li> P12</li> <FaPlus color='red' size={25} /></div>
                    <div className={styles.items}><li>Bonita 1l </li> <li> P12</li> <FaPlus color='red' size={25} /></div>
                    <div className={styles.items}><li>Bonita 1l </li> <li> P12</li> <FaPlus color='red' size={25} /></div>
                    <div className={styles.items}><li>Bonita 1l </li> <li> P12</li> <FaPlus color='red' size={25} /></div>
                    <div className={styles.items}><li>Bonita 1l </li> <li> P12</li> <FaPlus color='red' size={25} /></div>
                    <div className={styles.items}><li>Bonita 1l </li> <li> P12</li> <FaPlus color='red' size={25} /></div>
                    

                 </div>
              
                 <div className={styles.titles}>
<h3>Cost :P 130.00</h3>
<h3>Paid :P 200.00</h3>
<h3>Bal: P 70.00</h3>
                 </div>
               
                 <div className={styles.receiptAddButtons}>
                    <input type="search" placeholder="search a product" className={styles.search}/>
                    <button className={styles.searchBtn}>Load more</button>
                 </div>
            </div>
      </div>

    </div>
  )
}

export default Receipt
