// ReviewTable.tsx
import { useState, useEffect } from 'react';
import styles from './ReviewTable.module.css';

interface ParsedRow {
  category: string;
  name: string;
  costPrice: number;
  barcode?: string;
  sellingPrice: number;
  quantity: number;
  unit: string;
  expiryDate: string;
  rowIndex: number;
  valid: boolean;
}

interface MatchInfo {
  status: 'matched' | 'possible_match' | 'new';
  confidence: number;
  matchType?: 'barcode' | 'name' | 'none';
  matchedId: string | null;
  matchedName: string | null;
}

interface PreviewResult {
  rowIndex: number;
  original: ParsedRow;
  status?: 'invalid';
  reason?: string;
  category?: MatchInfo;
  item?: MatchInfo;
}

// The final, editable state per row — what the user has confirmed/edited,
// ready to be sent to /bulk/commit
interface ReviewRow {
  rowIndex: number;
  category: string;
  name: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  barcode: string;
  unit: string;
  expiryDate: string;
  categoryStatus: 'matched' | 'possible_match' | 'new' | 'invalid';
  categoryMatchedId: string | null;
  categoryMatchedName: string | null;
  itemStatus: 'matched' | 'possible_match' | 'new' | 'invalid';
  itemMatchedId: string | null;
  itemMatchedName: string | null;
  itemMatchType: 'barcode' | 'name' | 'none';
  useCategoryMatch: boolean; // user's decision: accept suggested match or treat as new
  useItemMatch: boolean;
  included: boolean; // user can exclude a row entirely from commit
}

interface ReviewTableProps {
  parsedRows: ParsedRow[];
  onCommitSuccess: (results: any) => void;
}

