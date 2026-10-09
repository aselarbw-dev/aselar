import React, { useState, useEffect, useCallback } from 'react';
import CategoryLists from '../CategoryLists/CategoryLists';
import ItemsList from '../ItemsList/ItemsList';
import NumberPad from '../NumberPad/NumberPad';
import Receipt from '../Receipt/Receipt';
import styles from './POSContainer.module.css';
import {useNavigate,Link} from 'react-router-dom';
import { toast } from 'react-toastify';
import BarcodeScanner from '../Scans/BarcodeScanner'; // Import the BarcodeScanner component
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

// NEW: one row returned by GET /bulk/search
interface SearchResult {
  _id: string;
  name: string;
  sellingPrice: number;
  quantity: number;
  unit: string;
  barcode: string;
  customCode: string;
  categoryId: string;
  categoryName: string;
  matchType: 'code' | 'category_code' | 'text';
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
import { useSellerContext } from '../Sellers/SellerNameProvider'
import { useAuth } from '../context/AuthContext';
import PaymentMethodModal from '../Payment/PaymentMethodModal'; // Import the PaymentMethodModal component
const POSContainer: React.FC = () => {
  const { user } = useAuth();
const scanOnlyMode = user?.scanOnlyMode ?? false;
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [showNumberPad, setShowNumberPad] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [loadingItems, setLoadingItems] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const navigate=useNavigate()
   const [showScanner, setShowScanner] = useState<boolean>(false);
const [scanLookupLoading, setScanLookupLoading] = useState<boolean>(false)
  // New state variables for added features
  const [showDiscountPad, setShowDiscountPad] = useState<boolean>(false);
  const [discountItemId, setDiscountItemId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [status, setStatus] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
const [paymentMethod, setPaymentMethod] = useState<string>('');
// NEW: lay-buy sale type + due date, driven by the payment modal
const [saleType, setSaleType] = useState<'full' | 'laybuy'>('full');
const [laybuyDueDate, setLaybuyDueDate] = useState<string | null>(null);
// NEW: search / filter state (name, category, barcode or custom code)
const [searchTerm, setSearchTerm] = useState<string>('');
const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
const [searchLoading, setSearchLoading] = useState<boolean>(false);
const { sellerName } = useSellerContext();
  
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
          const response = await fetch(`${import.meta.env.VITE_CATEGORIES_SERVICE_URL}api/get-items/${selectedCategoryId}`, {
            credentials: 'include',
             headers: { 'Content-Type': 'application/json',
          'authorization': `Bearer ${localStorage.getItem("token")}`


         }, // Include credentials (cookies, auth headers)
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

  // NEW: calls GET /bulk/search. In scan-only mode only exact codes are returned (codesOnly=true)
  const runSearch = async (term: string, signal?: AbortSignal): Promise<SearchResult[]> => {
    const response = await fetch(
      `${import.meta.env.VITE_CATEGORIES_SERVICE_URL}api/bulk/search?q=${encodeURIComponent(term)}&codesOnly=${scanOnlyMode}`,
      {
        signal,
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data.results) ? data.results : [];
  };

  // NEW: debounced search as the cashier types
  useEffect(() => {
    const term = searchTerm.trim();

    if (!term) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    setSearchLoading(true);

    const timer = setTimeout(async () => {
      try {
        const results = await runSearch(term, controller.signal);
        setSearchResults(results);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Search failed:', err);
          setSearchResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, scanOnlyMode]);

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
  };

  const handleSelectItem = (item: Item) => {
  
    setSelectedItem(item);
    setShowNumberPad(true);
  };

  // NEW: tapping a search result opens the quantity pad, same as clicking an item manually.
  // The search term is kept so the cashier can add another flavour from the same search.
  const handleSelectSearchResult = (result: SearchResult) => {
    handleSelectItem({
      _id: result._id,
      name: result.name,
      sellingPrice: result.sellingPrice,
      categoryId: result.categoryId,
    });
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
const handleBarcodeScan = async (code: string) => {
  setScanLookupLoading(true);

  try {
    const response = await fetch(
      `${import.meta.env.VITE_CATEGORIES_SERVICE_URL}api/bulk/lookup-barcode/${encodeURIComponent(code)}?sellerName=${encodeURIComponent(sellerName)}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    const data = await response.json();

    if (data.found) {
      // Build an Item matching what handleSelectItem expects,
      // then reuse the EXACT same flow as clicking an item manually
      const scannedItem: Item = {
        _id: data.item._id,
        name: data.item.name,
        sellingPrice: data.item.sellingPrice,
        categoryId: data.categoryId,
      };

      toast.success(`Scanned: ${data.item.name}`);
      handleSelectItem(scannedItem); // opens NumberPad, same as manual click
    } else {
      toast.warning('No match found for this code in your inventory.');
    }
  } catch (error) {
    console.error('Barcode lookup error:', error);
    toast.error('Could not look up barcode. Please try again.');
  } finally {
    setScanLookupLoading(false);
  }
};

  // NEW: pressing Enter in the search box. A hardware barcode scanner types the code and
  // presses Enter, and a cashier can type a custom code like 3452 and press Enter.
  // If the text is an exact barcode / custom code we go through the normal scan flow
  // (so it is logged against the seller). Otherwise the result list stays on screen.
  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();

    const term = searchTerm.trim();
    if (!term) return;

    try {
      const results = await runSearch(term);

      if (results.length > 0 && results[0].matchType === 'code') {
        setSearchTerm('');
        await handleBarcodeScan(term);
      } else if (results.length === 0) {
        toast.warning('No items match that search.');
      }
    } catch (err) {
      console.error('Search failed:', err);
      toast.error('Search failed. Please try again.');
    }
  };

  // NEW: Direct API call to process sale and deduct inventory (no Redux needed)
  const processSaleDirect = async (soldItems: { categoryId: string; itemId: string; soldQuantity: number }[],paymentMethod: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_CATEGORIES_SERVICE_URL}api/process-sale`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json',
          'authorization': `Bearer ${localStorage.getItem("token")}`


         },
        body: JSON.stringify({ soldItems, paymentMethod }),
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
// UPDATED: now accepts optional lay-buy details from the modal
const handlePaymentMethodSelect = (method: string, details?: { dueDate?: string }) => {
  setPaymentMethod(method);

  if (method === 'Lay-buy' && details?.dueDate) {
    setSaleType('laybuy');
    setLaybuyDueDate(details.dueDate);
  } else {
    setSaleType('full');
    setLaybuyDueDate(null);
  }

  setShowPaymentModal(false);
  toast.info(`Payment method: ${method}`);
};
  // Handler for submitting the receipt
  const handleSubmitReceipt = async () => {
    if (receiptItems.length === 0 || receiptItems.every(item => item.quantity === 0)) {
      toast.warning('Cannot submit an empty receipt');
      return;
    }

    // NEW: lay-buy specific guardrails, mirrors backend validation
    if (saleType === 'laybuy') {
      if (!laybuyDueDate) {
        toast.warning('Please choose a due date for this lay-buy');
        return;
      }
      if (cashPaid <= 0) {
        toast.warning('A deposit is required to start a lay-buy sale');
        return;
      }
      if (cashPaid >= total) {
        toast.warning('Deposit covers the full total — choose a normal payment method instead');
        return;
      }
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
      await processSaleDirect(soldItems, paymentMethod);

      // Prepare receipt data (keep your existing sales logging)
      const receiptData = {
        items: receiptItems,
        subtotal,
        vat,
        discount: discountAmount,
        total,
        cashPaid,
        change,
        paymentMethod, // NEW
        saleType, // NEW
        dueDate: laybuyDueDate, // NEW
      };
      
      // Send to backend
      const response = await fetch(`${import.meta.env.VITE_CATEGORY_RECEIPTS_SERVICE_URL}api/submit-receipt`, {
        method: 'POST',
         headers: { 'Content-Type': 'application/json',
          'authorization': `Bearer ${localStorage.getItem("token")}`


         },
        credentials: 'include',
        body: JSON.stringify(receiptData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      // Clear receipt after successful submission
      clearReceipt();
      // NEW: reset lay-buy state alongside the rest of the receipt
      setSaleType('full');
      setLaybuyDueDate(null);
      setPaymentMethod('');
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

  const hasSearch = searchTerm.trim().length > 0;

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
          saleType={saleType}
          dueDate={laybuyDueDate}
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
             <Link to="/laybuy-receipts">
             <button className={styles.laybuy} >Laybuys</button>
             </Link>
        <button className={styles.drawer} onClick={() => {
  console.log('Payment button clicked');
  setShowPaymentModal(true);
}}>
  Payment
</button>
            
         
        </div>
      </div>
  
     <div className={styles.categoriesSection}>
  <div className={styles.categoriesHeader}>
    <button
      className={styles.scanToggleButton}
      onClick={() => setShowScanner(!showScanner)}
    >
      {showScanner ? 'Close Scanner' : '📷 Scan Barcode'}
    </button>
    {showScanner && (
      <p className={styles.scannerNote}>
        ⚠️ Best used on a laptop or desktop while plugged in — continuous camera use drains mobile batteries quickly.
      </p>
    )}

    {/* NEW: search / filter — name, category, barcode or custom code */}
    <div className={styles.searchWrapper}>
      <input
        type="text"
        className={styles.searchInput}
        placeholder={scanOnlyMode ? 'Type barcode or custom code…' : '🔍 Search name, category, barcode or code…'}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleSearchKeyDown}
        autoComplete="off"
      />
      {searchTerm && (
        <button
          type="button"
          className={styles.clearSearch}
          onClick={() => setSearchTerm('')}
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  </div>

  {/* NEW: search results replace the category list while the box has text */}
  {hasSearch && (
    <div className={styles.searchResults}>
      {searchLoading && searchResults.length === 0 && (
        <p className={styles.searchEmpty}>Searching...</p>
      )}
      {!searchLoading && searchResults.length === 0 && (
        <p className={styles.searchEmpty}>
          {scanOnlyMode
            ? 'No item with that barcode or code.'
            : 'No matches. Try a different name, barcode or code.'}
        </p>
      )}
      {searchResults.map((result) => (
        <button
          type="button"
          key={`${result.categoryId}-${result._id}`}
          className={styles.searchResultItem}
          onClick={() => handleSelectSearchResult(result)}
        >
          <span className={styles.searchResultName}>{result.name}</span>
          <span className={styles.searchResultMeta}>
            {result.categoryName} · P{Number(result.sellingPrice).toFixed(2)} ·{' '}
            {result.quantity > 0 ? `Qty: ${result.quantity}` : <span className={styles.outOfStock}>Out of stock</span>}
          </span>
          {(result.customCode || result.barcode) && (
            <span className={styles.codeBadge}>{result.customCode || result.barcode}</span>
          )}
        </button>
      ))}
    </div>
  )}

  {/* Scanner / category list stay mounted (display: contents keeps layout identical) so the camera doesn't restart while typing */}
  <div style={{ display: hasSearch ? 'none' : 'contents' }}>
    {showScanner || scanOnlyMode ? (
      <BarcodeScanner onScan={handleBarcodeScan} isActive={showScanner || scanOnlyMode} />
    ) : (
      <CategoryLists onSelectCategory={handleSelectCategory} />
    )}
  </div>
</div>
  
      <div className={styles.itemsSection}>
        {selectedCategoryId && (
          <>
            {loadingItems && <div className={styles.loading}>Loading items...</div>}
            {error && <div className={styles.error}>{error}</div>}
            <ItemsList
  items={items}
  onSelectItem={(item) => {
    if (scanOnlyMode) {
      toast.warning('Scan-only mode is on — please scan the barcode to add this item.');
      return;
    }
    handleSelectItem(item);
  }}
/>
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
      {showPaymentModal && (
  <PaymentMethodModal
    onSelect={handlePaymentMethodSelect}
    onClose={() => setShowPaymentModal(false)}
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