import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from './cn';
import { ColorSwatch } from './ColorSwatch';
import { useEscapeKey } from './useEscapeKey';

/* ------------------------------------------------------------------ icons */

/**
 * Drawn here rather than imported, matching `Tree` and `Table`. This package
 * has no runtime dependencies and `icons/index.ts` records why: generic
 * pictograms belong to the consuming app, which passes them in as `ReactNode`
 * (`Button.leadingIcon`, `Card.icon`). These three are not consumer choices,
 * they are the control's own affordances — a combobox without a chevron is
 * not a combobox — so they follow the structural precedent instead, at the
 * same 24 viewBox and `currentColor` stroke as the rest of the package.
 */
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const ClearIcon = ({ className }: { className?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
  </svg>
);

/* ---------------------------------------------------------------- contract */

export interface DropdownOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
  /** Optional hex colour: renders a 12px `ColorSwatch` before the label. */
  swatchColor?: string | null;
}

export interface DropdownProps<T = string> {
  options: DropdownOption<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
  clearable?: boolean;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  /**
   * When `true`, the label shows the red asterisk and the trigger mirrors
   * `aria-required`, so the mandatory indicator matches the one a form field
   * renders. Off by default.
   */
  required?: boolean;
  /**
   * When `true`, the open menu renders a filter input
   * (`data-testid="<testId>-search"`) that narrows the options
   * case-insensitively by label. Off by default.
   */
  searchable?: boolean;
  /** Placeholder for the search input when `searchable` is set. */
  searchPlaceholder?: string;
  /**
   * Called on every change of the `searchable` filter input, so a consumer whose option set lives on
   * a server can refetch instead of being capped at whatever page it
   * happened to load. The internal client-side filter still runs on top of
   * whatever `options` come back; both match case-insensitively on the
   * label, so for a server that filters the same way the second pass is a
   * no-op rather than a second, disagreeing rule.
   */
  onSearchChange?: (term: string) => void;
  /**
   * Opens the menu on mount. In `searchable` mode that also puts focus in
   * the filter input, which is
   * what lets a dialog hand the operator a control they can type into
   * immediately instead of one they must first click open.
   */
  defaultOpen?: boolean;
  /**
   * Root `data-testid`, from which the trigger, clear, search, listbox,
   * option and swatch ids are derived. Defaults to `'custom-dropdown'`, so a
   * caller that passes nothing keeps the ids this component has always
   * emitted. Pass an explicit one on any page that renders more than one
   * dropdown (`coding_standards.md` §3.6: unique per page).
   */
  testId?: string;
  /** Accessible name for the trigger when no visible `label` is rendered. */
  ariaLabel?: string;
  /** Associates the trigger with an external `<label htmlFor>`. */
  id?: string;
}

/** How long a typeahead buffer keeps accumulating before it restarts. */
const TYPEAHEAD_RESET_MS = 500;

/**
 * Field-styled dropdown matching this package's form-control styling, with a
 * chevron, optional clear (`×`, `clearable` default `true`), and the
 * selected option highlighted (`bg-selected-blue` + bold `primary-blue`
 * text). An optional `searchable` mode adds a type-ahead filter input above
 * the option list.
 *
 * **Keyboard and ARIA.** This implements the WAI-ARIA
 * combobox-with-listbox-popup pattern, not a `<ul>` of buttons:
 *
 * | Key | Closed | Open |
 * | --- | --- | --- |
 * | `↓` / `↑` | opens, highlights the selected option (or the first) | moves the highlight, wrapping |
 * | `Home` / `End` | opens on the first / last option | jumps to the first / last option |
 * | `Enter` | opens | picks the highlighted option |
 * | `Space` | opens | picks the highlighted option (types a space in `searchable` mode) |
 * | `Escape` | — | closes and returns focus to the trigger |
 * | `Tab` | — | closes and lets focus move on |
 * | a letter | — | jumps to the next option starting with it (not in `searchable` mode, where typing filters) |
 *
 * Focus never enters the option list: the trigger (or, in `searchable`
 * mode, the filter input) keeps it and points at the highlighted option
 * with `aria-activedescendant`, which is what lets one keystroke reach an
 * option a hundred rows down. Escape is registered through the shared
 * `useEscapeKey` stack, so a dropdown opened inside a modal closes itself
 * on Escape without also closing the modal underneath it.
 */
