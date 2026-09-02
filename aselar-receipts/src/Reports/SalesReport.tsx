import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';
import styles from './SalesReport.module.css';

// Types mirror the getSalesReport controller response exactly.
interface TopItem {
  itemName: string;
  quantity: number;
  revenue: number;
}

interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  revenue: number;
  unitsSold: number;
  topItems: TopItem[];
}

interface PeriodSummary {
  totalRevenue: number;
  totalUnitsSold: number;
  byCategory: CategoryBreakdown[];
}

interface SalesReportResponse {
  generatedAt: string;
  selectedDate: string;
  selectedDay: PeriodSummary;
  previousDay: PeriodSummary;
  sevenDayAverage: PeriodSummary;
}

const CATEGORIES_PER_PAGE = 10;

const formatPula = (value: number) =>
  `${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Pula`;

const todayDateString = () => new Date().toISOString().slice(0, 10);

// Compares `current` against `baseline` and returns a signed percentage
// plus a direction, for the little up/down indicators next to each stat.
const computeChange = (current: number, baseline: number): { pct: number | null; direction: 'up' | 'down' | 'flat' } => {
  if (baseline === 0) {
    if (current === 0) return { pct: null, direction: 'flat' };
    return { pct: null, direction: 'up' }; // can't express % change from zero meaningfully
  }
  const pct = ((current - baseline) / baseline) * 100;
  if (Math.abs(pct) < 0.5) return { pct, direction: 'flat' };
  return { pct, direction: pct > 0 ? 'up' : 'down' };
};

