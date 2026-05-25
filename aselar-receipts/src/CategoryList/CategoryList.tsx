import React, { useState, useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../Store/store';
import { FaEdit } from 'react-icons/fa';  // For edit icon

import { removeCategory, getCategories, Item } from '../Store/store';  // FIXED: Import Item
import styles from './CategoryList.module.css';
import ItemForm from '../Forms/ItemForm';
import { IoMdClose } from 'react-icons/io';
import { IconContext } from "react-icons";
import { FaShoppingCart } from "react-icons/fa";
import { AppDispatch } from '../Store/store';
import ConfirmDialog from '../Dialog/ConfirmDialog';

// FIXED: Interface for typed expiring items
interface ExpiringItem extends Item {
  category: string;
  daysLeft: number;
}

const CategoryList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const categories = useSelector((state: RootState) => state.inventory.categories);
  // REMOVED: Unused loading selector
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editMode, setEditMode] = useState({
    isOpen: false,
    type: '',
    itemId: '',
    categoryId: '',
    data: null as any
  });
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    itemId: '',
    itemType: '',
    categoryId: ''
  });

  // NEW: Expiry modal state
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [expiringItems, setExpiringItems] = useState<ExpiringItem[]>([]);

  const handleToggleItemForm = (categoryId: string) => {
    setSelectedCategory(selectedCategory === categoryId ? null : categoryId);
    setEditMode({
      isOpen: false,
      type: '',
      itemId: '',
      categoryId: '',
      data: null
    });
  };
  
  const handleEditClick = (type: string, data: any, categoryId: string, itemId?: string) => {
    setEditMode({
      isOpen: true,
      type,
      itemId: itemId || '',
      categoryId,
      data
    });
    if (type === 'item') {
      setSelectedCategory(categoryId);
    }
    console.log("Editing Item Data:", data);
  };
  
  const handleEditComplete = useCallback(() => {
    setEditMode({
      isOpen: false,
      type: '',
      itemId: '',
      categoryId: '',
      data: null
    });
    // Refetch after edit
    dispatch(getCategories());
  }, [dispatch]);
  
  const handleDeleteClick = (id: string, type: string, categoryId?: string) => {
    setDeleteDialog({
      isOpen: true,
      itemId: id,
      itemType: type,
      categoryId: categoryId || ''
    });
  };

  const handleDeleteConfirm = () => {
    if (deleteDialog.itemType === 'category') {
      dispatch(removeCategory(deleteDialog.itemId));
    }
    setDeleteDialog({ isOpen: false, itemId: '', itemType: '', categoryId: '' });
  };

  // FIXED: Expiry check useEffect with typing
  useEffect(() => {
    if (categories.length > 0) {
      const now = new Date();
      const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);  // +5 days
      const expiring: ExpiringItem[] = [];  // Explicit type
      
      categories.forEach((cat) => {
        cat.items.forEach((item: Item) => {  // FIXED: Explicit Item type for item
          if (item.expiryDate) {
            const expiry = new Date(item.expiryDate);
            if (expiry <= fiveDaysFromNow && expiry > now) {  // Expiring soon, not past
              expiring.push({ 
                ...item, 
                category: cat.name, 
                daysLeft: Math.ceil((expiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) 
              });
            }
          }
        });
      });
      
      if (expiring.length > 0) {
        setExpiringItems(expiring);
        setShowExpiryModal(true);
      }
    }
  }, [categories]);

  // Helper to format date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'No expiry';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // FIXED: Add key to outer map (redundant but ensures no warning)
  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {categories.map((category, catIndex) => (  // FIXED: Added catIndex as fallback key
          <div key={category._id || catIndex} className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardActions}>
                <IoMdClose
                  className={styles.removeButton}
                  onClick={() => handleDeleteClick(category._id, 'category')}
                />
              </div>
            </div>
            
            <div className={styles.imageContainer}>
              {category.image ? (
                <img 
                  src={category.image} 
                  alt={category.name} 
                  className={styles.categoryImage}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <div className={styles.placeholderImage}>
                  No Image
                </div>
              )}
            </div>

            <div className={styles.categoryInfo}>
              <h2>{category.name}</h2>
              <p>{category.description}</p>
            </div>

            <div className={styles.itemsContainer}>
              {category.items && category.items.length > 0 ? (
                <div className={styles.itemsGrid}>
                  {category.items.map((item: Item, itemIndex) => (  // FIXED: Added itemIndex as fallback key
                    <div key={item._id || itemIndex} className={styles.itemCard}>
                      <div className={styles.itemHoverContainer}>
                        <FaEdit
                          className={styles.hoverEditButton}
                          onClick={() => handleEditClick('item', item, category._id, item._id)}
                        />
                      </div>
                      {item.image && (
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className={styles.itemImage}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}
                      <h4>{item.name}</h4>
                      <p>
                        Quantity: {item.quantity}
                        {item.lowStock && (
                          <span className={styles.restockWarning}>
                            ⚠️ Restock!
                          </span>
                        )}
                      </p>
                      <p>Cost: {item.costPrice} Pula</p>
                      <p>Price: {item.sellingPrice} Pula</p>
                     
                      {/* FIXED: Conditional render for unit/expiry to avoid blank lines */}
                      {item.unit && <p>Unit: {item.unit}</p>}
                      {item.expiryDate && <p>Expiry Date: {formatDate(item.expiryDate)}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.noItems}>No items in this category</p>
              )}
            </div>

            <div className={styles.cardFooter}>
              <button 
                className={styles.addItemButton}
                onClick={() => handleToggleItemForm(category._id)}
              >
                <IconContext.Provider value={{className: styles.cartIcon}}>
                  <FaShoppingCart />
                </IconContext.Provider>
                {selectedCategory === category._id ? 'Close' : 'Add Item'}
              </button>
            </div>
            {selectedCategory === category._id && (
              <div className={styles.itemForm}>
                <ItemForm 
                  categoryId={category._id} 
                  editingItem={editMode.isOpen && editMode.categoryId === category._id ? editMode.data : null}
                  onEditComplete={handleEditComplete}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* NEW: Expiry Modal */}
      {showExpiryModal && (
        <div className={styles.expiryModalOverlay}>
          <div className={styles.expiryModal}>
            <h3>⚠️ Expiry Alerts</h3>
            <p>These items expire soon—consider selling them!</p>
            <ul>
              {expiringItems.map((item, index) => (  // FIXED: Added index as fallback key
                <li key={item._id || index}>
                  <strong>{item.name}</strong> (in {item.daysLeft} days) - Category: {item.category}
                </li>
              ))}
            </ul>
            <button onClick={() => setShowExpiryModal(false)} className={styles.modalButton}>
              Got it, I'll handle it
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ ...deleteDialog, isOpen: false })}
        onConfirm={handleDeleteConfirm}
        title="Delete Confirmation"
        message={`Are you sure you want to delete this ${deleteDialog.itemType}? This action cannot be undone.`}
      />
    </div>
  );
};

export default CategoryList;