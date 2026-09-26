import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from './cn';
import type { DropdownOption } from './Dropdown';
import { useEscapeKey } from './useEscapeKey';

const CheckIcon = ({ className }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const RemoveIcon = ({ className }: { className?: string }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
  </svg>
);


/** How long a typeahead buffer keeps accumulating before it restarts. */
const TYPEAHEAD_RESET_MS = 500;

export interface MultiSelectDropdownProps<T = string> {
  options: DropdownOption<T>[];
  values: T[];
  onChange: (values: T[]) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  required?: boolean;
  /**
   * When `true`, the open menu renders a filter input that narrows the options
   * case-insensitively by label, mirroring `Dropdown`'s `searchable`.
   */
  searchable?: boolean;
  searchPlaceholder?: string;
  /**
   * Label for a selected value that is NOT in `options`, plus an optional badge
   * to render beside its chip.
   *
   * This exists because "the options list" and "what is currently selected" are
   * not the same set. The materials drawer offers only ACTIVE material classes,
   * but a material can carry a membership whose class has since been archived. A
   * component that rendered only the intersection would drop that chip silently,
   * and the next save (which sends the full set) would strip the membership
   * without the user ever seeing it. Returning `null` means "I cannot resolve
   * this", and the chip falls back to the raw value.
   */
  resolveMissingOption?: (value: T) => { label: string; badge?: string } | null;
  /** Root `data-testid`; chip and option testids are derived from it. */
  testId?: string;
}

/**
 * Multi-select counterpart to `Dropdown`: the same field styling, chevron
 * and menu, but the trigger renders each selected value as a removable chip and
 * menu items TOGGLE membership instead of replacing the selection.
 *
 * Clearing is "remove every chip" rather than a dedicated sentinel option: with
 * a list there is no ambiguity between "nothing selected" and "explicitly none",
 * so the empty array is the only empty state a caller has to handle.
 *
 * The menu stays OPEN after a toggle (where `Dropdown` closes on select),
 * because picking several values is the whole point; it closes on an outside
 * click or on the trigger.
 */
/**
 * Promoted from Core's `components/MultiSelectDropdown` (UI-20.4), unchanged
 * apart from the package's own icons; the single-value `Dropdown` is its
 * sibling.
 */
export function MultiSelectDropdown<T = string>({
  options,
  values,
  onChange,
  placeholder = 'Select...',
  disabled,
  label,
  required = false,
  searchable = false,
  searchPlaceholder = 'Search…',
  resolveMissingOption,
  testId = 'multi-select',
}: MultiSelectDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  // Index into `visibleOptions` of the highlighted (not yet toggled) option,
  // or -1 for none. Highlight is not membership: it is what Enter would flip.
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ buffer: '', at: 0 });

  const listboxId = `${testId}-listbox`;
  const optionDomId = (index: number) => `${listboxId}-option-${index}`;

  const visibleOptions =
    searchable && searchTerm.trim() !== ''
      ? options.filter((option) =>
          option.label.toLowerCase().includes(searchTerm.trim().toLowerCase()),
        )
      : options;

  const selectableIndexes = visibleOptions.reduce<number[]>((indexes, option, index) => {
    if (!option.disabled) indexes.push(index);
    return indexes;
  }, []);

  const closeAndRefocus = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Escape goes through the shared stack rather than a local listener, so an
  // open dropdown inside a modal is the topmost registrant and swallows the
  // Escape that would otherwise close the modal under it.
  useEscapeKey(isOpen && !disabled, closeAndRefocus);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Clear the search term and the highlight whenever the menu closes, so it
  // reopens unfiltered and pointing at nothing.
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setActiveIndex(-1);
    }
  }, [isOpen]);

  // Move focus into the filter input on open: it is where the next keystroke
  // is meant to land, and the arrow keys are handled there too.
  useEffect(() => {
    if (isOpen && searchable) {
      searchRef.current?.focus();
    }
  }, [isOpen, searchable]);

  // A dropdown disabled while its menu is open must not leave the menu
  // rendered under a dead trigger.
  useEffect(() => {
    if (disabled) setIsOpen(false);
  }, [disabled]);

  // Keep the highlighted option in view: with `max-h-60` on the list, a
  // keyboard-only user is otherwise moving a highlight they cannot see.
  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    const active = listRef.current?.querySelector('[data-active-option="true"]');
    // `scrollIntoView` is not implemented in jsdom, so this is an optional call
    // rather than a line every consuming test has to stub around.
    active?.scrollIntoView?.({ block: 'nearest' });
  }, [isOpen, activeIndex]);

  const toggle = (value: T) => {
    onChange(
      values.includes(value) ? values.filter((current) => current !== value) : [...values, value],
    );
  };

  const openMenu = (index: number) => {
    setIsOpen(true);
    setActiveIndex(index);
  };

  const moveActive = (delta: number) => {
    if (selectableIndexes.length === 0) return;
    const current = selectableIndexes.indexOf(activeIndex);
    const next =
      current === -1
        ? delta > 0
          ? 0
          : selectableIndexes.length - 1
        : (current + delta + selectableIndexes.length) % selectableIndexes.length;
    setActiveIndex(selectableIndexes[next]);
  };

  const toggleActive = () => {
    const option = visibleOptions[activeIndex];
    if (!option || option.disabled) return;
    // The menu deliberately stays open: picking several values is the point.
    toggle(option.value);
  };

  /** Jump to the next option whose label starts with the typed characters. */
  const runTypeahead = (character: string) => {
    const now = Date.now();
    const buffer =
      now - typeahead.current.at > TYPEAHEAD_RESET_MS
        ? character
        : typeahead.current.buffer + character;
    typeahead.current = { buffer, at: now };

    const from = activeIndex + 1;
    const ordered = [
      ...selectableIndexes.filter((index) => index >= from),
      ...selectableIndexes.filter((index) => index < from),
    ];
    const match = ordered.find((index) =>
      visibleOptions[index].label.toLowerCase().startsWith(buffer.toLowerCase()),
    );
    if (match !== undefined) setActiveIndex(match);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (disabled) return;

    if (!isOpen) {
      switch (event.key) {
        case 'ArrowDown':
        case 'Enter':
        case ' ':
        case 'Home':
          event.preventDefault();
          openMenu(selectableIndexes[0] ?? -1);
          return;
        case 'ArrowUp':
        case 'End':
          event.preventDefault();
          openMenu(selectableIndexes[selectableIndexes.length - 1] ?? -1);
          return;
        default:
          return;
      }
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveActive(1);
        return;
      case 'ArrowUp':
        event.preventDefault();
        moveActive(-1);
        return;
      case 'Home':
        event.preventDefault();
        if (selectableIndexes.length > 0) setActiveIndex(selectableIndexes[0]);
        return;
      case 'End':
        event.preventDefault();
        if (selectableIndexes.length > 0)
          setActiveIndex(selectableIndexes[selectableIndexes.length - 1]);
        return;
      case 'Enter':
        event.preventDefault();
        toggleActive();
        return;
      case ' ':
        // In `searchable` mode a space is a character in the query, not a
        // "toggle this" gesture.
        if (searchable) return;
        event.preventDefault();
        toggleActive();
        return;
      case 'Tab':
        // Do NOT preventDefault: the point is to let focus move on.
        setIsOpen(false);
        return;
      default:
        if (!searchable && event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
          event.preventDefault();
          runTypeahead(event.key);
        }
    }
  };

  const remove = (event: ReactMouseEvent, value: T) => {
    // The chip's X sits inside the trigger, so without this the click would
    // also toggle the menu open.
    event.stopPropagation();
    onChange(values.filter((current) => current !== value));
  };

  const chipFor = (value: T): { label: string; badge?: string } => {
    const option = options.find((candidate) => candidate.value === value);
    if (option) return { label: option.label };
    return resolveMissingOption?.(value) ?? { label: String(value) };
  };

  return (
    <div className="flex flex-col gap-1" ref={containerRef}>
      {label && (
        <span className="text-body-sm-emphasis text-primary-neutral">
          {label}
          {required && <span className="ml-0.5 text-error">*</span>}
        </span>
      )}
      <div className="relative">
        {/* A `div`, not a `button`: each chip carries its own remove button,
            and a button nested inside a button is neither valid HTML nor
            reachable by a screen reader as its own control. `tabIndex` and
            the keydown handler keep it fully focusable and operable. */}
        <div
          ref={triggerRef}
          data-testid={`${testId}-trigger`}
          role="combobox"
          tabIndex={disabled ? -1 : 0}
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-required={required}
          aria-disabled={disabled}
          aria-activedescendant={
            searchable ? undefined : isOpen && activeIndex >= 0 ? optionDomId(activeIndex) : undefined
          }
          onClick={() => {
            if (disabled) return;
            if (isOpen) setIsOpen(false);
            else openMenu(selectableIndexes[0] ?? -1);
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex min-h-9 w-full items-center justify-between gap-2 rounded-md border bg-slate-50 px-3 py-1 text-left text-body text-primary-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue',
            'border-slate-200',
            disabled && 'cursor-not-allowed bg-slate-200 text-slate-400',
          )}
        >
          {values.length === 0 ? (
            <span className="text-slate-400">{placeholder}</span>
          ) : (
            <span className="flex flex-wrap items-center gap-1.5 py-0.5">
              {values.map((value) => {
                const chip = chipFor(value);
                return (
                  <span
                    key={String(value)}
                    data-testid={`${testId}-chip-${String(value)}`}
                    className="inline-flex items-center gap-1 rounded-full bg-selected-blue px-2 py-0.5 text-body-xs text-primary-blue"
                  >
                    {chip.label}
                    {chip.badge && (
                      <span
                        data-testid={`${testId}-chip-badge-${String(value)}`}
                        className="rounded-full bg-slate-100 px-1.5 text-body-xs text-slate-500"
                      >
                        {chip.badge}
                      </span>
                    )}
                    {!disabled && (
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={`Remove ${chip.label}`}
                        data-testid={`${testId}-chip-remove-${String(value)}`}
                        onClick={(event) => remove(event, value)}
                        className="text-primary-blue hover:text-primary-neutral"
                      >
                        <RemoveIcon className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                );
              })}
            </span>
          )}
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-slate-400" />
        </div>
        {isOpen && !disabled && (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-mantsu-md">
            {searchable && (
              <div className="px-2 pb-1 pt-2">
                <input
                  type="text"
                  ref={searchRef}
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setActiveIndex(-1);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-controls={listboxId}
                  aria-expanded
                  aria-activedescendant={activeIndex >= 0 ? optionDomId(activeIndex) : undefined}
                  data-testid={`${testId}-search`}
                  className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-body-sm text-primary-neutral focus:border-primary-blue focus:outline-none"
                />
              </div>
            )}
            <ul
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-multiselectable
              aria-label={label}
              data-testid={`${testId}-options`}
              className="max-h-60 overflow-y-auto py-1"
            >
              {visibleOptions.map((option, index) => {
                const isSelected = values.includes(option.value);
                const isActive = index === activeIndex;
                return (
                  <li
                    key={String(option.value)}
                    id={optionDomId(index)}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled}
                    data-active-option={isActive || undefined}
                    data-testid={`${testId}-option-${String(option.value)}`}
                    onClick={() => {
                      if (!option.disabled) toggle(option.value);
                    }}
                    onMouseMove={() => {
                      if (!option.disabled && activeIndex !== index) setActiveIndex(index);
                    }}
                    className={cn(
                      'flex cursor-pointer items-center justify-between px-3 py-2 text-left text-body',
                      isSelected
                        ? 'bg-selected-blue font-bold text-primary-blue'
                        : 'text-primary-neutral',
                      isActive && !isSelected && 'bg-slate-50',
                      isActive && 'ring-1 ring-inset ring-primary-blue',
                      option.disabled && 'cursor-not-allowed text-slate-400',
                    )}
                  >
                    <span>{option.label}</span>
                    {isSelected && <CheckIcon className="h-4 w-4 shrink-0" />}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