// Small inline SVG bar chart comparing three revenue figures side by side.
// Plain SVG, no chart library — consistent with the donut chart already
// used in CategoryList.
const ComparisonBarChart: React.FC<{ bars: { label: string; value: number; color: string }[] }> = ({ bars }) => {
  const width = 260;
  const height = 120;
  const barGap = 24;
  const barWidth = 48;
  const maxValue = Math.max(...bars.map((b) => b.value), 1); // avoid divide-by-zero when everything is 0
  const chartHeight = 90;
  const totalBarsWidth = bars.length * barWidth + (bars.length - 1) * barGap;
  const startX = (width - totalBarsWidth) / 2;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={styles.barChartSvg}>
      {bars.map((bar, i) => {
        const barHeight = (bar.value / maxValue) * chartHeight;
        const x = startX + i * (barWidth + barGap);
        const y = chartHeight - barHeight;
        return (
          <g key={bar.label}>
            <rect x={x} y={y} width={barWidth} height={barHeight} rx={4} fill={bar.color} />
            <text x={x + barWidth / 2} y={chartHeight + 16} textAnchor="middle" className={styles.barChartLabel}>
              {bar.label}
            </text>
            <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" className={styles.barChartValue}>
              {bar.value >= 1000 ? `${(bar.value / 1000).toFixed(1)}k` : bar.value.toFixed(0)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// Horizontal bar showing a category's revenue as a share of the largest
// category's revenue on the selected day — lets you scan which category is
// carrying the day without reading every number.
const CategoryShareBar: React.FC<{ value: number; max: number }> = ({ value, max }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={styles.shareBarTrack}>
      <div className={styles.shareBarFill} style={{ width: `${pct}%` }} />
    </div>
  );
};

const ChangeIndicator: React.FC<{ current: number; baseline: number; label: string }> = ({ current, baseline, label }) => {
  const { pct, direction } = computeChange(current, baseline);
  const arrow = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '—';
  const directionClass =
    direction === 'up' ? styles.changeUp : direction === 'down' ? styles.changeDown : styles.changeFlat;

  return (
    <span className={`${styles.changeIndicator} ${directionClass}`}>
      {arrow} {pct !== null ? `${Math.abs(pct).toFixed(0)}%` : (baseline === 0 && current > 0 ? 'new' : 'no change')} vs {label}
    </span>
  );
};

const SalesReport: React.FC = () => {
  const [report, setReport] = useState<SalesReportResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // NEW: which day to view — defaults to today, changeable via the date picker
  const [selectedDate, setSelectedDate] = useState<string>(todayDateString());

  // NEW: search/filter and pagination for the category list
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const fetchReport = useCallback(async (dateToFetch: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_CATEGORIES_SERVICE_URL}api/sales-report?date=${dateToFetch}`,
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data: SalesReportResponse = await response.json();
      setReport(data);
    } catch (err) {
      console.error('Failed to fetch sales report:', err);
      setError('Failed to load sales report. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(selectedDate);
  }, [selectedDate, fetchReport]);

  // NEW: reset to page 1 whenever the date or search term changes, so you
  // don't land on an empty page from a previous, larger result set
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, searchTerm]);

  // NEW: filter + paginate the category list client-side
  const filteredCategories = useMemo(() => {
    if (!report) return [];
    if (!searchTerm.trim()) return report.selectedDay.byCategory;
    const term = searchTerm.toLowerCase().trim();
    return report.selectedDay.byCategory.filter((cat) => cat.categoryName.toLowerCase().includes(term));
  }, [report, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / CATEGORIES_PER_PAGE));
  const paginatedCategories = filteredCategories.slice(
    (currentPage - 1) * CATEGORIES_PER_PAGE,
    currentPage * CATEGORIES_PER_PAGE
  );

  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  };

  if (loading) {
    return <div className={styles.container}><p className={styles.statusText}>Loading sales report...</p></div>;
  }

  if (error || !report) {
    return (
      <div className={styles.container}>
        <p className={styles.errorText}>{error || 'No report data available.'}</p>
        <button className={styles.refreshButton} onClick={() => fetchReport(selectedDate)}>Retry</button>
      </div>
    );
  }

  const { selectedDay, previousDay, sevenDayAverage, generatedAt } = report;
  const isToday = selectedDate === todayDateString();
  const maxCategoryRevenue = Math.max(...selectedDay.byCategory.map((c) => c.revenue), 1);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Daily Sales Report</h1>
          <p className={styles.generatedAt}>Generated {new Date(generatedAt).toLocaleString('en-US')}</p>
        </div>
        <button className={styles.refreshButton} onClick={() => fetchReport(selectedDate)}>Refresh</button>
      </div>

      {/* NEW: date picker to browse any past day's report */}
      <div className={styles.dateBar}>
        <label className={styles.dateLabel} htmlFor="report-date">Viewing:</label>
        <input
          id="report-date"
          type="date"
          value={selectedDate}
          max={todayDateString()}
          onChange={(e) => setSelectedDate(e.target.value)}
          className={styles.dateInput}
        />
        {!isToday && (
          <button className={styles.todayButton} onClick={() => setSelectedDate(todayDateString())}>
            Jump to Today
          </button>
        )}
      </div>

      {/* Overview: selected day's totals vs the day before and vs the 7-day average */}
      <div className={styles.overviewGrid}>
        <div className={`${styles.overviewCard} ${styles.overviewRevenue}`}>
          <span className={styles.overviewLabel}>Revenue</span>
          <span className={styles.overviewValue}>{formatPula(selectedDay.totalRevenue)}</span>
          <ChangeIndicator current={selectedDay.totalRevenue} baseline={previousDay.totalRevenue} label="previous day" />
          <ChangeIndicator current={selectedDay.totalRevenue} baseline={sevenDayAverage.totalRevenue} label="7-day avg" />
        </div>
        <div className={`${styles.overviewCard} ${styles.overviewUnits}`}>
          <span className={styles.overviewLabel}>Units Sold</span>
          <span className={styles.overviewValue}>{selectedDay.totalUnitsSold}</span>
          <ChangeIndicator current={selectedDay.totalUnitsSold} baseline={previousDay.totalUnitsSold} label="previous day" />
          <ChangeIndicator current={selectedDay.totalUnitsSold} baseline={sevenDayAverage.totalUnitsSold} label="7-day avg" />
        </div>
      </div>

      {/* Visual comparison of revenue across the three periods */}
      <div className={styles.chartCard}>
        <span className={styles.overviewLabel}>Revenue: Selected Day vs Previous Day vs 7-Day Avg</span>
        <ComparisonBarChart
          bars={[
            { label: 'Selected', value: selectedDay.totalRevenue, color: '#0b5577' },
            { label: 'Previous', value: previousDay.totalRevenue, color: '#94a3b8' },
            { label: '7-Day Avg', value: sevenDayAverage.totalRevenue, color: '#10b981' },
          ]}
        />
      </div>

      {/* Per-category breakdown, with search and pagination for large category counts */}
      <div className={styles.categorySection}>
        <div className={styles.categorySectionHeader}>
          <h2 className={styles.sectionTitle}>By Category</h2>
          <div className={styles.searchBar}>
            <div className={styles.searchInputWrapper}>
              <FaSearch className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
              {searchTerm && (
                <FaTimes className={styles.clearSearchIcon} onClick={() => setSearchTerm('')} />
              )}
            </div>
            <span className={styles.resultCount}>
              {searchTerm
                ? `${filteredCategories.length} of ${selectedDay.byCategory.length} categories`
                : `${selectedDay.byCategory.length} categories with sales`}
            </span>
          </div>
        </div>

        {filteredCategories.length === 0 ? (
          <p className={styles.statusText}>
            {searchTerm ? `No categories match "${searchTerm}".` : 'No sales recorded for this day.'}
          </p>
        ) : (
          <>
            <div className={styles.categoryList}>
              {paginatedCategories.map((cat) => {
                const previousCat = previousDay.byCategory.find((c) => c.categoryId === cat.categoryId);
                const avgCat = sevenDayAverage.byCategory.find((c) => c.categoryId === cat.categoryId);

                return (
                  <div key={cat.categoryId} className={styles.categoryRow}>
                    <div className={styles.categoryRowHeader}>
                      <span className={styles.categoryName}>{cat.categoryName}</span>
                      <span className={styles.categoryRevenue}>{formatPula(cat.revenue)}</span>
                    </div>
                    {/* This category's revenue relative to the selected day's top category */}
                    <CategoryShareBar value={cat.revenue} max={maxCategoryRevenue} />
                    <div className={styles.categoryMeta}>
                      <span>{cat.unitsSold} units sold</span>
                      <ChangeIndicator current={cat.revenue} baseline={previousCat?.revenue ?? 0} label="previous day" />
                      <ChangeIndicator current={cat.revenue} baseline={avgCat?.revenue ?? 0} label="7-day avg" />
                    </div>
                    {cat.topItems.length > 0 && (
                      <ul className={styles.topItemsList}>
                        {cat.topItems.map((item, i) => (
                          <li key={`${item.itemName}-${i}`} className={styles.topItemRow}>
                            <span className={styles.topItemName}>{item.itemName}</span>
                            <span className={styles.topItemStats}>{item.quantity} sold · {formatPula(item.revenue)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
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
                <span className={styles.pageInfo}>Page {currentPage} of {totalPages}</span>
                <button
                  className={styles.pageButton}
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SalesReport;