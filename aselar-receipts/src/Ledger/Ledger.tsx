import React,{useState,useEffect} from 'react'
import styles from "./Ledger.module.css"
import {toast} from "react-toastify"
import { IoMdClose } from "react-icons/io";
import { IconContext } from 'react-icons'
import { formatNumber } from "../Helperfunctions/formatNumbers"
import { useNavigate } from 'react-router-dom';

interface Transaction {
   id: number;
   description:string;
   amount: number;
 }
 interface LedgerData {
  _id: string; // Add this for MongoDB document ID
  title: string;
  debitEntries: Transaction[];
  creditEntries: Transaction[];
}
const Ledger:React.FC = () => {
   const [debitEntries, setDebitEntries] = useState<Transaction[]>([]);
   const [creditEntries, setCreditEntries] = useState<Transaction[]>([]);
   const [description, setDescription] = useState<string>('');
   const [amount, setAmount] = useState<number>(0);
   const [isSaved, setIsSaved] = useState<boolean>(false);
   const [title, setTitle] = useState<string>('');
   const [ledgers, setLedgers] = useState<LedgerData[]>([]); // State to hold ledgers
   const navigate=useNavigate()
   const handleAddDebit = () => {
      if(!amount || !description){
         toast.error("Please enetr a debit value.")
      }
     if (amount > 0 && description ) {
       setDebitEntries([...debitEntries, { id: Date.now(), description, amount }]);
       setDescription(''); // Reset input
       setAmount(0); // Reset input
       setIsSaved(false); // Mark as unsaved
     }
   };
 
   const handleAddCredit = () => {
      if(!amount || !description){
         toast.error("Please enetr a credit value.")
      }
     if (amount > 0 && description) {
       setCreditEntries([...creditEntries, { id: Date.now(), description, amount }]);
       setDescription(''); // Reset input
       setAmount(0); // Reset input
       setIsSaved(false); // Mark as unsaved
     }
   };

  
    // Load data from localStorage on mount
  useEffect(() => {
   const savedDebits = localStorage.getItem('debitEntries');
   const savedCredits = localStorage.getItem('creditEntries');

   if (savedDebits) setDebitEntries(JSON.parse(savedDebits));
   if (savedCredits) setCreditEntries(JSON.parse(savedCredits));
 }, []);
// Function to save data to localStorage
const handleSaveData = () => {
   localStorage.setItem('debitEntries', JSON.stringify(debitEntries));
   localStorage.setItem('creditEntries', JSON.stringify(creditEntries));
   setIsSaved(true); // Mark as saved
 };
 
   const sumDebits = debitEntries.reduce((acc, entry) => acc + entry.amount, 0);
   const sumCredits = creditEntries.reduce((acc, entry) => acc + entry.amount, 0);
   const balance = Math.abs(sumDebits - sumCredits);
  // check on button click if its debit or credit and change boolean values,if true map inputs 
  // on debit or credit side
  // run for each,sum up all values
   // Remove Debit Entry
   const handleRemoveDebit = (id: number) => {
      const updatedDebits = debitEntries.filter((entry) => entry.id !== id);
      setDebitEntries(updatedDebits);
    };
  
    // Remove Credit Entry
    const handleRemoveCredit = (id: number) => {
      const updatedCredits = creditEntries.filter((entry) => entry.id !== id);
      setCreditEntries(updatedCredits);
    };
// Function to create a new ledger
const createLedger = async () => {
  const currentDate = new Date().toISOString();

  const newLedger = {
    title,
    debitEntries: debitEntries.map((entry) => ({
      ...entry,
      date: currentDate,
    })),
    creditEntries: creditEntries.map((entry) => ({
      ...entry,
      date: currentDate,
    })),
  };

  try {
    const response = await fetch('http://localhost:5006/api/ledger', {
      method: 'POST',
      credentials:"include",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(newLedger),
    });

    if (!response.ok) throw new Error('Failed to create ledger');

    const createdLedger = await response.json();
    setLedgers([...ledgers, createdLedger]);

    // Clear inputs & localStorage
    setTitle('');
    setDebitEntries([]);
    setCreditEntries([]);
    localStorage.removeItem('debitEntries'); // Optional: Clear storage
    localStorage.removeItem('creditEntries');
    localStorage.removeItem('ledgerTitle');
    toast.success("Your ledger has been submitted");
    navigate("/recent-ledgers")
  } catch (error) {
    console.error('Error creating ledger:', error);
    toast.error("Your ledger has not been submitted");
  }
};

  return (
    <div className={styles.ledger}>
   <div className={styles.main}>
      <div className={styles.ledgerDisplay}>
         <div className={styles.ledgerTitle}>
            <div></div>
         <h4 className={styles.ledgerHeader}>Accounts Ledgers</h4>
        <button
        onClick={handleSaveData}
        className={`${styles.saveButton} ${isSaved ? styles.active : styles.inactive}`}
      >
        {isSaved ? 'Saved' : 'Save '}
      </button>
         </div>
        
           <div className={styles.display}>
                <h4>Debit</h4> <input type='text'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='ledger title'
                 className={styles.borders}/>
                <h4>Credit</h4>
           </div>
           <div className={styles.displayBody}>
            <div className={styles.debit}>
            {debitEntries.map((entry) => (
               <div className={styles.flex}>
 <p key={entry.id}>
              {entry.description}: BWP{formatNumber(entry.amount)}
            </p>
            <IconContext.Provider value={{className:styles.removeButton}}>
               <IoMdClose onClick={() => handleRemoveDebit(entry.id)} color="red"/>
               </IconContext.Provider>
               </div>
   
   
           
   
          ))}
           
          <h3>Total Debits: BWP{formatNumber(sumDebits)}</h3>
            </div>
         
                 <div className={styles.line}></div>
                 <div className={styles.credit}>
                 {creditEntries.map((entry) => (
                  <div className={styles.flex}>
                   <p key={entry.id}>
              {entry.description}: BWP{formatNumber(entry.amount)}
            </p>
            
               <IconContext.Provider value={{className:styles.removeButton}}>
               <IoMdClose onClick={() => handleRemoveCredit(entry.id)} color="red"/>
               </IconContext.Provider>
             
               
                  </div>
           
          ))}
          <h3>Total Credits: BWP{formatNumber(sumCredits)}</h3>
           </div>

                 </div>
               
           <div className={styles.balance}>
        <h2>
          Balance B/F: BWP{formatNumber(balance)} on the {sumDebits > sumCredits ? 'Debit' : 'Credit'} side
        </h2>
      </div>
      </div>
      <div className={styles.submitPanel}>
         <div className={styles.inputs}>
            <input type="text"
             value={description}
             onChange={(e) => setDescription(e.target.value)}
            
            placeholder='goods/services'/>
            <input type="number" 
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder='sale or cost'/>
         </div>
         <div className={styles.buttons}>
            <button className={styles.bought} onClick={handleAddDebit}>Debit</button>
            <button className={styles.sold} onClick={handleAddCredit}>Credit</button>
            <button className={styles.post} onClick={createLedger}>Post</button>
           
         </div>
      </div>
   </div>

    </div>
  )
}

export default Ledger