import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { FaTrashAlt } from 'react-icons/fa';

import { RootState, AppDispatch, getCategories } from '../Store/store';
import ConfirmDialog from '../Dialog/ConfirmDialog';
import styles from './DeleteAllCategories.module.css';

// Deletes every category (and its items) for this account.
// Lives in the Inventory toolbar instead of on the category cards,
// so it can't be hit by accident while hovering over a card.
const DeleteAllCategories: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const categories = useSelector((state: RootState) => state.inventory.categories);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDialogOpen(false);
    setDeleting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_CATEGORIES_SERVICE_URL}api/delete-all-categories`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      toast.success('All categories deleted');
      dispatch(getCategories()); // refresh the list from the server
    } catch (error) {
      console.error('Delete all categories failed:', error);
      toast.error('Failed to delete all categories. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // Nothing to delete, so don't show the button at all
  if (categories.length === 0) return null;

  return (
    <>
      <button
        type="button"
        className={styles.deleteAllButton}
        onClick={() => setDialogOpen(true)}
        disabled={deleting}
      >
        <FaTrashAlt />
        {deleting ? 'Deleting…' : 'Delete All Categories'}
      </button>

      <ConfirmDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleConfirm}
        title="Delete ALL Categories"
        message={`This will permanently delete all ${categories.length} categories and every item inside them. This action cannot be undone.`}
      />
    </>
  );
};

export default DeleteAllCategories;