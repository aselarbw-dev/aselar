import React from 'react';
import styles from './ItemsList.module.css';

interface Item {
  _id: string;
  name: string;
  sellingPrice: number;
  quantity?: number; // Made optional to match POS's Item type
  lowStock?: boolean; // Made optional—only used in inventory views
}

interface ItemsListProps {
  items: Item[] | null; // Allow items to be null or an array
  onSelectItem: (item: Item) => void;
}

const ItemsList: React.FC<ItemsListProps> = ({ items, onSelectItem }) => {
  // If items is null or not an array, show a message
  if (!items || !Array.isArray(items)) {
    return <div className={styles.error}>No items available.</div>;
  }

  // If items is an empty array, show a message
  if (items.length === 0) {
    return <div className={styles.empty}>No items found in this category.</div>;
  }

  return (
    <div className={styles.itemsList}>
      {items.map((item) => (
        <div
          key={item._id}
          className={styles.item}
          onClick={() => onSelectItem(item)}
        >
          <span>{item.name}</span>
          <span>P{item.sellingPrice.toFixed(2)}</span>
          {/* NEW: Qty display + low-stock warning (only if available) */}
          {item.quantity !== undefined && (
            <span className={styles.itemQty}>
              Qty: {item.quantity}
              {item.lowStock && (
                <span className={styles.restockWarning}>
                  ⚠️ Restock!
                </span>
              )}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

export default ItemsList;