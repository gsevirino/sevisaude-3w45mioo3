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
  // Paletas de verdes naturais do app conforme solicitado:
  // Verde esmeralda #40916C, Verde floresta #1B4332, Tom intermediário da sobreposição #2D6A4F
  // Configuração das cores para cada variante:
  // - brand: Coração verde esmeralda (#40916C), cápsula de fundo sálvia pálido (#E7F0E3), sobreposição em blend suave
  // - light: Adaptada para fundos escuros (coração menta luminoso #74C69D, cápsula translúcida suave)
  // - mono: Monocromático em branco/tons claros
  const colorScheme = {
    brand: {
      capsule: '#E7F0E3',
      capsuleOpacity: 0.85,
      heart: '#40916C',
      heartOpacity: 0.96,
      overlap: '#317355',
    },
    light: {
      capsule: '#E7F0E3',
      capsuleOpacity: 0.35,
      heart: '#74C69D',
      heartOpacity: 0.96,
      overlap: '#95D5B2',
    },
    mono: {
      capsule: '#FFFFFF',
      capsuleOpacity: 0.45,
      heart: '#FFFFFF',
      heartOpacity: 0.95,
      overlap: '#E0E0E0',
    },
  }[variant]

  const uid = React.useId().replace(/:/g, '')
  const clipId = `sevi-overlap-clip-${uid}`
  const heartPathId = `sevi-heart-${uid}`

  // Geometria EXATA da imagem de referência:
  // - Fundo: Cápsula / pílula arredondada inclinada a -45° (de cima-esquerda para baixo-direita).
  // - Frente: Coração arredondado e volumoso, ligeiramente deslocado para a direita,
  //   formado pela união de duas cápsulas arredondadas perpendiculares em 45° e -45°.
  // - Sobreposição: A cápsula de trás e a asa esquerda do coração se cruzam; a zona de interseção
  //   aparece translúcida com tom intermediário harmônico visível.
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
        {/* Traçado do coração frontal (composto de duas cápsulas em 45° e -45°) */}
        <clipPath id={clipId}>
          <rect x="36" y="26" width="22" height="44" rx="11" transform="rotate(-45 36 26)" />
        </clipPath>
      </defs>

      {/* 1. Cápsula de fundo: sálvia pálido muito claro, inclinada a -45° */}
      <rect
        x="36"
        y="26"
        width="22"
        height="44"
        rx="11"
        transform="rotate(-45 36 26)"
        fill={colorScheme.capsule}
        fillOpacity={colorScheme.capsuleOpacity}
      />

      {/* 2. Coração principal frontal: verde esmeralda */}
      {/* Asa esquerda do coração (inclinada descendo para a direita, 45°) */}
      <rect
        id={heartPathId}
        x="53"
        y="19"
        width="21"
        height="42"
        rx="10.5"
        transform="rotate(45 53 19)"
        fill={colorScheme.heart}
        fillOpacity={colorScheme.heartOpacity}
      />

      {/* Asa direita do coração (inclinada descendo para a esquerda, -45°) */}
      <rect
        x="53"
        y="19"
        width="21"
        height="42"
        rx="10.5"
        transform="rotate(-45 53 19)"
        fill={colorScheme.heart}
        fillOpacity={colorScheme.heartOpacity}
      />

      {/* 3. Zona de sobreposição translúcida com tom intermediário visível */}
      <g clipPath={`url(#${clipId})`}>
        <rect
          x="53"
          y="19"
          width="21"
          height="42"
          rx="10.5"
          transform="rotate(45 53 19)"
          fill={colorScheme.overlap}
          fillOpacity={0.7}
        />
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
        {/* Contêiner de fundo suave arredondado igual ao da marca na imagem de referência */}
        <div
          className={`p-3.5 rounded-3xl mb-3 flex items-center justify-center shadow-sm transition-transform ${
            isDark ? 'bg-white/10 ring-1 ring-white/20' : 'bg-[#E7F0E3]/75 ring-4 ring-[#DCE9D4]/40'
          }`}
        >
          <SeviSaudeIcon size={size} variant={iconVariant} />
        </div>
        <div className="flex items-baseline justify-center gap-0.5 whitespace-nowrap">
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
            className={`text-xs md:text-sm mt-1.5 font-sans font-normal tracking-normal max-w-sm w-full mx-auto px-2 break-normal text-center whitespace-normal select-none ${
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
        <div className="flex items-baseline gap-0.5 whitespace-nowrap">
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
            className={`block text-[11px] font-sans font-normal tracking-tight whitespace-nowrap ${
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
