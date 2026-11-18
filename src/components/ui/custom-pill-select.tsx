'use client'

import React, { useState, useMemo } from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { ChevronDown, Check, Search, X } from 'lucide-react'
import { cn } from '../figma-ui/ui/utils'

export interface CustomPillSelectOption {
  value: string
  label: string
  count?: number
  badge?: string
}

export interface CustomPillSelectProps {
  value: string
  onChange: (value: string) => void
  options: CustomPillSelectOption[]
  ariaLabel?: string
  'aria-label'?: string
  placeholder?: string
  className?: string
  triggerClassName?: string
  prefix?: React.ReactNode
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
  disabled?: boolean
  id?: string
  dataTestId?: string
  fitContent?: boolean
}

export function CustomPillSelect({
  value,
  onChange,
  options,
  ariaLabel,
  'aria-label': ariaLabelProp,
  placeholder = 'Select...',
  className,
  triggerClassName,
  prefix,
  align = 'start',
  sideOffset = 6,
  disabled = false,
  id,
  dataTestId,
  fitContent = false,
}: CustomPillSelectProps) {
  const [open, setOpen] = useState(false)
  const resolvedAriaLabel = ariaLabel || ariaLabelProp || placeholder

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  )

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild disabled={disabled}>
        <button
          type="button"
          id={id}
          data-testid={dataTestId}
          aria-label={resolvedAriaLabel}
          aria-expanded={open}
          style={{ display: 'inline-flex', flexWrap: 'nowrap', alignItems: 'center', whiteSpace: 'nowrap' }}
          className={cn(
            'h-9.5 px-3.5 sm:px-4 rounded-full inline-flex flex-row flex-nowrap items-center justify-between gap-1.5 whitespace-nowrap shrink-0 text-xs sm:text-[13px] font-semibold transition-all active:scale-[0.98] outline-none',
            'bg-white dark:bg-[#1E1F20] text-[#1F1F1F] dark:text-[#E3E3E3]',
            'border border-black/[0.08] dark:border-white/[0.08] hover:border-[#0D5C3A]/30 dark:hover:border-[#F59E0B]/30 shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
            fitContent && 'w-auto min-w-max max-w-none',
            triggerClassName,
            className
          )}
        >
          {prefix}
          <span className={fitContent ? 'whitespace-nowrap' : 'truncate'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.count !== undefined && (
            <span className="text-[11px] font-mono text-[#747775] dark:text-[#8E918F] whitespace-nowrap shrink-0">
              ({selectedOption.count})
            </span>
          )}
          <ChevronDown
            className={cn(
              'size-3.5 shrink-0 text-[#747775] dark:text-[#8E918F] transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
              open && 'rotate-180 text-[#0D5C3A] dark:text-[#F59E0B]'
            )}
          />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          sideOffset={sideOffset}
          className={cn(
            'jiddah-popover-content rounded-2xl bg-white dark:bg-[#18211E] text-[#1F1F1F] dark:text-[#E3E3E3]',
            'border border-[#0D5C3A]/15 dark:border-[#F59E0B]/25',
            'shadow-[0_14px_38px_-6px_rgba(0,0,0,0.22)] dark:shadow-[0_16px_42px_-6px_rgba(0,0,0,0.75)]',
            'p-1.5 z-50 min-w-[200px] max-h-[340px] flex flex-col overflow-hidden outline-none'
          )}
        >
          <div className="max-h-[270px] overflow-y-auto space-y-0.5 pr-0.5">
            {options.map((option) => {
              const isSelected = option.value === value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                  className={cn(
                    'w-full px-3 py-2 rounded-xl flex items-center justify-between gap-2.5 cursor-pointer text-xs sm:text-[13px] text-left transition-colors',
                    isSelected
                      ? 'bg-gradient-to-r from-[#0D5C3A]/12 to-[#D97706]/10 dark:from-[#10B981]/22 dark:to-[#F59E0B]/15 text-[#093D26] dark:text-[#FDE68A] font-semibold'
                      : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[#1F1F1F] dark:text-[#E3E3E3]'
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {option.count !== undefined && (
                      <span className="text-[11px] font-mono opacity-60">
                        ({option.count})
                      </span>
                    )}
                    {option.badge && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#0D5C3A]/10 dark:bg-[#10B981]/20 text-[#0D5C3A] dark:text-[#34D399]">
                        {option.badge}
                      </span>
                    )}
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#0D5C3A] dark:text-[#F59E0B] shrink-0" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

export interface StudentComboboxItem {
  id: string
  name: string
  circular_class: string
  theology_class_arabic?: string | null
  arabic_name?: string | null
  admission_number?: string | null
}

export interface StudentComboboxProps {
  students: StudentComboboxItem[]
  selectedId: string
  onSelect: (id: string) => void
  ariaLabel?: string
  'aria-label'?: string
  placeholder?: string
  variant?: 'default' | 'hero'
  triggerClassName?: string
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
  disabled?: boolean
  id?: string
  dataTestId?: string
  showClassInLabel?: boolean
}

export function StudentCombobox({
  students,
  selectedId,
  onSelect,
  ariaLabel = 'Select student',
  'aria-label': ariaLabelProp,
  placeholder = 'Select student...',
  variant = 'default',
  triggerClassName,
  align = 'start',
  sideOffset = 6,
  disabled = false,
  id = 'marks-student-select',
  dataTestId,
  showClassInLabel = true,
}: StudentComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const resolvedAriaLabel = ariaLabelProp || ariaLabel

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedId),
    [students, selectedId]
  )

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return students
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.circular_class.toLowerCase().includes(q) ||
        (s.admission_number && s.admission_number.toLowerCase().includes(q)) ||
        (s.arabic_name && s.arabic_name.toLowerCase().includes(q))
    )
  }, [students, search])

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setSearch('')
      }}
    >
      <PopoverPrimitive.Trigger asChild disabled={disabled}>
        <button
          type="button"
          id={id}
          data-testid={dataTestId}
          aria-label={resolvedAriaLabel}
          aria-expanded={open}
          style={{ display: 'inline-flex', flexWrap: 'nowrap', alignItems: 'center', whiteSpace: 'nowrap' }}
          className={cn(
            'inline-flex flex-row flex-nowrap items-center justify-between whitespace-nowrap shrink-0 gap-1.5 sm:gap-2 text-xs font-bold transition-all outline-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
            variant === 'hero'
              ? 'h-8.5 px-3 rounded-full bg-black/25 hover:bg-black/35 text-white border border-white/25 ring-0 max-w-[220px] md:max-w-[270px] lg:max-w-[340px]'
              : 'h-8.5 sm:h-9 px-2.5 sm:px-3 rounded-full bg-[#F0F4F9] dark:bg-[#282A2C] hover:bg-[#E4EAE6] dark:hover:bg-[#323538] text-[#1F1F1F] dark:text-[#E3E3E3] border border-black/[0.06] dark:border-white/[0.08] w-full',
            triggerClassName
          )}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 truncate flex-nowrap whitespace-nowrap">
            {variant !== 'hero' && (
              <div className="w-5.5 h-5.5 rounded-full bg-[#0D5C3A]/12 text-[#0D5C3A] dark:bg-[#10B981]/20 dark:text-[#34D399] font-bold text-[10px] flex items-center justify-center shrink-0">
                {selectedStudent?.name?.charAt(0).toUpperCase() || 'S'}
              </div>
            )}
            <span className="truncate">
              {selectedStudent
                ? showClassInLabel
                  ? `${selectedStudent.name} (${selectedStudent.circular_class})`
                  : selectedStudent.name
                : placeholder}
            </span>
          </div>
          <ChevronDown
            className={cn(
              'size-3.5 shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
              variant === 'hero' ? 'text-white/80' : 'text-[#747775] dark:text-[#8E918F]',
              open && 'rotate-180'
            )}
          />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          sideOffset={sideOffset}
          className={cn(
            'jiddah-popover-content rounded-2xl bg-white dark:bg-[#18211E] text-[#1F1F1F] dark:text-[#E3E3E3]',
            'border border-[#0D5C3A]/15 dark:border-[#F59E0B]/25',
            'shadow-[0_14px_38px_-6px_rgba(0,0,0,0.22)] dark:shadow-[0_16px_42px_-6px_rgba(0,0,0,0.75)]',
            'p-1.5 z-50 w-[300px] sm:w-[360px] max-w-[92vw] flex flex-col overflow-hidden outline-none'
          )}
        >
          {/* Sticky Instant Search Input */}
          <div className="relative flex items-center px-1.5 py-1 mb-1 border-b border-black/[0.06] dark:border-white/[0.08]">
            <Search className="w-3.5 h-3.5 text-[#747775] dark:text-[#8E918F] absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student by name or class..."
              className="w-full h-8 pl-8 pr-7 text-xs rounded-lg bg-[#F0F4F9] dark:bg-[#131314] text-[#1F1F1F] dark:text-[#E3E3E3] placeholder:text-[#747775] border-0 outline-none focus:ring-1 focus:ring-[#0D5C3A]/30"
              autoFocus
            />
            {search && (
              <button
                type="button"
                aria-label="Clear student search"
                onClick={() => setSearch('')}
                className="absolute right-3 p-0.5 text-[#747775] hover:text-[#1F1F1F] dark:hover:text-white rounded-full cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Option rows */}
          <div className="max-h-[270px] overflow-y-auto space-y-0.5 pr-1">
            {filteredStudents.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-[#747775] dark:text-[#8E918F]">
                No students match &ldquo;{search}&rdquo;
              </div>
            ) : (
              filteredStudents.map((student) => {
                const isSelected = student.id === selectedId
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => {
                      onSelect(student.id)
                      setOpen(false)
                    }}
                    className={cn(
                      'w-full px-2.5 py-2 rounded-xl flex items-center justify-between gap-2.5 cursor-pointer text-xs sm:text-[13px] text-left transition-colors',
                      isSelected
                        ? 'bg-gradient-to-r from-[#0D5C3A]/12 to-[#D97706]/10 dark:from-[#10B981]/22 dark:to-[#F59E0B]/15 text-[#093D26] dark:text-[#FDE68A] font-semibold'
                        : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[#1F1F1F] dark:text-[#E3E3E3]'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-[#0D5C3A]/12 text-[#0D5C3A] dark:bg-[#10B981]/20 dark:text-[#34D399] font-bold text-[10px] flex items-center justify-center shrink-0">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium truncate text-[#111827] dark:text-[#F3F7F5]">
                        {student.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#0D5C3A]/10 dark:bg-[#10B981]/20 text-[#0D5C3A] dark:text-[#34D399]">
                        {student.circular_class}
                      </span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-[#0D5C3A] dark:text-[#F59E0B] shrink-0" />
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
