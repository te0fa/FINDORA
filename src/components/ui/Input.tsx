'use client';

import React, { forwardRef, useState } from 'react';
import { Search, Upload as UploadIcon, Check, AlertCircle } from 'lucide-react';

interface BaseInputProps {
  label?: string;
  error?: string;
  success?: boolean;
}

// ──────────────────────────────────────────────────────────────────────────
// 1. TEXT / NUMBER INPUT
// ──────────────────────────────────────────────────────────────────────────
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement>, BaseInputProps {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, success, className = '', type = 'text', style, ...props }, ref) => {
    return (
      <div className="input-group" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {label && <label className="input-label">{label}</label>}
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            ref={ref}
            type={type}
            className={`findora-input ${error ? 'input-error' : ''} ${success ? 'input-success' : ''} ${className}`}
            style={{
              width: '100%',
              padding: '0.85rem 1rem',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(15, 23, 42, 0.6)',
              color: 'var(--text-primary)',
              fontSize: 'var(--font-body)',
              boxSizing: 'border-box',
              outline: 'none',
              transition: 'border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)',
              ...style,
            }}
            {...props}
          />
          {error && (
            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#ef4444' }}>
              <AlertCircle size={18} />
            </span>
          )}
        </div>
        {error && <span className="input-error-msg">{error}</span>}
        <style jsx global>{`
          .input-label {
            font-size: var(--font-label);
            font-weight: 700;
            color: var(--text-secondary);
            margin-bottom: var(--space-8);
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .findora-input:focus {
            border-color: var(--accent);
            box-shadow: 0 0 0 3px rgba(200, 151, 59, 0.15);
            background: rgba(15, 23, 42, 0.85);
          }
          .findora-input.input-error {
            border-color: var(--danger);
          }
          .findora-input.input-error:focus {
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
          }
          .findora-input.input-success {
            border-color: var(--success);
          }
          .input-error-msg {
            color: var(--danger);
            font-size: var(--font-caption);
            margin-top: var(--space-4);
          }
        `}</style>
      </div>
    );
  }
);
Input.displayName = 'Input';

// ──────────────────────────────────────────────────────────────────────────
// 2. TEXTAREA
// ──────────────────────────────────────────────────────────────────────────
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement>, BaseInputProps {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, success, className = '', style, ...props }, ref) => {
    return (
      <div className="input-group" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {label && <label className="input-label">{label}</label>}
        <textarea
          ref={ref}
          className={`findora-input ${error ? 'input-error' : ''} ${className}`}
          style={{
            width: '100%',
            padding: '0.85rem 1rem',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(15, 23, 42, 0.6)',
            color: 'var(--text-primary)',
            fontSize: 'var(--font-body)',
            minHeight: '100px',
            resize: 'vertical',
            boxSizing: 'border-box',
            outline: 'none',
            fontFamily: 'inherit',
            transition: 'border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)',
            ...style,
          }}
          {...props}
        />
        {error && <span className="input-error-msg">{error}</span>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

// ──────────────────────────────────────────────────────────────────────────
// 3. SELECT
// ──────────────────────────────────────────────────────────────────────────
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement>, BaseInputProps {
  options: { label: string; value: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', style, ...props }, ref) => {
    return (
      <div className="input-group" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {label && <label className="input-label">{label}</label>}
        <select
          ref={ref}
          className={`findora-input ${error ? 'input-error' : ''} ${className}`}
          style={{
            width: '100%',
            padding: '0.85rem 1rem',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(15, 23, 42, 0.6)',
            color: 'var(--text-primary)',
            fontSize: 'var(--font-body)',
            boxSizing: 'border-box',
            outline: 'none',
            transition: 'border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)',
            ...style,
          }}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} style={{ background: '#0b0f19', color: '#fff' }}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <span className="input-error-msg">{error}</span>}
      </div>
    );
  }
);
Select.displayName = 'Select';

// ──────────────────────────────────────────────────────────────────────────
// 4. FILE UPLOAD
// ──────────────────────────────────────────────────────────────────────────
export interface UploadProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>, BaseInputProps {
  onFileSelect?: (file: File | null) => void;
}

export const Upload: React.FC<UploadProps> = ({ label, error, onFileSelect, className = '', ...props }) => {
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFileName(file ? file.name : null);
    if (onFileSelect) onFileSelect(file);
  };

  return (
    <div className="input-group" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {label && <label className="input-label">{label}</label>}
      <label
        className="findora-upload-area"
        style={{
          border: '1px dashed var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-24)',
          background: 'rgba(15, 23, 42, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        <input type="file" style={{ display: 'none' }} onChange={handleFileChange} {...props} />
        <UploadIcon size={24} style={{ color: 'var(--accent)', marginBottom: 'var(--space-8)' }} />
        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
          {fileName || 'اضغط لرفع الملفات / Click to upload'}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 'var(--space-4)' }}>
          Max size: 5MB
        </span>
      </label>
      {error && <span className="input-error-msg">{error}</span>}
      <style jsx global>{`
        .findora-upload-area:hover {
          border-color: var(--accent);
          background: rgba(200, 151, 59, 0.04);
        }
      `}</style>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// 5. SEARCH BAR
// ──────────────────────────────────────────────────────────────────────────
export interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (value: string) => void;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  ({ className = '', onSearch, style, ...props }, ref) => {
    const [val, setVal] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setVal(e.target.value);
      if (onSearch) onSearch(e.target.value);
    };

    return (
      <div style={{ position: 'relative', width: '100%' }}>
        <input
          ref={ref}
          type="text"
          value={val}
          onChange={handleChange}
          className={`findora-input ${className}`}
          style={{
            width: '100%',
            padding: '0.85rem 1rem 0.85rem 2.75rem',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(15, 23, 42, 0.6)',
            color: 'var(--text-primary)',
            boxSizing: 'border-box',
            outline: 'none',
            ...style,
          }}
          {...props}
        />
        <Search
          size={18}
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-secondary)',
            pointerEvents: 'none',
          }}
        />
      </div>
    );
  }
);
SearchBar.displayName = 'SearchBar';

