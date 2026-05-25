import React,{useState,useEffect} from 'react'
import styles from "./Quote.module.css"
import {toast} from "react-toastify"
import { FaTrash } from 'react-icons/fa'
import { FaPlus } from 'react-icons/fa'
import { IconContext } from 'react-icons'
import { useNavigate,Link } from 'react-router-dom'
import ReceiverForm from '../Receivers/ReceiversForm'

interface quoteFields{
   id:number,
   services:{
    field1:string,
    field2:string,
    field3:number,
    field4:number
   }
}

const Quote:React.FC = () => {
  const [data,setData]=useState<quoteFields[]>([])
  const [subtotal,setSubtotal]=useState<number>(0)
  const [vat,setVat]=useState<number>(0)
  const [totalSum,setTotalSum]=useState<number>(0)
  const [isSaved,setIsSaved]=useState<boolean>(false)
  const [showReceiverForm, setShowReceiverForm] = useState(false);
     const handleReceiverFormSubmit = () => {
        setShowReceiverForm(!showReceiverForm);
     }
  const navigate=useNavigate()
  
 
  
  // handle inputs function
  const handleInputs=()=>{
    if(data.length>7){
     toast.error("Quote has a maximum of 8 entries")
     return
    }
     const addInputs:quoteFields={
        id:data.length,
        services:{
          field1:"",
          field2:"",
          field3:0,
          field4:0
        }
     }
     setData([...data,addInputs])
     setIsSaved(false)
  }
  
  // calculate subtotal, VAT, and total
  useEffect(() => {
    const calculatedSubtotal = data.reduce((acc, input) => acc + input.services.field3 * input.services.field4, 0);
    const calculatedVat = calculatedSubtotal * 0.14; // 14% VAT
    const calculatedTotal = calculatedSubtotal + calculatedVat;
    
    setSubtotal(calculatedSubtotal);
    setVat(calculatedVat);
    setTotalSum(calculatedTotal);
  }, [data]);

  // save to local storage
  useEffect(()=>{
    const data = localStorage.getItem('data');
    const subtotal = localStorage.getItem('subtotal');
    const vat = localStorage.getItem('vat');
    const totalSum = localStorage.getItem('totalSum');
    
    if (data) setData(JSON.parse(data));
    if (subtotal) setSubtotal(JSON.parse(subtotal));
    if (vat) setVat(JSON.parse(vat));
    if (totalSum) setTotalSum(JSON.parse(totalSum));
  },[])
  
  // Function to save data to localStorage
  const handleSaveData = () => {
    localStorage.setItem('data', JSON.stringify(data));
    localStorage.setItem('subtotal', JSON.stringify(subtotal));
    localStorage.setItem('vat', JSON.stringify(vat));
    localStorage.setItem('totalSum', JSON.stringify(totalSum));
    
    setIsSaved(true); // Mark as saved
  };

  const handleInputChange = (id: number, field: string, value: string) => {
    setData((prevInputs) =>
      prevInputs.map((data) =>
        data.id === id
          ? {
              ...data,
              services: {
                ...data.services,
                [field]: field === 'field3' || field === 'field4' ? parseFloat(value) || 0 : value,
              },
            }
          : data
      )
    );
    setIsSaved(false);
  }
  
  // Function to remove a set of inputs
  const handleRemoveInput = (id: number) => {
    const updatedInputs = data.filter((input) => input.id !== id);
    setData(updatedInputs);
    setIsSaved(false);
  };
  
  const submitData=async()=>{
    if(data.length===0){
      toast.error("You can not submit a receipt without entries.")
      return
    }
    try {
      const payload = {
          data: data.map((detail) => detail.services),
          subtotal: subtotal.toFixed(2),
          vat: vat.toFixed(2),
          totalSum: totalSum.toFixed(2),
      };

      const response = await fetch("http://localhost:5003/api/quote", {
          method: "POST",
          mode: "cors",
          credentials: "include",
          headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
          },
          body: JSON.stringify(payload),
      });

      const load = await response.json();
      console.log(load);
      toast.success("Quote is being prepared, wait to print");
      setData([])
      setSubtotal(0)
      setVat(0)
      setTotalSum(0)
      localStorage.removeItem('data');
      localStorage.removeItem('subtotal');
      localStorage.removeItem('vat');
      localStorage.removeItem('totalSum');
    
      navigate("/quotation-template")
    } catch (error) {
        console.log(error);
        toast.error("Failed to submit quote. Please try again.");
    }
  }
  
  return (
    <div className={styles.quote}>
             <div className={styles.quotation}>
              <div className={styles.quotationTitles}>
                <div></div>
                <h4 className={styles.header}>Prepare Quotation</h4>
                <button
        onClick={handleSaveData}
        className={`${styles.saveButton} ${isSaved ? styles.active : styles.inactive}`}
      >
        {isSaved ? 'Saved!' : 'Save '}
      </button>
               
              </div>
             
                 <div className={styles.quoteContent}>
                   <div className={styles.quoteHeaders}>
              <h4>Service/product</h4>
              <h4>Description</h4>
              <h4>Quantity</h4>
              <h4>Price</h4>
                   </div>
                   {data.map((input)=>(
                    <div key={input.id} className={styles.flexQuote}>
                        <input type="text" 
                          value={input.services.field1}
                          onChange={(e) => handleInputChange(input.id, 'field1', e.target.value)}
                        placeholder='services/products'/>
                         <textarea name="" id="" 
                           value={input.services.field2}
                           onChange={(e) => handleInputChange(input.id, 'field2', e.target.value)}
                         placeholder='description'>
                         </textarea>
                         <input type="number" 
                          value={input.services.field3}
                          onChange={(e) => handleInputChange(input.id, 'field3', e.target.value)}
                         placeholder='quantity'/>
                         <input type="number"
                          value={input.services.field4}
                          onChange={(e) => handleInputChange(input.id, 'field4', e.target.value)}
                          placeholder='price of service'/>
                          <IconContext.Provider value={{className:styles.delete}}>
                          <FaTrash color="red" onClick={() => handleRemoveInput(input.id)} />
                          </IconContext.Provider>
                    </div>
                   ))}
                 </div>
                 
                  <div className={styles.balanceArea}>
                    <div className={styles.subtotal}>
                      <h4>Subtotal BWP:</h4>
                      <h4>{subtotal.toFixed(2)}</h4>
                    </div>
                    <div className={styles.vat}>
                      <h4>VAT(14%) BWP:</h4>
                      <h4>{vat.toFixed(2)}</h4>
                    </div>
                    <div className={styles.total}>
                      <h4>Total BWP:</h4>
                      <h4 className={styles.bold}>{totalSum.toFixed(2)}</h4>
                    </div>
                  </div>

                 <div className={styles.buttons}>
                  <button className={styles.print} onClick={submitData}> Compose</button>
                  <Link to="/quotation-template"> <button className={styles.recent}>Recent</button></Link>
                 <button className={styles.receivers} onClick={handleReceiverFormSubmit}>Quote To</button>
                  {showReceiverForm?<ReceiverForm submitUrl='http://localhost:5003/api/receiver'/>:null}
                  <button className={styles.add} onClick={handleInputs}><FaPlus/> Add Cell</button>
                 </div>
             </div>
    </div>
  )
}

export default Quote