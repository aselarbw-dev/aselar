import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './Calculator.module.css';

const Calculator: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const [result, setResult] = useState<string>('');

  const handleButtonClick = (value: string) => {
    if (value === '=') {
      try {
        setResult(eval(input).toString());
      } catch (error) {
        setResult('Error');
      }
    } else if (value === 'C') {
      setInput('');
      setResult('');
    } else if (value === '.') {
      // Prevent multiple decimal points in a single number
      const lastNumber = input.split(/[\+\-\*\/]/).pop(); // Get the last number in the input
      if (!lastNumber?.includes('.')) {
        setInput((prev) => prev + value);
      }
    } else {
      setInput((prev) => prev + value);
    }
  };

  // Portal target: render directly to body to bypass any parent stacking/overflow issues
  const modalRoot = document.body;

  return createPortal(
    <div className={styles.calculator}>
      <div className={styles.display}>
        <div className={styles.input}>{input}</div>
        <div className={styles.result}>{result}</div>
      </div>
      <div className={styles.buttons}>
        {[
          '7', '8', '9', '/',
          '4', '5', '6', '*',
          '1', '2', '3', '-',
          'C', '0', '.', '=',
          '+'
        ].map((btn) => (
          <button
            key={btn}
            className={styles.button}
            data-value={btn} // Added this to enable special CSS targeting (e.g., for =, C, .)
            onClick={() => handleButtonClick(btn)}
          >
            {btn}
          </button>
        ))}
      </div>
    </div>,
    modalRoot
  );
};

export default Calculator;