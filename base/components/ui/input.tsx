import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-input bg-white text-foreground placeholder:text-muted-foreground rounded-xl border px-3.5 text-base transition-[border-color,box-shadow] outline-none focus-visible:border-blue focus-visible:ring-[3px] focus-visible:ring-blue/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-[0.9375rem] h-11 w-full min-w-0 py-1 selection:bg-blue-tint file:text-foreground file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none",
        className
      )}
      {...props}
    />
  )
}

export { Input }
