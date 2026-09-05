import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

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
        // Primary CTA — Premium gradient and stronger shadow
        default:
          "bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-[0_2px_10px_-3px_rgba(37,99,235,0.4)] " +
          "hover:from-blue-600 hover:to-blue-700 hover:shadow-[0_4px_14px_-4px_rgba(37,99,235,0.5)] border border-blue-600 " +
          "active:scale-[0.98]",

        // Destructive — delete, only inside modals/confirmation dialogs
        destructive:
          "bg-red-600 text-white shadow-[0_1px_2px_rgba(0,0,0,0.12)] " +
          "hover:bg-red-700 active:scale-[0.98]",

        // Secondary / Cancel — outline style
        outline:
          "border border-slate-200 bg-white text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.05)] " +
          "hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98]",

        // Subtle fill — less emphasis than outline
        secondary:
          "bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-[0.98]",

        // Icon buttons, subtle actions
        ghost:
          "text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-[0.98]",

        // Inline text links
        link:
          "text-primary underline-offset-4 hover:underline p-0 h-auto shadow-none",

        // Confirm payment, approve actions
        success:
          "bg-emerald-600 text-white shadow-[0_1px_2px_rgba(0,0,0,0.12)] " +
          "hover:bg-emerald-700 active:scale-[0.98]",

        // Cautionary actions (not destructive but needs attention)
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
