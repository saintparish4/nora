import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input bg-white text-foreground placeholder:text-muted-foreground rounded-xl border px-3.5 text-base transition-[border-color,box-shadow] outline-none focus-visible:border-blue focus-visible:ring-[3px] focus-visible:ring-blue/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-[0.9375rem] flex field-sizing-content min-h-24 w-full py-2.5 leading-relaxed",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