export function Dropdown<T = string>({
  options,
  value,
  onChange,
  clearable = true,
  placeholder = 'Select...',
  disabled,
  label,
  required = false,
  searchable = false,
  searchPlaceholder = 'Search…',
  onSearchChange,
  defaultOpen = false,
  testId = 'custom-dropdown',
  ariaLabel,
  id,
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [searchTerm, setSearchTerm] = useState('');
  // Index into `visibleOptions` of the highlighted (not yet chosen) option,
  // or -1 for none. Highlight is not selection: it is what Enter would pick.
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ buffer: '', at: 0 });
  // Held in a ref so the close-reset effect keeps its `[isOpen]` dependency
  // list: an inline consumer callback changes identity every render, and
  // depending on it would re-fire the reset continuously.
  const onSearchChangeRef = useRef(onSearchChange);
  onSearchChangeRef.current = onSearchChange;

  const listboxId = `${testId}-listbox`;
  const optionDomId = (index: number) => `${listboxId}-option-${index}`;

  const selectedOption = options.find((option) => option.value === value);
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

  // Reset the filter and the highlight whenever the menu closes, so it
  // reopens unfiltered and pointing at the stored value. `onSearchChange`
  // is told about the reset too: a consumer holding a server-side query would
  // otherwise keep a narrowed option set after the menu that narrowed it is
  // gone.
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setActiveIndex(-1);
      onSearchChangeRef.current?.('');
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

  // Keep the highlighted option in view: with `max-h-64` on the list, a
  // keyboard-only user is otherwise moving a highlight they cannot see.
  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    const active = listRef.current?.querySelector('[data-active-option="true"]');
    // `scrollIntoView` is not implemented in jsdom, so this is an optional call
    // rather than a line every consuming test has to stub around.
    active?.scrollIntoView?.({ block: 'nearest' });
  }, [isOpen, activeIndex]);

  const openMenu = (index: number) => {
    setIsOpen(true);
    setActiveIndex(index);
  };

  /** The option the menu should highlight when it opens: the selected one. */
  const indexToOpenOn = (fallbackToLast = false) => {
    const selected = visibleOptions.findIndex(
      (option) => option.value === value && !option.disabled,
    );
    if (selected !== -1) return selected;
    if (selectableIndexes.length === 0) return -1;
    return fallbackToLast
      ? selectableIndexes[selectableIndexes.length - 1]
      : selectableIndexes[0];
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

  const commit = (index: number) => {
    const option = visibleOptions[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    closeAndRefocus();
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
          event.preventDefault();
          openMenu(indexToOpenOn());
          return;
        case 'ArrowUp':
        case 'End':
          event.preventDefault();
          openMenu(indexToOpenOn(true));
          return;
        case 'Home':
          event.preventDefault();
          openMenu(selectableIndexes[0] ?? -1);
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
        commit(activeIndex);
        return;
      case ' ':
        // In `searchable` mode a space is a character in the query, not a
        // "pick this" gesture.
        if (searchable) return;
        event.preventDefault();
        commit(activeIndex);
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

  const handleClear = (event: ReactMouseEvent) => {
    event.stopPropagation();
    onChange(null);
    triggerRef.current?.focus();
  };

  const showClear = clearable && selectedOption !== undefined && !disabled;
  const activeDescendant =
    isOpen && activeIndex >= 0 ? optionDomId(activeIndex) : undefined;

  return (
    <div className="flex flex-col gap-1" ref={containerRef}>
      {label && (
        <label
          htmlFor={id ?? `${testId}-trigger-id`}
          className="text-body-sm-emphasis text-primary-neutral"
        >
          {label}
          {required && <span className="ml-0.5 text-error">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          ref={triggerRef}
          id={id ?? `${testId}-trigger-id`}
          data-testid={`${testId}-trigger`}
          // In `searchable` mode the filter input is the combobox (APG's
          // editable-combobox pattern); the trigger stays a plain button so
          // there is never more than one combobox per control.
          role={searchable ? undefined : 'combobox'}
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-required={required}
          aria-label={ariaLabel}
          aria-activedescendant={searchable ? undefined : activeDescendant}
          disabled={disabled}
          onClick={() => (isOpen ? setIsOpen(false) : openMenu(indexToOpenOn()))}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border bg-slate-50 pl-3 text-left text-body text-primary-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue',
            'border-slate-200',
            showClear ? 'pr-14' : 'pr-9',
            disabled && 'cursor-not-allowed bg-slate-200 text-slate-400',
          )}
        >
          <span className={cn('flex items-center gap-2 truncate', !selectedOption && 'text-slate-400')}>
            {selectedOption?.swatchColor !== undefined && selectedOption.swatchColor !== null && (
              <ColorSwatch
                color={selectedOption.swatchColor}
                size={12}
                testId={`${testId}-trigger-swatch`}
              />
            )}
            {selectedOption?.label ?? placeholder}
          </span>
        </button>
        {/* Outside the trigger on purpose: a control nested inside a
            `role="combobox"` button is neither valid HTML nor reachable by a
            screen reader as its own button. */}
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center gap-1">
          {showClear && (
            <button
              type="button"
              tabIndex={-1}
              aria-label="Clear selection"
              data-testid={`${testId}-clear`}
              onClick={handleClear}
              className="pointer-events-auto text-slate-400 hover:text-slate-600"
            >
              <ClearIcon className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-slate-400" />
        </span>
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
                    onSearchChange?.(event.target.value);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-controls={listboxId}
                  aria-expanded
                  aria-activedescendant={activeDescendant}
                  data-testid={`${testId}-search`}
                  className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-body-sm text-primary-neutral focus:border-primary-blue focus:outline-none"
                />
              </div>
            )}
            <ul
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-label={ariaLabel ?? label}
              data-testid={`${testId}-options`}
              className="max-h-64 overflow-y-auto py-1"
            >
              {visibleOptions.map((option, index) => {
                const isSelected = option.value === value;
                const isActive = index === activeIndex;
                return (
                  <li
                    key={String(option.value)}
                    id={optionDomId(index)}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled}
                    data-testid={`${testId}-option-${String(option.value)}`}
                    onClick={() => commit(index)}
                    data-active-option={isActive || undefined}
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
                    <span className="flex items-center gap-2">
                      {option.swatchColor !== undefined && option.swatchColor !== null && (
                        <ColorSwatch
                          color={option.swatchColor}
                          size={12}
                          testId={`${testId}-swatch-${String(option.value)}`}
                        />
                      )}
                      {option.label}
                    </span>
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
