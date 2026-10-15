import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useHealthProfile } from '@/context/HealthProfileContext'
import { formatarData, formatarHora, formatarDataHora, extrairDataIso } from '@/lib/dateUtils'
import ProfileContextBadge from '@/components/ProfileContextBadge'
import { useHealthRefresh } from '@/context/HealthRefreshContext'
import { useRealtime } from '@/hooks/use-realtime'
import { getMedicamentos, getConsultas, getExames, getDocumentos } from '@/services/healthService'
import type { Medicamento, Consulta, Exame, Documento } from '@/types/health'
import {
  Pill,
  CalendarCheck,
  FileSearch,
  FolderOpen,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  Activity,
  Heart,
  Stethoscope,
  Sparkles,
  ChevronRight,
} from 'lucide-react'

interface TimelineItem {
  id: string
  date: string
  time?: string
  title: string
  subtitle: string
  type: 'medicamento' | 'consulta' | 'exame' | 'documento'
  badge: string
  badgeColor: string
}

export default function Index() {
  const { user } = useAuth()
  const { activeProfile, isOwner, permissions } = useHealthProfile()
  const { refreshKey, triggerRefresh } = useHealthRefresh()
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([])
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [exames, setExames] = useState<Exame[]>([])
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)

  // Realtime updates
  useRealtime('medicamentos', () => triggerRefresh())
  useRealtime('consultas', () => triggerRefresh())
  useRealtime('exames', () => triggerRefresh())
  useRealtime('documentos', () => triggerRefresh())

  const loadData = useCallback(async () => {
    const profId = activeProfile?.id
    try {
      const [meds, cons, exs, docs] = await Promise.all([
        getMedicamentos(profId),
        getConsultas(profId),
        getExames(profId),
        getDocumentos(profId),
      ])
      setMedicamentos(meds)
      setConsultas(cons)
      setExames(exs)
      setDocumentos(docs)
    } catch (err) {
      console.error('Erro ao carregar dados do painel:', err)
    } finally {
      setLoading(false)
    }
  }, [activeProfile?.id])

  useEffect(() => {
    loadData()
  }, [loadData, refreshKey])

  const firstName = user?.name ? user.name.split(' ')[0] : 'você'

  // Calculations
  const activeMeds = medicamentos.filter((m) => m.status === 'em uso')

  // Find upcoming appointments
  const now = new Date()
  const todayStr = extrairDataIso(now.toISOString())

  const upcomingConsultas = consultas
    .filter((c) => c.status === 'Agendada' && c.data >= todayStr)
    .sort((a, b) => a.data.localeCompare(b.data))

  const nextConsulta = upcomingConsultas[0]

  const pendingExames = exames.filter((e) => e.status === 'Pendente' || e.status === 'Agendado')

  // Total docs = separate documentos + exames with attachments
  const totalAttachments =
    documentos.length +
    exames.filter((e) => e.pedido_arquivo).length +
    exames.filter((e) => e.resultado_arquivo).length

  // Medications today schedule
  const allDailyDoses: { medName: string; time: string; dose: string }[] = []
  activeMeds.forEach((m) => {
    const list = Array.isArray(m.horarios) ? m.horarios : []
    list.forEach((t) => {
      allDailyDoses.push({
        medName: m.nome,
        dose: m.dosagem,
        time: t,
      })
    })
  })
  allDailyDoses.sort((a, b) => a.time.localeCompare(b.time))

  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes(),
  ).padStart(2, '0')}`

  const nextDose = allDailyDoses.find((d) => d.time >= currentTimeStr) || allDailyDoses[0]

  // Build Clinical Timeline (merged & sorted newest first)
  const timeline: TimelineItem[] = []

  medicamentos.forEach((m) => {
    timeline.push({
      id: `med-${m.id}`,
      date: extrairDataIso(m.data_inicio),
      title: `Início de medicação: ${m.nome}`,
      subtitle: `${m.dosagem} • ${m.forma} • Prescrito por ${m.expand?.medico?.nome || 'Médico'}`,
      type: 'medicamento',
      badge: m.status === 'em uso' ? 'Em uso' : m.status,
      badgeColor:
        m.status === 'em uso' ? 'bg-[#DCE9D4] text-[#26362B]' : 'bg-amber-100 text-amber-800',
    })
  })

  consultas.forEach((c) => {
    timeline.push({
      id: `con-${c.id}`,
      date: extrairDataIso(c.data),
      time: formatarHora(c.horario),
      title: `Consulta: ${c.expand?.medico?.nome || 'Médico'}`,
      subtitle: `${c.tipo} • ${c.expand?.medico?.especialidade || 'Geral'}${
        c.anotacoes ? ` • "${c.anotacoes.slice(0, 70)}..."` : ''
      }`,
      type: 'consulta',
      badge: c.status,
      badgeColor:
        c.status === 'Realizada'
          ? 'bg-[#DCE9D4] text-[#26362B]'
          : c.status === 'Agendada'
            ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300'
            : 'bg-red-50 text-red-700',
    })
  })

  exames.forEach((e) => {
    timeline.push({
      id: `ex-${e.id}`,
      date: extrairDataIso(e.data_realizado) || extrairDataIso(e.data_solicitado),
      title: `Exame: ${e.nome}`,
      subtitle: `Tipo: ${e.tipo} • Solicitado por ${e.expand?.medico?.nome || 'Médico'}`,
      type: 'exame',
      badge: e.status,
      badgeColor:
        e.status === 'Finalizado'
          ? 'bg-[#DCE9D4] text-[#26362B]'
          : e.status === 'Realizado'
            ? 'bg-teal-100 text-[#5B9A8B]'
            : e.status === 'Agendado'
              ? 'bg-blue-100 text-blue-900'
              : 'bg-orange-100 text-orange-800',
    })
  })

  timeline.sort((a, b) => b.date.localeCompare(a.date))

  const formatDate = (iso?: string) => formatarData(iso)

  const rawDateFormatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now)

  // Formata com a primeira letra maiúscula (ex.: "Quarta-feira, 14 de outubro de 2026")
  const todayFormatted = rawDateFormatted.charAt(0).toUpperCase() + rawDateFormatted.slice(1)

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header with Organic Warm Gradient & Greeting */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#E7F0E3] via-[#F4F8F1] to-white p-6 md:p-8 border border-[#D9E2D4] shadow-sm">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#4C7A5A]/10 blob-organic blur-xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#4C7A5A] mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Visão analítica de saúde</span>
            </div>
            <h1 className="font-serif italic text-3xl md:text-4xl text-[#26362B] font-semibold tracking-tight">
              Olá, {firstName} 👋
            </h1>
            <p className="text-[#4C7A5A] text-xs font-medium mt-1">{todayFormatted}</p>
            <p className="text-[#6B7A6F] text-sm mt-0.5">
              Visualizando dados clínicos de:{' '}
              <strong className="text-[#26362B]">{activeProfile?.nome || 'Titular'}</strong>
              {!isOwner && (
                <span className="text-amber-800 font-medium"> (familiar autorizado)</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/cartao"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white text-[#26362B] hover:bg-[#F6F4EF] border border-[#D9E2D4] text-xs font-medium shadow-sm transition"
            >
              <Heart className="w-3.5 h-3.5 text-[#4C7A5A]" />
              <span>Meu cartão de saúde</span>
            </Link>
            <Link
              to="/medicamentos"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-xs font-medium shadow-sm transition"
            >
              <Pill className="w-3.5 h-3.5" />
              <span>Gerenciar medicamentos</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        {/* Card 1: Medicamentos Ativos */}
        <Link
          to="/medicamentos"
          className="bg-white rounded-3xl p-5 border border-[#D9E2D4] shadow-sm hover:shadow-md hover:-translate-y-1 transition duration-200 group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3 gap-2">
              <span className="text-xs font-semibold text-[#6B7A6F] uppercase tracking-wider">
                Medicamentos ativos
              </span>
              <div className="w-9 h-9 rounded-2xl bg-[#DCE9D4]/70 text-[#4C7A5A] flex items-center justify-center group-hover:bg-[#4C7A5A] group-hover:text-white transition shrink-0">
                <Pill className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-serif italic font-bold text-[#26362B]">
              {loading ? '—' : activeMeds.length}
            </div>
          </div>
          <p className="text-xs text-[#6B7A6F] mt-2 flex items-center gap-1">
            <span>
              {activeMeds.length === 1
                ? '1 em uso contínuo'
                : `${activeMeds.length} em uso contínuo`}
            </span>
            <ChevronRight className="w-3 h-3 text-[#4C7A5A]" />
          </p>
        </Link>

        {/* Card 2: Próxima Consulta */}
        <Link
          to="/consultas"
          className="bg-white rounded-3xl p-5 border border-[#D9E2D4] shadow-sm hover:shadow-md hover:-translate-y-1 transition duration-200 group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3 gap-2">
              <span className="text-xs font-semibold text-[#6B7A6F] uppercase tracking-wider">
                Próxima consulta
              </span>
              <div className="w-9 h-9 rounded-2xl bg-[#E7F0E3] text-[#4C7A5A] flex items-center justify-center group-hover:bg-[#4C7A5A] group-hover:text-white transition shrink-0">
                <CalendarCheck className="w-4 h-4" />
              </div>
            </div>

            {loading ? (
              <div className="text-2xl font-serif italic font-semibold text-[#26362B]">—</div>
            ) : nextConsulta ? (
              <div className="space-y-1">
                {/* Data e Hora completas: formato "DD/MM/AAAA às HH:mm" */}
                <div className="font-serif italic font-semibold text-[#26362B] text-lg sm:text-xl leading-snug break-words">
                  {formatarDataHora(nextConsulta.data, nextConsulta.horario)}
                </div>

                {/* Profissional e especialidade / tipo */}
                <div className="text-xs text-[#6B7A6F] leading-relaxed break-words pt-0.5">
                  <div className="font-medium text-[#26362B]/90">
                    {nextConsulta.expand?.medico?.nome || 'Médico'}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[#6B7A6F]">
                    {nextConsulta.expand?.medico?.especialidade && (
                      <span>{nextConsulta.expand.medico.especialidade}</span>
                    )}
                    {nextConsulta.expand?.medico?.especialidade && nextConsulta.tipo && (
                      <span className="text-[#A8C3A0]">•</span>
                    )}
                    {nextConsulta.tipo && <span>{nextConsulta.tipo}</span>}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-lg font-serif italic font-semibold text-[#26362B]">
                  Nenhuma agendada
                </div>
                <p className="text-xs text-[#6B7A6F] mt-1 leading-relaxed">
                  Mantenha seus check-ups em dia
                </p>
              </div>
            )}
          </div>

          <p className="text-xs text-[#4C7A5A] font-medium mt-3 flex items-center gap-1">
            <span>Ver detalhes da consulta</span>
            <ChevronRight className="w-3 h-3 text-[#4C7A5A]" />
          </p>
        </Link>

        {/* Card 3: Exames Pendentes */}
        <Link
          to="/exames"
          className="bg-white rounded-3xl p-5 border border-[#D9E2D4] shadow-sm hover:shadow-md hover:-translate-y-1 transition duration-200 group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3 gap-2">
              <span className="text-xs font-semibold text-[#6B7A6F] uppercase tracking-wider">
                Exames pendentes
              </span>
              <div className="w-9 h-9 rounded-2xl bg-[#5B9A8B]/15 text-[#5B9A8B] flex items-center justify-center group-hover:bg-[#5B9A8B] group-hover:text-white transition shrink-0">
                <FileSearch className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-serif italic font-bold text-[#26362B]">
              {loading ? '—' : pendingExames.length}
            </div>
          </div>
          <p className="text-xs text-[#6B7A6F] mt-2 flex items-center gap-1">
            <span>
              {pendingExames.length === 1
                ? '1 pedido aguardando'
                : `${pendingExames.length} pedidos solicitados`}
            </span>
            <ChevronRight className="w-3 h-3 text-[#5B9A8B]" />
          </p>
        </Link>

        {/* Card 4: Documentos */}
        <Link
          to="/documentos"
          className="bg-white rounded-3xl p-5 border border-[#D9E2D4] shadow-sm hover:shadow-md hover:-translate-y-1 transition duration-200 group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3 gap-2">
              <span className="text-xs font-semibold text-[#6B7A6F] uppercase tracking-wider">
                Documentos de saúde
              </span>
              <div className="w-9 h-9 rounded-2xl bg-[#A8C3A0]/30 text-[#4C7A5A] flex items-center justify-center group-hover:bg-[#4C7A5A] group-hover:text-white transition shrink-0">
                <FolderOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-serif italic font-bold text-[#26362B]">
              {loading ? '—' : totalAttachments}
            </div>
          </div>
          <p className="text-xs text-[#6B7A6F] mt-2 flex items-center gap-1">
            <span>Laudos, pedidos e receitas</span>
            <ChevronRight className="w-3 h-3 text-[#4C7A5A]" />
          </p>
        </Link>
      </div>

      {/* Medication Reminder Strip */}
      <div className="rounded-3xl bg-gradient-to-r from-[#DCE9D4] via-[#E7F0E3] to-[#DCE9D4] p-5 md:p-6 border border-[#A8C3A0]/60 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#4C7A5A] text-white flex items-center justify-center shrink-0 shadow-md">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-serif italic font-semibold text-base md:text-lg text-[#26362B]">
              Lembretes de medicação de hoje
            </h2>
            <p className="text-xs text-[#385942] mt-0.5">
              {activeMeds.length > 0 ? (
                <>
                  Você tem <strong>{activeMeds.length} medicamentos ativos</strong> cadastrados.{' '}
                  {nextDose && (
                    <span>
                      Próxima dose: <strong>{nextDose.time}</strong> ({nextDose.medName} •{' '}
                      {nextDose.dose})
                    </span>
                  )}
                </>
              ) : (
                'Nenhum medicamento ativo registrado no momento.'
              )}
            </p>
          </div>
        </div>

        <Link
          to="/medicamentos"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-xs font-semibold shadow transition shrink-0"
        >
          <span>Ver medicamentos</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Two Column Content: Próximas Consultas & Últimos Exames */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Próximas Consultas */}
        <div className="bg-white rounded-3xl p-6 border border-[#D9E2D4] shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-[#D9E2D4]/60 mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#4C7A5A]" />
              <h3 className="font-serif italic font-semibold text-lg text-[#26362B]">
                Próximas consultas
              </h3>
            </div>
            <Link
              to="/consultas"
              className="text-xs text-[#4C7A5A] font-semibold hover:underline flex items-center gap-1"
            >
              Ver todas <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3 flex-1">
            {consultas.slice(0, 4).length === 0 ? (
              <p className="text-xs text-[#6B7A6F] py-8 text-center italic">
                Nenhuma consulta registrada.
              </p>
            ) : (
              consultas.slice(0, 4).map((c) => (
                <Link
                  key={c.id}
                  to="/consultas"
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F6F4EF]/60 hover:bg-[#E7F0E3]/70 transition border border-[#D9E2D4]/50 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white border border-[#D9E2D4] text-[#4C7A5A] flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold leading-none">
                        {c.data ? formatarData(c.data).split('/')[0] : '—'}
                      </span>
                      <span className="text-[9px] uppercase text-[#6B7A6F] leading-none mt-0.5">
                        {c.data
                          ? (() => {
                              const iso = extrairDataIso(c.data)
                              return iso
                                ? new Date(iso + 'T12:00:00')
                                    .toLocaleDateString('pt-BR', { month: 'short' })
                                    .replace('.', '')
                                : ''
                            })()
                          : ''}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-serif italic font-medium text-sm text-[#26362B] group-hover:text-[#4C7A5A] transition">
                        {c.expand?.medico?.nome || 'Profissional'}
                      </h4>
                      <p className="text-xs text-[#6B7A6F]">
                        {c.expand?.medico?.especialidade || 'Consulta'} • {formatarHora(c.horario)}{' '}
                        • {c.tipo}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
                      c.status === 'Realizada'
                        ? 'bg-[#DCE9D4] text-[#26362B]'
                        : c.status === 'Agendada'
                          ? 'bg-amber-100 text-amber-900 animate-pulse'
                          : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {c.status}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Right: Últimos Exames */}
        <div className="bg-white rounded-3xl p-6 border border-[#D9E2D4] shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-[#D9E2D4]/60 mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#5B9A8B]" />
              <h3 className="font-serif italic font-semibold text-lg text-[#26362B]">
                Últimos exames
              </h3>
            </div>
            <Link
              to="/exames"
              className="text-xs text-[#5B9A8B] font-semibold hover:underline flex items-center gap-1"
            >
              Ver todos <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3 flex-1">
            {exames.slice(0, 4).length === 0 ? (
              <p className="text-xs text-[#6B7A6F] py-8 text-center italic">
                Nenhum exame cadastrado.
              </p>
            ) : (
              exames.slice(0, 4).map((e) => (
                <Link
                  key={e.id}
                  to="/exames"
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F6F4EF]/60 hover:bg-[#E7F0E3]/70 transition border border-[#D9E2D4]/50 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white border border-[#D9E2D4] text-[#5B9A8B] flex items-center justify-center shrink-0">
                      <FileSearch className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-serif italic font-medium text-sm text-[#26362B] group-hover:text-[#5B9A8B] transition">
                        {e.nome}
                      </h4>
                      <p className="text-xs text-[#6B7A6F]">
                        {e.tipo} • Solicitado em {formatDate(e.data_solicitado)}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
                      e.status === 'Finalizado'
                        ? 'bg-[#DCE9D4] text-[#26362B]'
                        : e.status === 'Realizado'
                          ? 'bg-teal-100 text-[#5B9A8B]'
                          : e.status === 'Agendado'
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {e.status}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Linha do Tempo Clínica (full width below) */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#D9E2D4] shadow-sm">
        <div className="flex items-center justify-between pb-5 border-b border-[#D9E2D4]/60 mb-6">
          <div>
            <h3 className="font-serif italic font-semibold text-xl text-[#26362B]">
              Linha do tempo clínica
            </h3>
            <p className="text-xs text-[#6B7A6F] mt-0.5">
              Histórico cronológico de medicações, consultas médicas e exames laboratoriais
            </p>
          </div>
        </div>

        {timeline.length === 0 ? (
          <p className="text-xs text-[#6B7A6F] py-8 text-center italic">
            Nenhum evento registrado no seu prontuário ainda.
          </p>
        ) : (
          <div className="relative pl-6 md:pl-8 space-y-6 before:content-[''] before:absolute before:left-3 md:before:left-4 before:top-2 before:bottom-2 before:w-[2px] before:bg-[#D9E2D4]">
            {timeline.slice(0, 10).map((item) => (
              <div key={item.id} className="relative group">
                {/* Node Dot with Leaf / Pulse icon */}
                <div
                  className={`absolute -left-[29px] md:-left-[33px] top-1.5 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white shadow-sm ${
                    item.type === 'medicamento'
                      ? 'bg-[#4C7A5A] text-white'
                      : item.type === 'consulta'
                        ? 'bg-[#DCE9D4] text-[#26362B]'
                        : 'bg-[#5B9A8B] text-white'
                  }`}
                >
                  {item.type === 'medicamento' ? (
                    <Pill className="w-3 h-3" />
                  ) : item.type === 'consulta' ? (
                    <Stethoscope className="w-3 h-3" />
                  ) : (
                    <Activity className="w-3 h-3" />
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-[#F6F4EF]/50 hover:bg-[#F6F4EF] border border-[#D9E2D4]/70 transition">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-[#4C7A5A]">
                      {formatDate(item.date)} {item.time ? `às ${item.time}` : ''}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  </div>

                  <h4 className="font-serif italic font-medium text-base text-[#26362B]">
                    {item.title}
                  </h4>
                  <p className="text-xs text-[#6B7A6F] mt-1 leading-relaxed">{item.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
