import React, { useState } from 'react';
import styles from "./Forms.module.css";
import { useDispatch } from 'react-redux';
import { AppDispatch } from "../Store/store";
import { submitCategory } from '../Store/store';

import { toast } from 'react-toastify';

const Forms: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>(); 
  const [name, setName] = useState('');
  const [image, setImage] = useState<string | null>(null);  // Changed to null initially for clarity
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  
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
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    // FIXED: Only include image if it exists (null/undefined sends nothing, thunk will handle as optional)
    const categoryData = { 
      name: name.trim(), 
      description: description.trim() || '',  // Allow empty description
      image: image || undefined  // Send undefined if no image—thunk fills with ''
    };
    
    try {
       // Creating a new category
       const resultAction = await dispatch(submitCategory(categoryData));

       if (submitCategory.fulfilled.match(resultAction)) {
         console.log('Category added successfully:', resultAction.payload);
         toast.success('Category added successfully!');
         // Reset form
         setName('');
         setImage(null);
         setDescription('');
         // Optional: Reset file input
         const fileInput = document.getElementById('productImage') as HTMLInputElement;
         if (fileInput) fileInput.value = '';
       } else {
         const errorMsg = resultAction.payload ? 
           (resultAction.payload as any).message || 'Failed to create category' : 
           resultAction.error?.message || 'Failed to create category';
         console.error('Failed to add category:', errorMsg);
         setError(errorMsg);
         toast.error(errorMsg);
       }
    } catch (error) {
      console.error('Form submission error:', error);
      const errorMsg = 'Failed to submit form';
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  return (
    <div className={styles.form}>
      <form className={styles.all} onSubmit={handleSubmit}>
        <h4 className={styles.headerCat}>
          CREATE CATEGORY
        </h4>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.itemsContent}>
          <label htmlFor="categoryName">Name of Category</label>
          <input
            id="categoryName"
            type="text"
            placeholder="Category Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className={styles.itemsContent}>
          <label htmlFor="categoryDescription">Category Description</label>  {/* Added label */}
          <textarea
            id="categoryDescription"
            placeholder="Category Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}  // Minor UX: Set rows for better sizing
          />  {/* REMOVED: required—now optional */}
        </div>

        <div className={styles.itemsContent}>
          <label htmlFor="productImage">Upload Product Image (Optional)</label>  {/* Added "Optional" text */}
          <input 
            id="productImage"
            type="file"
            onChange={handleImageUpload}
            accept="image/*"
          />
          {image && <p className={styles.imagePreview}>Image selected: {image.substring(0, 50)}...</p>}  {/* NEW: Preview feedback */}
        </div>

        <button type='submit' className={styles.category}>
          Create Category
        </button>
      </form>
    </div>
  );
};

export default Forms;