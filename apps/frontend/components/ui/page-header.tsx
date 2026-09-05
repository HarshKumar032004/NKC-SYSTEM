'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import type { VariantProps } from 'class-variance-authority';

interface PageAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: VariantProps<typeof buttonVariants>['variant'];
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: PageAction[];
  /**
   * Additional className — note: spacing (mb-*) should be controlled
   * at the page level, not inside this component.
   */
  className?: string;
  children?: React.ReactNode;
}

/**
 * Consistent page header used across all IMS pages.
 * Shows title, optional subtitle, and action buttons on the right.
 *
 * IMPORTANT: This component does NOT add bottom margin.
 * Use gap-* on the parent flex container (the page's root div) to control spacing.
 */
export function PageHeader({
  title,
  description,
  actions = [],
  className,
  children,
}: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h1 className="text-[1.125rem] font-semibold text-slate-900 leading-tight truncate">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-slate-500 mt-1 leading-snug">{description}</p>
        )}
      </div>

      {(actions.length > 0 || children) && (
        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          {children}
          {actions.map((action, i) => (
            <Button
              key={i}
              variant={action.variant ?? (i === actions.length - 1 ? 'default' : 'outline')}
              onClick={action.onClick}
              disabled={action.disabled}
              asChild={!!action.href}
              size="sm"
            >
              {action.href ? (
                <a href={action.href}>
                  {action.icon}
                  {action.label}
                </a>
              ) : (
                <>
                  {action.icon}
                  {action.label}
                </>
              )}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
