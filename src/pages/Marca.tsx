import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Download,
  Copy,
  Check,
  ExternalLink,
  ArrowLeft,
  FileCode,
  Palette,
  ShieldCheck,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'

interface BrandAsset {
  id: string
  title: string
  subtitle: string
  description: string
  filename: string
  path: string
  previewPath: string
  viewBox: string
  recommendedFor: string
  bgPreviewClass: string
  contrastLabel: string
}

const BRAND_ASSETS: BrandAsset[] = [
  {
    id: 'simbolo',
    title: 'Símbolo Principal',
    subtitle: 'Paleta padrão (coração esmeralda, cápsula sálvia e sobreposição)',
    description:
      'Ícone puro com geometria idêntica ao aplicativo, sobre fundo transparente. Ideal para avatares, apps, favicons, cabeçalhos e mídias sociais em fundos claros.',
    filename: 'sevisaude-simbolo.svg',
    path: '/brand/sevisaude-simbolo.svg',
    previewPath: '/brand/sevisaude-simbolo.svg',
    viewBox: '0 0 100 100',
    recommendedFor: 'Fundos claros, ícones de perfil, favicons e assinaturas',
    bgPreviewClass: 'bg-white border border-[#D9E2D4]',
    contrastLabel: 'Fundo claro',
  },
  {
    id: 'simbolo-light',
    title: 'Símbolo para Fundos Escuros',
    subtitle: 'Paleta menta, off-white e tom luminoso',
    description:
      'Variação desenvolvida para alto contraste sobre fundos escuros, telas OLED, dark mode ou materiais pretos/verdes-escuros.',
    filename: 'sevisaude-simbolo-light.svg',
    path: '/brand/sevisaude-simbolo-light.svg',
    previewPath: '/brand/sevisaude-simbolo-light.svg',
    viewBox: '0 0 100 100',
    recommendedFor: 'Modo escuro, vídeos, slides pretos e uniformes escuros',
    bgPreviewClass: 'bg-[#1B4332] text-white border border-[#2D6A4F]',
    contrastLabel: 'Fundo escuro',
  },
  {
    id: 'logo-horizontal',
    title: 'Logo Horizontal Completa',
    subtitle: 'Símbolo + tipografia SeviSaúde em serifa itálica',
    description:
      'Versão padrão de aplicação institucional: combina o símbolo com o wordmark "SeviSaúde" em serifa itálica com contraste estilístico.',
    filename: 'sevisaude-logo-horizontal.svg',
    path: '/brand/sevisaude-logo-horizontal.svg',
    previewPath: '/brand/sevisaude-logo-horizontal.svg',
    viewBox: '0 0 460 120',
    recommendedFor: 'Cabeçalhos de sites, documentos, timbrados, crachás e relatórios',
    bgPreviewClass: 'bg-white border border-[#D9E2D4]',
    contrastLabel: 'Fundo claro',
  },
  {
    id: 'logo-vertical',
    title: 'Logo Vertical com Slogan',
    subtitle: 'Símbolo no selo + wordmark + "Sua jornada de saúde, conectada."',
    description:
      'Composição vertical com selo orgânico, wordmark e o slogan oficial da marca. Perfeita para capas, cartazes, telões e apresentações.',
    filename: 'sevisaude-logo-vertical.svg',
    path: '/brand/sevisaude-logo-vertical.svg',
    previewPath: '/brand/sevisaude-logo-vertical.svg',
    viewBox: '0 0 340 260',
    recommendedFor: 'Capas de manuais, banners verticais, apresentações e material impresso',
    bgPreviewClass: 'bg-[#F6F4EF] border border-[#D9E2D4]',
    contrastLabel: 'Institucional',
  },
]

