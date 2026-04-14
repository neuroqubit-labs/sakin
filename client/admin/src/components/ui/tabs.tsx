'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

const Tabs = TabsPrimitive.Root

function TabsList({ className, ref, ...props }: React.ComponentProps<typeof TabsPrimitive.List> & { ref?: React.Ref<HTMLDivElement> }) {
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        'inline-flex min-h-11 items-center justify-center rounded-[20px] border border-white/80 bg-[rgba(255,255,255,0.68)] p-1.5 text-[#6c7e95] shadow-[0_12px_30px_rgba(8,17,31,0.05)] backdrop-blur-xl',
        className,
      )}
      {...props}
    />
  )
}
TabsList.displayName = TabsPrimitive.List.displayName

function TabsTrigger({ className, ref, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger> & { ref?: React.Ref<HTMLButtonElement> }) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-[#102038] data-[state=active]:shadow-[0_12px_24px_rgba(8,17,31,0.08)]',
        className,
      )}
      {...props}
    />
  )
}
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

function TabsContent({ className, ref, ...props }: React.ComponentProps<typeof TabsPrimitive.Content> & { ref?: React.Ref<HTMLDivElement> }) {
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(
        'mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className,
      )}
      {...props}
    />
  )
}
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
