import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './Calculator.module.css';

interface CalculatorProps {
  onClose: () => void;
}

// Module-level state: survives Calculator unmount/remount (e.g. closing and
// reopening the dropdown) since it lives outside the component function.
// Resets only on a full page reload — matches "temporary until cleared" intent.
let persistedInput = '';
let persistedResult = '';
let persistedMemory = 0;

/**
 * Safely evaluates a basic arithmetic expression (+, -, *, /, decimals only).
 * Deliberately avoids eval()/Function() — only accepts digits, ".", and
 * + - * / as characters, then parses with standard operator precedence
 * (multiply/divide before add/subtract) via a small recursive-descent parser.
 * Throws on anything unexpected — no arbitrary code can ever execute here.
 */
function safeEvaluate(expression: string): number {
  const sanitized = expression.replace(/\s+/g, '');
  if (sanitized === '') throw new Error('Empty expression');
  if (!/^[0-9.+\-*/]+$/.test(sanitized)) {
    throw new Error('Invalid characters in expression');
  }

  let pos = 0;

  const peek = () => sanitized[pos];
  const consume = () => sanitized[pos++];

  function parseNumber(): number {
    let start = pos;
    if (peek() === '-') consume(); // leading unary minus (e.g. after * or /)
    while (pos < sanitized.length && /[0-9.]/.test(peek())) consume();
    const numStr = sanitized.slice(start, pos);
    if (numStr === '' || numStr === '-' || (numStr.match(/\./g) || []).length > 1) {
      throw new Error('Malformed number');
    }
    const num = parseFloat(numStr);
    if (Number.isNaN(num)) throw new Error('Malformed number');
    return num;
  }

  function parseTerm(): number {
    let value = parseNumber();
    while (pos < sanitized.length && (peek() === '*' || peek() === '/')) {
      const op = consume();
      const next = parseNumber();
      if (op === '*') {
        value *= next;
      } else {
        if (next === 0) throw new Error('Division by zero');
        value /= next;
      }
    }
    return value;
  }

  function parseExpression(): number {
    let value = parseTerm();
    while (pos < sanitized.length && (peek() === '+' || peek() === '-')) {
      const op = consume();
      const next = parseTerm();
      value = op === '+' ? value + next : value - next;
    }
    return value;
  }

  const result = parseExpression();
  if (pos !== sanitized.length) throw new Error('Unexpected trailing characters');
  return result;
}

const Calculator: React.FC<CalculatorProps> = ({ onClose }) => {
  const [input, setInput] = useState<string>(persistedInput);
  const [result, setResult] = useState<string>(persistedResult);
  const [memory, setMemory] = useState<number>(persistedMemory);

  const updateInput = (value: string) => {
    persistedInput = value;
    setInput(value);
  };

  const updateResult = (value: string) => {
    persistedResult = value;
    setResult(value);
  };

  const updateMemory = (value: number) => {
    persistedMemory = value;
    setMemory(value);
  };

  const handleButtonClick = (value: string) => {
    if (value === '=') {
      try {
        const evaluated = safeEvaluate(input);
        updateResult(evaluated.toString());
      } catch (error) {
        updateResult('Error');
      }
    } else if (value === 'C') {
      updateInput('');
      updateResult('');
    } else if (value === 'MC') {
      updateMemory(0);
    } else if (value === 'MR') {
      updateInput(input + memory.toString());
    } else if (value === 'M+') {
      const current = parseFloat(result || input) || 0;
      updateMemory(memory + current);
    } else if (value === 'M-') {
      const current = parseFloat(result || input) || 0;
      updateMemory(memory - current);
    } else if (value === '.') {
      const lastNumber = input.split(/[\+\-\*\/]/).pop();
      if (!lastNumber?.includes('.')) {
        updateInput(input + value);
      }
    } else {
      updateInput(input + value);
    }
  };

  const modalRoot = document.body;

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.calculator} onClick={(e) => e.stopPropagation()}>
        <div className={styles.calcHeader}>
          <span>Calculator {memory !== 0 && <span className={styles.memoryBadge}>M</span>}</span>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className={styles.display}>
          <div className={styles.input}>{input}</div>
          <div className={styles.result}>{result}</div>
        </div>

        <div className={styles.buttons}>
          {[
            'MC', 'MR', 'M+', 'M-',
            '7', '8', '9', '/',
            '4', '5', '6', '*',
            '1', '2', '3', '-',
            'C', '0', '.', '=',
            '+'
          ].map((btn) => (
            <button
              key={btn}
              className={styles.button}
              data-value={btn}
              onClick={() => handleButtonClick(btn)}
            >
              {btn}
            </button>
          ))}
        </div>
      </div>
    </div>,
    modalRoot
  );
};

export default Calculator;