export default function MarcaPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleDownload = (asset: BrandAsset) => {
    // Cria um link temporário para forçar o download com o nome correto do arquivo
    const link = document.createElement('a')
    link.href = asset.path
    link.download = asset.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: 'Download iniciado',
      description: `Arquivo ${asset.filename} baixado com sucesso.`,
    })
  }

  const handleCopyLink = async (asset: BrandAsset) => {
    const fullUrl = `${window.location.origin}${asset.path}`
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopiedId(asset.id)
      toast({
        title: 'URL copiada',
        description: 'Link direto do arquivo SVG copiado para a área de transferência.',
      })
      setTimeout(() => setCopiedId(null), 2500)
    } catch {
      toast({
        title: 'Não foi possível copiar',
        description: fullUrl,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F4EF] text-[#26362B]">
      {/* Top Header */}
      <header className="border-b border-[#D9E2D4] bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#4C7A5A] hover:text-[#1B4332] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao SeviSaúde</span>
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-[#40916C]/40 text-[#1B4332] bg-[#E7F0E3]/60">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-[#40916C]" /> Ativos Oficiais da Marca
            </Badge>
          </div>
        </div>
      </header>

      {/* Hero section */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-[#E7F0E3] mb-4">
            <img src="/brand/sevisaude-simbolo.svg" alt="SeviSaúde Símbolo" className="w-12 h-12" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif italic font-bold tracking-tight text-[#26362B]">
            Arquivos SVG Oficiais SeviSaúde
          </h1>
          <p className="mt-3 text-base sm:text-lg text-[#6B7A6F]">
            Baixe os arquivos vetoriais em formato SVG puro para usar fora do app: apresentações,
            materiais gráficos, crachás, cabeçalhos e publicações.
          </p>
        </div>

        {/* Guia de Cores Rápidas */}
        <div className="mb-10 p-5 rounded-2xl bg-white border border-[#D9E2D4] shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="w-4 h-4 text-[#40916C]" />
            <h2 className="text-sm font-semibold tracking-wide uppercase text-[#1B4332]">
              Paleta Oficial da Marca
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F6F4EF] border border-[#D9E2D4]">
              <div className="w-8 h-8 rounded-lg bg-[#40916C] shadow-inner shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#26362B] truncate">Esmeralda</p>
                <code className="text-[11px] text-[#6B7A6F]">#40916C</code>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F6F4EF] border border-[#D9E2D4]">
              <div className="w-8 h-8 rounded-lg bg-[#E7F0E3] border border-[#D9E2D4] shadow-inner shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#26362B] truncate">Sálvia Pálido</p>
                <code className="text-[11px] text-[#6B7A6F]">#E7F0E3</code>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F6F4EF] border border-[#D9E2D4]">
              <div className="w-8 h-8 rounded-lg bg-[#317355] shadow-inner shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#26362B] truncate">Sobreposição</p>
                <code className="text-[11px] text-[#6B7A6F]">#317355</code>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F6F4EF] border border-[#D9E2D4]">
              <div className="w-8 h-8 rounded-lg bg-[#74C69D] shadow-inner shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#26362B] truncate">Menta (Dark)</p>
                <code className="text-[11px] text-[#6B7A6F]">#74C69D</code>
              </div>
            </div>
          </div>
        </div>

        {/* Grid de Ativos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {BRAND_ASSETS.map((asset) => (
            <Card
              key={asset.id}
              className="flex flex-col justify-between overflow-hidden border-[#D9E2D4] bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <div>
                {/* Visual Preview */}
                <div
                  className={`p-8 min-h-[220px] flex items-center justify-center relative overflow-hidden ${asset.bgPreviewClass}`}
                >
                  <img
                    src={asset.previewPath}
                    alt={asset.title}
                    className="max-h-36 max-w-[85%] object-contain select-none"
                    loading="lazy"
                  />
                  <div className="absolute top-3 right-3">
                    <Badge
                      variant="secondary"
                      className="text-[11px] font-normal backdrop-blur-sm bg-black/10 text-inherit border-none"
                    >
                      {asset.contrastLabel}
                    </Badge>
                  </div>
                </div>

                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-xl text-[#26362B]">{asset.title}</CardTitle>
                      <CardDescription className="text-xs text-[#6B7A6F] mt-1">
                        {asset.subtitle}
                      </CardDescription>
                    </div>
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] text-[#4C7A5A] border-[#4C7A5A]/30 shrink-0"
                    >
                      SVG Vetorial
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 text-sm text-[#4A554D] pb-4">
                  <p className="leading-relaxed">{asset.description}</p>
                  <div className="pt-2 border-t border-[#F0F4ED]">
                    <span className="text-xs font-medium text-[#6B7A6F]">Recomendado para: </span>
                    <span className="text-xs text-[#26362B] font-medium">
                      {asset.recommendedFor}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-xs text-[#6B7A6F] bg-[#F6F4EF] p-2 rounded-lg">
                    <FileCode className="w-3.5 h-3.5 text-[#40916C] shrink-0" />
                    <span className="truncate">{asset.filename}</span>
                  </div>
                </CardContent>
              </div>

              {/* Ações de Download e Cópia */}
              <div className="p-4 pt-0 mt-auto flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => handleDownload(asset)}
                  className="flex-1 bg-[#4C7A5A] hover:bg-[#3D6349] text-white gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar SVG</span>
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopyLink(asset)}
                    title="Copiar URL direta do SVG"
                    className="border-[#D9E2D4] hover:bg-[#F6F4EF] text-[#26362B]"
                  >
                    {copiedId === asset.id ? (
                      <Check className="w-4 h-4 text-[#40916C]" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    asChild
                    title="Abrir arquivo SVG em nova aba"
                    className="border-[#D9E2D4] hover:bg-[#F6F4EF] text-[#26362B]"
                  >
                    <a href={asset.path} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Dicas de Uso e Links Diretos */}
        <div className="mt-12 p-6 rounded-2xl bg-white border border-[#D9E2D4] shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-[#40916C]" />
            <h3 className="font-semibold text-[#26362B]">Links diretos para download via URL</h3>
          </div>
          <p className="text-sm text-[#6B7A6F] mb-4">
            Você também pode acessar e incorporar os arquivos diretamente utilizando as URLs
            públicas abaixo:
          </p>
          <div className="space-y-2">
            {BRAND_ASSETS.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#F6F4EF] border border-[#D9E2D4] text-xs font-mono"
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <span className="font-semibold text-[#1B4332]">{asset.filename}:</span>
                  <span className="text-[#4A554D] truncate">{asset.path}</span>
                </div>
                <a
                  href={asset.path}
                  download={asset.filename}
                  className="text-[#40916C] hover:text-[#1B4332] font-sans font-medium hover:underline shrink-0 ml-2"
                >
                  Baixar
                </a>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer simples */}
      <footer className="border-t border-[#D9E2D4] bg-white py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-xs text-[#6B7A6F]">
          <p>SeviSaúde — Sua jornada de saúde, conectada. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
