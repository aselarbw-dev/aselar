import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import receipts from "./Receipt.module.css";
import { FaTrash } from 'react-icons/fa';
import { FaPlus } from 'react-icons/fa';
import { IconContext } from "react-icons";
import { formatNumber } from "../Helperfunctions/formatNumbers";
import { useNavigate, Link } from "react-router-dom";
import Spinner from "../Spinners/Spinner";

interface InputField {
  id: number;
  values: {
    field1: number;
    field2: number;
    field3: string;
    field4: string;
  }
}

interface SubtractionField {
  value: number;
}

interface DiscountData {
  name: string;
  value: number;
  isPercentage: boolean;
}

const Receipt: React.FC = () => {
  const [inputs, setInputs] = useState<InputField[]>([]);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [vatAmount, setVatAmount] = useState<number>(0);
  const [totalAfterVat, setTotalAfterVat] = useState<number>(0);
  
  const [show, setShow] = useState<boolean>(false);           // SMS toggle
  const [isSaved, setIsSaved] = useState<boolean>(false);
 
  const [subtraction, setSubtraction] = useState<SubtractionField>({ value: 0 });
  const [loading, setLoading] = useState(false);
  const [showDiscountPopup, setShowDiscountPopup] = useState<boolean>(false);
  
  const [discount, setDiscount] = useState<DiscountData>({
    name: '',
    value: 0,
    isPercentage: false
  });
  
  const navigate = useNavigate();

  const showSendersNumber = () => {
    setShow(!show);
  };

  const handleAddInputs = () => {
    if (inputs.length > 6) {
      toast.error("Quick Receipts is only for 5 items, use inventory.");
      return;
    }
    const newInputSet: InputField = {
      id: inputs.length,
      values: {
        field1: 0,
        field2: 0,
        field3: '',
        field4: '',
      },
    };
    setInputs([...inputs, newInputSet]);
    setIsSaved(false);
  };

  const handleSubtractionChange = (value: string) => {
    setSubtraction({ value: parseFloat(value) || 0 });
  };

  const handleInputChange = (id: number, field: string, value: string) => {
    setInputs((prevInputs) =>
      prevInputs.map((input) =>
        input.id === id
          ? {
              ...input,
              values: {
                ...input.values,
                [field]: field === 'field1' || field === 'field2' ? parseFloat(value) || 0 : value,
              },
            }
          : input
      )
    );
  };

  const handleRemoveInput = (id: number) => {
    const updatedInputs = inputs.filter((input) => input.id !== id);
    setInputs(updatedInputs);
  };

  useEffect(() => {
    const calculatedSubtotal = inputs.reduce((acc, input) => acc + input.values.field1 * input.values.field2, 0);
    const calculatedVat = calculatedSubtotal * 0.14;
    
    let discountAmount = 0;
    if (discount.value > 0) {
      discountAmount = discount.isPercentage 
        ? (calculatedSubtotal + calculatedVat) * (discount.value / 100)
        : discount.value;
    }
    
    const calculatedTotal = (calculatedSubtotal + calculatedVat) - discountAmount;
    
    setSubtotal(calculatedSubtotal);
    setVatAmount(calculatedVat);
    setTotalAfterVat(calculatedTotal);
  }, [inputs, discount]);

  useEffect(() => {
    const savedInputs = localStorage.getItem('inputs');
    const savedTotal = localStorage.getItem('total');
    const savedSubtraction = localStorage.getItem('subtraction');
    const savedDiscount = localStorage.getItem('discount');

    if (savedInputs) setInputs(JSON.parse(savedInputs));
    if (savedTotal) setSubtotal(JSON.parse(savedTotal));
    if (savedSubtraction) setSubtraction(JSON.parse(savedSubtraction));
    if (savedDiscount) setDiscount(JSON.parse(savedDiscount));
  }, []);

  const handleSaveData = () => {
    localStorage.setItem('inputs', JSON.stringify(inputs));
    localStorage.setItem('total', JSON.stringify(subtotal));
    localStorage.setItem('vatAmount', JSON.stringify(vatAmount));
    localStorage.setItem('totalAfterVat', JSON.stringify(totalAfterVat));
    localStorage.setItem('subtraction', JSON.stringify(subtraction));
    localStorage.setItem('discount', JSON.stringify(discount));
    setIsSaved(true);
  };

  const submitData = async () => {
    if (inputs.length === 0) {
      toast.error("You cannot submit a receipt without entries.");
      return;
    }
    
    setLoading(true);
    try {
      const finalChange = Math.max(0, subtraction.value - totalAfterVat);
      
      const payload = {
        inputs: inputs.map((input) => input.values),
        subtotal: subtotal,
        vatAmount: vatAmount,
        grandTotal: totalAfterVat,
        cash: subtraction.value,
        change: finalChange,
        ...(discount.value > 0 && {
          discountName: discount.name,
          discountValue: discount.value,
          discountType: discount.isPercentage ? "percentage" : "fixed"
        }),
      };
     const token= localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_RECEIPT_BACKEND_SERVICE_URL}/api/quick-receipt`, {
        method: "POST",
        credentials: "include",
        mode: "cors",
                    headers:{ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
  
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
  
      const data = await response.json();
      toast.success("Receipt is being prepared, wait to print");
      console.log('Receipt created:', data);
      
      setInputs([]);
      setSubtraction({ value: 0 });
      setSubtotal(0);
      setVatAmount(0);
      setTotalAfterVat(0);
      setDiscount({ name: '', value: 0, isPercentage: false });
      setShow(false);                    // Reset SMS input too
      localStorage.clear();
      
      navigate("/receipt-template");
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(`Error submitting receipt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const DiscountPopup = () => {
    return (
      <div className={receipts.discountPopup}>
        <div className={receipts.discountContent}>
          <h4>Apply Discount</h4>
          <input
            type="text"
            placeholder="Discount Name"
            value={discount.name}
            onChange={(e) => setDiscount({...discount, name: e.target.value})}
          />
          <input
            type="number"
            placeholder="Value"
            value={discount.value}
            onChange={(e) => setDiscount({...discount, value: parseFloat(e.target.value) || 0})}
            step="0.01"
            min="0"
          />
          <label>
            <input
              type="checkbox"
              checked={discount.isPercentage}
              onChange={(e) => setDiscount({...discount, isPercentage: e.target.checked})}
            />
            Percentage Discount
          </label>
          <div className={receipts.discountButtons}>
            <button onClick={() => setShowDiscountPopup(false)}>Apply</button>
            <button onClick={() => {
              setDiscount({ name: '', value: 0, isPercentage: false });
              setShowDiscountPopup(false);
            }}>Remove</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={receipts.container}>
      {loading && <Spinner />}
      <div className={receipts.mainReceipt}>
        <div className={receipts.receiptTitle}>
          <div></div>
          <h4>Prepare Quick Receipt</h4>
          <button
            onClick={handleSaveData}
            className={`${receipts.saveButton} ${isSaved ? receipts.active : receipts.inactive}`}
          >
            {isSaved ? 'Saved!' : 'Save '}
          </button>
        </div>
                   
        <div className={receipts.receiptForm}>
          <div className={receipts.titles}>
            <div className="product"><h4>Product</h4></div>
            <div className="quantity"><h4>Quantity</h4></div>
            <div className="unit"><h4>Unit(kg)</h4></div>
            <div className="price"><h4>Price(P)</h4></div>
          </div>

          {inputs.map((input) => (
            <div key={input.id} className={receipts.flexInputs}>
              <input
                type="text"
                placeholder="Product"
                value={input.values.field3}
                onChange={(e) => handleInputChange(input.id, 'field3', e.target.value)}
              />
              <input
                type="number"
                placeholder="quantity"
                value={input.values.field1}
                onChange={(e) => handleInputChange(input.id, 'field1', e.target.value)}
                step="0.01"
                min="0"
              />
              <input
                type="text"
                placeholder="unit"
                value={input.values.field4}
                onChange={(e) => handleInputChange(input.id, 'field4', e.target.value)}
              />
              <input
                type="number"
                placeholder="Price"
                value={input.values.field2}
                onChange={(e) => handleInputChange(input.id, 'field2', e.target.value)}
                step="0.01"
                min="0"
              />
              <IconContext.Provider value={{className: receipts.delete}}>
                <FaTrash color="red" onClick={() => handleRemoveInput(input.id)} />
              </IconContext.Provider>
            </div>
          ))}

          <div className={receipts.calculations}>
            <div className={receipts.total}>
              <h3>Subtotal BWP</h3>
              <div>{formatNumber(subtotal)}</div>
            </div>
            <div className={receipts.total}>
              <h3>VAT (14%) BWP</h3>
              <div>{formatNumber(vatAmount)}</div>
            </div>
            {discount.value > 0 && (
              <div className={receipts.total}>
                <h3>Discount ({discount.name}) BWP</h3>
                <div>-{formatNumber(
                  discount.isPercentage 
                    ? (subtotal + vatAmount) * (discount.value / 100)
                    : discount.value
                )}</div>
              </div>
            )}
            <div className={receipts.total}>
              <h3>Total BWP</h3>
              <div>{formatNumber(totalAfterVat)}</div>
            </div>
            <div className={receipts.cash}>
              <h3>Cash BWP</h3>
              <input
                type="number"
                placeholder="enter cash received"
                value={subtraction.value}
                onChange={(e) => handleSubtractionChange(e.target.value)}
                step="0.01"
                min="0"
              />
            </div>
            <div className={receipts.balance}>
              <h3>Balance BWP</h3>
              <div>{formatNumber(subtraction.value - totalAfterVat)}</div>
            </div>
          </div>

          <div className={receipts.buttons}>
            <button className={receipts.print} onClick={submitData}>
              Compose 
            </button>

            <button 
              className={receipts.sms} 
              onClick={showSendersNumber}
            >
              SMS
            </button>

            <button 
              className={receipts.sms} 
              onClick={() => setShowDiscountPopup(true)}
            >
              Discounts
            </button>
           
            <button className={receipts.addCell} onClick={handleAddInputs}>
              <FaPlus/>  
              Cell
            </button>

            <Link to="/receipt-template">
              <button className={receipts.sales}>Recent</button>
            </Link>
            
            <div className={receipts.tooltipContainer}>
              <Link to='/generative-scanner' className={receipts.hoverTrigger}>
                <button className={receipts.sales}>Sell</button>
              </Link>
              <div className={receipts.tooltip}>
                <h5 className={receipts.smallPop}>Generate Receipt</h5>
                <p>Proceed to prepare a receipt with inventory.</p>
              </div>
            </div>
          </div>

          {show && (
            <div className={receipts.senders}>
              <input type="number" placeholder='enter number'/>
              <button>Data</button>
            </div>
          )}
        </div>
      </div>

      {showDiscountPopup && <DiscountPopup />}
    </div>
  );
};

export default Receipt;