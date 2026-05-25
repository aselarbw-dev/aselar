import {useState,useEffect} from 'react'
import styles from './Notice.module.css';

const Notice = () => {
    const [showModal, setShowModal] = useState(true);
    // Show modal on component mount
  useEffect(() => {
    setShowModal(true);
  }, []);
   const closeModal = () => {
    setShowModal(false);
   }
  return (
    <div>
        {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Important Notice</h3>
            </div>
            <div className={styles.modalBody}>
              <p>
                Passcode should be kept and used by the owner of the system only.And if you 
                forget the passcode, you will lose all data,its possible to
                 change but difficult as we want customers data to be tightly protected.
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.close} onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Notice
