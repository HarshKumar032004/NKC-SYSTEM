import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KpiCardProps {
  title: string;
  value: string | number;
  description: string;
  /** Optional trend chip shown below the description */
  trend?: {
    label: string;
    /** true = green (positive), false = red (negative) */
    positive?: boolean;
  };
  icon: React.ElementType;
  /**
   * Tailwind classes for the icon container background + icon color.
   * e.g. "bg-indigo-50 text-indigo-600"
   */
  accentColor: string;
  /** Optional click handler to make the card navigable */
  onClick?: () => void;
  className?: string;
}

/**
 * KPI summary card used on the dashboard.
 * Shows a single metric with an optional trend indicator.
 *
 * Design rules:
 * - Use max 4 per row
 * - Icon container: 32×32, rounded-lg, soft semantic bg
 * - Value: 24px bold — the primary focal point
 * - Keep description ≤ 3 words
 */
export function KpiCard({
  title,
  value,
  description,
  trend,
  icon: Icon,
  accentColor,
  onClick,
  className,
}: KpiCardProps) {
  const isPositive = trend?.positive !== false;

  return (
    <div
      className={cn(
        // Base card
        'bg-white rounded-xl border border-slate-200/80 p-5',
        'shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]',
        'transition-all duration-200 relative overflow-hidden',
        // Interactive if onClick provided
        onClick
          ? 'cursor-pointer hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 hover:border-slate-300'
          : 'hover:shadow-[0_6px_16px_-6px_rgba(0,0,0,0.06)]',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {/* Header row: label + icon */}
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-slate-500 leading-tight">{title}</p>
        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', accentColor)}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>

      {/* Primary value */}
      <div className="text-2xl font-bold text-slate-900 mb-1 tabular-nums leading-none">
        {value}
      </div>

      {/* Description + trend */}
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-xs text-slate-500">{description}</p>
        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full',
              isPositive
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
            )}
          >
            {isPositive
              ? <TrendingUp className="h-2.5 w-2.5" aria-hidden="true" />
              : <TrendingDown className="h-2.5 w-2.5" aria-hidden="true" />
            }
            <span>{trend.label}</span>
          </span>
        )}
      </div>
    </div>
  );
}
