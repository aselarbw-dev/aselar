import React,{useState} from "react"
import {  toast } from 'react-toastify';
import surveryStyles from "../Componets/Survey.module.css"
import {useNavigate} from "react-router-dom"
import loader from "../assets/circle-9360_256.gif"
import AselarWhite from "../assets/Asset 6.png"

 interface formSubmission{
   businessNature:string,
   place:string,
   city:string,               // new
   businessNumber:string,
   businessDescription:string
  
 }
 const initialState:formSubmission={businessNature:"",place:"",city:"",businessNumber:"",
      businessDescription:""}
const Survey:React.FC = () => {
 const [formData,setFormData]=useState<formSubmission>(initialState)
  const [loading,setLoading]=useState(false)
const navigate=useNavigate()
 const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormData({
        ...formData,
        [name]: value,
      });
     
    };
     
    const handleSubmit = async(e: React.ChangeEvent<HTMLFormElement>) => {
      e.preventDefault();
      if(!formData.businessNature || !formData.place || !formData.city || !formData.businessNumber 
            || ! formData.businessDescription){
                    toast.error("Please enter necessary required information..")
                    return  // note: added this — see flag below
  }
           setLoading(true)
      try {

        
      const token = localStorage.getItem('token');

const response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/verify-business`, {
    method: "POST",
    mode: "cors",
    body: JSON.stringify(formData),
    credentials: "include",
    headers: {
        "Content-Type": "application/json",
        'Accept': 'application/json',
        ...(token && { "Authorization": `Bearer ${token}` })
    }
})
       const data=await response.json()
       console.log(data)
      toast.success("Successfully boarded profile.")
           navigate("/user-agreements")
           setFormData(initialState) 
           setLoading(false)
           
      } catch (error:any) {
            toast.error("Something is wrong,please wait.")
            console.log(error)
            setLoading(false)
      }
   
    }
  

  return (
    
    <div className={surveryStyles.form}>
        <div className={surveryStyles.formPlusImage}>
        
       
    
       <form action="" onSubmit={handleSubmit}  className={surveryStyles.bigForm}>
       <div className={surveryStyles.logoWhite}>
          <img src={AselarWhite} alt="aselar logo" />
          </div>
        <h1>Business Credentials</h1>
             <div className={surveryStyles.formDetails}>
                   <label htmlFor="business">Nature of Business</label>
                   <input type="text" placeholder="tuckshop,car rental,security,finance etc." 
                   id="business"
                   name="businessNature"
                   onChange={handleChange} value={formData.businessNature}
                        
                        />
             </div>

             <div className={surveryStyles.rowGroup}>
                 <div className={surveryStyles.formDetails}>
                       <label htmlFor="physical">Place of Work</label>
                       <input type="text" placeholder="eg plot 123,unit 01,extension 123" 
                       id="physical"
                       name="place"
                        onChange={handleChange} value={formData.place}
                       />
                 </div>
                 <div className={surveryStyles.formDetails}>
                       <label htmlFor="city">City / Town</label>
                       <input type="text" placeholder="eg Gaborone,Francistown,Maun" 
                       id="city"
                       name="city"
                        onChange={handleChange} value={formData.city}
                       />
                 </div>
             </div>

             <div className={surveryStyles.formDetails}>
                   <label htmlFor="phone">Business Contact</label>
                   <input type="text" placeholder="active business contact eg 70000000"
                   id="phone"
                   name="businessNumber" 
                   onChange={handleChange} value={formData.businessNumber}
                   />
             </div>
             <div className={surveryStyles.formDetails}>
                   <label htmlFor="description">Business Description</label>
            
                   <input type="text" placeholder="a brief about your business and services." 
                   id="description"
                   name="businessDescription"
                   className={surveryStyles.wide}
                   onChange={handleChange} value={formData.businessDescription}
                   />
             </div>
             <div className="button">
                
                  <button type="submit"
                   
                >Submit
                {loading && <img src={loader} alt="Loading.." className={surveryStyles.load}/>}
                
                </button>
                 
             
             </div>
           
       </form>
        </div>
      
        
        </div>
  )
}

export default Survey