// IncomeStatement.tsx (Cookie-Based Authentication)
import React, { useState, useRef, useEffect } from 'react';
import styles from './IncomeStatement.module.css';
import income from '../assets/tesla-logo-7408969_1280.png';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartOptions } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { toPng } from 'html-to-image';
import * as XLSX from 'xlsx';
import {Link} from "react-router-dom"

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Type definitions
type FinancialItem = {
  label: string;
  value: number;
  type?: 'debit' | 'credit';
};

type AccountSection = {
  title: string;
  items: FinancialItem[];
  showTotal?: boolean;
};

type CompanyInfo = {
  name: string;
  address: string[];
  contacts: {
    email: string;
    phoneNumbers: string[];
  };
};

// API Response type
type IncomeStatementData = {
  totalSales: number;
  returns: number;
  purchases: number;
  carriageInwards: number;
  grossProfit: number;
  userId?: string; // Optional debug field
};

interface IncomeStatementProps {
  company?: CompanyInfo;
  period?: string;
  expensesAccount?: AccountSection;
  netProfit?: number;
  currency?: string;
}

const IncomeStatement: React.FC<IncomeStatementProps> = ({
  company = {
    name: "Tex-Technology Extreme Pty (LTD)",
    address: [
      "Private Bag,45682,Fair Grounds",
      "TPX Building,4th Floor",
      "Plot 5689,Block 12"
    ],
    contacts: {
      email: "textrobotics@gmail.com",
      phoneNumbers: ["75679216", "72150073"]
    }
  },
  period = "Year Ended December 31, 2023",
  expensesAccount = {
    title: "Expenses Account",
    items: [
      { label: "Rentals", value: 6000.00, type: 'debit' },
      { label: "Taxation", value: 1000.00, type: 'debit' },
      { label: "Payments", value: 20000.00, type: 'debit' },
      { label: "Bad Debts", value: 2200.00, type: 'debit' }
    ],
    showTotal: true
  },
  netProfit = 32800.80,
  currency = "Pula"
}) => {
  const [showChart, setShowChart] = useState(false);
  const [tradingData, setTradingData] = useState<IncomeStatementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null); // For debugging
  const statementRef = useRef<HTMLDivElement>(null);
  
  // Fetch trading account data from API
  useEffect(() => {
    const fetchTradingData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 Debug Info:');
        console.log('🍪 Document cookies:', document.cookie);
        console.log('🚀 Making API call to:', '/api/income-statement');
        
        // Set debug info for display
        setDebugInfo({
          cookiesAvailable: !!document.cookie,
          cookieString: document.cookie || 'No cookies found',
          timestamp: new Date().toISOString()
        });

        // Make the API call with cookies
        const response = await fetch('http://localhost:5008/api/income-statement', {
          method: 'GET',
          mode: 'cors', // Ensure CORS is enabled
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Send cookies with request
        });

        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.log('❌ Error response body:', errorText);
          
          if (response.status === 404) {
            throw new Error('No sales data found in the system');
          } else if (response.status === 401) {
            throw new Error(`Unauthorized access (401). Authentication cookie may be missing or expired. Response: ${errorText}`);
          } else {
            throw new Error(`Failed to fetch data (${response.status}): ${errorText}`);
          }
        }

        const data: IncomeStatementData = await response.json();
        console.log('✅ Success! Data received:', data);
        setTradingData(data);
        
      } catch (err) {
        console.error('❌ Error fetching trading data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load trading account data');
      } finally {
        setLoading(false);
      }
    };

    fetchTradingData();
  }, []);

  // Create dynamic trading account from API data
  const getDynamicTradingAccount = (): AccountSection => {
    if (!tradingData) {
      return {
        title: "Trading Account",
        items: [
          { label: "Sales", value: 0, type: 'credit' },
          { label: "Returns inwards", value: 0, type: 'debit' },
          { label: "Purchases", value: 0, type: 'debit' },
          { label: "Carriage Inwards", value: 0, type: 'debit' }
        ],
        showTotal: true
      };
    }

    return {
      title: "Trading Account",
      items: [
        { label: "Sales", value: tradingData.totalSales, type: 'credit' },
        { label: "Returns inwards", value: tradingData.returns, type: 'debit' },
        { label: "Purchases", value: tradingData.purchases, type: 'debit' },
        { label: "Carriage Inwards", value: tradingData.carriageInwards, type: 'debit' }
      ],
      showTotal: true
    };
  };

  const tradingAccount = getDynamicTradingAccount();
  
  // Calculate totals
  const tradingTotal = tradingAccount.items.reduce((sum, item) => {
    return item.type === 'credit' ? sum + item.value : sum - item.value;
  }, 0);

  const expensesTotal = expensesAccount.items.reduce((sum, item) => sum + item.value, 0);
  const dynamicGrossProfit = tradingData ? tradingData.grossProfit : tradingTotal;

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Generate PDF
  const generatePDF = async () => {
    if (!statementRef.current) return;
    
    try {
      const dataUrl = await toPng(statementRef.current, { quality: 0.95 });
      const link = document.createElement('a');
      link.download = `${company.name.replace(/\s+/g, '_')}_Income_Statement_${period.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    const worksheetData = [
      ['Income Statement', '', '', ''],
      ['Company:', company.name, '', ''],
      ['Period:', period, '', ''],
      ['', '', '', ''],
      ['Account', 'Description', 'Debit', 'Credit'],
      ...tradingAccount.items.map(item => [
        tradingAccount.title,
        item.label,
        item.type === 'debit' ? formatCurrency(item.value) : '',
        item.type === 'credit' ? formatCurrency(item.value) : ''
      ]),
      [tradingAccount.title, 'Gross Profit', '', formatCurrency(dynamicGrossProfit)],
      ...expensesAccount.items.map(item => [
        expensesAccount.title,
        item.label,
        formatCurrency(item.value),
        ''
      ]),
      [expensesAccount.title, 'Total Expenses', formatCurrency(expensesTotal), ''],
      ['', 'Net Profit', '', formatCurrency(netProfit)]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Income Statement');
    
    XLSX.writeFile(workbook, `${company.name.replace(/\s+/g, '_')}_Income_Statement_${period.replace(/\s+/g, '_')}.xlsx`);
  };

  // Render account section
  const renderAccountSection = (section: AccountSection, isExpense = false) => {
    return (
      <div className={isExpense ? styles.expenses : styles.tradingItems}>
        <h5>{section.title}</h5>
        {section.items.map((item, index) => (
          <div key={index} className={styles.accountItem}>
            <h4>{item.label}</h4>
            {item.type === 'debit' && <h4 className={styles.number}>{formatCurrency(item.value)}</h4>}
            {item.type === 'credit' && (
              <>
                <div></div>
                <h4 className={styles.number}>{formatCurrency(item.value)}</h4>
              </>
            )}
            {!item.type && <h4 className={styles.number}>{formatCurrency(item.value)}</h4>}
          </div>
        ))}
        
        {section.showTotal && (
          <div className={styles.totalRow}>
            <h3>{isExpense ? 'Total Expenses' : 'Gross Profit'}</h3>
            {!isExpense && <div></div>}
            <h3 className={isExpense ? styles.exp : styles.value}>
              {isExpense ? `(${formatCurrency(expensesTotal)})` : formatCurrency(dynamicGrossProfit)}
            </h3>
          </div>
        )}
      </div>
    );
  };

  // Retry function for failed requests
  const retryFetch = () => {
    setError(null);
    setLoading(true);
    window.location.reload();
  };

  // Chart data
  const chartData = {
    labels: tradingAccount.items.concat(expensesAccount.items).map(item => item.label),
    datasets: [
      {
        label: 'Debit',
        data: tradingAccount.items.concat(expensesAccount.items).map(item => 
          item.type === 'debit' ? item.value : 0
        ),
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
      {
        label: 'Credit',
        data: tradingAccount.items.concat(expensesAccount.items).map(item => 
          item.type === 'credit' ? item.value : 0
        ),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      }
    ]
  };

  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Income Statement Breakdown',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => {
            if (typeof value === 'string') {
              return `${currency} ${parseFloat(value).toLocaleString()}`;
            }
            return `${currency} ${value.toLocaleString()}`;
          }
        }
      }
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <h3>Loading Income Statement Data...</h3>
          <p>Fetching trading account information from database</p>
          
          {/* Cookie Debug Info */}
          {debugInfo && (
            <div className={styles.debugInfo}>
              <h4>Cookie Debug Information:</h4>
              <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <h3>Error Loading Data</h3>
          <p>{error}</p>
          
          {/* Cookie Debug Info */}
          {debugInfo && (
            <div className={styles.debugInfo}>
              <h4>Cookie Debug Information:</h4>
              <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
          )}
          
          <button onClick={retryFetch} className={styles.retryButton}>
            Retry Loading Data
          </button>
          <Link to="/dashboard">
            <button className={styles.backButton}>Back to Dashboard</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div ref={statementRef} className={styles.income}>
        <div className={styles.statement}>
          {/* Company Header */}
          <div className={styles.address}>
            <div className={styles.contatcs}>
              <h4>{company.name}</h4>
              {company.address.map((line, index) => (
                <h4 key={index}>{line}</h4>
              ))}
            </div>
            
            <div className={styles.logo}>
               <img src={income} alt="company logo" />
            </div>
            
            <div className={styles.contacts}>
              <h4>Our Contacts</h4>
              <h4>Email: {company.contacts.email}</h4>
              {company.contacts.phoneNumbers.map((phone, index) => (
                <h4 key={index}>Call: {phone}</h4>
              ))}
            </div>
          </div>
          
          {/* Statement Title */}
          <div className={styles.incomeHeader}>
            <h4>Income Statement for {company.name.split(' ')[0]}</h4>
            <h5>{period}</h5>
          </div>
          
          {/* Currency Header */}
          <div className={styles.double}>
            <div></div>
            <div></div>
            <h4 className={styles.debit}>{currency}-DR</h4>
            <h4 className={styles.credit}>{currency}-CR</h4>
          </div>
          
          {/* Trading Account - Now with dynamic data */}
          {renderAccountSection(tradingAccount)}
          
          {/* Expenses Account - Still static for now */}
          {renderAccountSection(expensesAccount, true)}
          
          {/* Net Profit - Still static for now */}
          <div className={styles.profit}>
            <h3 className={styles.green}>Net Profit</h3>
            <div></div>
            <h3 className={styles.profitValue}>{formatCurrency(netProfit)}</h3>
          </div>
          
          {/* Data Source Indicator */}
          <div className={styles.dataSource}>
            <small>
              Trading Account: Real-time data via cookie authentication | 
              Expenses & Net Profit: Static data (for testing)
            </small>
          </div>
          
          {/* Action Buttons */}
          <div className={styles.statementButtons}>
            <button className={styles.printStatement} onClick={() => window.print()}>Print</button>
            <button className={styles.pdfExport} onClick={generatePDF}>Save as PDF</button>
            <button className={styles.excelExport} onClick={exportToExcel}>Export Excel</button>
            <button className={styles.chartToggle} onClick={() => setShowChart(!showChart)}>
              {showChart ? 'Hide Chart' : 'Show Chart'}
            </button>
            <Link to="/balance-sheet"><button className={styles.sheet}>Balance Sheet</button></Link>
          </div>
        </div>
      </div>
      
      {/* Interactive Chart */}
      {showChart && (
        <div className={styles.chartContainer}>
          <Bar data={chartData} options={chartOptions} />
        </div>
      )}
    </div>
  );
};

export default IncomeStatement;