// ──────────────────────────────────────────────────────────────────────────
// 6. OTP SEGMENTED INPUT (4-Digits)
// ──────────────────────────────────────────────────────────────────────────
export interface OTPInputProps {
  length?: number;
  onChange?: (code: string) => void;
}

export const OTPInput: React.FC<OTPInputProps> = ({ length = 4, onChange }) => {
  const [code, setCode] = useState<string[]>(Array(length).fill(''));

  const handleChange = (val: string, index: number) => {
    if (/[^0-9]/.test(val)) return;
    const newCode = [...code];
    newCode[index] = val;
    setCode(newCode);

    if (onChange) onChange(newCode.join(''));

    // Shift focus
    if (val !== '' && index < length - 1) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && code[index] === '' && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  return (
    <div style={{ display: 'flex', gap: 'var(--space-12)', direction: 'ltr', justifyContent: 'center' }}>
      {code.map((digit, i) => (
        <input
          key={i}
          id={`otp-${i}`}
          type="text"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(e.target.value, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          style={{
            width: '50px',
            height: '56px',
            textAlign: 'center',
            fontSize: '1.5rem',
            fontWeight: 800,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            background: 'rgba(15, 23, 42, 0.6)',
            color: '#fff',
            outline: 'none',
          }}
        />
      ))}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// 7. CHECKBOX
// ──────────────────────────────────────────────────────────────────────────
export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, className = '', ...props }) => {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: 'var(--space-8)' }}>
      <input type="checkbox" className="findora-checkbox" style={{ display: 'none' }} {...props} />
      <span className="checkbox-visual">
        <Check size={12} className="check-icon" />
      </span>
      <span style={{ fontSize: '0.9rem', userSelect: 'none' }}>{label}</span>
      <style jsx global>{`
        .checkbox-visual {
          width: 18px;
          height: 18px;
          border-radius: var(--radius-xs);
          border: 1px solid var(--border);
          background: rgba(15, 23, 42, 0.6);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }
        .check-icon {
          opacity: 0;
          color: var(--primary-foreground);
          transition: opacity 0.15s ease;
        }
        input:checked + .checkbox-visual {
          background: var(--accent);
          border-color: var(--accent);
        }
        input:checked + .checkbox-visual .check-icon {
          opacity: 1;
        }
      `}</style>
    </label>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// 8. RADIO
// ──────────────────────────────────────────────────────────────────────────
export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export const Radio: React.FC<RadioProps> = ({ label, className = '', ...props }) => {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: 'var(--space-8)' }}>
      <input type="radio" className="findora-radio" style={{ display: 'none' }} {...props} />
      <span className="radio-visual">
        <span className="radio-dot" />
      </span>
      <span style={{ fontSize: '0.9rem', userSelect: 'none' }}>{label}</span>
      <style jsx global>{`
        .radio-visual {
          width: 18px;
          height: 18px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border);
          background: rgba(15, 23, 42, 0.6);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }
        .radio-dot {
          width: 8px;
          height: 8px;
          border-radius: var(--radius-full);
          background: transparent;
          transition: background 0.15s ease;
        }
        input:checked + .radio-visual {
          border-color: var(--accent);
        }
        input:checked + .radio-visual .radio-dot {
          background: var(--accent);
        }
      `}</style>
    </label>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// 9. TOGGLE / SWITCH
// ──────────────────────────────────────────────────────────────────────────
export interface ToggleProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ label, className = '', ...props }) => {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: 'var(--space-8)' }}>
      <input type="checkbox" style={{ display: 'none' }} {...props} />
      <span className="toggle-visual">
        <span className="toggle-thumb" />
      </span>
      {label && <span style={{ fontSize: '0.9rem', userSelect: 'none' }}>{label}</span>}
      <style jsx global>{`
        .toggle-visual {
          width: 36px;
          height: 20px;
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid var(--border);
          position: relative;
          display: inline-block;
          transition: background var(--duration-fast) var(--ease-standard);
        }
        .toggle-thumb {
          width: 14px;
          height: 14px;
          border-radius: var(--radius-full);
          background: var(--text-secondary);
          position: absolute;
          top: 2px;
          left: 2px;
          transition: transform var(--duration-fast) var(--ease-standard), background var(--duration-fast) var(--ease-standard);
        }
        input:checked + .toggle-visual {
          background: var(--accent-bg);
          border-color: rgba(200, 151, 59, 0.3);
        }
        input:checked + .toggle-visual .toggle-thumb {
          transform: translateX(16px);
          background: var(--accent);
        }
      `}</style>
    </label>
  );
};
