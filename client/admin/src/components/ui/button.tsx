import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'motion-press inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'border border-[#1f3f72]/10 bg-[linear-gradient(135deg,#12203a_0%,#1d3b67_46%,#4f7df7_100%)] text-primary-foreground shadow-[0_18px_34px_rgba(79,125,247,0.28)] hover:-translate-y-0.5 hover:shadow-[0_22px_40px_rgba(79,125,247,0.34)]',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-white/85 bg-white/82 text-[#102038] shadow-[0_12px_28px_rgba(8,17,31,0.06)] hover:-translate-y-0.5 hover:bg-white',
        secondary:
          'border border-[#dce7ff] bg-[#eef4ff] text-[#17345a] shadow-[0_12px_24px_rgba(79,125,247,0.08)] hover:bg-[#e5efff]',
        ghost: 'text-[#42536b] hover:bg-white/72 hover:text-[#0d182b]',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-lg px-3.5',
        lg: 'h-11 rounded-xl px-8',
        icon: 'h-10 w-10 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  ref?: React.Ref<HTMLButtonElement>
}

function Button({ className, variant, size, ref, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  )
}
Button.displayName = 'Button'

export { Button, buttonVariants }
