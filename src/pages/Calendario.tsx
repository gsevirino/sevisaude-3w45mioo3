import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatarData, formatarHora, extrairDataIso, extrairHora } from '@/lib/dateUtils'
import { getConsultas, getExames } from '@/services/healthService'
import type { Consulta, Exame } from '@/types/health'
import { useAuth } from '@/context/AuthContext'
import { useHealthProfile } from '@/context/HealthProfileContext'
import ProfileContextBadge from '@/components/ProfileContextBadge'
import { useHealthRefresh } from '@/context/HealthRefreshContext'
import { useRealtime } from '@/hooks/use-realtime'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  Activity,
  X,
  ExternalLink,
  Clock,
  MapPin,
  Loader2,
} from 'lucide-react'

interface DayEvent {
  id: string
  title: string
  time?: string
  doctorName?: string
  doctorSpecialty?: string
  type: 'consulta' | 'exame'
  status: string
  rawDate: string
  path: string
}

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

export default function Calendario() {
  const { user } = useAuth()
  const { activeProfile, isOwner } = useHealthProfile()
  const { refreshKey, triggerRefresh } = useHealthRefresh()
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [exames, setExames] = useState<Exame[]>([])
  const [loading, setLoading] = useState(true)

  useRealtime('consultas', () => triggerRefresh())
  useRealtime('exames', () => triggerRefresh())

  // Current calendar month cursor
  const [currentDate, setCurrentDate] = useState(new Date())

  // Selected Day Modal
  const [selectedDayEvents, setSelectedDayEvents] = useState<DayEvent[] | null>(null)
  const [selectedDayLabel, setSelectedDayLabel] = useState('')

  const navigate = useNavigate()

  const loadData = useCallback(async () => {
    const profId = activeProfile?.id
    try {
      const [cons, exs] = await Promise.all([getConsultas(profId), getExames(profId)])
      setConsultas(cons)
      setExames(exs)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [activeProfile?.id])

  useEffect(() => {
    loadData()
  }, [loadData, refreshKey])

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }
  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // First day of current month (0 = Sun, 1 = Mon...)
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  // Build calendar matrix (42 cells: 6 weeks * 7 days)
  const calendarCells: {
    dayNumber: number
    dateStr: string
    isCurrentMonth: boolean
    isToday: boolean
  }[] = []

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate(),
  ).padStart(2, '0')}`

  // Leading days from previous month
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i
    const prevMonthDate = new Date(year, month - 1, dayNum)
    const dStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(dayNum).padStart(2, '0')}`
    calendarCells.push({
      dayNumber: dayNum,
      dateStr: dStr,
      isCurrentMonth: false,
      isToday: dStr === todayStr,
    })
  }

  // Days in current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    calendarCells.push({
      dayNumber: d,
      dateStr: dStr,
      isCurrentMonth: true,
      isToday: dStr === todayStr,
    })
  }

  // Trailing days from next month
  const remainingCells = 42 - calendarCells.length
  for (let d = 1; d <= remainingCells; d++) {
    const nextMonthDate = new Date(year, month + 1, d)
    const dStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(d).padStart(2, '0')}`
    calendarCells.push({
      dayNumber: d,
      dateStr: dStr,
      isCurrentMonth: false,
      isToday: dStr === todayStr,
    })
  }

  // Group events by date (YYYY-MM-DD)
  const eventsByDate: Record<string, DayEvent[]> = {}

  consultas.forEach((c) => {
    const d = extrairDataIso(c.data)
    if (!d) return
    if (!eventsByDate[d]) eventsByDate[d] = []
    eventsByDate[d].push({
      id: `c-${c.id}`,
      title: `Consulta — ${c.expand?.medico?.nome || 'Médico'}`,
      time: formatarHora(c.horario),
      doctorName: c.expand?.medico?.nome,
      doctorSpecialty: c.expand?.medico?.especialidade,
      type: 'consulta',
      status: c.status,
      rawDate: d,
      path: '/consultas',
    })
  })

  exames.forEach((e) => {
    const d =
      extrairDataIso(e.data_hora_agendada) ||
      extrairDataIso(e.data_realizado) ||
      extrairDataIso(e.data_solicitado)
    if (!d) return
    if (!eventsByDate[d]) eventsByDate[d] = []

    // Se houver horário no agendamento, extrai e exibe; caso contrário, fica sem hora
    const exameHora = e.data_hora_agendada ? extrairHora(e.data_hora_agendada) : ''

    eventsByDate[d].push({
      id: `e-${e.id}`,
      title: `Exame: ${e.nome}`,
      time: exameHora ? formatarHora(exameHora) : undefined,
      doctorName: e.expand?.medico?.nome,
      doctorSpecialty: e.tipo,
      type: 'exame',
      status: e.status,
      rawDate: d,
      path: '/exames',
    })
  })

  const monthName = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(currentDate)

  const handleDayClick = (dateStr: string, events: DayEvent[]) => {
    setSelectedDayLabel(formatarData(dateStr))
    setSelectedDayEvents(events || [])
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif italic text-3xl md:text-4xl text-[#26362B] font-semibold tracking-tight">
            Calendário de saúde
          </h1>
          <p className="text-[#6B7A6F] text-sm mt-1">
            Visão unificada das consultas agendadas e prazos de exames de{' '}
            <strong>{activeProfile?.nome || 'Titular'}</strong>
          </p>
        </div>
        {/* Month Navigation Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={goToToday}
            className="px-4 py-2 rounded-full bg-white hover:bg-[#E7F0E3] text-[#26362B] text-xs font-semibold border border-[#D9E2D4] shadow-xs transition cursor-pointer"
          >
            Hoje
          </button>
          <div className="flex items-center rounded-full bg-white border border-[#D9E2D4] shadow-xs p-1">
            <button
              onClick={prevMonth}
              aria-label="Mês anterior"
              className="p-1.5 rounded-full hover:bg-[#F6F4EF] text-[#26362B] transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-serif italic text-sm font-semibold capitalize min-w-[150px] text-center text-[#26362B]">
              {monthName}
            </span>
            <button
              onClick={nextMonth}
              aria-label="Próximo mês"
              className="p-1.5 rounded-full hover:bg-[#F6F4EF] text-[#26362B] transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-white rounded-3xl p-4 md:p-6 border border-[#D9E2D4] shadow-sm">
        {loading ? (
          <div className="text-center py-24 space-y-3">
            <Loader2 className="w-8 h-8 text-[#4C7A5A] animate-spin mx-auto" />
            <p className="text-sm font-serif italic text-[#26362B]">Carregando calendário...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Weekday headers: dom, seg, ter, qua, qui, sex, sáb */}
            <div className="grid grid-cols-7 gap-1 md:gap-2 text-center pb-2 border-b border-[#D9E2D4]">
              {WEEKDAYS.map((wd) => (
                <div
                  key={wd}
                  className="text-xs font-semibold uppercase tracking-wider text-[#6B7A6F] py-1"
                >
                  {wd}
                </div>
              ))}
            </div>

            {/* 6 weeks grid */}
            <div className="grid grid-cols-7 gap-1 md:gap-2">
              {calendarCells.map((cell, idx) => {
                const dayEvents = eventsByDate[cell.dateStr] || []
                const visibleEvents = dayEvents.slice(0, 2)
                const overflowCount = dayEvents.length - visibleEvents.length

                return (
                  <div
                    key={idx}
                    onClick={() => handleDayClick(cell.dateStr, dayEvents)}
                    className={`min-h-[85px] md:min-h-[105px] p-1.5 md:p-2 rounded-2xl border transition duration-150 flex flex-col justify-between cursor-pointer ${
                      cell.isCurrentMonth
                        ? 'bg-white hover:bg-[#F6F4EF] border-[#D9E2D4]/70'
                        : 'bg-gray-50/50 hover:bg-gray-100/50 border-gray-100 text-gray-400'
                    } ${cell.isToday ? 'ring-2 ring-[#4C7A5A] bg-[#E7F0E3]/30' : ''}`}
                  >
                    {/* Day number with green ring if today */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                          cell.isToday
                            ? 'bg-[#4C7A5A] text-white font-bold'
                            : cell.isCurrentMonth
                              ? 'text-[#26362B]'
                              : 'text-gray-400'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4C7A5A] md:hidden" />
                      )}
                    </div>

                    {/* Event chips (up to 2 + overflow) */}
                    <div className="space-y-1 mt-1 flex-1 overflow-hidden hidden md:block">
                      {visibleEvents.map((ev) => (
                        <div
                          key={ev.id}
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded-lg truncate ${
                            ev.type === 'consulta'
                              ? 'bg-[#DCE9D4] text-[#26362B] border border-[#A8C3A0]/60'
                              : 'bg-teal-50 text-[#5B9A8B] border border-teal-200'
                          }`}
                          title={ev.title}
                        >
                          {ev.time ? `${ev.time} ` : ''}
                          {ev.title}
                        </div>
                      ))}

                      {overflowCount > 0 && (
                        <span className="text-[9px] font-semibold text-[#4C7A5A] block pl-1">
                          +{overflowCount} mais
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Legend Below */}
        <div className="mt-6 pt-4 border-t border-[#D9E2D4] flex flex-wrap items-center justify-between gap-4 text-xs text-[#6B7A6F]">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#4C7A5A]" />
              <span className="font-medium text-[#26362B]">Consulta médica</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#5B9A8B]" />
              <span className="font-medium text-[#26362B]">Exame laboratorial</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full ring-2 ring-[#4C7A5A] bg-transparent" />
              <span>Dia atual</span>
            </div>
          </div>

          <span className="italic text-[11px]">
            Dica: clique em qualquer dia para ver os detalhes completos dos compromissos.
          </span>
        </div>
      </div>

      {/* Day Events Modal */}
      {selectedDayEvents && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#D9E2D4] space-y-4 animate-scale-in relative">
            <button
              onClick={() => setSelectedDayEvents(null)}
              className="absolute top-6 right-6 p-1.5 rounded-full hover:bg-gray-100 text-[#6B7A6F] transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E7F0E3] text-[#4C7A5A] flex items-center justify-center">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif italic text-xl text-[#26362B] font-semibold">
                  Eventos em {selectedDayLabel}
                </h3>
                <p className="text-xs text-[#6B7A6F]">
                  {selectedDayEvents.length === 1
                    ? '1 evento registrado para este dia'
                    : `${selectedDayEvents.length} eventos registrados`}
                </p>
              </div>
            </div>

            {selectedDayEvents.length === 0 ? (
              <p className="text-xs text-[#6B7A6F] py-6 text-center italic">
                Nenhuma consulta ou exame agendado nesta data.
              </p>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {selectedDayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3.5 rounded-2xl bg-[#F6F4EF] border border-[#D9E2D4] space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          ev.type === 'consulta'
                            ? 'bg-[#DCE9D4] text-[#26362B]'
                            : 'bg-teal-100 text-[#5B9A8B]'
                        }`}
                      >
                        {ev.type === 'consulta' ? 'Consulta' : 'Exame'} • {ev.status}
                      </span>

                      {ev.time && (
                        <span className="text-xs font-semibold text-[#4C7A5A] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {ev.time}
                        </span>
                      )}
                    </div>

                    <h4 className="font-serif italic text-base text-[#26362B] font-medium">
                      {ev.title}
                    </h4>

                    {ev.doctorName && (
                      <p className="text-xs text-[#6B7A6F]">
                        {ev.doctorSpecialty ? `${ev.doctorSpecialty} • ` : ''}
                        {ev.doctorName}
                      </p>
                    )}

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => {
                          setSelectedDayEvents(null)
                          navigate(ev.path)
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#4C7A5A] hover:underline cursor-pointer"
                      >
                        <span>Ver detalhes</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 text-center">
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="w-full py-2.5 rounded-full bg-[#F6F4EF] hover:bg-[#E7F0E3] text-[#26362B] text-xs font-semibold transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
