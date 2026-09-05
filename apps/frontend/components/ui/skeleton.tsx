import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("skeleton-shimmer rounded-md", className)}
      {...props}
    />
  )
}

/** A full table skeleton with configurable rows/columns */
function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex gap-3 px-3 py-2.5 border-b bg-slate-50">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3.5 flex-1" style={{ maxWidth: i === 0 ? 80 : undefined }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-3 px-3 py-3.5 border-b last:border-0">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <div key={colIdx} className="flex-1">
              {colIdx === 1 ? (
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              ) : (
                <Skeleton
                  className="h-3.5"
                  style={{
                    width: colIdx === 0 ? 28 : `${60 + Math.random() * 20}%`,
                    maxWidth: colIdx === columns - 1 ? 80 : undefined,
                  }}
                />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/** A row of KPI card skeletons */
function KpiCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-${count}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-7 w-20 mb-1.5" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  )
}

/** Card body skeleton */
function CardBodySkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="space-y-3 p-1">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3.5 w-20" />
        </div>
      ))}
    </div>
  )
}

/** A page-level skeleton with page header + table */
function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3.5 w-56" />
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
      {/* Filter bar */}
      <div className="flex gap-3">
        <Skeleton className="h-9 flex-1 max-w-sm rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
      {/* Table */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <TableSkeleton rows={7} columns={5} />
      </div>
    </div>
  )
}

export { Skeleton, TableSkeleton, KpiCardSkeleton, CardBodySkeleton, PageSkeleton }
