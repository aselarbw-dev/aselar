import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../Store/store';
import { FaEdit } from 'react-icons/fa';
import { FaSearch, FaTimes } from 'react-icons/fa'; // NEW

import { removeCategory, getCategories, Item, Category } from '../Store/store';
import styles from './CategoryList.module.css';
import ItemForm from '../Forms/ItemForm';
import { IoMdClose } from 'react-icons/io';
import { IconContext } from "react-icons";
import { FaShoppingCart } from "react-icons/fa";
import { AppDispatch } from '../Store/store';
import ConfirmDialog from '../Dialog/ConfirmDialog';

interface ExpiringItem extends Item {
  category: string;
  daysLeft: number;
}

const CATEGORIES_PER_PAGE = 6;

// NEW: reporting helpers -----------------------------------------------

// Fixed palette so a given slice position always gets the same color
// across renders/categories (easier to scan visually than random colors).
const PIE_COLORS = ['#0b5577', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

const MAX_PIE_SLICES = 5; // top 5 sellers get their own slice, rest roll into "Other"

interface CategorySummary {
  totalUnitsInStock: number;
  totalStockValue: number; // cost-basis value of what's currently on the shelf
  totalRevenue: number;    // cumulative revenue from sales, all time
  totalUnitsSold: number;  // cumulative units sold, all time
  lowStockCount: number;
  pieSlices: { name: string; value: number; color: string }[];
}

const getCategorySummary = (category: Category): CategorySummary => {
  let totalUnitsInStock = 0;
  let totalStockValue = 0;
  let totalRevenue = 0;
  let totalUnitsSold = 0;
  let lowStockCount = 0;

  category.items.forEach((item: Item) => {
    const quantity = Number(item.quantity) || 0;
    const costPrice = Number(item.costPrice) || 0;
    const revenue = Number(item.revenue) || 0;
    const soldQuantity = Number(item.soldQuantity) || 0;

    totalUnitsInStock += quantity;
    totalStockValue += quantity * costPrice;
    totalRevenue += revenue;
    totalUnitsSold += soldQuantity;
    if (item.lowStock) lowStockCount += 1;
  });

  // Build pie data from items that have actually sold something.
  const sellers = category.items
    .filter((item: Item) => (Number(item.soldQuantity) || 0) > 0)
    .sort((a, b) => (Number(b.soldQuantity) || 0) - (Number(a.soldQuantity) || 0));

  const pieSlices: { name: string; value: number; color: string }[] = [];
  const top = sellers.slice(0, MAX_PIE_SLICES);
  const rest = sellers.slice(MAX_PIE_SLICES);

  top.forEach((item, i) => {
    pieSlices.push({ name: item.name, value: Number(item.soldQuantity) || 0, color: PIE_COLORS[i % PIE_COLORS.length] });
  });

  if (rest.length > 0) {
    const restTotal = rest.reduce((sum, item) => sum + (Number(item.soldQuantity) || 0), 0);
    pieSlices.push({ name: 'Other', value: restTotal, color: PIE_COLORS[MAX_PIE_SLICES % PIE_COLORS.length] });
  }

  return { totalUnitsInStock, totalStockValue, totalRevenue, totalUnitsSold, lowStockCount, pieSlices };
};

const formatPula = (value: number) =>
  `${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Pula`;

// NEW: small inline SVG donut chart — no chart library dependency needed.
// Renders each slice as a stroked circle segment via stroke-dasharray/offset.
const DonutChart: React.FC<{ slices: { name: string; value: number; color: string }[] }> = ({ slices }) => {
  const size = 120;
  const radius = 45;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * radius;
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return <p className={styles.noSalesText}>No sales recorded yet for this category</p>;
  }

  let cumulativeOffset = 0;

  return (
    <div className={styles.pieChartWrapper}>
      <svg viewBox={`0 0 ${size} ${size}`} className={styles.pieSvg}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {slices.map((slice, i) => {
            const fraction = slice.value / total;
            const dashLength = fraction * circumference;
            const dashArray = `${dashLength} ${circumference - dashLength}`;
            const dashOffset = -cumulativeOffset;
            cumulativeOffset += dashLength;
            return (
              <circle
                key={`${slice.name}-${i}`}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={strokeWidth}
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
              />
            );
          })}
        </g>
      </svg>
      <ul className={styles.pieLegend}>
        {slices.map((slice, i) => (
          <li key={`${slice.name}-legend-${i}`} className={styles.legendItem}>
            <span className={styles.legendSwatch} style={{ backgroundColor: slice.color }} />
            <span className={styles.legendText}>{slice.name} ({slice.value})</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ------------------------------------------------------------------------

const CategoryList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const categories = useSelector((state: RootState) => state.inventory.categories);
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

  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [expiringItems, setExpiringItems] = useState<ExpiringItem[]>([]);

  const [currentPage, setCurrentPage] = useState(1);

  // NEW: search state
  const [searchTerm, setSearchTerm] = useState('');

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

  useEffect(() => {
    if (categories.length > 0) {
      const now = new Date();
      const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
      const expiring: ExpiringItem[] = [];
      
      categories.forEach((cat) => {
        cat.items.forEach((item: Item) => {
          if (item.expiryDate) {
            const expiry = new Date(item.expiryDate);
            if (expiry <= fiveDaysFromNow && expiry > now) {
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

  // NEW: filter categories by search term — matches category name OR any item name inside it
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categories;

    const term = searchTerm.toLowerCase().trim();

    return categories.filter((category) => {
      const categoryMatches = category.name.toLowerCase().includes(term);
      const itemMatches = category.items.some((item: Item) =>
        item.name.toLowerCase().includes(term)
      );
      return categoryMatches || itemMatches;
    });
  }, [categories, searchTerm]);

  // NEW: reset to page 1 whenever the search term changes, so you don't
  // land on an empty page from a previous, larger result set
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Clamp current page if filtered results shrink
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredCategories.length / CATEGORIES_PER_PAGE));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [filteredCategories.length, currentPage]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'No expiry';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Pagination now operates on filteredCategories instead of categories
  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / CATEGORIES_PER_PAGE));
  const startIndex = (currentPage - 1) * CATEGORIES_PER_PAGE;
  const paginatedCategories = filteredCategories.slice(startIndex, startIndex + CATEGORIES_PER_PAGE);

  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  };

  return (
    <div className={styles.container}>
      {/* NEW: Search bar */}
      <div className={styles.searchBar}>
        <div className={styles.searchInputWrapper}>
          <FaSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search categories or items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          {searchTerm && (
            <FaTimes
              className={styles.clearSearchIcon}
              onClick={() => setSearchTerm('')}
            />
          )}
        </div>
        <span className={styles.resultCount}>
          {searchTerm
            ? `${filteredCategories.length} of ${categories.length} categories`
            : `${categories.length} categories`}
        </span>
      </div>

      <div className={styles.grid}>
        {paginatedCategories.length === 0 && searchTerm ? (
          <p className={styles.noResults}>No categories or items match "{searchTerm}"</p>
        ) : (
          paginatedCategories.map((category, catIndex) => {
            // NEW: per-category reporting summary + pie data
            const summary = getCategorySummary(category);

            return (
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

              {/* NEW: reporting summary — stock value, revenue, units sold, low-stock count */}
              <div className={styles.categorySummary}>
                <div className={styles.summaryGrid}>
                  <div className={`${styles.summaryStat} ${styles.statStock}`}>
                    <span className={styles.summaryLabel}>Stock Value</span>
                    <span className={styles.summaryValue}>{formatPula(summary.totalStockValue)}</span>
                  </div>
                  <div className={`${styles.summaryStat} ${styles.statRevenue}`}>
                    <span className={styles.summaryLabel}>Revenue (All-Time)</span>
                    <span className={styles.summaryValue}>{formatPula(summary.totalRevenue)}</span>
                  </div>
                  <div className={`${styles.summaryStat} ${styles.statUnits}`}>
                    <span className={styles.summaryLabel}>Units in Stock</span>
                    <span className={styles.summaryValue}>{summary.totalUnitsInStock}</span>
                  </div>
                  <div className={`${styles.summaryStat} ${styles.statSold}`}>
                    <span className={styles.summaryLabel}>Units Sold (All-Time)</span>
                    <span className={styles.summaryValue}>{summary.totalUnitsSold}</span>
                  </div>
                  {summary.lowStockCount > 0 && (
                    <div className={`${styles.summaryStat} ${styles.statWarning}`}>
                      <span className={styles.summaryLabel}>Low Stock Items</span>
                      <span className={styles.summaryValueWarning}>{summary.lowStockCount}</span>
                    </div>
                  )}
                </div>

                {/* NEW: what's selling fast in this category */}
                <div className={styles.chartSection}>
                  <span className={styles.chartTitle}>Top Sellers</span>
                  <DonutChart slices={summary.pieSlices} />
                </div>
              </div>

              <div className={styles.itemsContainer}>
                {category.items && category.items.length > 0 ? (
                  <div className={styles.itemsGrid}>
                    {category.items.map((item: Item, itemIndex) => (
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
                       
                        {item.unit && <p>Unit: {item.unit}</p>}
                        {item.expiryDate && <p>Expiry Date: {formatDate(item.expiryDate)}</p>}
                        {/* NEW: per-item sold/revenue, only shown once something has sold */}
                        {(Number(item.soldQuantity) || 0) > 0 && (
                          <p className={styles.itemSalesLine}>
                            Sold: {item.soldQuantity} ({formatPula(Number(item.revenue) || 0)})
                          </p>
                        )}
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
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageButton}
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Prev
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <span key={page} className={styles.pageNumber}>
              <button
                className={`${styles.pageButton} ${page === currentPage ? styles.pageButtonActive : ''}`}
                onClick={() => goToPage(page)}
              >
                {page}
              </button>
            </span>
          ))}

          <span className={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </span>

          <button
            className={styles.pageButton}
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}

      {showExpiryModal && (
        <div className={styles.expiryModalOverlay}>
          <div className={styles.expiryModal}>
            <h3>⚠️ Expiry Alerts</h3>
            <p>These items expire soon—consider selling them!</p>
            <ul>
              {expiringItems.map((item, index) => (
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