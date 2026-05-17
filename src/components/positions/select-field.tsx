"use client"

import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface SelectFieldProps<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  label: string
  options: ReadonlyArray<{ value: string; label: string }>
}

/** Labeled shadcn select bound to a react-hook-form controller. */
export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  options,
}: SelectFieldProps<T>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id={name} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </div>
  )
}
