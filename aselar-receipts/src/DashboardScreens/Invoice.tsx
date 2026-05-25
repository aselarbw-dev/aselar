import React,{useState,useEffect} from 'react'
import styles from "./Invoice.module.css"
import { FaTrash } from 'react-icons/fa'
import { FaPlus } from 'react-icons/fa'
import { FaFilePdf } from 'react-icons/fa'
import { IconContext } from 'react-icons'
import {toast} from "react-toastify"
import { useNavigate,Link } from 'react-router-dom'
import ReceiverForm from '../Receivers/ReceiversForm'
interface invoiceFields{
  id:number,
  services:{
    field1:string,
    field2:string,
    field3:number,
    field4:number
  }
}
const Invoice:React.FC = () => {
  const [fields,setFields]=useState<invoiceFields[]>([])
  const [addition,setAddition]=useState<number>(0)
    //const [subtotal,setSubtotal]=useState<number>(0)
    const [vat,setVat]=useState<number>(0)
    const [totalSum,setTotalSum]=useState<number>(0)
const [showReceiverForm, setShowReceiverForm] = useState(false);
     const handleReceiverFormSubmit = () => {
        setShowReceiverForm(!showReceiverForm);
     }
  const [isSaved,setIsSaved]=useState<boolean>(false)
  const navigate=useNavigate()
 
  // add inputs
  const handleInputs=()=>{
    if(fields.length>7){
      toast.error("Invoice has a maximum of 8 entries")
      return
     }
    const addInputs:invoiceFields={
      id:fields.length,
      services:{
        field1:"",
        field2:"",
        field3:0,
        field4:0
      }
   }
   setFields([...fields,addInputs])
   setIsSaved(false)
  }
  useEffect(()=>{
    const fields = localStorage.getItem('fields');
      const addition= localStorage.getItem('addition');
      
   
      if (fields) setFields(JSON.parse(fields));
      if (addition) setAddition(JSON.parse(addition));
     
  },[])
   // Function to save data to localStorage
   const handleSaveData = () => {
    localStorage.setItem('fields', JSON.stringify(fields));
    localStorage.setItem('addition', JSON.stringify(addition));
   
    setIsSaved(true); // Mark as saved
  };
      // Function to remove a set of inputs
      const handleRemoveInput = (id: number) => {
     
        const updatedInputs = fields.filter((input) => input.id !== id);
        setFields(updatedInputs);
      };
  const handleInputChange = (id: number, field: string, value: string) => {
    setFields((prevInputs) =>
      prevInputs.map((fields) =>
        fields.id === id
          ? {
              ...fields,
              services: {
                ...fields.services,
                [field]: field === 'field3' || field === 'field4' ? parseFloat(value) || 0 : value,
              },
            }
          : fields
      )
    );
  }
  // calculate total
  useEffect(() => {
    const total = fields.reduce((acc, input) => acc + input.services.field3 * input.services.field4, 0);
    const calculateVat= total * 0.14; // 14% VAT
    const calculateTotal= total + calculateVat;
    setAddition(total);
    setVat(calculateVat)
    setTotalSum(calculateTotal)
  }, [fields]);
  const submitData=async()=>{
    if(fields.length===0){
      toast.error("You can not submit an invoice without entries.")
      return
    }
    try {
     
      const payload = {
          fields:fields.map((input) =>input.services),
          addition: String(addition),
          vat: vat.toFixed(2),
          totalSum: totalSum.toFixed(2),
         
      };

      const response = await fetch("http://localhost:5004/api/invoice", {
          method: "POST",
          credentials: "include",
          mode: "cors",
          headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
          },
          body: JSON.stringify(payload),
      });

      const load = await response.json();
      console.log(load);
      toast.success("Invoice is being prepared, wait to send");
      setFields([])
     
      setAddition(0)
      localStorage.removeItem('fields');
      localStorage.removeItem('addition');
    
      navigate("/invoice-template")
  } catch (error) {
      console.log(error);
  }
   }
  return (
    <div className={styles.quote}>
             <div className={styles.quotation}>
              <div className={styles.quoteTitle}>
                   <div></div>
                   <h4 className={styles.header}>Prepare Invoice</h4>
                   <button
        onClick={handleSaveData}
        className={`${styles.saveButton} ${isSaved ? styles.active : styles.inactive}`}
      >
        {isSaved ? 'Saved!' : 'Save '}
      </button>
     
     
              </div>
             
                 <div className={styles.quoteContent}>
                      <div className={styles.headers}>
                              <h4>Service/Product</h4>
                              <h4>Description</h4>
                              <h4>Quantity</h4>
                              <h4>Price</h4>
                      </div>
                      {fields.map((input)=>(
                    <div key={input.id} className={styles.flexInvoice}>
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
                                      <h4>{addition.toFixed(2)}</h4>
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
                  <button className={styles.print} onClick={submitData}><FaFilePdf/> Compose</button>
                                    <Link to="/invoice-template"> <button className={styles.recent}>Recent</button></Link>
                           <button className={styles.receivers} onClick={handleReceiverFormSubmit}>Invoice To</button>
                            {showReceiverForm?<ReceiverForm submitUrl='http://localhost:5004/api/receiver'/>:null}
                  <button className={styles.add} onClick={handleInputs}><FaPlus/> Add Cell</button>
                 </div>

             </div>
    
    </div>
  )
}

export default Invoice