import * as React from "react"
import { Slot, Slottable } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

const buttonVariants = cva(
  // ── Base ──────────────────────────────────────────────────────────
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium " +
  "transition-all duration-150 select-none " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
  "disabled:pointer-events-none disabled:opacity-50 " +
  "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-[0_2px_10px_-3px_rgba(37,99,235,0.4)] " +
          "hover:from-blue-600 hover:to-blue-700 hover:shadow-[0_4px_14px_-4px_rgba(37,99,235,0.5)] border border-blue-600 " +
          "active:scale-[0.98]",
        destructive:
          "bg-red-600 text-white shadow-[0_1px_2px_rgba(0,0,0,0.12)] " +
          "hover:bg-red-700 active:scale-[0.98]",
        outline:
          "border border-slate-200 bg-white text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.05)] " +
          "hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98]",
        secondary:
          "bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-[0.98]",
        ghost:
          "text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-[0.98]",
        link:
          "text-primary underline-offset-4 hover:underline p-0 h-auto shadow-none",
        success:
          "bg-emerald-600 text-white shadow-[0_1px_2px_rgba(0,0,0,0.12)] " +
          "hover:bg-emerald-700 active:scale-[0.98]",
        warning:
          "bg-amber-500 text-white shadow-[0_1px_2px_rgba(0,0,0,0.12)] " +
          "hover:bg-amber-600 active:scale-[0.98]",
      },
      size: {
        default:   "h-9 px-4 py-2",
        sm:        "h-8 rounded-md px-3 text-xs",
        lg:        "h-10 rounded-md px-6",
        icon:      "h-9 w-9",
        "icon-sm": "h-7 w-7 rounded-md text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isLoading || disabled}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        <Slottable>{children}</Slottable>
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
