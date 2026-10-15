import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import SeviSaudeLogo, { SeviSaudeIcon } from '@/components/SeviSaudeLogo'
import {
  Check,
  Sparkles,
  ShieldCheck,
  Users,
  QrCode,
  ArrowRight,
  Heart,
  FolderHeart,
  Clock,
  FileCheck,
} from 'lucide-react'

export default function Planos() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleChoosePlan = (planoId: string) => {
    if (user) {
      navigate('/perfil?tab=plano&escolhido=' + planoId)
    } else {
      navigate('/criar-conta')
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F4EF] text-[#26362B] flex flex-col antialiased">
      {/* Top Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-[#D9E2D4] sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <SeviSaudeIcon size={28} variant="brand" />
            <div className="flex items-baseline gap-0.5">
              <span className="font-serif italic font-bold text-2xl text-[#26362B]">Sevi</span>
              <span className="font-serif italic font-bold text-2xl text-[#4C7A5A]">Saúde</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to="/perfil?tab=plano"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#4C7A5A] text-white text-xs font-semibold hover:bg-[#3F664C] transition shadow-xs"
              >
                <span>Meu Plano</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/entrar"
                  className="px-4 py-2 rounded-full text-xs font-semibold text-[#4C7A5A] hover:bg-[#E7F0E3] transition"
                >
                  Entrar
                </Link>
                <Link
                  to="/criar-conta"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#4C7A5A] text-white text-xs font-semibold hover:bg-[#3F664C] transition shadow-xs"
                >
                  <span>Criar conta</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-4 py-12 md:py-16 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E7F0E3] border border-[#DCE9D4] text-[#4C7A5A] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Teste grátis de 30 dias em todas as novas contas</span>
          </div>

          <h1 className="font-serif italic text-3xl md:text-5xl font-semibold text-[#26362B] tracking-tight">
            Planos claros, transparentes e sem pegadinhas
          </h1>

          <p className="text-sm md:text-base text-[#6B7A6F] leading-relaxed">
            Escolha o plano ideal para cuidar da sua saúde e da sua família. Pagamento via PIX
            manual confirmado diretamente pela dona — sem cartões cadastrados e sem renovações
            automáticas indesejadas.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {/* 1. Sevi Essencial */}
          <div className="bg-white rounded-3xl p-6 lg:p-8 border border-[#D9E2D4] shadow-xs flex flex-col justify-between hover:shadow-md transition">
            <div>
              <div className="mb-4">
                <h2 className="font-serif italic text-2xl font-bold text-[#26362B]">
                  Sevi Essencial
                </h2>
                <p className="text-xs text-[#6B7A6F] mt-1 min-h-[32px]">
                  "Para quem quer organizar a própria saúde."
                </p>
              </div>

              <div className="py-4 border-y border-[#D9E2D4]/60 mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="font-serif italic text-4xl font-bold text-[#26362B]">
                    R$ 9,90
                  </span>
                  <span className="text-xs text-[#6B7A6F] font-medium">/mês</span>
                </div>
                <p className="text-[11px] text-[#4C7A5A] font-semibold mt-1">
                  30 dias grátis para começar
                </p>
              </div>

              <div className="space-y-3 mb-8 text-xs text-[#26362B]">
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#4C7A5A] shrink-0 mt-0.5" />
                  <span>
                    <strong>1 perfil de saúde</strong>
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#4C7A5A] shrink-0 mt-0.5" />
                  <span>Cadastro de medicamentos e histórico de alterações</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#4C7A5A] shrink-0 mt-0.5" />
                  <span>Registro de consultas, exames e resultados</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#4C7A5A] shrink-0 mt-0.5" />
                  <span>Calendário e lembretes por e-mail</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#4C7A5A] shrink-0 mt-0.5" />
                  <span>Carteira de saúde para impressão</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#4C7A5A] shrink-0 mt-0.5" />
                  <span className="text-[#6B7A6F]">
                    Armazenamento e anexos básicos (100 MB de cota)
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleChoosePlan('essencial')}
              className="w-full py-3 px-4 rounded-full border-2 border-[#4C7A5A] text-[#4C7A5A] hover:bg-[#E7F0E3] font-semibold text-xs transition cursor-pointer"
            >
              {user ? 'Escolher Sevi Essencial' : 'Experimentar 30 dias grátis'}
            </button>
          </div>

          {/* 2. Sevi Completo (Recomendado) */}
          <div className="bg-[#FAF8F5] rounded-3xl p-6 lg:p-8 border-2 border-[#4C7A5A] shadow-lg flex flex-col justify-between relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#4C7A5A] text-white text-[11px] font-bold uppercase tracking-wider px-4 py-1 rounded-full shadow-sm">
              Recomendado
            </div>

            <div>
              <div className="mb-4 pt-1">
                <h2 className="font-serif italic text-2xl font-bold text-[#26362B]">
                  Sevi Completo
                </h2>
                <p className="text-xs text-[#6B7A6F] mt-1 min-h-[32px]">
                  "Para quem quer manter o histórico organizado e digitalizar documentos."
                </p>
              </div>

              <div className="py-4 border-y border-[#D9E2D4] mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="font-serif italic text-4xl font-bold text-[#26362B]">
                    R$ 19,90
                  </span>
                  <span className="text-xs text-[#6B7A6F] font-medium">/mês</span>
                </div>
                <p className="text-[11px] text-[#4C7A5A] font-semibold mt-1">
                  Melhor custo-benefício individual
                </p>
              </div>

              <div className="space-y-3 mb-8 text-xs text-[#26362B]">
                <div className="flex items-start gap-2.5 font-semibold text-[#4C7A5A]">
                  <Check className="w-4 h-4 text-[#4C7A5A] shrink-0 mt-0.5" />
                  <span>Tudo do Essencial</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#4C7A5A] shrink-0 mt-0.5" />
                  <span>Até 3 perfis de saúde</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#4C7A5A] shrink-0 mt-0.5" />
                  <span>Armazenamento ampliado de documentos (1 GB)</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#4C7A5A] shrink-0 mt-0.5" />
                  <span>
                    Leitura de receitas e pedidos por OCR (cota de 10 docs/mês com revisão
                    obrigatória)
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#4C7A5A] shrink-0 mt-0.5" />
                  <span>Exportação do histórico em PDF</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#4C7A5A] shrink-0 mt-0.5" />
                  <span>Compartilhamento controlado com pessoas autorizadas</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleChoosePlan('completo')}
              className="w-full py-3.5 px-4 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white font-semibold text-xs shadow transition cursor-pointer"
            >
              {user ? 'Assinar Sevi Completo' : 'Começar com Sevi Completo'}
            </button>
          </div>

          {/* 3. Sevi Família (Compartilhado) */}
          <div className="bg-white rounded-3xl p-6 lg:p-8 border border-[#D9E2D4] shadow-xs flex flex-col justify-between hover:shadow-md transition relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#26362B] text-white text-[11px] font-bold uppercase tracking-wider px-4 py-1 rounded-full shadow-sm">
              Compartilhado
            </div>

            <div>
              <div className="mb-4 pt-1">
                <h2 className="font-serif italic text-2xl font-bold text-[#26362B]">
                  Sevi Família
                </h2>
                <p className="text-xs text-[#6B7A6F] mt-1 min-h-[32px]">
                  "Para quem organiza a própria saúde e ajuda a cuidar da família."
                </p>
              </div>

              <div className="py-4 border-y border-[#D9E2D4]/60 mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="font-serif italic text-4xl font-bold text-[#26362B]">
                    R$ 34,90
                  </span>
                  <span className="text-xs text-[#6B7A6F] font-medium">/mês</span>
                </div>
                <p className="text-[11px] text-[#4C7A5A] font-semibold mt-1">
                  Até 5 perfis de saúde independentes
                </p>
              </div>

              <div className="space-y-3 mb-8 text-xs text-[#26362B]">
                <div className="flex items-start gap-2.5 font-semibold text-[#4C7A5A]">
                  <Check className="w-4 h-4 text-[#4C7A5A] shrink-0 mt-0.5" />
                  <span>Tudo do Completo</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#4C7A5A] shrink-0 mt-0.5" />
                  <span>
                    <strong>Até 5 perfis de saúde</strong>, incluindo o titular
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#4C7A5A] shrink-0 mt-0.5" />
                  <span>Histórico separado para cada pessoa da casa</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#4C7A5A] shrink-0 mt-0.5" />
                  <span>Convites e permissões individuais para familiares autorizados</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#4C7A5A] shrink-0 mt-0.5" />
                  <span>Calendário e acompanhamento das pendências da família</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#4C7A5A] shrink-0 mt-0.5" />
                  <span>Cota compartilhada de 2 GB e até 30 processos OCR/mês</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleChoosePlan('familia')}
              className="w-full py-3 px-4 rounded-full border-2 border-[#26362B] text-[#26362B] hover:bg-[#E7F0E3] font-semibold text-xs transition cursor-pointer"
            >
              {user ? 'Escolher Sevi Família' : 'Começar com Sevi Família'}
            </button>
          </div>
        </div>

        {/* Tabela Comparativa de Recursos */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#D9E2D4] shadow-xs space-y-6">
          <div className="text-center max-w-xl mx-auto">
            <h3 className="font-serif italic text-2xl font-bold text-[#26362B]">
              Comparação detalhada de recursos
            </h3>
            <p className="text-xs text-[#6B7A6F] mt-1">
              Todos os planos incluem segurança de dados de saúde e privacidade por padrão
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#D9E2D4] text-[#26362B]">
                  <th className="py-3 px-4 font-bold">Recurso / Limite</th>
                  <th className="py-3 px-4 text-center font-bold">Sevi Essencial</th>
                  <th className="py-3 px-4 text-center font-bold bg-[#FAF8F5]">Sevi Completo</th>
                  <th className="py-3 px-4 text-center font-bold">Sevi Família</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E2D4]/60 text-[#26362B]">
                <tr>
                  <td className="py-3 px-4 font-medium">Preço mensal</td>
                  <td className="py-3 px-4 text-center">R$ 9,90</td>
                  <td className="py-3 px-4 text-center font-bold bg-[#FAF8F5]">R$ 19,90</td>
                  <td className="py-3 px-4 text-center">R$ 34,90</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">Perfis de saúde permitidos</td>
                  <td className="py-3 px-4 text-center">1 perfil (titular)</td>
                  <td className="py-3 px-4 text-center font-bold bg-[#FAF8F5]">Até 3 perfis</td>
                  <td className="py-3 px-4 text-center">Até 5 perfis</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">Cota de armazenamento de documentos</td>
                  <td className="py-3 px-4 text-center">100 MB</td>
                  <td className="py-3 px-4 text-center font-bold bg-[#FAF8F5]">1 GB</td>
                  <td className="py-3 px-4 text-center">2 GB (compartilhados)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">Medicamentos e histórico de alterações</td>
                  <td className="py-3 px-4 text-center text-[#4C7A5A]">✓ Ilimitado</td>
                  <td className="py-3 px-4 text-center text-[#4C7A5A] font-bold bg-[#FAF8F5]">
                    ✓ Ilimitado
                  </td>
                  <td className="py-3 px-4 text-center text-[#4C7A5A]">✓ Ilimitado</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">Consultas e exames estruturados</td>
                  <td className="py-3 px-4 text-center text-[#4C7A5A]">✓ Ilimitado</td>
                  <td className="py-3 px-4 text-center text-[#4C7A5A] font-bold bg-[#FAF8F5]">
                    ✓ Ilimitado
                  </td>
                  <td className="py-3 px-4 text-center text-[#4C7A5A]">✓ Ilimitado</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">Lembretes por e-mail no backend</td>
                  <td className="py-3 px-4 text-center text-[#4C7A5A]">✓ Incluído</td>
                  <td className="py-3 px-4 text-center text-[#4C7A5A] font-bold bg-[#FAF8F5]">
                    ✓ Incluído
                  </td>
                  <td className="py-3 px-4 text-center text-[#4C7A5A]">✓ Incluído</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">Carteira de saúde para impressão</td>
                  <td className="py-3 px-4 text-center text-[#4C7A5A]">✓ Incluído</td>
                  <td className="py-3 px-4 text-center text-[#4C7A5A] font-bold bg-[#FAF8F5]">
                    ✓ Incluído
                  </td>
                  <td className="py-3 px-4 text-center text-[#4C7A5A]">✓ Incluído</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">Exportação do histórico em PDF</td>
                  <td className="py-3 px-4 text-center text-gray-400">—</td>
                  <td className="py-3 px-4 text-center text-[#4C7A5A] font-bold bg-[#FAF8F5]">
                    ✓ Incluído
                  </td>
                  <td className="py-3 px-4 text-center text-[#4C7A5A]">✓ Incluído</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">
                    Compartilhamento e vínculos com familiares
                  </td>
                  <td className="py-3 px-4 text-center text-gray-400">—</td>
                  <td className="py-3 px-4 text-center text-[#4C7A5A] font-bold bg-[#FAF8F5]">
                    ✓ Controlado
                  </td>
                  <td className="py-3 px-4 text-center text-[#4C7A5A]">✓ Permissões completas</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">Processamento de receitas via OCR</td>
                  <td className="py-3 px-4 text-center text-gray-400">—</td>
                  <td className="py-3 px-4 text-center bg-[#FAF8F5]">10 processos/mês</td>
                  <td className="py-3 px-4 text-center">30 processos/mês</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Como funciona o PIX Manual & Segurança */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-[#D9E2D4] space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#DCE9D4] text-[#4C7A5A] flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h4 className="font-serif italic text-lg font-bold text-[#26362B]">
              30 dias de teste grátis
            </h4>
            <p className="text-xs text-[#6B7A6F] leading-relaxed">
              Toda conta nova inicia automaticamente com 30 dias de acesso sem nenhum custo. Você só
              faz o PIX se realmente gostar do aplicativo.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-[#D9E2D4] space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#DCE9D4] text-[#4C7A5A] flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <h4 className="font-serif italic text-lg font-bold text-[#26362B]">
              PIX manual e seguro
            </h4>
            <p className="text-xs text-[#6B7A6F] leading-relaxed">
              Cobrança mensal confirmada manualmente pela dona do negócio. Sem cobranças automáticas
              inesperadas no seu cartão de crédito.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-[#D9E2D4] space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#DCE9D4] text-[#4C7A5A] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="font-serif italic text-lg font-bold text-[#26362B]">
              Seus dados nunca são apagados
            </h4>
            <p className="text-xs text-[#6B7A6F] leading-relaxed">
              Mesmo se a assinatura expirar, o prontuário continua disponível em modo somente
              leitura e para exportação de dados a qualquer momento.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 text-center border-t border-[#D9E2D4] bg-white text-xs text-[#6B7A6F] space-y-2">
        <div className="flex items-center justify-center gap-1.5">
          <SeviSaudeIcon size={16} variant="brand" />
          <span>
            <strong>SeviSaúde</strong> — Sua jornada de saúde, conectada.
          </span>
        </div>
        <p className="text-[11px] text-[#6B7A6F]/80">
          Contato para dúvidas e suporte financeiro:{' '}
          <a
            href="mailto:gislaine.sevirino@gmail.com"
            className="text-[#4C7A5A] font-semibold hover:underline"
          >
            gislaine.sevirino@gmail.com
          </a>
        </p>
      </footer>
    </div>
  )
}
