'use client';

import * as React from 'react';
import { X, Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type Option = {
  label: string;
  value: string;
};

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select options...',
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleUnselect = (item: string) => {
    onChange(selected.filter((i) => i !== item));
  };

  const handleSelect = (item: string) => {
    if (selected.includes(item)) {
      onChange(selected.filter((i) => i !== item));
    } else {
      onChange([...selected, item]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between hover:bg-transparent min-h-10 h-auto font-normal',
            selected.length === 0 && 'text-muted-foreground',
            className
          )}
        >
          <div className="flex flex-wrap gap-1 items-center">
            {selected.length === 0 && placeholder}
            {selected.map((item) => {
              const option = options.find((o) => o.value === item);
              if (!option) return null;
              return (
                <Badge
                  variant="secondary"
                  key={item}
                  className="mr-1 mb-1 font-normal bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnselect(item);
                  }}
                >
                  {option.label}
                  <button
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleUnselect(item);
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleUnselect(item);
                    }}
                  >
                    <X className="h-3 w-3 text-primary/70 hover:text-primary" />
                  </button>
                </Badge>
              );
            })}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <div className="max-h-64 overflow-auto p-1">
          {options.map((option) => {
            const isSelected = selected.includes(option.value);
            return (
              <div
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  'relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                  isSelected ? 'bg-accent/50 text-accent-foreground font-medium' : ''
                )}
              >
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                  {isSelected && <Check className="h-4 w-4 text-primary" />}
                </span>
                {option.label}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
