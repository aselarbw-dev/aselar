import React,{useState} from 'react'
import styles from './WhatsAppModal.module.css'
interface WhatsAppModalProps{
    isOpen:boolean,
    onClose:()=>void,
    onSubmit:(whatsappNumber:string)=>void
}
const WhatsAppModal:React.FC<WhatsAppModalProps> = ({isOpen,onClose,onSubmit}) => {
    const [whatsappNumber, setWhatsAppNumber] = useState('');
     const handleSubmit = () => {
    // Add country code if missing (Botswana example)
    let formattedNumber = whatsappNumber.trim();
    if (!formattedNumber.startsWith('+')) {
      formattedNumber = `+267${formattedNumber.replace(/^0/, '')}`;
    }
    onSubmit(formattedNumber);
    onClose();
  };


  if (!isOpen) return null;
  return (
    <div className={styles.modalWhatsAppOverlay}>
        <div className={styles.modalWhatsApp}>
            <h3>Enter WhatsApp Number</h3>
            <input
            type="text"
            placeholder="Enter WhatsApp number"
            value={whatsappNumber}
            onChange={(e) => setWhatsAppNumber(e.target.value.replace(/[^\d]/g, ''))}
            />
            <button onClick={handleSubmit}>Send WhatsApp</button>
            <button onClick={onClose}>Close</button>
        </div>
      
    </div>
  )
}

export default WhatsAppModal
