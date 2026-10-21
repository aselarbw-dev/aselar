import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../Store/store';
import { submitItem, editItem } from '../Store/store';
import { Item } from '../Store/store';
import styles from "./ItemForm.module.css";

// Image resize settings — tweak these if you want sharper or smaller images
const MAX_IMAGE_DIMENSION = 1000;   // longest side in pixels
const IMAGE_QUALITY = 0.8;          // JPEG quality, 0 to 1
const MAX_RAW_FILE_MB = 15;         // reject absurdly large originals before even trying

// Shrink an image file in the browser and return it as a base64 JPEG data URL
const resizeImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      const longest = Math.max(width, height);
      if (longest > MAX_IMAGE_DIMENSION) {
        const scale = MAX_IMAGE_DIMENSION / longest;
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not process image'));
        return;
      }

      // White background so transparent PNGs don't turn black when saved as JPEG
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/jpeg', IMAGE_QUALITY));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read that image file'));
    };

    img.src = objectUrl;
  });

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
  // Called after an item is added OR updated, so the list can refresh
  onEditComplete?: () => void;
}

const ItemForm: React.FC<ItemFormProps> = ({ categoryId, editingItem, onEditComplete }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [name, setName] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [unit, setUnit] = useState('');
  const [image, setImage] = useState('');
  const [processingImage, setProcessingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // NEW: upload progress. uploadPercent stays null until the upload reports a real
  // number; while null the bar shows a moving "working" state instead of a percentage.
  const [submitting, setSubmitting] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);

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
    setSubmitting(true);
    setUploadPercent(null);

    // NEW: handed to the store thunks so they can report real upload progress
    const onUploadProgress = (percent: number) => {
      setUploadPercent(Math.min(100, Math.max(0, Math.round(percent))));
    };

    try {
      const itemData: Omit<Item, '_id'> = {
        name,
        costPrice: parseFloat(costPrice),
        sellingPrice: parseFloat(sellingPrice),
        quantity: parseInt(quantity, 10),
        user: editingItem?.user || "",
        categoryId,
        lowStock: parseInt(quantity, 10) <= 10 ? 'low' : 'ok',
        unit: unit || '',
        expiryDate: expiryDate || '',
        image: image || ''
      };

      if (editingItem) {
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
        // `as any` only because the thunk's argument type doesn't list onUploadProgress yet;
        // thunks that ignore it keep working exactly as before
        const result = await dispatch(
          editItem({
            categoryId,
            itemId: editingItem._id,
            updates,
            onUploadProgress
          } as any)
        ).unwrap();
      
        console.log("Item updated successfully:", result);
        resetForm();
        if (onEditComplete) {
          onEditComplete();
        }
      } else {
        await dispatch(
          submitItem({ categoryId, item: itemData, onUploadProgress } as any)
        ).unwrap();
        resetForm();
        // NEW: refresh the list after an add too, so the category picks up the
        // image the server just saved on it
        if (onEditComplete) {
          onEditComplete();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error("Error submitting item:", err);
    } finally {
      setSubmitting(false);
      setUploadPercent(null);
    }
  };

  // Resizes the picked image in the browser before storing it as base64
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      e.target.value = '';
      return;
    }

    if (file.size > MAX_RAW_FILE_MB * 1024 * 1024) {
      setError(`That image is over ${MAX_RAW_FILE_MB}MB. Please choose a smaller one.`);
      e.target.value = '';
      return;
    }

    setProcessingImage(true);
    try {
      const resized = await resizeImage(file);
      setImage(resized);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image');
      e.target.value = '';
    } finally {
      setProcessingImage(false);
    }
  };

  // NEW: the bar only appears when a newly picked image (base64) is being sent.
  // An unchanged image is already a URL, so there's nothing to upload.
  const showUploadProgress = submitting && image.startsWith('data:');

  const progressLabel =
    uploadPercent === null
      ? 'Uploading image...'
      : uploadPercent >= 100
        ? 'Finishing up...'
        : `Uploading image... ${uploadPercent}%`;

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

      <input 
        type="date" 
        placeholder="Expiry Date (Optional)" 
        value={expiryDate} 
        onChange={(e) => setExpiryDate(e.target.value)} 
        min={new Date().toISOString().split('T')[0]}
      />

      <input 
        type="text" 
        placeholder="Unit (e.g., kg, pcs—Optional)" 
        value={unit} 
        onChange={(e) => setUnit(e.target.value)} 
      />

      <input 
        type="file" 
        accept="image/*" 
        onChange={handleImageUpload} 
        disabled={submitting}
      />
      {processingImage && <small>Processing image...</small>}
      {!processingImage && !submitting && image && <small>Image selected</small>}

      {/* NEW: upload progress bar */}
      {showUploadProgress && (
        <div
          className={styles.progressWrap}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={uploadPercent ?? undefined}
          aria-label="Image upload progress"
        >
          <div className={styles.progressTrack}>
            <div
              className={`${styles.progressFill} ${uploadPercent === null ? styles.progressIndeterminate : ''}`}
              style={uploadPercent === null ? undefined : { width: `${uploadPercent}%` }}
            />
          </div>
          <small className={styles.progressLabel}>{progressLabel}</small>
        </div>
      )}

      <button type="submit" disabled={processingImage || submitting}>
        {submitting ? "Saving..." : editingItem ? "Update Item" : "Add Item"}
      </button>
    </form>
  );
};

export default ItemForm;