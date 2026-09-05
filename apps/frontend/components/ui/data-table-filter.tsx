import React, { useState, useEffect } from 'react';
import { Input } from './input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Button } from './button';
import { Search, X } from 'lucide-react';

export interface FilterOption {
  id: string;
  label: string;
  options: { label: string; value: string }[];
}

interface DataTableFilterProps {
  searchPlaceholder?: string;
  filters?: FilterOption[];
  onFilterChange: (filters: Record<string, string>) => void;
  debounceMs?: number;
}

export function DataTableFilter({ searchPlaceholder = 'Search...', filters = [], onFilterChange, debounceMs = 300 }: DataTableFilterProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  
  useEffect(() => {
    const handler = setTimeout(() => {
      // Clean up empty values
      const cleaned: Record<string, string> = {};
      Object.keys(values).forEach(key => {
        if (values[key] !== '' && values[key] !== 'ALL') {
          cleaned[key] = values[key];
        }
      });
      onFilterChange(cleaned);
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [values, onFilterChange, debounceMs]);

  const handleValueChange = (key: string, val: string) => {
    setValues(prev => ({ ...prev, [key]: val }));
  };

  const clearFilters = () => {
    setValues({});
  };

  const hasActiveFilters = Object.keys(values).some(k => values[k] !== '' && values[k] !== 'ALL');

  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-center w-full mb-4">
      <div className="relative flex-1 w-full sm:min-w-[250px] sm:max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder={searchPlaceholder}
          className="pl-8 bg-white dark:bg-slate-950"
          value={values['search'] || ''}
          onChange={(e) => handleValueChange('search', e.target.value)}
        />
      </div>

      {filters.map((filter) => (
        <div key={filter.id} className="w-full sm:w-auto">
          <Select 
            value={values[filter.id] || 'ALL'} 
            onValueChange={(val) => handleValueChange(filter.id, val)}
          >
            <SelectTrigger className="w-full sm:w-[160px] bg-white dark:bg-slate-950">
              <SelectValue placeholder={filter.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All {filter.label}</SelectItem>
              {filter.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
