// BalanceSheet.tsx
import React, { useState, useRef } from 'react';
import styles from './BalanceSheet.module.css';
import income from '../assets/tesla-logo-7408969_1280.png';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartOptions } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { toPng } from 'html-to-image';
import * as XLSX from 'xlsx';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Type definitions
type FinancialItem = {
  label: string;
  value: number;
  type?: 'asset' | 'liability' | 'equity';
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

interface BalanceSheetProps {
  company?: CompanyInfo;
  period?: string;
  assets?: AccountSection[];
  liabilities?: AccountSection[];
  equity?: AccountSection[];
  currency?: string;
}

const BalanceSheet: React.FC<BalanceSheetProps> = ({
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
  period = "As of December 31, 2023",
  assets = [
    {
      title: "Current Assets",
      items: [
        { label: "Cash and Cash Equivalents", value: 25000.00, type: 'asset' },
        { label: "Accounts Receivable", value: 18000.50, type: 'asset' },
        { label: "Inventory", value: 12000.75, type: 'asset' },
        { label: "Prepaid Expenses", value: 3500.25, type: 'asset' },
      ],
      showTotal: true
    },
    {
      title: "Fixed Assets",
      items: [
        { label: "Property, Plant & Equipment", value: 85000.00, type: 'asset' },
        { label: "Less: Accumulated Depreciation", value: -15000.00, type: 'asset' },
        { label: "Intangible Assets", value: 20000.00, type: 'asset' },
      ],
      showTotal: true
    }
  ],
  liabilities = [
    {
      title: "Current Liabilities",
      items: [
        { label: "Accounts Payable", value: 15000.00, type: 'liability' },
        { label: "Short-term Debt", value: 8000.00, type: 'liability' },
        { label: "Accrued Expenses", value: 5000.50, type: 'liability' },
      ],
      showTotal: true
    },
    {
      title: "Long-term Liabilities",
      items: [
        { label: "Long-term Debt", value: 40000.00, type: 'liability' },
        { label: "Deferred Tax Liability", value: 7500.25, type: 'liability' },
      ],
      showTotal: true
    }
  ],
  equity = [
    {
      title: "Shareholders' Equity",
      items: [
        { label: "Common Stock", value: 50000.00, type: 'equity' },
        { label: "Retained Earnings", value: 28025.75, type: 'equity' },
        { label: "Treasury Stock", value: -5000.00, type: 'equity' },
      ],
      showTotal: true
    }
  ],
  currency = "Pula"
}) => {
  const [showChart, setShowChart] = useState(false);
  const statementRef = useRef<HTMLDivElement>(null);
  
  // Calculate totals
  const totalAssets = assets.reduce((total, section) => {
    return total + section.items.reduce((sum, item) => sum + item.value, 0);
  }, 0);
  
  const totalLiabilities = liabilities.reduce((total, section) => {
    return total + section.items.reduce((sum, item) => sum + item.value, 0);
  }, 0);
  
  const totalEquity = equity.reduce((total, section) => {
    return total + section.items.reduce((sum, item) => sum + item.value, 0);
  }, 0);
  
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

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
      link.download = `${company.name.replace(/\s+/g, '_')}_Balance_Sheet_${period.replace(/\s+/g, '_')}.png`;
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
      ['Balance Sheet', '', '', ''],
      ['Company:', company.name, '', ''],
      ['Period:', period, '', ''],
      ['', '', '', ''],
      ['Assets', '', 'Liabilities & Equity', ''],
      ...assets.flatMap((section, _sectionIndex) => [
        [`${section.title}:`, '', '', ''],
        ...section.items.map(item => [
          item.label,
          formatCurrency(item.value),
          '',
          ''
        ]),
        ...(section.showTotal ? [
          ['Total ' + section.title, 
          formatCurrency(section.items.reduce((sum, item) => sum + item.value, 0)),
          '',
          '']
        ] : [])
      ]),
      ['Total Assets', formatCurrency(totalAssets), '', ''],
      ['', '', '', ''],
      ...liabilities.flatMap(section => [
        [`${section.title}:`, '', '', ''],
        ...section.items.map(item => [
          '',
          '',
          item.label,
          formatCurrency(item.value)
        ]),
        ...(section.showTotal ? [
          ['', '', 
          'Total ' + section.title, 
          formatCurrency(section.items.reduce((sum, item) => sum + item.value, 0))]
        ] : [])
      ]),
      ...equity.flatMap(section => [
        [`${section.title}:`, '', '', ''],
        ...section.items.map(item => [
          '',
          '',
          item.label,
          formatCurrency(item.value)
        ]),
        ...(section.showTotal ? [
          ['', '', 
          'Total ' + section.title, 
          formatCurrency(section.items.reduce((sum, item) => sum + item.value, 0))]
        ] : [])
      ]),
      ['', '', 'Total Liabilities', formatCurrency(totalLiabilities)],
      ['', '', 'Total Equity', formatCurrency(totalEquity)],
      ['', '', 'Total Liabilities & Equity', formatCurrency(totalLiabilitiesAndEquity)]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Balance Sheet');
    
    XLSX.writeFile(workbook, `${company.name.replace(/\s+/g, '_')}_Balance_Sheet_${period.replace(/\s+/g, '_')}.xlsx`);
  };

  // Fixed: Parameters are now prefixed with _ to suppress unused variable warnings
  const renderAccountSection = (
    section: AccountSection, 
    _isLeftColumn: boolean = true, 
    _sectionIndex: number = 0
  ) => {
    return (
      <div className={styles.accountSection}>
        <h5 className={styles.sectionTitle}>{section.title}</h5>
        {section.items.map((item, index) => (
          <div key={index} className={styles.accountItem}>
            <h4>{item.label}</h4>
            <h4 className={styles.number}>{formatCurrency(item.value)}</h4>
          </div>
        ))}
        
        {section.showTotal && (
          <div className={styles.totalRow}>
            <h3>Total {section.title}</h3>
            <h3 className={styles.value}>
              {formatCurrency(section.items.reduce((sum, item) => sum + item.value, 0))}
            </h3>
          </div>
        )}
      </div>
    );
  };

  // Chart data
  const chartData = {
    labels: ['Assets', 'Liabilities', 'Equity'],
    datasets: [
      {
        label: 'Amount',
        data: [totalAssets, totalLiabilities, totalEquity],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(75, 192, 192, 0.6)'
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(75, 192, 192, 1)'
        ],
        borderWidth: 1,
      }
    ]
  };

  // Chart options
  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Balance Sheet Composition',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${currency} ${context.parsed.y.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `${currency} ${Number(value).toLocaleString()}`,
        }
      }
    }
  };

  return (
    <div className={styles.container}>
      <div ref={statementRef} className={styles.balanceSheet}>
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
          <div className={styles.balanceHeader}>
            <h4>Balance Sheet for {company.name.split(' ')[0]}</h4>
            <h5>{period}</h5>
          </div>
          
          {/* Two-column layout */}
          <div className={styles.columns}>
            {/* Assets Column */}
            <div className={styles.assetsColumn}>
              <div className={styles.columnHeader}>
                <h4>Assets</h4>
              </div>
              {assets.map((section, sectionIndex) => (
                <div key={sectionIndex}>
                  {renderAccountSection(section, true, sectionIndex)}
                </div>
              ))}
              <div className={styles.grandTotal}>
                <h3>Total Assets</h3>
                <h3 className={styles.assetTotal}>{formatCurrency(totalAssets)}</h3>
              </div>
            </div>
            
            {/* Liabilities & Equity Column */}
            <div className={styles.liabilitiesColumn}>
              <div className={styles.columnHeader}>
                <h4>Liabilities & Equity</h4>
              </div>
              {liabilities.map((section, sectionIndex) => (
                <div key={sectionIndex}>
                  {renderAccountSection(section, false, sectionIndex)}
                </div>
              ))}
              {equity.map((section, sectionIndex) => (
                <div key={sectionIndex}>
                  {renderAccountSection(section, false, sectionIndex)}
                </div>
              ))}
              <div className={styles.grandTotal}>
                <h3>Total Liabilities</h3>
                <h3 className={styles.liabilityTotal}>{formatCurrency(totalLiabilities)}</h3>
              </div>
              <div className={styles.grandTotal}>
                <h3>Total Equity</h3>
                <h3 className={styles.equityTotal}>{formatCurrency(totalEquity)}</h3>
              </div>
              <div className={styles.grandTotal}>
                <h3>Total Liabilities & Equity</h3>
                <h3 className={styles.totalBalance}>{formatCurrency(totalLiabilitiesAndEquity)}</h3>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className={styles.statementButtons}>
            <button className={styles.printStatement} onClick={() => window.print()}>Print</button>
            <button className={styles.pdfExport} onClick={generatePDF}>Save as PDF</button>
            <button className={styles.excelExport} onClick={exportToExcel}>Export Excel</button>
            <button className={styles.chartToggle} onClick={() => setShowChart(!showChart)}>
              {showChart ? 'Hide Chart' : 'Show Chart'}
            </button>
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

export default BalanceSheet;