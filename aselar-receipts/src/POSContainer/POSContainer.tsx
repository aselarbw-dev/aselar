import React, { useState, useEffect, useCallback } from 'react';
import CategoryLists from '../CategoryLists/CategoryLists';
import ItemsList from '../ItemsList/ItemsList';
import NumberPad from '../NumberPad/NumberPad';
import Receipt from '../Receipt/Receipt';
import styles from './POSContainer.module.css';
import {useNavigate,Link} from 'react-router-dom';
import { toast } from 'react-toastify';
// Define types
interface Item {
  _id: string;
  name: string;
  sellingPrice: number;
  categoryId?: string; // Made optional to match ItemsList's expected type
}

interface ReceiptItem {
  id: string; // Added for item identification
  name: string;
  quantity: number;
  price: number;
  discount: number; // Optional item discount
  categoryId: string; // NEW: For processSale
  itemId: string; // NEW: Item _id for targeted deduction
}

// Constants
const VAT_RATE = 0.14; // 14% VAT in Botswana

// Custom hook for receipt management
const useReceiptManager = () => {
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [cashPaid, setCashPaid] = useState<number>(0);
 
  // Calculate derived values
  const vat = (subtotal - discountAmount) * VAT_RATE;
  const total = subtotal - discountAmount + vat;
  const change = cashPaid - total;

  // Add item to receipt
  const addItem = useCallback((item: Item, quantity: number) => {
    const newItem: ReceiptItem = {
      id: `${item._id}-${Date.now()}`, // Create unique ID for the receipt item
      name: item.name,
      discount: 0, 
      quantity,
      price: item.sellingPrice,
      categoryId: item.categoryId || '', // Ensure it's set (from fetch or fallback)
      itemId: item._id, // NEW: Capture for targeted update
    };
    
    setReceiptItems(prev => [...prev, newItem]);
    setSubtotal(prev => prev + (quantity * item.sellingPrice));
  }, []);

  // Remove item from receipt
  const removeItem = useCallback((itemId: string) => {
    setReceiptItems(prev => {
      const itemToRemove = prev.find(item => item.id === itemId);
      
      if (itemToRemove) {
        // Update subtotal
        const itemTotal = itemToRemove.quantity * itemToRemove.price;
        setSubtotal(current => current - itemTotal);
        
        // Update discount if this item had one
        if (itemToRemove.discount && itemToRemove.discount > 0) {
          setDiscountAmount(current => current - itemToRemove.discount);
        }
      }
      
      return prev.filter(item => item.id !== itemId);
    });
  }, []);

  // Apply discount to specific item
  const applyItemDiscount = useCallback((itemId: string, discount: number) => {
    setReceiptItems(prev => prev.map(item => {
      if (item.id === itemId) {
        // If item already had a discount, remove it from total first
        if (item.discount && item.discount > 0) {
          setDiscountAmount(current => current - item.discount + discount);
        } else {
          setDiscountAmount(current => current + discount);
        }
        
        // Return updated item
        return { ...item, discount };
      }
      return item;
    }));
  }, []);

  // Apply global discount percentage
  const applyGlobalDiscount = useCallback((percentage: number) => {
    const newDiscountAmount = (subtotal * percentage) / 100;
    setDiscountAmount(newDiscountAmount);
  }, [subtotal]);

  // Update cash paid
  const updateCashPaid = useCallback((amount: number) => {
    setCashPaid(amount);
  }, []);

  // Clear receipt
  const clearReceipt = useCallback(() => {
    setReceiptItems([]);
    setSubtotal(0);
    setDiscountAmount(0);
    setCashPaid(0);
  }, []);

  return {
    receiptItems,
    subtotal,
    vat,
    discountAmount,
    total,
    cashPaid,
    change,
    addItem,
    removeItem,
    applyItemDiscount,
    applyGlobalDiscount,
    updateCashPaid,
    clearReceipt
  };
};

