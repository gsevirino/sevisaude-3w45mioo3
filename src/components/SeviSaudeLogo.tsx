import React from 'react'

export interface SeviSaudeIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string
  className?: string
  variant?: 'brand' | 'light' | 'mono'
}

/**
 * Símbolo vetorial SeviSaúde fiel à geometria enviada pelo usuário:
 * A marca é composta por duas formas em "V" arredondado com as hastes arredondadas (estilo coração geométrico / monograma duplo)
 * sobrepostas horizontalmente com área de interseção evidente.
 *
 * Cada forma é constituída por duas pílulas/cápsulas arredondadas inclinadas que se conectam na base:
 * - Cápsula inclinada descendo para a direita: pill de largura 22, cantos redondos, rotação -45°
 * - Cápsula inclinada descendo para a esquerda: pill de largura 22, cantos redondos, rotação +45°
 *
 * Ao usar retângulos com cantos perfeitamente arredondados (rx="11") e rotação de 45° / -45°,
 * obtemos exatamente a curvatura de pílula perfeita da referência, idêntica ao design da logo.
 */
export function SeviSaudeIcon({
  size = 32,
  className = '',
  variant = 'brand',
  ...props
}: SeviSaudeIconProps) {
  // Paletas de verdes naturais do app
  const colors = {
    brand: {
      left: '#40916C', // Verde esmeralda fresco/vibrante
      right: '#1B4332', // Verde floresta profundo
      overlap: '#2D6A4F', // Tom intermediário rico da sobreposição
    },
    light: {
      left: '#74C69D', // Verde menta luminoso (para fundos escuros)
      right: '#E7F0E3', // Off-white esverdeado suave
      overlap: '#95D5B2', // Intermediário luminoso
    },
    mono: {
      left: '#FFFFFF',
      right: 'rgba(255, 255, 255, 0.65)',
      overlap: 'rgba(255, 255, 255, 0.85)',
    },
  }[variant]

  const uid = React.useId().replace(/:/g, '')
  const leftShapeId = `sevi-left-${uid}`
  const rightShapeId = `sevi-right-${uid}`
  const clipId = `sevi-clip-${uid}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Símbolo SeviSaúde"
      role="img"
      {...props}
    >
      <defs>
        {/* Forma esquerda (Coração/V arredondado esquerdo, centrado em X ~37) */}
        <g id={leftShapeId}>
          {/* Haste esquerda descendo */}
          <rect x="27.5" y="-3" width="20" height="56" rx="10" transform="rotate(45 27.5 -3)" />
          {/* Haste direita subindo */}
          <rect x="48" y="37" width="20" height="56" rx="10" transform="rotate(-45 48 37)" />
        </g>

        {/* Forma direita (Coração/V arredondado direito, centrado em X ~63) */}
        <g id={rightShapeId}>
          {/* Haste esquerda descendo */}
          <rect x="53.5" y="-3" width="20" height="56" rx="10" transform="rotate(45 53.5 -3)" />
          {/* Haste direita subindo */}
          <rect x="74" y="37" width="20" height="56" rx="10" transform="rotate(-45 74 37)" />
        </g>

        {/* Clip-path da forma esquerda para isolar a área de interseção com a direita */}
        <clipPath id={clipId}>
          <use href={`#${leftShapeId}`} />
        </clipPath>
      </defs>

      {/* 1. Forma Esquerda (Verde vibrante) */}
      <use href={`#${leftShapeId}`} fill={colors.left} />

      {/* 2. Forma Direita (Verde escuro profundo) */}
      <use href={`#${rightShapeId}`} fill={colors.right} />

      {/* 3. Área de Sobreposição/Interseção (Verde intermediário) */}
      <g clipPath={`url(#${clipId})`}>
        <use href={`#${rightShapeId}`} fill={colors.overlap} />
      </g>
    </svg>
  )
}

export interface SeviSaudeLogoProps {
  size?: number | string
  layout?: 'horizontal' | 'vertical' | 'icon-only'
  variant?: 'brand' | 'on-dark'
  showSlogan?: boolean
  sloganText?: string
  className?: string
  nameClassName?: string
}

export default function SeviSaudeLogo({
  size = 36,
  layout = 'horizontal',
  variant = 'brand',
  showSlogan = false,
  sloganText = 'Sua jornada de saúde, conectada.',
  className = '',
  nameClassName = '',
}: SeviSaudeLogoProps) {
  const isDark = variant === 'on-dark'
  const iconVariant = isDark ? 'light' : 'brand'

  if (layout === 'icon-only') {
    return <SeviSaudeIcon size={size} variant={iconVariant} className={className} />
  }

  if (layout === 'vertical') {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        <div
          className={`p-3.5 rounded-3xl mb-3 flex items-center justify-center shadow-sm transition-transform ${
            isDark ? 'bg-white/10 ring-1 ring-white/20' : 'bg-[#E7F0E3]/70 ring-4 ring-[#DCE9D4]/40'
          }`}
        >
          <SeviSaudeIcon size={size} variant={iconVariant} />
        </div>
        <div className="flex items-baseline gap-0.5">
          <span
            className={`font-serif italic font-semibold tracking-tight text-3xl md:text-4xl ${
              isDark ? 'text-white' : 'text-[#26362B]'
            } ${nameClassName}`}
          >
            Sevi
          </span>
          <span
            className={`font-serif italic font-bold tracking-tight text-3xl md:text-4xl ${
              isDark ? 'text-[#74C69D]' : 'text-[#4C7A5A]'
            } ${nameClassName}`}
          >
            Saúde
          </span>
        </div>
        {showSlogan && (
          <p
            className={`text-xs md:text-sm mt-1.5 font-sans font-normal tracking-wide max-w-xs ${
              isDark ? 'text-[#E7F0E3]/85' : 'text-[#6B7A6F]'
            }`}
          >
            {sloganText}
          </p>
        )}
      </div>
    )
  }

  // Horizontal layout
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div
        className={`shrink-0 rounded-2xl flex items-center justify-center transition-transform ${
          isDark
            ? 'p-1.5 bg-white/10 ring-1 ring-white/15'
            : 'p-1.5 bg-[#E7F0E3]/80 ring-2 ring-[#DCE9D4]/50'
        }`}
      >
        <SeviSaudeIcon size={size} variant={iconVariant} />
      </div>
      <div className="leading-tight">
        <div className="flex items-baseline gap-0.5">
          <span
            className={`font-serif italic font-semibold tracking-tight ${
              isDark ? 'text-white' : 'text-[#26362B]'
            } ${nameClassName || 'text-xl'}`}
          >
            Sevi
          </span>
          <span
            className={`font-serif italic font-bold tracking-tight ${
              isDark ? 'text-[#74C69D]' : 'text-[#4C7A5A]'
            } ${nameClassName || 'text-xl'}`}
          >
            Saúde
          </span>
        </div>
        {showSlogan && (
          <span
            className={`block text-[11px] font-sans font-normal tracking-tight ${
              isDark ? 'text-[#DCE9D4]' : 'text-[#6B7A6F]'
            }`}
          >
            {sloganText}
          </span>
        )}
      </div>
    </div>
  )
}
