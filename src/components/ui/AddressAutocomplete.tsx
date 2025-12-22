'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RadarAddress {
  addressLabel?: string;
  formattedAddress?: string;
  city?: string;
  stateCode?: string;
  postalCode?: string;
  street?: string;
  number?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  onSelect?: (address: RadarAddress) => void;
  placeholder?: string;
  required?: boolean;
  error?: boolean;
  errorMessage?: string;
  className?: string;
  disabled?: boolean;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Street, City, State ZIP',
  required = false,
  error = false,
  errorMessage,
  className,
  disabled = false,
}: AddressAutocompleteProps) {
  const [results, setResults] = useState<RadarAddress[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const radarApiKey = process.env.NEXT_PUBLIC_RADAR_KEY;

  const search = useCallback(
    async (query: string) => {
      if (!radarApiKey || query.length < 3) {
        setResults([]);
        setShowResults(false);
        return;
      }

      setLoading(true);

      try {
        const response = await fetch(
          `https://api.radar.io/v1/search/autocomplete?query=${encodeURIComponent(query)}&limit=5&country=US`,
          {
            headers: {
              Authorization: radarApiKey,
            },
          }
        );

        const data = await response.json();

        if (data.addresses && data.addresses.length > 0) {
          setResults(data.addresses);
          setShowResults(true);
          setHighlightedIndex(-1);
        } else {
          setResults([]);
          setShowResults(false);
        }
      } catch (error) {
        console.error('Radar autocomplete error:', error);
        setResults([]);
        setShowResults(false);
      } finally {
        setLoading(false);
      }
    },
    [radarApiKey]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    onChange(query);

    // Debounce the search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      search(query);
    }, 300);
  };

  const selectAddress = (address: RadarAddress) => {
    const formattedAddress =
      address.formattedAddress ||
      `${address.addressLabel || ''}, ${address.city || ''}, ${address.stateCode || ''} ${address.postalCode || ''}`.trim();

    onChange(formattedAddress);
    onSelect?.(address);
    setShowResults(false);
    setResults([]);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showResults || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : results.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < results.length) {
          selectAddress(results[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowResults(false);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete="off"
          className={cn(
            'w-full px-4 py-2.5 border rounded-lg shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 dark:bg-gray-700 dark:text-white',
            error ? 'border-red-300' : 'border-gray-300 dark:border-gray-600',
            disabled && 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed',
            className
          )}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 max-h-60 overflow-auto"
        >
          <ul className="py-1">
            {results.map((result, index) => (
              <li
                key={index}
                onClick={() => selectAddress(result)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={cn(
                  'px-4 py-2 cursor-pointer text-sm',
                  highlightedIndex === index
                    ? 'bg-violet-50 dark:bg-violet-900/30'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-600'
                )}
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  {result.addressLabel}
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-xs">
                  {result.city}, {result.stateCode} {result.postalCode}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {errorMessage && (
        <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
      )}
    </div>
  );
}
