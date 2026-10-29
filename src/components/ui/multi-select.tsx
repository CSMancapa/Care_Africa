import * as React from "react"
import { Command, CommandGroup, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface MultiSelectProps {
  options: { name: string }[] | string[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
}

export function MultiSelect({ options, selected, onChange, placeholder }: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "w-full justify-between",
            !selected.length && "text-muted-foreground"
          )}
        >
          {selected.length ? (
            <div className="flex gap-1 flex-wrap">
              {selected.map((item) => (
                <Badge
                  key={item}
                  variant="secondary"
                  className="mr-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    onChange(selected.filter((i) => i !== item))
                  }}
                >
                  {item}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))}
            </div>
          ) : (
            placeholder || "Select items..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandGroup>
            {options.map((option) => {
              const value = typeof option === 'string' ? option : option.name
              return (
                <CommandItem
                  key={value}
                  onSelect={() => {
                    onChange(
                      selected.includes(value)
                        ? selected.filter((item) => item !== value)
                        : [...selected, value]
                    )
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected.includes(value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {value}
                </CommandItem>
              )
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 