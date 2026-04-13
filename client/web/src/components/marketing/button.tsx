import type { ButtonHTMLAttributes, ReactNode } from 'react'
import Link from 'next/link'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full border text-sm font-semibold transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60',
  {
    variants: {
      variant: {
        primary:
          'border-transparent bg-[linear-gradient(135deg,#0f1d37_0%,#1f3355_60%,#7d8da8_100%)] px-5 py-3 text-white shadow-halo hover:-translate-y-0.5',
        secondary:
          'border-white/45 bg-white/70 px-5 py-3 text-navy-900 backdrop-blur-sm hover:border-navy-900/20 hover:bg-white',
        ghost:
          'border-transparent px-0 py-0 text-navy-900/72 hover:text-navy-950',
      },
      size: {
        default: 'min-h-11',
        lg: 'min-h-12 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
)

type ButtonLinkProps = {
  href: string
  children: ReactNode
  className?: string
} & VariantProps<typeof buttonVariants>

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    className?: string
  }

export function ButtonLink({ href, children, className, variant, size }: ButtonLinkProps) {
  return (
    <Link className={cn(buttonVariants({ variant, size }), className)} href={href}>
      {children}
    </Link>
  )
}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
