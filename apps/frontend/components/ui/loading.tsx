import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingProps {
  /** Type of loading indicator to show */
  variant?: 'page' | 'inline' | 'overlay' | 'card';
  text?: string;
  className?: string;
}

/**
 * Modern, premium loading component for replacing static loading text.
 */
export function Loading({ variant = 'inline', text = 'Loading...', className }: LoadingProps) {
  if (variant === 'page') {
    return (
      <div className={cn('flex flex-col items-center justify-center min-h-[60vh] w-full gap-4', className)}>
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 bg-indigo-200 rounded-full blur-xl opacity-60 animate-pulse"></div>
          <div className="h-10 w-10 rounded-full border-[3px] border-indigo-100 border-t-indigo-600 animate-spin z-10 shadow-sm"></div>
        </div>
        <p className="text-sm font-medium text-slate-500 animate-pulse tracking-wide">{text}</p>
      </div>
    );
  }

  if (variant === 'overlay') {
    return (
      <div className={cn('absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-3 rounded-lg', className)}>
        <div className="h-8 w-8 rounded-full border-2 border-indigo-100 border-t-indigo-600 animate-spin shadow-sm"></div>
        {text && <p className="text-xs font-semibold text-indigo-900/70 tracking-wide">{text}</p>}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={cn('flex flex-col items-center justify-center p-12 w-full gap-3 bg-white/40 rounded-xl', className)}>
        <div className="h-8 w-8 rounded-full border-[3px] border-indigo-100 border-t-indigo-600 animate-spin shadow-sm"></div>
        {text && <p className="text-xs font-medium text-slate-500">{text}</p>}
      </div>
    );
  }

  // inline
  return (
    <div className={cn('flex items-center justify-center gap-2 text-slate-500', className)}>
      <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}
