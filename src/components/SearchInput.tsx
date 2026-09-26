import React from 'react';
import { cn } from './cn';

/**
 * SearchInput — the Make search field (UI-20.4).
 *
 * Promoted from the Order Cockpit: 40px high, a 24px search glyph inset 12px,
 * text 14px. `bordered` (default) is the field on a white surface;
 * `borderless` is the one that sits in a toolbar that already draws the edge
 * (Core's table controls). The name is required twice on purpose: the
 * placeholder disappears as soon as the operator types, the accessible name
 * must not.
 */
export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  variant?: 'bordered' | 'borderless';
  disabled?: boolean;
  testId?: string;
  className?: string;
}

const SearchIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden
    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#171717]">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
);

export const SearchInput: React.FC<SearchInputProps> = ({
  value, onChange, placeholder, ariaLabel, variant = 'bordered', disabled = false, testId, className,
}) => (
  <div className={cn('relative', className)}>
    <SearchIcon />
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      disabled={disabled}
      data-testid={testId}
      className={cn(
        'h-10 w-full rounded-md pl-12 pr-4 text-[14px] text-primary-neutral tabular-nums outline-none placeholder:text-slate-400',
        variant === 'bordered' ? 'border border-slate-200 focus:border-primary-blue' : 'border border-transparent bg-transparent',
        disabled ? 'cursor-not-allowed bg-slate-50' : variant === 'bordered' && 'bg-white',
      )}
    />
  </div>
);
export default SearchInput;
