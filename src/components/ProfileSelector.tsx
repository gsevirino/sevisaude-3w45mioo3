import React from 'react'
import { useHealthProfile } from '@/context/HealthProfileContext'
import { Users, ChevronDown, Check, ShieldCheck, HeartHandshake } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNavigate } from 'react-router-dom'

interface ProfileSelectorProps {
  compact?: boolean
}

export default function ProfileSelector({ compact = false }: ProfileSelectorProps) {
  const { profiles, activeProfile, setActiveProfileId, isOwner, activeGrant } = useHealthProfile()
  const navigate = useNavigate()

  if (!activeProfile && profiles.length === 0) {
    return null
  }

  const currentName = activeProfile?.nome || 'Titular'
  const isFamilyGuest = !isOwner && !!activeGrant

  return (
    <div className="w-full">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`w-full flex items-center justify-between gap-2 rounded-2xl transition border text-left cursor-pointer ${
              compact
                ? 'px-2.5 py-1.5 bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs'
                : 'px-3.5 py-2.5 bg-white/10 hover:bg-white/15 border-white/15 text-white shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  isOwner
                    ? 'bg-[#E7F0E3] text-[#26362B]'
                    : 'bg-amber-200 text-amber-900 ring-1 ring-amber-400'
                }`}
              >
                {currentName.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-xs truncate block">{currentName}</span>
                </div>
                <span className="text-[10px] text-[#DCE9D4] block truncate">
                  {activeProfile?.is_proprio
                    ? 'Titular principal'
                    : isFamilyGuest
                      ? `Familiar autorizado (${activeGrant?.parentesco || 'vínculo'})`
                      : activeProfile?.parentesco || 'Dependente'}
                </span>
              </div>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-white/70 shrink-0" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          className="w-64 bg-white text-[#26362B] p-2 rounded-2xl shadow-xl border border-[#D9E2D4]"
        >
          <DropdownMenuLabel className="text-[11px] font-semibold text-[#6B7A6F] uppercase tracking-wider px-2 py-1 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#4C7A5A]" />
            <span>Consultando dados de:</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <div className="max-h-60 overflow-y-auto space-y-1">
            {profiles.map((p) => {
              const isSelected = activeProfile?.id === p.id
              const isSelf = p.is_proprio

              return (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => setActiveProfileId(p.id)}
                  className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer ${
                    isSelected ? 'bg-[#E7F0E3] font-semibold text-[#26362B]' : 'hover:bg-[#F6F4EF]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                        isSelected ? 'bg-[#4C7A5A] text-white' : 'bg-[#DCE9D4] text-[#26362B]'
                      }`}
                    >
                      {p.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className="truncate block font-medium">{p.nome}</span>
                      <span className="text-[10px] text-[#6B7A6F] block">
                        {isSelf ? 'Próprio' : p.parentesco ? p.parentesco : 'Familiar'}
                      </span>
                    </div>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-[#4C7A5A] shrink-0" />}
                </DropdownMenuItem>
              )
            })}
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => navigate('/perfil')}
            className="flex items-center gap-2 p-2 rounded-xl text-xs text-[#4C7A5A] font-semibold hover:bg-[#E7F0E3]/70 cursor-pointer"
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Gerenciar titulares e vínculos</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