const ReviewTable: React.FC<ReviewTableProps> = ({ parsedRows, onCommitSuccess }) => {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [isCommitting, setIsCommitting] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    fetchPreview();
  }, []);

  const fetchPreview = async () => {
    setIsLoadingPreview(true);
    setPreviewError(null);

    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${import.meta.env.VITE_CATEGORIES_SERVICE_URL}api/bulk/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rows: parsedRows }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPreviewError(data.message || 'Failed to preview import.');
        return;
      }

      const reviewRows: ReviewRow[] = data.preview.map((p: PreviewResult) => {
        const isInvalid = p.status === 'invalid';

        return {
          rowIndex: p.rowIndex,
          category: p.original.category,
          name: p.original.name,
          costPrice: p.original.costPrice,
          sellingPrice: p.original.sellingPrice,
          quantity: p.original.quantity,
          unit: p.original.unit,
          expiryDate: p.original.expiryDate,
          barcode: isInvalid ? '' : (p.original.barcode || ''),
          categoryStatus: isInvalid ? 'invalid' : p.category!.status,
          categoryMatchedId: isInvalid ? null : p.category!.matchedId,
          categoryMatchedName: isInvalid ? null : p.category!.matchedName,
          itemMatchType: isInvalid ? 'none' : (p.item?.matchType || 'none'),
          itemStatus: isInvalid ? 'invalid' : p.item!.status,
          itemMatchedId: isInvalid ? null : p.item!.matchedId,
          itemMatchedName: isInvalid ? null : p.item!.matchedName,
          // Default: auto-accept high-confidence matches, leave possible_match
          // unchecked so the user has to consciously confirm it
          useCategoryMatch: !isInvalid && p.category!.status === 'matched',
          useItemMatch: !isInvalid && p.item!.status === 'matched',
          included: !isInvalid,
        };
      });

      setRows(reviewRows);
    } catch (error) {
      console.error('Preview fetch error:', error);
      setPreviewError('Something went wrong loading the preview. Please try again.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const updateRow = (rowIndex: number, updates: Partial<ReviewRow>) => {
    setRows(prev =>
      prev.map(r => (r.rowIndex === rowIndex ? { ...r, ...updates } : r))
    );
  };

  const handleCommit = async () => {
    const rowsToCommit = rows
      .filter(r => r.included)
      .map(r => ({
        category: r.category,
        name: r.name,
        barcode: r.barcode,
        costPrice: r.costPrice,
        sellingPrice: r.sellingPrice,
        quantity: r.quantity,
        unit: r.unit,
        expiryDate: r.expiryDate,
        categoryDecision: r.useCategoryMatch && r.categoryMatchedId
          ? { action: 'use_existing', categoryId: r.categoryMatchedId }
          : { action: 'create_new' },
        itemDecision: r.useItemMatch && r.itemMatchedId
          ? { action: 'use_existing', itemId: r.itemMatchedId }
          : { action: 'create_new' },
      }));

    if (rowsToCommit.length === 0) {
      setPreviewError('No rows selected to import.');
      return;
    }

    setIsCommitting(true);

    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${import.meta.env.VITE_CATEGORIES_SERVICE_URL}api/bulk/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rows: rowsToCommit }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPreviewError(data.message || 'Failed to commit import.');
        return;
      }

      onCommitSuccess(data);
    } catch (error) {
      console.error('Commit error:', error);
      setPreviewError('Something went wrong committing the import. Please try again.');
    } finally {
      setIsCommitting(false);
    }
  };

  if (isLoadingPreview) {
    return <p className={styles.loadingText}>Matching against your existing inventory...</p>;
  }

  if (previewError && rows.length === 0) {
    return <p className={styles.errorText}>{previewError}</p>;
  }

  const matchedCount = rows.filter(r => r.categoryStatus === 'matched' && r.itemStatus === 'matched').length;
  const possibleCount = rows.filter(r => r.categoryStatus === 'possible_match' || r.itemStatus === 'possible_match').length;
  const newCount = rows.filter(r => r.categoryStatus === 'new' && r.itemStatus === 'new').length;

  return (
    <div className={styles.reviewWrapper}>
      <div className={styles.summaryBar}>
        <span className={styles.summaryMatched}>{matchedCount} matched</span>
        <span className={styles.summaryPossible}>{possibleCount} to confirm</span>
        <span className={styles.summaryNew}>{newCount} new</span>
      </div>

      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th></th>
              <th>Category</th>
              <th>Item</th>
              <th>Barcode</th>
              <th>Cost</th>
              <th>Price</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Expiry</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.rowIndex} className={!row.included ? styles.excludedRow : ''}>
                <td>
                  <input
                    type="checkbox"
                    checked={row.included}
                    onChange={(e) => updateRow(row.rowIndex, { included: e.target.checked })}
                    title="Include this row in the import"
                  />
                </td>

                <td>
                  <div className={styles.cellStack}>
                    <input
                      type="text"
                      value={row.category}
                      onChange={(e) => updateRow(row.rowIndex, { category: e.target.value })}
                      className={styles.textInput}
                      disabled={!row.included}
                    />
                    {row.categoryStatus === 'matched' && (
                      <span className={styles.badgeMatched}>✓ {row.categoryMatchedName}</span>
                    )}
                    {row.categoryStatus === 'possible_match' && (
                      <label className={styles.badgePossible}>
                        <input
                          type="checkbox"
                          checked={row.useCategoryMatch}
                          onChange={(e) => updateRow(row.rowIndex, { useCategoryMatch: e.target.checked })}
                        />
                        Use existing "{row.categoryMatchedName}"?
                      </label>
                    )}
                    {row.categoryStatus === 'new' && (
                      <span className={styles.badgeNew}>New category</span>
                    )}
                  </div>
                </td>

                <td>
                  <div className={styles.cellStack}>
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => updateRow(row.rowIndex, { name: e.target.value })}
                      className={styles.textInput}
                      disabled={!row.included}
                    />
                    {/* Barcode match — certain, shown distinctly from a name-based match */}
                    {row.itemStatus === 'matched' && row.itemMatchType === 'barcode' && (
                      <span className={styles.badgeBarcode}>🔗 Matched by barcode</span>
                    )}
                    {/* Name-based match — the original green checkmark */}
                    {row.itemStatus === 'matched' && row.itemMatchType !== 'barcode' && (
                      <span className={styles.badgeMatched}>✓ {row.itemMatchedName}</span>
                    )}
                    {row.itemStatus === 'possible_match' && (
                      <label className={styles.badgePossible}>
                        <input
                          type="checkbox"
                          checked={row.useItemMatch}
                          onChange={(e) => updateRow(row.rowIndex, { useItemMatch: e.target.checked })}
                        />
                        Use existing "{row.itemMatchedName}"?
                      </label>
                    )}
                    {row.itemStatus === 'new' && (
                      <span className={styles.badgeNew}>New item</span>
                    )}
                  </div>
                </td>

                <td>
                  <input
                    type="text"
                    value={row.barcode}
                    onChange={(e) => updateRow(row.rowIndex, { barcode: e.target.value })}
                    className={styles.barcodeInput}
                    disabled={!row.included}
                    placeholder="—"
                  />
                </td>

                <td>
                  <input
                    type="number"
                    value={row.costPrice}
                    onChange={(e) => updateRow(row.rowIndex, { costPrice: parseFloat(e.target.value) || 0 })}
                    className={styles.numberInput}
                    disabled={!row.included}
                  />
                </td>

                <td>
                  <input
                    type="number"
                    value={row.sellingPrice}
                    onChange={(e) => updateRow(row.rowIndex, { sellingPrice: parseFloat(e.target.value) || 0 })}
                    className={styles.numberInput}
                    disabled={!row.included}
                  />
                </td>

                <td>
                  <input
                    type="number"
                    value={row.quantity}
                    onChange={(e) => updateRow(row.rowIndex, { quantity: parseInt(e.target.value, 10) || 0 })}
                    className={styles.numberInput}
                    disabled={!row.included}
                  />
                </td>

                <td>
                  <input
                    type="text"
                    value={row.unit}
                    onChange={(e) => updateRow(row.rowIndex, { unit: e.target.value })}
                    className={styles.unitInput}
                    disabled={!row.included}
                  />
                </td>

                <td>
                  <input
                    type="date"
                    value={row.expiryDate}
                    onChange={(e) => updateRow(row.rowIndex, { expiryDate: e.target.value })}
                    className={styles.dateInput}
                    disabled={!row.included}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {previewError && <p className={styles.errorText}>{previewError}</p>}

      <button
        className={styles.commitButton}
        onClick={handleCommit}
        disabled={isCommitting}
      >
        {isCommitting ? 'Importing...' : `Import ${rows.filter(r => r.included).length} Items`}
      </button>
    </div>
  );
};

export default ReviewTable;