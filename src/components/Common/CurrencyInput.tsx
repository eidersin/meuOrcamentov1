import React, { useState, useEffect } from 'react';
import { formatCurrencyInput, parseCurrencyInput } from '../../lib/utils';

interface CurrencyInputProps {
  value: string | number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
  required?: boolean;
}

export function CurrencyInput({ 
  value, 
  onChange, 
  placeholder = "R$ 0,00", 
  className = "",
  disabled = false,
  error = false,
  required = false
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    if (typeof value === 'number') {
      setDisplayValue(formatCurrencyInput(value));
    } else if (typeof value === 'string') {
      setDisplayValue(value);
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formattedValue = formatCurrencyInput(rawValue);
    const numericValue = parseCurrencyInput(formattedValue);
    
    setDisplayValue(formattedValue);
    onChange(numericValue);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      className={`${className} ${error ? 'border-red-300' : 'border-gray-300'}`}
    />
  );
}