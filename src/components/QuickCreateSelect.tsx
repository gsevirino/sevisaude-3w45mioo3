import React, { useState, useRef, useEffect, useId } from 'react'
import { Plus, ChevronDown, Check, Sparkles } from 'lucide-react'

export interface QuickCreateSelectOption {
  value: string
  label: string
  sublabel?: string
  disabled?: boolean
}

export interface QuickCreateSelectProps {
  id?: string
  value: string
  onChange: (value: string) => void
  options: QuickCreateSelectOption[]
  placeholder?: string
  emptyOptionLabel?: string
  allowEmpty?: boolean
  emptyValue?: string
  disabled?: boolean
  required?: boolean
  className?: string
  /**
   * Texto da ação de cadastro rápido no menu, ex: "+ Cadastrar novo médico…"
   */
  quickCreateLabel?: string
  /**
   * Callback disparado quando o usuário clica na ação de cadastro rápido
   */
  onQuickCreate?: () => void
  /**
   * Dica contextual exibida abaixo da lista quando há ação rápida
   */
  quickCreateHint?: string
}

export function QuickCreateSelect({
  id: explicitId,
  value,
  onChange,
  options,
  placeholder = 'Selecione uma opção...',
  emptyOptionLabel,
  allowEmpty = false,
  emptyValue = '',
  disabled = false,
  required = false,
  className = '',
  quickCreateLabel,
  onQuickCreate,
  quickCreateHint,
}: QuickCreateSelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const listboxRef = useRef<HTMLUListElement>(null)
  const autoId = useId()
  const componentId = explicitId || autoId

  const selectedOption = options.find((opt) => opt.value === value)

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleSelectOption = (val: string) => {
    onChange(val)
    setOpen(false)
  }

  const handleQuickCreateClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setOpen(false)
    if (onQuickCreate) {
      onQuickCreate()
    }
  }

  // Label para mostrar no gatilho
  let triggerText = placeholder
  if (selectedOption) {
    triggerText = selectedOption.sublabel
      ? `${selectedOption.label} — ${selectedOption.sublabel}`
      : selectedOption.label
  } else if (allowEmpty && emptyOptionLabel && value === emptyValue) {
    triggerText = emptyOptionLabel
  }

  const isValueEmpty = !value || (allowEmpty && value === emptyValue)

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Hidden input para compatibilidade com required em forms */}
      <input
        type="text"
        id={componentId}
        value={value}
        onChange={() => {}}
        required={required}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full flex items-center justify-between text-left transition-all ${
          className
            ? className
            : 'px-3.5 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs text-[#26362B] focus:ring-2 focus:ring-[#4C7A5A] outline-none'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[#4C7A5A]/60'} ${
          open ? 'ring-2 ring-[#4C7A5A] border-transparent' : ''
        }`}
      >
        <span
          className={`truncate ${isValueEmpty ? 'text-[#6B7A6F]' : 'font-medium text-[#26362B]'}`}
        >
          {triggerText}
        </span>
        <ChevronDown
          className={`w-4 h-4 ml-2 text-[#4C7A5A] shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Popover Menu */}
      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-2xl border border-[#D9E2D4] shadow-xl overflow-hidden animate-scale-in">
          {/* Header opcional de criação rápida em destaque se especificado */}
          {onQuickCreate && quickCreateLabel && (
            <div className="p-1.5 bg-[#F6F4EF] border-b border-[#D9E2D4]">
              <button
                type="button"
                onClick={handleQuickCreateClick}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-[#4C7A5A] hover:bg-[#E7F0E3] transition cursor-pointer group"
              >
                <span className="w-5 h-5 rounded-lg bg-[#4C7A5A] text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                  <Plus className="w-3.5 h-3.5" />
                </span>
                <span className="truncate">{quickCreateLabel}</span>
                <Sparkles className="w-3.5 h-3.5 ml-auto text-[#4C7A5A]/70 shrink-0" />
              </button>
            </div>
          )}

          {/* Listbox */}
          <ul
            ref={listboxRef}
            role="listbox"
            tabIndex={-1}
            className="max-h-60 overflow-y-auto p-1.5 divide-y divide-[#D9E2D4]/40 focus:outline-none"
          >
            {/* Opção vazia (ex: "Nenhum médico selecionado") */}
            {allowEmpty && emptyOptionLabel && (
              <li
                role="option"
                aria-selected={value === emptyValue}
                onClick={() => handleSelectOption(emptyValue)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition ${
                  value === emptyValue
                    ? 'bg-[#E7F0E3] text-[#26362B] font-semibold'
                    : 'text-[#6B7A6F] hover:bg-[#F6F4EF]'
                }`}
              >
                <span className="italic">{emptyOptionLabel}</span>
                {value === emptyValue && <Check className="w-4 h-4 text-[#4C7A5A]" />}
              </li>
            )}

            {options.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-[#6B7A6F] italic">
                Nenhum registro cadastrado.
              </li>
            ) : (
              options.map((opt) => {
                const isSelected = opt.value === value
                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      if (!opt.disabled) handleSelectOption(opt.value)
                    }}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition ${
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed'
                        : isSelected
                          ? 'bg-[#E7F0E3] text-[#26362B] font-semibold cursor-pointer'
                          : 'text-[#26362B] hover:bg-[#F6F4EF] cursor-pointer'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="truncate">{opt.label}</div>
                      {opt.sublabel && (
                        <div className="text-[11px] text-[#6B7A6F] truncate">{opt.sublabel}</div>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#4C7A5A] shrink-0" />}
                  </li>
                )
              })
            )}
          </ul>

          {/* Rodapé opcional com link rápido secundário e dica */}
          {onQuickCreate && quickCreateLabel && (
            <div className="p-2 bg-[#FDFCFB] border-t border-[#D9E2D4] flex items-center justify-between text-[11px] text-[#6B7A6F]">
              <span className="truncate">
                {quickCreateHint || 'Cadastre sem sair deste formulário'}
              </span>
              <button
                type="button"
                onClick={handleQuickCreateClick}
                className="font-semibold text-[#4C7A5A] hover:underline cursor-pointer shrink-0 ml-2"
              >
                + Cadastrar novo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
