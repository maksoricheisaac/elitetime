"use client"

import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { addDays } from "date-fns"
import { type DateRange } from "react-day-picker"

interface CalendarRangeProps {
  value?: DateRange | undefined
  onChange?: (value: DateRange | undefined) => void
}

export function CalendarRange(props: CalendarRangeProps = {}) {
  const { value, onChange } = props

  const [internalRange, setInternalRange] = React.useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), 0, 12),
    to: addDays(new Date(new Date().getFullYear(), 0, 12), 30),
  })

  const selected = value ?? internalRange

  const handleSelect = (next: DateRange | undefined) => {
    if (!value) {
      setInternalRange(next)
    }
    onChange?.(next)
  }

  return (
    <Card className="mx-auto w-fit p-0">
      <CardContent className="p-0">
        <Calendar
          mode="range"
          defaultMonth={selected?.from}
          selected={selected}
          onSelect={handleSelect}
          numberOfMonths={2}
          disabled={(date) =>
            date > new Date() || date < new Date("1900-01-01")
          }
        />
      </CardContent>
    </Card>
  )
}
