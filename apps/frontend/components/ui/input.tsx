import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base layout
          "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900",
          // Placeholder
          "placeholder:text-slate-400",
          // Hover
          "hover:border-slate-300",
          // Focus — custom ring instead of outline (see globals.css override)
          "focus-visible:outline-none focus-visible:border-indigo-500",
          "focus-visible:ring-2 focus-visible:ring-indigo-500/15 focus-visible:ring-offset-0",
          // Transitions
          "transition-[border-color,box-shadow] duration-150",
          // File input
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-slate-900",
          // Shadow
          "shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50",
          // Error state — apply via parent or className
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
