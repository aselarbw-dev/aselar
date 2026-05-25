import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './IncomeStatementGenerator.module.css';

// Define interfaces for financial data
interface FinancialEntry {
  description: string;
  amount: number;
}

const IncomeStatementGenerator: React.FC = () => {
  const [stage, setStage] = useState<string>('Initializing');
  const [progressText, setProgressText] = useState<string>('');
  const [showCompletion, setShowCompletion] = useState<boolean>(false);
  const [financialSummary, setFinancialSummary] = useState<{
    totalSales: number;
    totalDirectCosts: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
  }>({
    totalSales: 0,
    totalDirectCosts: 0,
    grossProfit: 0,
    totalExpenses: 0,
    netProfit: 0
  });

  const navigate = useNavigate();

  // Simulated financial data
  const receiptsAndSales: FinancialEntry[] = [
    { description: 'Product Sales', amount: 250000 },
    { description: 'Service Revenue', amount: 75000 },
    { description: 'Consulting Income', amount: 45000 }
  ];

  const directCosts: FinancialEntry[] = [
    { description: 'Raw Materials', amount: 80000 },
    { description: 'Direct Labor', amount: 60000 },
    { description: 'Manufacturing Overhead', amount: 40000 }
  ];

  const expenses: FinancialEntry[] = [
    { description: 'Administrative Salaries', amount: 50000 },
    { description: 'Rent', amount: 15000 },
    { description: 'Utilities', amount: 10000 },
    { description: 'Marketing', amount: 20000 }
  ];

  // Typing animation effect
  const typeText = (text: string, callback?: () => void) => {
    let index = 0;
    const typingInterval = setInterval(() => {
      setProgressText(prev => {
        const newText = prev + (text[index] || '');
        index++;
        
        if (index >= text.length) {
          clearInterval(typingInterval);
          if (callback) callback();
        }
        return newText;
      });
    }, 50);
  };

  // Process stages
  useEffect(() => {
    const processStages = () => {
      // Stage 1: Adding Receipts and Sales
      setStage('Receipts and Sales');
      setProgressText('');
      typeText('Calculating total receipts and sales...\n', () => {
        const totalSales = receiptsAndSales.reduce((sum, entry) => sum + entry.amount, 0);
        
        setFinancialSummary(prev => ({
          ...prev,
          totalSales
        }));

        typeText(`Total Sales: Bwp ${totalSales.toLocaleString()}`, () => {
          // Stage 2: Preparing Trading Account
          setTimeout(() => {
            setStage('Trading Account');
            setProgressText('');
            typeText('Preparing trading account...\n', () => {
              const totalDirectCosts = directCosts.reduce((sum, entry) => sum + entry.amount, 0);
              
              setFinancialSummary(prev => ({
                ...prev,
                totalDirectCosts
              }));

              typeText(`Total Direct Costs: Bwp ${totalDirectCosts.toLocaleString()}\n`, () => {
                const grossProfit = totalSales - totalDirectCosts;
                
                setFinancialSummary(prev => ({
                  ...prev,
                  grossProfit
                }));

                typeText(`Gross Profit: Bwp ${grossProfit.toLocaleString()}`, () => {
                  // Stage 3: Preparing Expenses
                  setTimeout(() => {
                    setStage('Expenses');
                    setProgressText('');
                    typeText('Calculating operating expenses...\n', () => {
                      const totalExpenses = expenses.reduce((sum, entry) => sum + entry.amount, 0);
                      
                      setFinancialSummary(prev => ({
                        ...prev,
                        totalExpenses
                      }));

                      typeText(`Total Expenses: Bwp ${totalExpenses.toLocaleString()}`, () => {
                        // Stage 4: Calculating Net Profit
                        setTimeout(() => {
                          setStage('Net Profit');
                          setProgressText('');
                          typeText('Calculating net profit...\n', () => {
                            const netProfit = grossProfit - totalExpenses;
                            
                            setFinancialSummary(prev => ({
                              ...prev,
                              netProfit
                            }));

                            typeText(`Net Profit: Bwp ${netProfit.toLocaleString()}`, () => {
                              // Show completion and navigate
                              setTimeout(() => {
                                setShowCompletion(true);
                                navigate('/financial-statements', { 
                                  state: { financialSummary }
                                });
                              }, 1000);
                            });
                          });
                        }, 1000);
                      });
                    });
                  }, 1000);
                });
              });
            });
          }, 1000);
        });
      });
    };

    processStages();
  }, [navigate]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Income Statement Generator</h1>
        <div className={styles.terminalOutput}>
          <div className={styles.stageIndicator}>
            <span className={styles.stageLabel}>Current Stage:</span> {stage || 'Initializing'}
          </div>
          <pre className={styles.progressText}>{progressText}</pre>
        </div>
        
        {showCompletion && (
          <div className={styles.completionAlert}>
            Income Statement Prepared Successfully!
          </div>
        )}
      </div>
    </div>
  );
};

export default IncomeStatementGenerator;