const POSContainer: React.FC = () => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [showNumberPad, setShowNumberPad] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [loadingItems, setLoadingItems] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const navigate=useNavigate()
  // New state variables for added features
  const [showDiscountPad, setShowDiscountPad] = useState<boolean>(false);
  const [discountItemId, setDiscountItemId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [status, setStatus] = useState<string | null>(null);

  const openDrawer = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_CATEGORY_RECEIPTS_SERVICE_URL}/api/open-drawer`, {
        method: "POST",
     
      });
      const data = await res.json();
      setStatus(data.message || "Drawer opened.");
      toast.success("Drawer opened successfully!");
    } catch (err) {
      setStatus("Error: Could not open drawer.");
    }
  };

  // Use our receipt manager hook
  const {
    receiptItems,
    subtotal,
    vat,
    discountAmount,
    total,
    cashPaid,
    change,
    addItem,
    removeItem,
    applyItemDiscount,
    applyGlobalDiscount,
    updateCashPaid,
    clearReceipt
  } = useReceiptManager();

  // Fetch items when a category is selected
  useEffect(() => {
    if (selectedCategoryId) {
      const fetchItems = async () => {
        setLoadingItems(true);
        setError(null);
        try {
          const response = await fetch(`${import.meta.env.VITE_CATEGORIES_SERVICE_URL}/api/get-items/${selectedCategoryId}`, {
            credentials: 'include', // Include credentials (cookies, auth headers)
          });

          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }

          const data = await response.json();

          // Check if the data is an array
          if (Array.isArray(data)) {
            // NEW: Add categoryId to each item for deduction
            const itemsWithCategory = data.map((item: any) => ({
              ...item,
              categoryId: selectedCategoryId
            }));
            setItems(itemsWithCategory);
          } else {
            setError('Invalid data format: Expected an array of items');
          }
        } catch (error) {
          console.error('Failed to fetch items:', error);
          setError('Failed to fetch items. Please try again later.');
        } finally {
          setLoadingItems(false);
        }
      };

      fetchItems();
    }
  }, [selectedCategoryId]);

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
  };

  const handleSelectItem = (item: Item) => {
    setSelectedItem(item);
    setShowNumberPad(true);
  };

  const handleConfirmQuantity = (quantity: number) => {
    if (selectedItem) {
      addItem(selectedItem, quantity);
    }
    setShowNumberPad(false);
  };

  // Handler for item discount
  const handleItemDiscount = (itemId: string) => {
    setDiscountItemId(itemId);
    setShowDiscountPad(true);
  };

  // Handler for confirming discount amount
  const handleConfirmDiscount = (amount: number) => {
    if (discountItemId) {
      applyItemDiscount(discountItemId, amount);
    }
    setShowDiscountPad(false);
    setDiscountItemId(null);
  };

  // NEW: Direct API call to process sale and deduct inventory (no Redux needed)
  const processSaleDirect = async (soldItems: { categoryId: string; itemId: string; soldQuantity: number }[]) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_CATEGORIES_SERVICE_URL}/api/process-sale`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ soldItems }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process sale');
      }

      const result = await response.json();
      console.log('Inventory updated:', result);
      toast.info('Inventory updated successfully!');
      return result;
    } catch (error: any) {
      console.error('Process sale error:', error);
      throw error; // Re-throw for handling in submit
    }
  };

  // Handler for submitting the receipt
  const handleSubmitReceipt = async () => {
    if (receiptItems.length === 0 || receiptItems.every(item => item.quantity === 0)) {
      toast.warning('Cannot submit an empty receipt');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // NEW: Build soldItems for inventory deduction
      const soldItems = receiptItems.map(rItem => ({
        categoryId: rItem.categoryId,
        itemId: rItem.itemId,
        soldQuantity: rItem.quantity
      }));

      // Process sale to deduct inventory (backend handles stock check)
      await processSaleDirect(soldItems);

      // Prepare receipt data (keep your existing sales logging)
      const receiptData = {
        items: receiptItems,
        subtotal,
        vat,
        discount: discountAmount,
        total,
        cashPaid,
        change
      };
      
      // Send to backend
      const response = await fetch(`${import.meta.env.VITE_CATEGORY_RECEIPTS_SERVICE_URL}/api/submit-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(receiptData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      // Clear receipt after successful submission
      clearReceipt();
      toast.success('Receipt submitted successfully!');
      navigate("/current-receipt")
    } catch (error: any) {
      console.error('Failed to submit receipt:', error);
      // Handle e.g., insufficient stock from backend
      if (error.message?.includes('Insufficient stock')) {
        toast.error(error.message);
      } else {
        toast.error('Failed to submit receipt. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.posContainer}>
      <div className={styles.receiptSection}>
         {status && <p className={styles.statusPrinter}>Status: {status}</p>}
        <Receipt
          items={receiptItems}
          subtotal={subtotal}
          vat={vat}
          discount={discountAmount}
          total={total}
          cashPaid={cashPaid}
          change={change}
          onCashPaidChange={updateCashPaid}
          onRemoveItem={removeItem}
          onItemDiscount={handleItemDiscount}
          onApplyGlobalDiscount={applyGlobalDiscount}
        />
        
        {/* Add the compose button and related controls */}
        <div className={styles.receiptActions}>
          <button 
            className={styles.composeButton}
            onClick={handleSubmitReceipt}
            disabled={submitting || receiptItems.length === 0}
            
          >
            {submitting ? 'Submitting...' : 'Compose Receipt'}
          </button>
          <Link to="/current-receipt">
             <button className={styles.recent} >Recent</button>
             </Link>
          <button className={styles.drawer} onClick={openDrawer}>Drawer</button>
            
         
        </div>
      </div>
  
      <div className={styles.categoriesSection}>
        <CategoryLists onSelectCategory={handleSelectCategory} />
      </div>
  
      <div className={styles.itemsSection}>
        {selectedCategoryId && (
          <>
            {loadingItems && <div className={styles.loading}>Loading items...</div>}
            {error && <div className={styles.error}>{error}</div>}
            <ItemsList items={items} onSelectItem={handleSelectItem} />
          </>
        )}
      </div>
  
      {showNumberPad && (
        <NumberPad
          onClose={() => setShowNumberPad(false)}
          onConfirm={handleConfirmQuantity}
          title="Enter Quantity"
        />
      )}
      
      {/* Add NumberPad for discounts */}
      {showDiscountPad && (
        <NumberPad
          title="Enter Discount Amount"
          onClose={() => {
            setShowDiscountPad(false);
            setDiscountItemId(null);
          }}
          onConfirm={handleConfirmDiscount}
        />
      )}
    </div>
  );
};

export default POSContainer;