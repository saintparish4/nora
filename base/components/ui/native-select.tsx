import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * A native <select> dressed to match Input. Native on purpose: the lists here
 * are short, and the platform control is the most accessible one on a phone.
 * `className` sizes the wrapper (w-full by default); the select fills it.
 */
function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <span className={cn("relative block w-full", className)}>
      <select
        data-slot="native-select"
        className="border-input bg-white text-foreground h-11 w-full appearance-none rounded-xl border pr-10 pl-3.5 text-base transition-[border-color,box-shadow] outline-none focus-visible:border-blue focus-visible:ring-[3px] focus-visible:ring-blue/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-[0.9375rem]"
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon aria-hidden className="text-muted-foreground pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2" />
    </span>
  )
}

export { NativeSelect }
