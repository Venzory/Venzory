'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  /** Available options */
  options: ComboboxOption[];
  /** Currently selected value */
  value?: string;
  /** Callback when value changes */
  onChange?: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Search placeholder text */
  searchPlaceholder?: string;
  /** Label text */
  label?: string;
  /** Error message */
  error?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the combobox is disabled */
  disabled?: boolean;
  /** Whether to allow clearing the selection */
  clearable?: boolean;
  /** Empty state message when no options match */
  emptyMessage?: string;
  /** Custom render for options */
  renderOption?: (option: ComboboxOption, isSelected: boolean) => ReactNode;
  /** ID for the input */
  id?: string;
  /** Name for the input */
  name?: string;
  /** Additional class name */
  className?: string;
}

/**
 * Combobox - Searchable select dropdown for large option lists
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search...',
  label,
  error,
  required,
  disabled,
  clearable = true,
  emptyMessage = 'No options found.',
  renderOption,
  id,
  name,
  className,
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const debouncedSearch = useDebounce(searchQuery, 150);

  // Filter options based on search
  const filteredOptions = options.filter(
    (option) =>
      option.label.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      option.description?.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  // Get selected option
  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlighted index when filtered options change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [debouncedSearch]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlightedElement = listRef.current.children[
        highlightedIndex
      ] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = useCallback(
    (optionValue: string) => {
      onChange?.(optionValue);
      setIsOpen(false);
      setSearchQuery('');
    },
    [onChange]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.('');
    },
    [onChange]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const enabledOptions = filteredOptions.filter((opt) => !opt.disabled);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex((prev) =>
            prev < enabledOptions.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (isOpen && enabledOptions[highlightedIndex]) {
          handleSelect(enabledOptions[highlightedIndex].value);
        } else {
          setIsOpen(true);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
        break;
      case 'Tab':
        setIsOpen(false);
        setSearchQuery('');
        break;
    }
  };

  const inputId = id || name;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          {label}
          {required && (
            <span className="ml-1 text-rose-600 dark:text-rose-400">*</span>
          )}
        </label>
      )}

      {/* Hidden native select for form submission */}
      <input type="hidden" name={name} value={value || ''} />

      {/* Trigger button */}
      <button
        type="button"
        id={inputId}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors',
          'focus:outline-none focus:ring-2',
          disabled && 'cursor-not-allowed opacity-50',
          error
            ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/30'
            : 'border-slate-300 focus:border-sky-500 focus:ring-sky-500/30 dark:border-slate-800',
          'bg-white dark:bg-slate-900'
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span
          className={cn(
            'truncate',
            selectedOption
              ? 'text-slate-900 dark:text-slate-100'
              : 'text-slate-400 dark:text-slate-500'
          )}
        >
          {selectedOption?.label || placeholder}
        </span>
        <div className="flex items-center gap-1">
          {clearable && value && (
            <span
              onClick={handleClear}
              className="rounded p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4 text-slate-400" />
            </span>
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 text-slate-400 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
          {/* Search input */}
          <div className="border-b border-slate-200 p-2 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                className="w-full rounded-md border-0 bg-slate-50 py-1.5 pl-8 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:bg-slate-800 dark:text-slate-100"
                autoFocus
              />
            </div>
          </div>

          {/* Options list */}
          <ul
            ref={listRef}
            className="max-h-60 overflow-auto p-1"
            role="listbox"
          >
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-center text-sm text-slate-500 dark:text-slate-400">
                {emptyMessage}
              </li>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={option.value}
                    onClick={() => !option.disabled && handleSelect(option.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      'flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                      option.disabled && 'cursor-not-allowed opacity-50',
                      isHighlighted &&
                        !option.disabled &&
                        'bg-slate-100 dark:bg-slate-800',
                      isSelected && 'font-medium'
                    )}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled}
                  >
                    {renderOption ? (
                      renderOption(option, isSelected)
                    ) : (
                      <>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-slate-900 dark:text-slate-100">
                            {option.label}
                          </div>
                          {option.description && (
                            <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                              {option.description}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 flex-shrink-0 text-sky-600 dark:text-sky-400" />
                        )}
                      </>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {error && (
        <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}

