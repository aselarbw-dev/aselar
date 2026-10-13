import React, { useEffect, useState } from 'react';

interface NumericInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number;                       // the real number your state holds
  onValueChange: (value: number) => void; // always called with a number (empty -> 0)
  min?: number;
  max?: number;
}

const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onValueChange,
  min,
  max,
  placeholder = '0',
  ...rest
}) => {
  // what the box displays; empty when the value is 0 so there's no stray "0"
  const [text, setText] = useState<string>(value ? String(value) : '');

  // if the parent changes the value (reset, loaded data, etc.), resync the text
  useEffect(() => {
    if (Number(text || 0) !== value) {
      setText(value ? String(value) : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    let num = Number(raw) || 0;
    let nextText = raw;

    // optional clamping
    if (raw !== '' && max !== undefined && num > max) {
      num = max;
      nextText = String(max);
    }
    if (raw !== '' && min !== undefined && num < min) {
      num = min;
      nextText = String(min);
    }

    setText(nextText);
    onValueChange(num);
  };

  return (
    <input
      {...rest}
      type="number"
      min={min}
      max={max}
      value={text}
      placeholder={placeholder}
      onChange={handleChange}
    />
  );
};

export default NumericInput;