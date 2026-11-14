'use client'

import React, { useState, useRef, useEffect, useId } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown, Check } from 'lucide-react'

export interface ThemedSelectOption<T extends string = string> {
  value: T
  label: string
  sublabel?: string
  disabled?: boolean
}

export interface ThemedSelectProps<T extends string = string> {
  value: T
  onChange: (value: T) => void
  options: ThemedSelectOption<T>[]
  placeholder?: string
  className?: string
  buttonClassName?: string
  disabled?: boolean
  id?: string
  'aria-label'?: string
}

export function ThemedSelect<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  buttonClassName = '',
  disabled = false,
  id,
  'aria-label': ariaLabel,
}: ThemedSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const listboxRef = useRef<HTMLUListElement>(null)
  const generatedId = useId()
  const selectId = id || generatedId

  const selectedOption = options.find((opt) => opt.value === value)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      const idx = options.findIndex((opt) => opt.value === value)
      setHighlightedIndex(idx >= 0 ? idx : 0)
    }
  }, [isOpen, value, options])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }

    if (e.key === 'Escape' || e.key === 'Tab') {
      setIsOpen(false)
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const targetOption = options[highlightedIndex]
      if (targetOption && !targetOption.disabled) {
        onChange(targetOption.value)
        setIsOpen(false)
      }
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full text-xs font-semibold tabular-nums ${className}`}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        id={selectId}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || placeholder}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full min-h-[42px] px-3.5 py-2 flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20 shadow-[var(--shadow-card)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${buttonClassName}`}
      >
        <span className="truncate text-left font-medium">
          {selectedOption ? selectedOption.label : <span className="text-[var(--text-secondary)]">{placeholder}</span>}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-[var(--text-secondary)] transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.ul
            ref={listboxRef}
            role="listbox"
            tabIndex={-1}
            aria-labelledby={selectId}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-1 shadow-xl focus:outline-none text-[var(--text-primary)] backdrop-blur-md"
            style={{
              scrollbarWidth: 'thin',
            }}
          >
            {options.map((option, index) => {
              const isSelected = option.value === value
              const isHighlighted = index === highlightedIndex
              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    if (!option.disabled) {
                      onChange(option.value)
                      setIsOpen(false)
                    }
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`relative flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    option.disabled ? 'opacity-40 cursor-not-allowed' : ''
                  } ${
                    isSelected
                      ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-bold'
                      : isHighlighted
                      ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                      : 'text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-4">
                    <span className="truncate text-xs">{option.label}</span>
                    {option.sublabel && (
                      <span className="text-[10px] text-[var(--text-secondary)] truncate">
                        {option.sublabel}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <Check size={14} className="shrink-0 text-[var(--accent-primary)] stroke-[2.5]" />
                  )}
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
