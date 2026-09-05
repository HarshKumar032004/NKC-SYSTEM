'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  GraduationCap, CreditCard, ClipboardList, CalendarCheck, Users,
  Bell, Package, FileText, Search, WifiOff, Lock, AlertTriangle,
  RefreshCw, Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type EmptyStateType =
  | 'students' | 'exams' | 'fees' | 'attendance' | 'staff'
  | 'notices' | 'inventory' | 'documents' | 'search' | 'offline'
  | 'permission' | 'error' | 'generic';

const emptyConfig: Record<
  EmptyStateType,
  {
    icon: React.ElementType;
    title: string;
    description: string;
    iconBg: string;
    iconColor: string;
  }
> = {
  students:   { icon: GraduationCap, title: 'No students yet',          description: 'Add your first student to get started.',                iconBg: 'bg-indigo-50',  iconColor: 'text-indigo-400'  },
  exams:      { icon: ClipboardList, title: 'No exams scheduled',       description: 'Schedule an exam to manage grading and results.',       iconBg: 'bg-indigo-50',  iconColor: 'text-indigo-400'  },
  fees:       { icon: CreditCard,    title: 'No fee records',           description: 'Fee invoices will appear here once generated.',         iconBg: 'bg-emerald-50', iconColor: 'text-emerald-400' },
  attendance: { icon: CalendarCheck, title: 'No attendance records',    description: 'Select a date and batch to mark attendance.',          iconBg: 'bg-sky-50',     iconColor: 'text-sky-400'     },
  staff:      { icon: Users,         title: 'No staff members',         description: 'Invite staff members to give them access.',            iconBg: 'bg-indigo-50',  iconColor: 'text-indigo-400'  },
  notices:    { icon: Bell,          title: 'No active notices',        description: 'Post a notice to inform your staff and students.',     iconBg: 'bg-amber-50',   iconColor: 'text-amber-400'   },
  inventory:  { icon: Package,       title: 'No inventory items',       description: 'Add items to track your inventory.',                   iconBg: 'bg-slate-100',  iconColor: 'text-slate-400'   },
  documents:  { icon: FileText,      title: 'No documents uploaded',    description: 'Upload documents to keep them secure.',               iconBg: 'bg-slate-100',  iconColor: 'text-slate-400'   },
  search:     { icon: Search,        title: 'No results found',         description: 'Try adjusting your search or filter criteria.',       iconBg: 'bg-slate-100',  iconColor: 'text-slate-400'   },
  offline:    { icon: WifiOff,       title: "You're offline",           description: 'Check your internet connection and try again.',       iconBg: 'bg-slate-100',  iconColor: 'text-slate-400'   },
  permission: { icon: Lock,          title: 'Access denied',            description: "You don't have permission to view this section.",     iconBg: 'bg-amber-50',   iconColor: 'text-amber-500'   },
  error:      { icon: AlertTriangle, title: 'Something went wrong',     description: 'There was an error loading the data.',                iconBg: 'bg-red-50',     iconColor: 'text-red-400'     },
  generic:    { icon: FileText,      title: 'Nothing here yet',         description: "Content will appear here once it's created.",         iconBg: 'bg-slate-100',  iconColor: 'text-slate-400'   },
};

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: React.ReactNode;
  };
  retry?: () => void;
  className?: string;
}

export function EmptyState({
  type = 'generic',
  title,
  description,
  action,
  retry,
  className,
}: EmptyStateProps) {
  const config = emptyConfig[type];
  const Icon = config.icon;
  const finalTitle = title ?? config.title;
  const finalDesc = description ?? config.description;
  const isError = type === 'error';

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-6 text-center',
        className
      )}
      role={isError ? 'alert' : undefined}
    >
      {/* Icon container */}
      <div
        className={cn(
          'h-12 w-12 rounded-xl flex items-center justify-center mb-4',
          config.iconBg
        )}
      >
        <Icon className={cn('h-6 w-6', config.iconColor)} />
      </div>

      <h3 className="text-sm font-semibold text-slate-900 mb-1">{finalTitle}</h3>
      <p className="text-sm text-slate-500 max-w-xs leading-relaxed mb-5">{finalDesc}</p>

      <div className="flex items-center gap-2">
        {retry && (
          <Button variant="outline" size="sm" onClick={retry}>
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </Button>
        )}
        {action && (
          <Button
            size="sm"
            onClick={action.onClick}
            asChild={!!action.href}
          >
            {action.href ? (
              <a href={action.href}>
                {action.icon ?? <Plus className="h-3.5 w-3.5" />}
                {action.label}
              </a>
            ) : (
              <>
                {action.icon ?? <Plus className="h-3.5 w-3.5" />}
                {action.label}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
