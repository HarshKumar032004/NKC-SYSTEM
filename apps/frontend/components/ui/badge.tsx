import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-semibold transition-colors tracking-wide",
  {
    variants: {
      variant: {
        // Neutral
        default:     "border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200",
        secondary:   "border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200",
        outline:     "border-slate-200 text-slate-600 bg-transparent",
        // Semantic status — using design token colors
        success:     "border-emerald-200 bg-emerald-50 text-emerald-800",
        error:       "border-red-200 bg-red-50 text-red-800",
        destructive: "border-red-200 bg-red-50 text-red-800",
        warning:     "border-amber-200 bg-amber-50 text-amber-800",
        info:        "border-sky-200 bg-sky-50 text-sky-800",
        pending:     "border-orange-200 bg-orange-50 text-orange-800",
        inactive:    "border-slate-200 bg-slate-100 text-slate-500",
        primary:     "border-indigo-200 bg-indigo-50 text-indigo-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

// Maps variant → dot color for colorblind-accessible indicators
const dotColorMap: Record<string, string> = {
  success:     "bg-emerald-500",
  error:       "bg-red-500",
  destructive: "bg-red-500",
  warning:     "bg-amber-500",
  info:        "bg-sky-500",
  pending:     "bg-orange-400",
  primary:     "bg-indigo-500",
  // neutral variants — no dot
}

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  /** Show a colored dot indicator before the label (improves colorblind accessibility) */
  showDot?: boolean
}

function Badge({ className, variant, showDot, ...props }: BadgeProps) {
  const dotColor = variant ? dotColorMap[variant] : undefined

  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {showDot && dotColor && (
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColor)} />
      )}
      {props.children}
    </div>
  )
}

/** Map common IMS status strings to the correct badge variant */
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
    // Student statuses
    ENROLLED:          { label: "Enrolled",      variant: "success"  },
    ACTIVE:            { label: "Active",         variant: "success"  },
    ALUMNI:            { label: "Alumni",         variant: "info"     },
    SUSPENDED:         { label: "Suspended",      variant: "warning"  },
    WITHDRAWN:         { label: "Withdrawn",      variant: "inactive" },
    DROPPED:           { label: "Dropped",        variant: "inactive" },
    INACTIVE:          { label: "Inactive",       variant: "inactive" },
    // Fee statuses
    PAID:              { label: "Paid",           variant: "success"  },
    FULLY_PAID:        { label: "Fully Paid",     variant: "success"  },
    PARTIALLY_PAID:    { label: "Partial",        variant: "warning"  },
    OVERDUE:           { label: "Overdue",        variant: "error"    },
    PENDING:           { label: "Pending",        variant: "pending"  },
    // Exam statuses
    PUBLISHED:         { label: "Published",      variant: "success"  },
    DRAFT:             { label: "Draft",          variant: "warning"  },
    COMPLETED:         { label: "Completed",      variant: "info"     },
    // Admission statuses
    NEW:               { label: "New",            variant: "info"     },
    CONTACTED:         { label: "Contacted",      variant: "primary"  },
    DEMO_SCHEDULED:    { label: "Demo Sched.",    variant: "warning"  },
    COUNSELED:         { label: "Counseled",      variant: "warning"  },
    ADMISSION_PENDING: { label: "Adm. Pending",   variant: "pending"  },
    CONVERTED:         { label: "Converted",      variant: "success"  },
    // Generic
    ARCHIVED:          { label: "Archived",       variant: "inactive" },
    APPROVED:          { label: "Approved",       variant: "success"  },
    REJECTED:          { label: "Rejected",       variant: "error"    },
  }

  const config = map[status] ?? { label: status, variant: "default" as const }
  return (
    <Badge variant={config.variant} showDot role="status" aria-label={`Status: ${config.label}`}>
      {config.label}
    </Badge>
  )
}

export { Badge, badgeVariants }
