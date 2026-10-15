import React from 'react'
import { useHealthProfile } from '@/context/HealthProfileContext'
import { ShieldCheck, Info } from 'lucide-react'

interface ProfileContextBadgeProps {
  actionLabel?: string // ex: "editando medicamento para", "cadastrando consulta para"
  className?: string
}

export default function ProfileContextBadge({
  actionLabel = 'Registrando informações para',
  className = '',
}: ProfileContextBadgeProps) {
  const { activeProfile, isOwner, activeGrant } = useHealthProfile()

  if (!activeProfile) return null

  return (
    <div
      className={`rounded-2xl p-3 border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
        isOwner
          ? 'bg-[#E7F0E3]/70 border-[#D9E2D4] text-[#26362B]'
          : 'bg-amber-50 border-amber-200 text-amber-900'
      } ${className}`}
    >
      <div className="flex items-center gap-2">
        {isOwner ? (
          <ShieldCheck className="w-4 h-4 text-[#4C7A5A] shrink-0" />
        ) : (
          <Info className="w-4 h-4 text-amber-700 shrink-0" />
        )}
        <span>
          {actionLabel}:{' '}
          <strong className="font-bold underline decoration-[#4C7A5A] decoration-2">
            {activeProfile.nome}
          </strong>
          {activeProfile.is_proprio
            ? ' (Titular principal)'
            : activeProfile.parentesco
              ? ` (${activeProfile.parentesco})`
              : ''}
        </span>
      </div>

      {!isOwner && activeGrant && (
        <span className="text-[11px] font-medium bg-white/80 px-2 py-0.5 rounded-full border border-amber-300 self-start sm:self-auto">
          Acesso autorizado por vínculo familiar
        </span>
      )}
    </div>
  )
}
