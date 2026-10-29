import { Input } from "./input"

interface TimePickerProps {
  value: string
  onChange: (value: string) => void
}

export function TimePicker({ value, onChange }: TimePickerProps) {
  return (
    <Input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
} 