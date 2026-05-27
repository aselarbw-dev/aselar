import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../Store/store';
import { submitItem, editItem } from '../Store/store';
import { Item } from '../Store/store';
import styles from "./ItemForm.module.css";

interface ItemFormProps {
  categoryId: string;
  editingItem?: {
    _id: string;
    name: string;
    costPrice: number;
    sellingPrice: number;
    quantity: number;
    user: string;
    expiryDate?: string;
    lowStock?: string;
    unit?: string;
    image?: string;
  } | null;
  onEditComplete?: () => void;
}

const ItemForm: React.FC<ItemFormProps> = ({ categoryId, editingItem, onEditComplete }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [name, setName] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [unit, setUnit] = useState('');  // NEW: Unit state (e.g., 'kg', 'pcs'—optional)
  const [image, setImage] = useState('');  // NEW: Image state if needed (base64 or URL)
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setCostPrice(editingItem.costPrice.toString());
      setSellingPrice(editingItem.sellingPrice.toString());
      setQuantity(editingItem.quantity.toString());
      setExpiryDate(editingItem.expiryDate || '');
      setUnit(editingItem.unit || '');
      setImage(editingItem.image || '');
    } else {
      resetForm();
    }
  }, [editingItem]);

  const resetForm = () => {
    setName('');
    setCostPrice('');
    setSellingPrice('');
    setQuantity('');
    setExpiryDate('');
    setUnit('');
    setImage('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      // FIXED: Construct item without categoryId (it's in payload wrapper)
      const itemData: Omit<Item, '_id'> = {
        name,
        costPrice: parseFloat(costPrice),
        sellingPrice: parseFloat(sellingPrice),
        quantity: parseInt(quantity, 10),
        user: editingItem?.user || "",
        categoryId,  // Item has categoryId
        lowStock: parseInt(quantity, 10) <= 10 ? 'low' : 'ok',  // FIXED: Set as string based on qty (adjust logic if needed)
        unit: unit || '',  // FIXED: Include unit (empty default)
        expiryDate: expiryDate || '',  // FIXED: Include expiryDate
        image: image || ''  // FIXED: Include image (empty default)
      };

      if (editingItem) {
        // For edit, send updates (partial, but include all for safety)
        const updates = {
          name: itemData.name,
          costPrice: itemData.costPrice,
          sellingPrice: itemData.sellingPrice,
          quantity: itemData.quantity,
          lowStock: itemData.lowStock,
          unit: itemData.unit,
          expiryDate: itemData.expiryDate,
          image: itemData.image
        };
        const result = await dispatch(
          editItem({
            categoryId,
            itemId: editingItem._id,
            updates
          })
        ).unwrap();
      
        console.log("Item updated successfully:", result);
        resetForm();
        if (onEditComplete) {
          onEditComplete();
        }
      } else {
        await dispatch(submitItem({ categoryId, item: itemData })).unwrap();
        resetForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error("Error submitting item:", err);
    }
  };

  // NEW: Image upload handler (if you want file support—stubbed)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // NEW: Unit input (optional field—add if units matter)
  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h4>{editingItem ? "EDIT ITEM" : "ADD ITEM"}</h4>
      
      {error && <div className={styles.error}>{error}</div>}

      <input 
        type="text" 
        placeholder="Item Name" 
        value={name} 
        onChange={(e) => setName(e.target.value)} 
        required 
      />
      <input 
        type="number" 
        placeholder="Cost Price" 
        value={costPrice} 
        onChange={(e) => setCostPrice(e.target.value)} 
        required 
        step="0.01"
      />
      <input 
        type="number" 
        placeholder="Selling Price" 
        value={sellingPrice} 
        onChange={(e) => setSellingPrice(e.target.value)} 
        required 
        step="0.01"
      />
      <input 
        type="number" 
        placeholder="Quantity" 
        value={quantity} 
        onChange={(e) => setQuantity(e.target.value)} 
        required 
      />

      {/* NEW: Expiry Date Field */}
      <input 
        type="date" 
        placeholder="Expiry Date (Optional)" 
        value={expiryDate} 
        onChange={(e) => setExpiryDate(e.target.value)} 
        min={new Date().toISOString().split('T')[0]}
      />

      {/* NEW: Unit Field (Optional) */}
      <input 
        type="text" 
        placeholder="Unit (e.g., kg, pcs—Optional)" 
        value={unit} 
        onChange={(e) => setUnit(e.target.value)} 
      />

      {/* NEW: Image Upload (Optional) */}
      <input 
        type="file" 
        accept="image/*" 
        onChange={handleImageUpload} 
      />
      {image && <small>Image selected</small>}

      <button type="submit">
        {editingItem ? "Update Item" : "Add Item"}
      </button>
    </form>
  );
};

export default ItemForm;