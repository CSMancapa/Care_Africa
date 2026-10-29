import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange, DayPicker } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function DatePickerWithRange({
  className,
  value,
  onChange
}: {
  className?: string
  value?: DateRange | undefined
  onChange?: (date: DateRange | undefined) => void
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal bg-white hover:bg-gray-50/90 transition-colors",
              "border border-gray-200 shadow-sm",
              "focus:ring-2 focus:ring-blue-100 focus:border-blue-200",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, "MMM dd, yyyy")} -{" "}
                  {format(value.to, "MMM dd, yyyy")}
                </>
              ) : (
                format(value.from, "MMM dd, yyyy")
              )
            ) : (
              <span>Select date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0 bg-white border border-gray-200 shadow-lg rounded-lg" 
          align="start"
        >
          <DayPicker
            mode="range"
            selected={value}
            onSelect={onChange}
            numberOfMonths={2}
            className="p-3"
          />
        </PopoverContent>
      </Popover>
    </div>
  )
} 