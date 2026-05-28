import React, { useEffect, useState } from 'react';
//import axios from 'axios';
import styles from './CategoryLists.module.css';

interface Category {
  _id: string;
  name: string;
}

const CategoriesLists: React.FC<{ onSelectCategory: (categoryId: string) => void }> = ({ onSelectCategory }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_CATEGORIES_SERVICE_URL}api/get-categories1`, {
          credentials: 'include',
           headers: { 'Content-Type': 'application/json',
          'authorization': `Bearer ${localStorage.getItem("token")}`


         }, // Include credentials (cookies, auth headers)
        });
  
        // Check if the response is OK (status code 200-299)
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
  
        // Parse the JSON data
        const data = await response.json();
  
        // Check if the data is an array
        if (Array.isArray(data)) {
           console.log("Categories fetched:", data); // <-- Check this
           console.log("Setting categories");
           console.log("Categories in render:", categories);

          setCategories(data);
        } else {
          setError('Invalid data format: Expected an array of categories');
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        setError('Failed to fetch categories. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
  
    fetchCategories();
  }, []);

  if (loading) {
    return <div className={styles.loading}>Loading categories...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (categories.length === 0) {
    return <div className={styles.empty}>No categories found.</div>;
  }

  return (
    <div className={styles.categoriesList}>
      {categories.map((category) => (
        <div
          key={category._id}
          className={styles.categoryItem}
          onClick={() => onSelectCategory(category._id)}
        >
          {category.name}
        </div>
      ))}
    </div>
  );
};

export default CategoriesLists;